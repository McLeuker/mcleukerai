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
        content: mode === "deep" ? "🔍 Researching..." : "💭 Thinking...",
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
        hasMessage: !!chatResult.message,
        messageLength: chatResult.message?.length,
        hasError: !!chatResult.error,
      });

      // Process response
      const content = chatResult.message || chatResult.error || "I apologize, but I couldn't generate a response. Please try again.";
      
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
            content: content,
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
        content: content,
        model_used: chatResult.model || model || "grok",
        credits_used: chatResult.credits_used || 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
        sources: sources,
        isResearched: mode === "deep",
        reasoning: reasoning,
        reasoningSteps: reasoningSteps,
        generatedFiles: generatedFiles,
        followUpQuestions: followUpQuestions,
        isPlaceholder: false,
        isError: false,
      };

      // ALWAYS replace placeholder with real message
      console.log("[Chat] Replacing placeholder:", placeholderId);
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? newAssistantMessage : m))
      );

      // Update conversation in list
      await fetchConversations();

    } catch (error: any) {
      console.error("[Chat] Error:", error);
      
      // Determine error message
      let errorMessage = "Something went wrong. Please try again.";
      if (error.name === "AbortError") {
        errorMessage = "Request timed out. The server took too long to respond. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Replace placeholder with error message (if placeholder exists)
      if (placeholderId) {
        const errorAssistantMessage: ChatMessage = {
          id: placeholderId,
          conversation_id: conversation?.id || "",
          user_id: user.id,
          role: "assistant",
          content: `❌ ${errorMessage}`,
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

        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? errorAssistantMessage : m))
        );
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

    } finally {
      // ALWAYS reset state - this runs no matter what
      console.log("[Chat] Cleanup - resetting state");
      setLoading(false);
      setStreamingContent("");
      setResearchState({
        isResearching: false,
        phase: null,
        currentStep: 0,
        totalSteps: 0,
        message: "",
      });
      abortControllerRef.current = null;
    }
  };

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setStreamingContent("");
      setResearchState({
        isResearching: false,
        phase: null,
        currentStep: 0,
        totalSteps: 0,
        message: "",
      });
    }
  }, []);

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
      return;
    }

    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }
  };

  // Toggle message favorite
  const toggleFavorite = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const { error } = await supabase
      .from("chat_messages")
      .update({ is_favorite: !message.is_favorite })
      .eq("id", messageId);

    if (error) {
      console.error("Error toggling favorite:", error);
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, is_favorite: !m.is_favorite } : m
      )
    );
  };

  // Start new chat
  const startNewChat = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    streamingContent,
    researchState,
    setCurrentConversation,
    sendMessage,
    deleteConversation,
    toggleFavorite,
    startNewChat,
    cancelRequest,
    retryMessage,
    fetchConversations,
  };
}
