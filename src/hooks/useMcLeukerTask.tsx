import { useState, useCallback } from "react";

export interface MappedGeneratedFile {
  name: string;
  type: "excel" | "csv" | "docx" | "pptx" | "pdf";
  url: string;
  size: number;
  path?: string;
  created_at?: string;
}

interface TaskResult {
  id: string;
  status: string;
  message?: string;
  files?: Array<{ filename: string; format: string; size_bytes?: number; filepath?: string }>;
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

function mapFileFormat(format: string): "excel" | "csv" | "docx" | "pptx" | "pdf" {
  const formatLower = format.toLowerCase();
  if (formatLower === "xlsx" || formatLower === "excel" || formatLower === "xls") return "excel";
  if (formatLower === "csv") return "csv";
  if (formatLower === "docx" || formatLower === "doc") return "docx";
  if (formatLower === "pptx" || formatLower === "ppt") return "pptx";
  return "pdf";
}

export function useMcLeukerTask(): UseMcLeukerTaskReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [mappedFiles, setMappedFiles] = useState<MappedGeneratedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submitTask = useCallback(async (_prompt: string, _userId?: string): Promise<TaskResult | null> => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setMappedFiles([]);

    try {
      // Tasks are handled through useTasks and direct chat
      const taskResult: TaskResult = {
        id: crypto.randomUUID(),
        status: "completed",
        message: "Task submitted",
      };
      setResult(taskResult);
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
    if (result?.id === taskId) {
      return result;
    }
    return null;
  }, [result]);

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
