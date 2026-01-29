import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { GeneratedFile } from "./useTasks";

interface ExcelSheet {
  name: string;
  columns: string[];
  rows: (string | number)[][];
}

interface FileGenerationRequest {
  output_type: "excel" | "csv" | "docx" | "pptx" | "pdf";
  filename: string;
  sheets?: ExcelSheet[];
  sections?: { title: string; content: string; type?: string }[];
  slides?: { title: string; content: string[]; type?: string }[];
  taskId?: string;
  styling?: {
    theme?: "professional" | "modern" | "minimal";
    primaryColor?: string;
  };
}

export function useFileGeneration() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateFile = async (request: FileGenerationRequest): Promise<GeneratedFile | null> => {
    setGenerating(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Please log in to continue");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/file-generator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "File generation failed");
      }

      const data = await response.json();

      if (!data.success || !data.file) {
        throw new Error("Invalid response from file generator");
      }

      toast({
        title: "File Generated",
        description: `${data.file.name} is ready to download`,
      });

      return data.file as GeneratedFile;
    } catch (error) {
      console.error("File generation error:", error);
      toast({
        title: "File Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  // Helper to detect if a prompt requests a file
  const detectFileRequest = (prompt: string): { type: "excel" | "csv" | "docx" | "pptx" | null; detected: boolean } => {
    const lower = prompt.toLowerCase();

    const excelPatterns = [
      /excel/i,
      /spreadsheet/i,
      /xlsx/i,
      /generate.*(?:list|table).*(?:excel|xlsx)/i,
      /export.*(?:as|to).*excel/i,
    ];

    const csvPatterns = [
      /csv/i,
      /comma.?separated/i,
      /export.*(?:as|to).*csv/i,
    ];

    const docxPatterns = [
      /word\s*doc/i,
      /docx?/i,
      /word\s*document/i,
      /export.*(?:as|to).*(?:word|doc)/i,
    ];

    const pptxPatterns = [
      /ppt/i,
      /powerpoint/i,
      /presentation/i,
      /slide/i,
      /export.*(?:as|to).*(?:ppt|powerpoint|presentation)/i,
    ];

    if (excelPatterns.some((p) => p.test(lower))) {
      return { type: "excel", detected: true };
    }
    if (csvPatterns.some((p) => p.test(lower))) {
      return { type: "csv", detected: true };
    }
    if (docxPatterns.some((p) => p.test(lower))) {
      return { type: "docx", detected: true };
    }
    if (pptxPatterns.some((p) => p.test(lower))) {
      return { type: "pptx", detected: true };
    }

    return { type: null, detected: false };
  };

  return {
    generateFile,
    detectFileRequest,
    generating,
  };
}
