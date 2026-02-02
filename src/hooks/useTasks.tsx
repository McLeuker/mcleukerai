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

function mapFileFormat(format: string): "excel" | "csv" | "docx" | "pptx" | "pdf" {
  const formatLower = format.toLowerCase();
  if (formatLower === "xlsx" || formatLower === "excel" || formatLower === "xls") return "excel";
  if (formatLower === "csv") return "csv";
  if (formatLower === "docx" || formatLower === "doc") return "docx";
  if (formatLower === "pptx" || formatLower === "ppt") return "pptx";
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

    try {
      await supabase
        .from("tasks")
        .update({ status: "understanding" })
        .eq("id", data.id);

      // Use chat API for task processing
      const chatResponse = await mcLeukerAPI.chat(prompt, "deep", []);

      const generatedFiles: GeneratedFile[] = (chatResponse.files || []).map((file) => ({
        name: file.name,
        type: mapFileFormat(file.type || "pdf"),
        url: file.url,
        size: 0,
        created_at: new Date().toISOString(),
      }));

      if (chatResponse.message || chatResponse.response) {
        setStreamingContent(chatResponse.message || chatResponse.response || "");
      }

      const taskStatus = chatResponse.error ? "failed" : "completed";
      const taskResultContent = chatResponse.message || chatResponse.response 
        ? { content: chatResponse.message || chatResponse.response || "" } 
        : null;

      await supabase
        .from("tasks")
        .update({
          status: taskStatus,
          result: taskResultContent,
          generated_files: generatedFiles as unknown as null,
          updated_at: new Date().toISOString(),
          model_used: "McLeuker AI",
        })
        .eq("id", data.id);

      const updatedTask: Task = {
        ...newTask,
        status: taskStatus,
        result: taskResultContent,
        generated_files: generatedFiles,
        model_used: "McLeuker AI",
      };

      setCurrentTask(updatedTask);
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );

      await fetchTasks();
    } catch (error) {
      console.error("Task processing error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "AI processing failed";
      
      toast({
        title: "Task Failed",
        description: errorMessage,
        variant: "destructive",
      });

      await supabase
        .from("tasks")
        .update({ status: "failed" })
        .eq("id", data.id);

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
