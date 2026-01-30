import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";

export interface TaskStep {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
}

export interface TaskFile {
  name: string;
  type: string;
  description: string;
}

export interface GeneratedFile {
  name: string;
  type: "excel" | "csv" | "docx" | "pptx" | "pdf";
  url: string;
  size: number;
  path?: string;
  created_at?: string;
}

export interface Task {
  id: string;
  prompt: string;
  status: "pending" | "understanding" | "researching" | "structuring" | "generating" | "completed" | "failed";
  result: { content: string } | null;
  steps: TaskStep[];
  files: TaskFile[];
  generated_files: GeneratedFile[];
  model_used: string | null;
  credits_used: number | null;
  created_at: string;
  updated_at: string;
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
  return "pdf";
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    // Transform the data to match our Task interface
    const transformedTasks: Task[] = (data || []).map((task) => ({
      id: task.id,
      prompt: task.prompt,
      status: task.status as Task["status"],
      result: task.result as Task["result"],
      steps: (task.steps as unknown as TaskStep[]) || [],
      files: (task.files as unknown as TaskFile[]) || [],
      generated_files: (task.generated_files as unknown as GeneratedFile[]) || [],
      model_used: task.model_used || null,
      credits_used: task.credits_used || null,
      created_at: task.created_at,
      updated_at: task.updated_at,
    }));

    setTasks(transformedTasks);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Subscribe to task updates
  useEffect(() => {
    if (!currentTask) return;

    const channel = supabase
      .channel(`task-${currentTask.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `id=eq.${currentTask.id}`,
        },
        (payload) => {
          const updated = payload.new;
          const transformedTask: Task = {
            id: updated.id,
            prompt: updated.prompt,
            status: updated.status as Task["status"],
            result: updated.result as Task["result"],
            steps: (updated.steps as TaskStep[]) || [],
            files: (updated.files as TaskFile[]) || [],
            generated_files: (updated.generated_files as GeneratedFile[]) || [],
            model_used: updated.model_used || null,
            credits_used: updated.credits_used || null,
            created_at: updated.created_at,
            updated_at: updated.updated_at,
          };
          setCurrentTask(transformedTask);
          
          // Also update in tasks list
          setTasks((prev) =>
            prev.map((t) => (t.id === transformedTask.id ? transformedTask : t))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTask?.id]);

  const createTask = async (prompt: string): Promise<Task | null> => {
    if (!user) return null;

    setLoading(true);
    setStreamingContent("");

    // Create task in database with pending status
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        prompt,
        status: "pending",
        steps: [],
        files: [],
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
      setLoading(false);
      return null;
    }

    const newTask: Task = {
      id: data.id,
      prompt: data.prompt,
      status: data.status as Task["status"],
      result: null,
      steps: [],
      files: [],
      generated_files: [],
      model_used: null,
      credits_used: null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    setCurrentTask(newTask);
    setTasks((prev) => [newTask, ...prev]);

    // Call Railway backend for AI processing
    try {
      // Update status to processing
      await supabase
        .from("tasks")
        .update({ status: "understanding" })
        .eq("id", data.id);

      // Call Railway API for synchronous task processing
      const taskResult = await mcLeukerAPI.createTask(prompt, user.id);

      // Map Railway's GeneratedFile format to existing format with proper download URLs
      const generatedFiles: GeneratedFile[] = (taskResult.files || []).map((file) => ({
        name: file.filename,
        type: mapFileFormat(file.format),
        url: mcLeukerAPI.getFileDownloadUrl(file.filename),
        size: file.size_bytes || 0,
        path: file.filepath,
        created_at: new Date().toISOString(),
      }));

      // Update the content for streaming display
      if (taskResult.message) {
        setStreamingContent(taskResult.message);
      }

      // Prepare update payload - cast to Json-compatible format
      const taskStatus = taskResult.status === "completed" ? "completed" : "failed";
      const taskResultContent = taskResult.message ? { content: taskResult.message } : null;
      const modelUsed = taskResult.interpretation 
        ? `Railway AI (${taskResult.interpretation.complexity})` 
        : "Railway AI";

      // Update task in database with result
      await supabase
        .from("tasks")
        .update({
          status: taskStatus,
          result: taskResultContent,
          generated_files: generatedFiles as unknown as null, // Cast for Supabase Json type
          updated_at: new Date().toISOString(),
          model_used: modelUsed,
        })
        .eq("id", data.id);

      // Update local state
      const updatedTask: Task = {
        ...newTask,
        status: taskStatus,
        result: taskResultContent,
        generated_files: generatedFiles,
        model_used: modelUsed,
      };

      setCurrentTask(updatedTask);
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );

      // Refresh to get final state
      await fetchTasks();
    } catch (error) {
      console.error("Railway API processing error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "AI processing failed";
      
      toast({
        title: "Task Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Update task as failed
      await supabase
        .from("tasks")
        .update({ status: "failed" })
        .eq("id", data.id);

      // Update local state
      const failedTask: Task = {
        ...newTask,
        status: "failed",
      };
      setCurrentTask(failedTask);
      setTasks((prev) =>
        prev.map((t) => (t.id === failedTask.id ? failedTask : t))
      );
    }

    setLoading(false);
    return newTask;
  };

  const selectTask = (task: Task) => {
    setCurrentTask(task);
    setStreamingContent(task.result?.content || "");
  };

  return {
    tasks,
    currentTask,
    loading,
    streamingContent,
    createTask,
    selectTask,
    fetchTasks,
  };
}
