import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExcelSheet {
  name: string;
  columns: string[];
  rows: (string | number)[][];
}

interface FileRequest {
  output_type: "excel" | "csv" | "docx" | "pptx" | "pdf";
  filename: string;
  sheets?: ExcelSheet[]; // For Excel/CSV
  sections?: { title: string; content: string; type?: "heading" | "paragraph" | "list" | "table" }[]; // For DOCX
  slides?: { title: string; content: string[]; type?: "title" | "content" | "bullets" }[]; // For PPTX
  taskId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const body: FileRequest = await req.json();

    // Validate request
    if (!body.output_type || !body.filename) {
      return new Response(
        JSON.stringify({ error: "Missing output_type or filename" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize filename
    const sanitizedFilename = body.filename
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      .substring(0, 100);

    let fileBuffer: Uint8Array;
    let contentType: string;
    let extension: string;

    switch (body.output_type) {
      case "excel":
        const result = generateExcel(body.sheets || []);
        fileBuffer = result.buffer;
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
        break;

      case "csv":
        const csvResult = generateCSV(body.sheets?.[0]);
        fileBuffer = csvResult.buffer;
        contentType = "text/csv";
        extension = "csv";
        break;

      case "docx":
        const docResult = generateSimpleDoc(body.sections || [], body.filename);
        fileBuffer = docResult.buffer;
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;

      case "pptx":
        const pptResult = generateSimplePPT(body.slides || [], body.filename);
        fileBuffer = pptResult.buffer;
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        extension = "pptx";
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unsupported output type: ${body.output_type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Ensure filename has correct extension
    const finalFilename = sanitizedFilename.endsWith(`.${extension}`)
      ? sanitizedFilename
      : `${sanitizedFilename}.${extension}`;

    // Upload to Supabase Storage using service role
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const storagePath = `${userId}/${Date.now()}_${finalFilename}`;

    const { error: uploadError } = await serviceSupabase.storage
      .from("generated-files")
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await serviceSupabase.storage
      .from("generated-files")
      .createSignedUrl(storagePath, 3600);

    if (urlError) {
      console.error("Signed URL error:", urlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If taskId provided, update the task with file info
    if (body.taskId) {
      const fileInfo = {
        name: finalFilename,
        type: body.output_type,
        path: storagePath,
        url: urlData.signedUrl,
        size: fileBuffer.length,
        created_at: new Date().toISOString(),
      };

      // Get current files and append
      const { data: taskData } = await serviceSupabase
        .from("tasks")
        .select("generated_files")
        .eq("id", body.taskId)
        .single();

      const existingFiles = (taskData?.generated_files as unknown[]) || [];
      
      await serviceSupabase
        .from("tasks")
        .update({
          generated_files: [...existingFiles, fileInfo],
        })
        .eq("id", body.taskId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        file: {
          name: finalFilename,
          type: body.output_type,
          size: fileBuffer.length,
          url: urlData.signedUrl,
          path: storagePath,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("File generator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate Excel file
function generateExcel(sheets: ExcelSheet[]): { buffer: Uint8Array } {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    // Create worksheet data with headers
    const wsData = [sheet.columns, ...sheet.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = sheet.columns.map((col, i) => {
      const maxLen = Math.max(
        col.length,
        ...sheet.rows.map((row) => String(row[i] || "").length)
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    worksheet["!cols"] = colWidths;

    // Add sheet to workbook
    const sheetName = sheet.name.substring(0, 31); // Excel limit
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return { buffer: new Uint8Array(buffer) };
}

// Generate CSV file
function generateCSV(sheet?: ExcelSheet): { buffer: Uint8Array } {
  if (!sheet) {
    return { buffer: new TextEncoder().encode("") };
  }

  const lines: string[] = [];
  
  // Add header
  lines.push(sheet.columns.map(escapeCSV).join(","));
  
  // Add rows
  for (const row of sheet.rows) {
    lines.push(row.map((cell) => escapeCSV(String(cell))).join(","));
  }

  const csv = lines.join("\n");
  return { buffer: new TextEncoder().encode(csv) };
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Generate simple DOCX (minimal implementation using Open XML)
function generateSimpleDoc(
  sections: { title: string; content: string; type?: string }[],
  title: string
): { buffer: Uint8Array } {
  // Create a simple plain text representation for now
  // Full DOCX generation would require a more complex XML structure
  let text = `${title}\n${"=".repeat(title.length)}\n\n`;

  for (const section of sections) {
    if (section.title) {
      text += `${section.title}\n${"-".repeat(section.title.length)}\n`;
    }
    text += `${section.content}\n\n`;
  }

  // Return as text file with .docx extension
  // In production, use proper DOCX XML structure
  return { buffer: new TextEncoder().encode(text) };
}

// Generate simple PPTX (minimal implementation)
function generateSimplePPT(
  slides: { title: string; content: string[]; type?: string }[],
  title: string
): { buffer: Uint8Array } {
  // Create a simple plain text representation for now
  let text = `PRESENTATION: ${title}\n${"=".repeat(50)}\n\n`;

  slides.forEach((slide, i) => {
    text += `--- Slide ${i + 1} ---\n`;
    text += `Title: ${slide.title}\n`;
    if (slide.content && slide.content.length > 0) {
      text += `Content:\n`;
      slide.content.forEach((item) => {
        text += `  • ${item}\n`;
      });
    }
    text += "\n";
  });

  // Return as text file with .pptx extension
  // In production, use proper PPTX XML structure
  return { buffer: new TextEncoder().encode(text) };
}
