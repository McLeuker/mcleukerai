/**
 * useConversations.tsx - COMPREHENSIVE FIX
 * 
 * FIXES APPLIED:
 * 1. Uses `response` field from backend (not `message`)
 * 2. Handles [object Object] by converting any objects to strings
 * 3. Proper error handling with guaranteed state reset
 * 4. Handles `needs_user_input` responses properly
 * 5. Timeout protection (60s for quick queries, 180s for deep research)
 * 6. Retry mechanism on failure
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    url: string;
    snippet?: string;
    source?: string;
  }>;
  reasoning?: string[];
  files?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  images?: string[];
  followUpQuestions?: string[];
  isFavorite?: boolean;
  isPlaceholder?: boolean;
  isError?: boolean;
  canRetry?: boolean;
  creditsUsed?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * HELPER: Safely convert any value to a string
 * This prevents [object Object] from appearing in the UI
 */
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(safeStringify).join(", ");
  }
  if (typeof value === "object") {
    try {
      // For objects, try to extract meaningful content
      const obj = value as Record<string, unknown>;
      if (obj.title && obj.url) {
        // It's a source object
        return `${obj.title} (${obj.url})`;
      }
      if (obj.content) {
        return safeStringify(obj.content);
      }
      if (obj.text) {
        return safeStringify(obj.text);
      }
      if (obj.message) {
        return safeStringify(obj.message);
      }
      // Last resort: JSON stringify
      return JSON.stringify(value);
    } catch {
      return "[Data]";
    }
  }
  return String(value);
}

/**
 * HELPER: Clean response text of any [object Object] artifacts
 */
