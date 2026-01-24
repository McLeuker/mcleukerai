import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

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

export interface Task {
  id: string;
  prompt: string;
  status: "pending" | "understanding" | "researching" | "structuring" | "generating" | "completed" | "failed";
  result: { content: string } | null;
  steps: TaskStep[];
  files: TaskFile[];
  model_used: string | null;
  credits_used: number | null;
  created_at: string;
  updated_at: string;
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

    // Create task in database
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
      model_used: null,
      credits_used: null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    setCurrentTask(newTask);
    setTasks((prev) => [newTask, ...prev]);

    // Start AI processing
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Please log in to continue");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fashion-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({ prompt, taskId: data.id }),
        }
      );

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = "AI processing failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response might not be JSON, use status text
          errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Check content type to ensure we have a stream
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        // Might be a JSON error response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || "Unexpected response format");
        } catch (e) {
          if (e instanceof Error && e.message !== "Unexpected response format") {
            throw new Error("Failed to process AI response");
          }
          throw e;
        }
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let hasReceivedContent = false;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const eventData = line.slice(6).trim();
                if (eventData === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(eventData);
                  if (parsed.content) {
                    hasReceivedContent = true;
                    content += parsed.content;
                    setStreamingContent(content);
                  }
                  // Check for error in stream
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch (parseError) {
                  // Only skip if it's a JSON parse error, not a thrown error
                  if (parseError instanceof SyntaxError) {
                    // Skip malformed JSON
                    continue;
                  }
                  throw parseError;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Check if we received any content
      if (!hasReceivedContent && !content) {
        console.warn("No content received from AI stream");
      }

      // Refresh to get final state
      await fetchTasks();
    } catch (error) {
      console.error("AI processing error:", error);
      
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
