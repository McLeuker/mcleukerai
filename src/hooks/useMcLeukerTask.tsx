import { useState, useCallback } from "react";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import type { TaskResult, GeneratedFile } from "@/types/mcLeuker";

// Mapped file type for UI compatibility
export interface MappedGeneratedFile {
  name: string;
  type: "excel" | "csv" | "docx" | "pptx" | "pdf";
  url: string;
  size: number;
  path?: string;
  created_at?: string;
}

interface UseMcLeukerTaskReturn {
  isProcessing: boolean;
  result: TaskResult | null;
  mappedFiles: MappedGeneratedFile[];
  error: string | null;
  submitTask: (prompt: string, userId?: string) => Promise<TaskResult | null>;
  pollTask: (taskId: string) => Promise<TaskResult | null>;
  clearResult: () => void;
  clearError: () => void;
}

/**
 * Map Railway file format to UI-expected type
 */
function mapFileFormat(format: string): "excel" | "csv" | "docx" | "pptx" | "pdf" {
  const formatLower = format.toLowerCase();
  if (formatLower === "xlsx" || formatLower === "excel" || formatLower === "xls") {
    return "excel";
  }
  if (formatLower === "csv") {
    return "csv";
  }
  if (formatLower === "docx" || formatLower === "doc") {
    return "docx";
  }
  if (formatLower === "pptx" || formatLower === "ppt") {
    return "pptx";
  }
  if (formatLower === "pdf") {
    return "pdf";
  }
  // Default to pdf for unknown formats
  return "pdf";
}

/**
 * Map Railway GeneratedFile to UI-compatible format with download URLs
 */
function mapGeneratedFiles(files: GeneratedFile[] | undefined): MappedGeneratedFile[] {
  if (!files || files.length === 0) return [];

  return files.map((file) => ({
    name: file.filename,
    type: mapFileFormat(file.format),
    url: mcLeukerAPI.getFileDownloadUrl(file.filename),
    size: file.size_bytes || 0,
    path: file.filepath,
    created_at: new Date().toISOString(),
  }));
}

export function useMcLeukerTask(): UseMcLeukerTaskReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [mappedFiles, setMappedFiles] = useState<MappedGeneratedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submitTask = useCallback(async (prompt: string, userId?: string): Promise<TaskResult | null> => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setMappedFiles([]);

    try {
      const taskResult = await mcLeukerAPI.createTask(prompt, userId);
      setResult(taskResult);
      
      // Map files for UI
      const mapped = mapGeneratedFiles(taskResult.files);
      setMappedFiles(mapped);

      return taskResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Task submission failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const pollTask = useCallback(async (taskId: string): Promise<TaskResult | null> => {
    setError(null);

    try {
      const taskResult = await mcLeukerAPI.getTaskStatus(taskId);
      setResult(taskResult);
      
      // Map files for UI
      const mapped = mapGeneratedFiles(taskResult.files);
      setMappedFiles(mapped);

      return taskResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Task polling failed";
      setError(errorMessage);
      return null;
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setMappedFiles([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    result,
    mappedFiles,
    error,
    submitTask,
    pollTask,
    clearResult,
    clearError,
  };
}
