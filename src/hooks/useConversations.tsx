import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import type { ResearchPhase } from "@/components/dashboard/ResearchProgress";
import type { Source } from "@/components/dashboard/SourceCitations";
import type { ReasoningStep } from "@/types/mcLeuker";

export type ResearchMode = "quick" | "deep";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  model_used: string | null;
  credits_used: number;
  is_favorite: boolean;
  created_at: string;
  // Research agent fields
  sources?: Source[];
  isResearched?: boolean;
  // V2.0.0 reasoning (string)
  reasoning?: string;
  // Legacy deep mode reasoning steps
  reasoningSteps?: ReasoningStep[];
  // Generated files
  generatedFiles?: Array<{
    name: string;
    type: "excel" | "csv" | "docx" | "pptx" | "pdf";
    url: string;
    size: number;
    path?: string;
    created_at?: string;
  }>;
  // V2.0.0 follow-up questions
  followUpQuestions?: string[];
  // Reliability hardening fields
  isPlaceholder?: boolean;
  isError?: boolean;
  retryData?: {
    prompt: string;
    mode: ResearchMode;
    model?: string;
    domain?: string;
  };
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
  lastMessage?: ChatMessage;
}

export interface ResearchState {
  isResearching: boolean;
  phase: ResearchPhase | null;
  currentStep: number;
  totalSteps: number;
  message: string;
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

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [researchState, setResearchState] = useState<ResearchState>({
    isResearching: false,
    phase: null,
    currentStep: 0,
    totalSteps: 0,
    message: "",
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      (data || []).map(async (conv) => {
        const { data: msgData } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          ...conv,
          lastMessage: msgData?.[0] || undefined,
        } as Conversation;
      })
    );