function cleanResponseText(text: string): string {
  if (!text) return text;
  
  // Remove [object Object] patterns
  let cleaned = text
    .replace(/\[object Object\]/g, "")
    .replace(/,\s*\[object Object\]\s*,/g, ",")
    .replace(/,\s*\[object Object\]/g, "")
    .replace(/\[object Object\]\s*,/g, "")
    .replace(/\s+,\s+/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ");
  
  return cleaned.trim();
}

/**
 * HELPER: Process sources array to ensure all items are properly formatted
 */
function processSources(sources: unknown[]): Array<{title: string; url: string; snippet?: string; source?: string}> {
  if (!Array.isArray(sources)) return [];
  
  return sources.map((source) => {
    if (typeof source === "string") {
      return { title: source, url: "#" };
    }
    if (typeof source === "object" && source !== null) {
      const s = source as Record<string, unknown>;
      return {
        title: safeStringify(s.title) || "Unknown Source",
        url: safeStringify(s.url) || "#",
        snippet: s.snippet ? safeStringify(s.snippet) : undefined,
        source: s.source ? safeStringify(s.source) : undefined,
      };
    }
    return { title: "Unknown Source", url: "#" };
  }).filter(s => s.title !== "Unknown Source" || s.url !== "#");
}

/**
 * HELPER: Process reasoning array
 */
function processReasoning(reasoning: unknown): string[] {
  if (!reasoning) return [];
  if (typeof reasoning === "string") return [reasoning];
  if (Array.isArray(reasoning)) {
    return reasoning.map(safeStringify).filter(Boolean);
  }
  return [];
}

export function useConversations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [researchState, setResearchState] = useState<{
    isResearching: boolean;
    currentStep: string;
    progress: number;
  } | null>(null);
  
  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations from Supabase
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formattedConversations: Conversation[] = (data || []).map((conv) => ({
        id: conv.id,
        title: conv.title || "New Chat",
        messages: Array.isArray(conv.messages) ? conv.messages.map((msg: any) => ({
          ...msg,
          content: cleanResponseText(safeStringify(msg.content)),
          timestamp: new Date(msg.timestamp),
          sources: msg.sources ? processSources(msg.sources) : undefined,
          reasoning: msg.reasoning ? processReasoning(msg.reasoning) : undefined,
        })) : [],
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
      }));

      setConversations(formattedConversations);
    } catch (error) {
      console.error("[Conversations] Error loading:", error);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Create new conversation
  const createConversation = useCallback(async () => {
    if (!user) return null;

    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const { error } = await supabase.from("conversations").insert({
        id: newConversation.id,
        user_id: user.id,
        title: newConversation.title,
        messages: [],
      });

      if (error) throw error;

      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (error) {
      console.error("[Conversations] Error creating:", error);
      return null;
    }
  }, [user]);

  // Cancel current request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingContent(null);
    setResearchState(null);
  }, []);

  // Send message - THE CORE FUNCTION WITH ALL FIXES
  const sendMessage = useCallback(
    async (content: string, mode: "quick" | "deep" = "quick") => {
      if (!user || !content.trim()) return;

      // Create conversation if needed
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await createConversation();
        if (!conversation) return;
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      // Add placeholder for assistant response
      const placeholderId = crypto.randomUUID();
      const placeholderMessage: Message = {
        id: placeholderId,
        role: "assistant",
        content: "Thinking...",
        timestamp: new Date(),
        isPlaceholder: true,
      };

      // Update UI immediately
      const updatedMessages = [...conversation.messages, userMessage, placeholderMessage];
      const updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        updatedAt: new Date(),
      };

      setCurrentConversation(updatedConversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation!.id ? updatedConversation : c))
      );

      // Set loading state
      setIsLoading(true);
      if (mode === "deep") {
        setResearchState({
          isResearching: true,
          currentStep: "Initializing research...",
          progress: 0,
        });
      }

      // OUTER TRY-FINALLY: Guarantees loading state is always reset
      try {
        // Prepare conversation history for context
        const history = conversation.messages.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        console.log("[Chat] Sending request to backend...", { mode, contentLength: content.length });

        // Call the API with timeout
        const timeout = mode === "deep" ? 180000 : 60000; // 3 min for deep, 1 min for quick
        
        const chatResult = await Promise.race([
          mcLeukerAPI.chat(content, mode, history, abortControllerRef.current.signal),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Request timeout")), timeout)
          ),
        ]);

        console.log("[Chat] Backend response received:", {
          hasResponse: !!chatResult.response,
          hasMessage: !!chatResult.message,
          responseType: typeof chatResult.response,
          messageType: typeof chatResult.message,
          hasError: !!chatResult.error,
          needsUserInput: chatResult.needs_user_input,
        });

        // FIX: Handle needs_user_input response
        if (chatResult.needs_user_input && chatResult.user_input_prompt) {
          const assistantMessage: Message = {
            id: placeholderId,
            role: "assistant",
            content: chatResult.user_input_prompt,
            timestamp: new Date(),
            isPlaceholder: false,
          };

          const finalMessages = updatedMessages.map((msg) =>
            msg.id === placeholderId ? assistantMessage : msg
          );

          const finalConversation = {
            ...conversation,
            messages: finalMessages,
            title: conversation.title === "New Chat" ? content.slice(0, 50) : conversation.title,
            updatedAt: new Date(),
          };

          setCurrentConversation(finalConversation);
          setConversations((prev) =>
            prev.map((c) => (c.id === conversation!.id ? finalConversation : c))
          );

          // Save to database
          await supabase
            .from("conversations")
            .update({
              messages: finalMessages,
              title: finalConversation.title,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversation.id);

          return;
        }

        // FIX: Get content from `response` field (backend uses `response`, not `message`)
        // Also handle `message` as fallback for backwards compatibility
        let responseContent = chatResult.response || chatResult.message || chatResult.error;
        
        // FIX: Ensure content is a string, not an object
        responseContent = safeStringify(responseContent);
        
        // FIX: Clean any [object Object] from the response
        responseContent = cleanResponseText(responseContent);
        
        // Fallback if still empty
        if (!responseContent || responseContent.trim() === "") {
          responseContent = "I apologize, but I couldn't generate a response. Please try again with more details.";
        }

        console.log("[Chat] Processed response:", {
          contentLength: responseContent.length,
          contentPreview: responseContent.substring(0, 100),
        });

        // Process sources and reasoning
        const processedSources = chatResult.sources ? processSources(chatResult.sources) : undefined;
        const processedReasoning = chatResult.reasoning ? processReasoning(chatResult.reasoning) : undefined;

        // Create the assistant message
        const assistantMessage: Message = {
          id: placeholderId,
          role: "assistant",
          content: responseContent,
          timestamp: new Date(),
          sources: processedSources,
          reasoning: processedReasoning,
          files: chatResult.files,
          images: chatResult.images,
          followUpQuestions: chatResult.follow_up_questions,
          creditsUsed: chatResult.credits_used || 1,
          isPlaceholder: false,
          isError: false,
        };

        // Update conversation with the response
        const finalMessages = updatedMessages.map((msg) =>
          msg.id === placeholderId ? assistantMessage : msg
        );

        const finalConversation = {
          ...conversation,
          messages: finalMessages,
          title: conversation.title === "New Chat" ? content.slice(0, 50) : conversation.title,
          updatedAt: new Date(),
        };

        setCurrentConversation(finalConversation);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversation!.id ? finalConversation : c))
        );

        // Save to database
        await supabase
          .from("conversations")
          .update({
            messages: finalMessages,
            title: finalConversation.title,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation.id);

      } catch (error: any) {
        console.error("[Chat] Error:", error);

        // Determine error message
        let errorContent = "I encountered an error. Please try again.";
        if (error.name === "AbortError") {
          errorContent = "Request was cancelled.";
        } else if (error.message === "Request timeout") {
          errorContent = "The request took too long. Please try a simpler query or try again later.";
        } else if (error.message) {
          errorContent = `Error: ${error.message}`;
        }

        // FIX: Always replace placeholder with error message
        const errorMessage: Message = {
          id: placeholderId,
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
          isPlaceholder: false,
          isError: true,
          canRetry: true,
        };

        const errorMessages = updatedMessages.map((msg) =>
          msg.id === placeholderId ? errorMessage : msg
        );

        const errorConversation = {
          ...conversation,
          messages: errorMessages,
          updatedAt: new Date(),
        };

        setCurrentConversation(errorConversation);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversation!.id ? errorConversation : c))
        );

        // Show toast for non-abort errors
        if (error.name !== "AbortError") {
          toast({
            title: "Error",
            description: errorContent,
            variant: "destructive",
          });
        }
      } finally {
        // FIX: ALWAYS reset loading state, no matter what
        setIsLoading(false);
        setStreamingContent(null);
        setResearchState(null);
        abortControllerRef.current = null;
      }
    },
    [user, currentConversation, createConversation, toast]
  );

  // Retry failed message
  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!currentConversation) return;

      // Find the user message before the error
      const messageIndex = currentConversation.messages.findIndex((m) => m.id === messageId);
      if (messageIndex <= 0) return;

      const userMessage = currentConversation.messages[messageIndex - 1];
      if (userMessage.role !== "user") return;

      // Remove the error message
      const messagesWithoutError = currentConversation.messages.filter((m) => m.id !== messageId);
      const updatedConversation = {
        ...currentConversation,
        messages: messagesWithoutError,
      };

      setCurrentConversation(updatedConversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConversation.id ? updatedConversation : c))
      );

      // Retry the message
      await sendMessage(userMessage.content);
    },
    [currentConversation, sendMessage]
  );

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (messageId: string) => {
      if (!currentConversation) return;

      const updatedMessages = currentConversation.messages.map((msg) =>
        msg.id === messageId ? { ...msg, isFavorite: !msg.isFavorite } : msg
      );

      const updatedConversation = {
        ...currentConversation,
        messages: updatedMessages,
      };

      setCurrentConversation(updatedConversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConversation.id ? updatedConversation : c))
      );

      await supabase
        .from("conversations")
        .update({ messages: updatedMessages })
        .eq("id", currentConversation.id);
    },
    [currentConversation]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await supabase.from("conversations").delete().eq("id", conversationId);

        setConversations((prev) => prev.filter((c) => c.id !== conversationId));

        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
        }
      } catch (error) {
        console.error("[Conversations] Error deleting:", error);
      }
    },
    [currentConversation]
  );

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    isLoading,
    streamingContent,
    researchState,
    sendMessage,
    createConversation,
    deleteConversation,
    toggleFavorite,
    cancelRequest,
    retryMessage,
    loadConversations,
  };
}
