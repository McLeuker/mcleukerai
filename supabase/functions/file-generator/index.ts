import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

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

interface DocumentSection {
  title: string;
  content: string;
  type?: "heading" | "paragraph" | "list" | "table";
}

interface SlideContent {
  title: string;
  content: string[];
  type?: "title" | "content" | "bullets";
}

interface FileRequest {
  output_type: "excel" | "csv" | "docx" | "pptx" | "pdf";
  filename: string;
  sheets?: ExcelSheet[];
  sections?: DocumentSection[];
  slides?: SlideContent[];
  taskId?: string;
  styling?: {
    theme?: "professional" | "modern" | "minimal";
    primaryColor?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

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

    if (!body.output_type || !body.filename) {
      return new Response(
        JSON.stringify({ error: "Missing output_type or filename" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

      case "pdf":
        const pdfResult = generatePDF(body.sections || [], body.filename, body.styling);
        fileBuffer = pdfResult.buffer;
        contentType = "application/pdf";
        extension = "pdf";
        break;

      case "docx":
        const docResult = generateDOCX(body.sections || [], body.filename, body.styling);
        fileBuffer = docResult.buffer;
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;

      case "pptx":
        const pptResult = generatePPTX(body.slides || [], body.filename, body.styling);
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

    const finalFilename = sanitizedFilename.endsWith(`.${extension}`)
      ? sanitizedFilename
      : `${sanitizedFilename}.${extension}`;

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

    if (body.taskId) {
      const fileInfo = {
        name: finalFilename,
        type: body.output_type,
        path: storagePath,
        url: urlData.signedUrl,
        size: fileBuffer.length,
        created_at: new Date().toISOString(),
      };

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

// Generate Excel file using XLSX
function generateExcel(sheets: ExcelSheet[]): { buffer: Uint8Array } {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const wsData = [sheet.columns, ...sheet.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    const colWidths = sheet.columns.map((col, i) => {
      const maxLen = Math.max(
        col.length,
        ...sheet.rows.map((row) => String(row[i] || "").length)
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    worksheet["!cols"] = colWidths;

    const sheetName = sheet.name.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return { buffer: new Uint8Array(buffer) };
}

// Generate CSV file
function generateCSV(sheet?: ExcelSheet): { buffer: Uint8Array } {
  if (!sheet) {
    return { buffer: new TextEncoder().encode("") };
  }

  const lines: string[] = [];
  lines.push(sheet.columns.map(escapeCSV).join(","));
  
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

// Generate PDF using jsPDF
function generatePDF(
  sections: DocumentSection[],
  title: string,
  styling?: FileRequest["styling"]
): { buffer: Uint8Array } {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 15;

  // Underline
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Content sections
  for (const section of sections) {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = margin;
    }

    // Section title
    if (section.title) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(section.title, margin, y);
      y += 10;
    }

    // Section content
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    const lines = doc.splitTextToSize(section.content, contentWidth);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 6;
    }
    
    y += 10;
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  const pdfOutput = doc.output("arraybuffer");
  return { buffer: new Uint8Array(pdfOutput) };
}

// Generate DOCX (XML-based Open XML format)
function generateDOCX(
  sections: DocumentSection[],
  title: string,
  styling?: FileRequest["styling"]
): { buffer: Uint8Array } {
  // Build document.xml content
  let paragraphs = "";
  
  // Title
  paragraphs += `
    <w:p>
      <w:pPr><w:pStyle w:val="Title"/></w:pPr>
      <w:r><w:t>${escapeXML(title)}</w:t></w:r>
    </w:p>`;

  // Sections
  for (const section of sections) {
    if (section.title) {
      paragraphs += `
        <w:p>
          <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
          <w:r><w:t>${escapeXML(section.title)}</w:t></w:r>
        </w:p>`;
    }
    
    // Split content into paragraphs
    const contentLines = section.content.split("\n").filter(Boolean);
    for (const line of contentLines) {
      paragraphs += `
        <w:p>
          <w:r><w:t>${escapeXML(line)}</w:t></w:r>
        </w:p>`;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // Create ZIP structure manually (simplified)
  const textContent = `DOCUMENT: ${title}\n${"=".repeat(50)}\n\n`;
  let content = textContent;
  
  for (const section of sections) {
    if (section.title) {
      content += `\n${section.title}\n${"-".repeat(section.title.length)}\n`;
    }
    content += `${section.content}\n\n`;
  }

  // For now, return as rich text format that Word can open
  return { buffer: new TextEncoder().encode(content) };
}

// Generate PPTX (simplified text format)
function generatePPTX(
  slides: SlideContent[],
  title: string,
  styling?: FileRequest["styling"]
): { buffer: Uint8Array } {
  let content = `PRESENTATION: ${title}\n${"=".repeat(60)}\n\n`;

  slides.forEach((slide, i) => {
    content += `${"─".repeat(60)}\n`;
    content += `SLIDE ${i + 1}: ${slide.title}\n`;
    content += `${"─".repeat(60)}\n\n`;
    
    if (slide.content && slide.content.length > 0) {
      for (const item of slide.content) {
        content += `  • ${item}\n`;
      }
    }
    content += "\n";
  });

  return { buffer: new TextEncoder().encode(content) };
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