    setConversations(conversationsWithLastMessage);
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return (data || []) as ChatMessage[];
  }, []);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id).then((msgs) => {
        setMessages(msgs);
      });
    } else {
      setMessages([]);
    }
  }, [currentConversation?.id, fetchMessages]);

  // Create or get current conversation
  const getOrCreateConversation = async (): Promise<Conversation | null> => {
    if (!user) return null;

    // If we have a current conversation, use it
    if (currentConversation) {
      return currentConversation;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: "New Chat",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      return null;
    }

    const newConversation = data as Conversation;
    setCurrentConversation(newConversation);
    setConversations((prev) => [newConversation, ...prev]);
    return newConversation;
  };

  // Retry a failed message
  const retryMessage = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (msg?.retryData) {
      // Remove error message
      setMessages(prev => prev.filter(m => m.id !== messageId));
      // Resend with original parameters
      await sendMessage(
        msg.retryData.prompt,
        msg.retryData.mode,
        msg.retryData.model,
        msg.retryData.domain
      );
    }
  }, [messages]);

  // Send message with FULL reliability hardening
  const sendMessage = async (
    prompt: string,
    mode: ResearchMode = "quick",
    model?: string,
    domain?: string
  ) => {
    console.log("[Chat] Starting sendMessage:", { prompt, mode, hasUser: !!user });

    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to send messages",
        variant: "destructive",
      });
      return;
    }

    // Track placeholder ID for replacement
    let placeholderId: string | null = null;
    let conversation: Conversation | null = null;

    // OUTER try/finally - guarantees state cleanup no matter what
    setLoading(true);
    if (mode === "deep") {
      setResearchState({
        isResearching: true,
        phase: "planning",
        currentStep: 0,
        totalSteps: 5,
        message: "Starting deep research...",
      });
    }

    try {
      // Get or create conversation
      conversation = await getOrCreateConversation();
      if (!conversation) {
        throw new Error("Failed to create conversation");
      }
      console.log("[Chat] Conversation ready:", conversation.id);

      // Add user message to state immediately
      const userMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: prompt,
        model_used: null,
        credits_used: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Save user message to database
      const { data: userMsg, error: userError } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: "user",
          content: prompt,
        })
        .select()
        .single();

      if (userError) {
        console.error("Error saving user message:", userError);
        throw new Error("Failed to save message");
      }
      console.log("[Chat] User message saved:", userMsg.id);

      // Update user message with real ID
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id ? { ...m, id: userMsg.id } : m
        )
      );

      // Add placeholder assistant message IMMEDIATELY
      placeholderId = `placeholder-${Date.now()}`;
      const placeholderMessage: ChatMessage = {
        id: placeholderId,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "assistant",
        content: mode === "deep" ? "🔍 Researching..." : "🤔 Thinking...",
        model_used: null,
        credits_used: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
        isPlaceholder: true,
      };
      setMessages((prev) => [...prev, placeholderMessage]);
      console.log("[Chat] Placeholder created:", placeholderId);

      // Update conversation title (best-effort, don't block on failure)
      try {
        const currentMessages = await fetchMessages(conversation.id);
        if (currentMessages.length <= 1) {
          const titlePrompt = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
          await supabase
            .from("conversations")
            .update({ title: titlePrompt })
            .eq("id", conversation.id);
        }
      } catch (titleError) {
        console.warn("[Chat] Title update failed (non-blocking):", titleError);
      }

      // Setup AbortController with timeout
      abortControllerRef.current = new AbortController();
      const timeoutMs = mode === "deep" ? 180000 : 60000; // 3min deep, 1min quick
      const timeoutId = setTimeout(() => {
        console.log("[Chat] Request timeout triggered");
        abortControllerRef.current?.abort();
      }, timeoutMs);

      console.log("[Chat] Calling backend API...");
      // Call backend API with abort signal
      const chatResult = await mcLeukerAPI.chatV2(
        prompt,
        conversation.id,
        mode,
        abortControllerRef.current.signal
      );

      clearTimeout(timeoutId);
      console.log("[Chat] Backend response received:", {
        hasResponse: !!chatResult.response,
        hasMessage: !!chatResult.message,
        responseLength: chatResult.response?.length || chatResult.message?.length,
        hasError: !!chatResult.error,
      });

      // Process response - FIX: Check for 'response' first, then 'message'
      const content = chatResult.response || chatResult.message || chatResult.error || "I apologize, but I couldn't generate a response. Please try again.";

      // Ensure content is a string (handle any object that might slip through)
      const safeContent = typeof content === 'string' ? content : JSON.stringify(content);

      // Extract sources, reasoning, files, follow-ups from response
      const sources = chatResult.sources || [];
      const reasoning = chatResult.reasoning || "";
      const reasoningSteps = chatResult.reasoning_steps || [];
      const followUpQuestions = chatResult.follow_up_questions || [];

      // Process generated files
      const generatedFiles = (chatResult.generated_files || []).map((file: any) => ({
        name: file.name || file.filename || "file",
        type: mapFileFormat(file.format || file.type || "pdf"),
        url: file.url || file.download_url || "",
        size: file.size || 0,
        path: file.path,
        created_at: file.created_at,
      }));

      // Save assistant message to database
      let dbMessageId: string | null = null;
      try {
        const { data: assistantMsg, error: assistantError } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: conversation.id,
            user_id: user.id,
            role: "assistant",
            content: safeContent,
            model_used: chatResult.model || model || "grok",
            credits_used: chatResult.credits_used || 0,
          })
          .select()
          .single();

        if (!assistantError && assistantMsg) {
          dbMessageId = assistantMsg.id;
        }
      } catch (dbError) {
        console.warn("[Chat] DB save failed (non-blocking):", dbError);
      }

      // Create final assistant message
      const newAssistantMessage: ChatMessage = {
        id: dbMessageId || placeholderId!,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "assistant",
        content: safeContent,
        model_used: chatResult.model || model || "grok",
        credits_used: chatResult.credits_used || 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
        sources,
        reasoning: typeof reasoning === 'string' ? reasoning : JSON.stringify(reasoning),
        reasoningSteps,
        generatedFiles,
        followUpQuestions,
        isResearched: mode === "deep",
        isPlaceholder: false,
        isError: false,
      };

      // ALWAYS replace placeholder with real message
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== placeholderId);
        return [...filtered, newAssistantMessage];
      });
      console.log("[Chat] Message replaced successfully");

      // Refresh conversations list
      fetchConversations();

    } catch (error: any) {
      console.error("[Chat] Error in sendMessage:", error);

      // Create error message with retry capability
      const errorMessage: ChatMessage = {
        id: placeholderId || `error-${Date.now()}`,
        conversation_id: conversation?.id || "",
        user_id: user.id,
        role: "assistant",
        content: error.name === "AbortError"
          ? "Request timed out. Please try again with a simpler query."
          : `Sorry, something went wrong: ${error.message || "Unknown error"}`,
        model_used: null,
        credits_used: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
        isPlaceholder: false,
        isError: true,
        retryData: {
          prompt,
          mode,
          model,
          domain,
        },
      };

      // Replace placeholder with error message
      if (placeholderId) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== placeholderId);
          return [...filtered, errorMessage];
        });
      } else {
        setMessages((prev) => [...prev, errorMessage]);
      }

      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      // GUARANTEED cleanup - runs no matter what
      console.log("[Chat] Cleanup: resetting loading state");
      setLoading(false);
      setResearchState({
        isResearching: false,
        phase: null,
        currentStep: 0,
        totalSteps: 0,
        message: "",
      });
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("[Chat] Cancelling request");
      abortControllerRef.current.abort();
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const newFavoriteStatus = !message.is_favorite;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, is_favorite: newFavoriteStatus } : m
      )
    );

    const { error } = await supabase
      .from("chat_messages")
      .update({ is_favorite: newFavoriteStatus })
      .eq("id", messageId);

    if (error) {
      // Revert on error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_favorite: !newFavoriteStatus } : m
        )
      );
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    // Optimistic update
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      // Refetch on error
      if (currentConversation) {
        const msgs = await fetchMessages(currentConversation.id);
        setMessages(msgs);
      }
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    // Optimistic update
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      fetchConversations();
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  // Create new conversation
  const createNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    loading,
    streamingContent,
    researchState,
    sendMessage,
    cancelRequest,
    toggleFavorite,
    deleteMessage,
    deleteConversation,
    createNewConversation,
    retryMessage,
    fetchConversations,
  };
}
