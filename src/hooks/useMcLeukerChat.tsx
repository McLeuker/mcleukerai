import { useState, useCallback } from "react";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import type { Message, GeneratedFile } from "@/types/mcLeuker";

interface UseMcLeukerChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, conversationId?: string) => Promise<Message | null>;
  clearMessages: () => void;
  clearError: () => void;
}

export function useMcLeukerChat(): UseMcLeukerChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string, conversationId?: string): Promise<Message | null> => {
    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await mcLeukerAPI.chat(content, conversationId);

      // Map generated files with download URLs
      const files: GeneratedFile[] | undefined = response.files?.map((file) => ({
        ...file,
        download_url: mcLeukerAPI.getFileDownloadUrl(file.filename),
      }));

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        files,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Chat request failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
  };
}
