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
  // Deep mode reasoning steps
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

    // Create a new conversation
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

    const newConv: Conversation = {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    setCurrentConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    return newConv;
  };

  // Send a message in the current conversation
  const sendMessage = async (
    prompt: string, 
    mode: ResearchMode = "quick", 
    model?: string,
    domain?: string
  ): Promise<void> => {
    if (!user) return;

    setLoading(true);
    setStreamingContent("");
    setResearchState({
      isResearching: mode === "deep",
      phase: mode === "deep" ? "planning" : null,
      currentStep: 0,
      totalSteps: 0,
      message: mode === "deep" ? "Starting research..." : "",
    });

    // Get or create conversation
    const conversation = await getOrCreateConversation();
    if (!conversation) {
      setLoading(false);
      setResearchState(prev => ({ ...prev, isResearching: false, phase: null }));
      return;
    }

    // Add user message to database
    const { data: userMsg, error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: prompt,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error("Error creating user message:", userMsgError);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setLoading(false);
      setResearchState(prev => ({ ...prev, isResearching: false, phase: null }));
      return;
    }

    // Add user message to local state
    const newUserMessage: ChatMessage = {
      id: userMsg.id,
      conversation_id: userMsg.conversation_id,
      user_id: userMsg.user_id,
      role: "user",
      content: userMsg.content,
      model_used: null,
      credits_used: 0,
      is_favorite: false,
      created_at: userMsg.created_at,
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Update conversation title if it's the first message
    if (messages.length === 0) {
      const title = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
      await supabase
        .from("conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", conversation.id);

      setCurrentConversation((prev) =>
        prev ? { ...prev, title } : prev
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? { ...c, title } : c))
      );
    }

    // Call Railway backend API based on mode
    try {
      let content = "";
      let sources: Source[] = [];
      let isResearched = mode === "deep";
      let generatedFiles: ChatMessage["generatedFiles"] = undefined;
      let reasoningSteps: ReasoningStep[] | undefined = undefined;
      let creditsUsed = mode === "deep" ? 25 : 1;

      if (mode === "deep") {
        // Use Railway deep chat endpoint for deep mode (25 credits)
        setResearchState(prev => ({
          ...prev,
          phase: "searching",
          message: "Deep reasoning in progress...",
        }));

        const deepResult = await mcLeukerAPI.chatDeep(prompt, conversation.id);
        
        content = deepResult.message;
        creditsUsed = deepResult.credits_used || 25;
        reasoningSteps = deepResult.reasoning_steps;
        
        // Map sources if available
        if (deepResult.sources) {
          sources = deepResult.sources.map((src) => ({
            title: src.title,
            url: src.url,
            snippet: src.snippet,
            type: "search" as const,
          }));
        }

        // Map generated files with download URLs
        if (deepResult.files && deepResult.files.length > 0) {
          generatedFiles = deepResult.files.map((file) => ({
            name: file.filename,
            type: mapFileFormat(file.format),
            url: mcLeukerAPI.getFileDownloadUrl(file.filename),
            size: file.size_bytes || 0,
            path: file.filepath,
            created_at: new Date().toISOString(),
          }));
        }

        setResearchState(prev => ({
          ...prev,
          phase: "completed",
          message: "Deep analysis complete",
        }));
      } else {
        // Use Railway chat endpoint for quick mode (1 credit)
        const chatResult = await mcLeukerAPI.chat(prompt, conversation.id);
        content = chatResult.message;
        creditsUsed = chatResult.credits_used || 1;

        // Map any generated files with download URLs
        if (chatResult.files && chatResult.files.length > 0) {
          generatedFiles = chatResult.files.map((file) => ({
            name: file.filename,
            type: mapFileFormat(file.format),
            url: mcLeukerAPI.getFileDownloadUrl(file.filename),
            size: file.size_bytes || 0,
            path: file.filepath,
            created_at: new Date().toISOString(),
          }));
        }
      }

      // Update streaming content for display
      setStreamingContent(content);

      // Save assistant message to database
      if (content) {
        const { data: assistantMsg, error: assistantError } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: conversation.id,
            user_id: user.id,
            role: "assistant",
            content,
            model_used: mode === "deep" ? "McLeuker Deep" : "McLeuker Quick",
            credits_used: creditsUsed,
          })
          .select()
          .single();

        if (!assistantError && assistantMsg) {
          const newAssistantMessage: ChatMessage = {
            id: assistantMsg.id,
            conversation_id: assistantMsg.conversation_id,
            user_id: assistantMsg.user_id,
            role: "assistant",
            content: assistantMsg.content,
            model_used: assistantMsg.model_used,
            credits_used: assistantMsg.credits_used || 0,
            is_favorite: false,
            created_at: assistantMsg.created_at,
            sources: sources.length > 0 ? sources : undefined,
            isResearched,
            reasoningSteps,
            generatedFiles,
          };
          setMessages((prev) => [...prev, newAssistantMessage]);
        }

        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversation.id);
      }

      setStreamingContent("");
      setResearchState({
        isResearching: false,
        phase: mode === "deep" ? "completed" : null,
        currentStep: 0,
        totalSteps: 0,
        message: "",
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Railway API processing error:", error);
        toast({
          title: "Message Failed",
          description: error instanceof Error ? error.message : "AI processing failed",
          variant: "destructive",
        });
      }
      setResearchState(prev => ({ ...prev, isResearching: false, phase: "failed" }));
    }

    setLoading(false);
    abortControllerRef.current = null;
    await fetchConversations();
  };

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreamingContent("");
    setResearchState({
      isResearching: false,
      phase: null,
      currentStep: 0,
      totalSteps: 0,
      message: "",
    });
  }, []);

  // Create a new conversation (user explicitly clicks New Chat)
  const createNewConversation = async (): Promise<void> => {
    setCurrentConversation(null);
    setMessages([]);
    setStreamingContent("");
  };

  // Select an existing conversation
  const selectConversation = async (conversation: Conversation): Promise<void> => {
    setCurrentConversation(conversation);
    setStreamingContent("");
    const msgs = await fetchMessages(conversation.id);
    setMessages(msgs);
  };

  // Toggle favorite on a message
  const toggleFavorite = async (messageId: string): Promise<void> => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const newFavoriteState = !message.is_favorite;

    const { error } = await supabase
      .from("chat_messages")
      .update({ is_favorite: newFavoriteState })
      .eq("id", messageId);

    if (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      });
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, is_favorite: newFavoriteState } : m
      )
    );

    toast({
      title: newFavoriteState ? "Added to favorites" : "Removed from favorites",
    });
  };

  // Delete a message
  const deleteMessage = async (messageId: string): Promise<void> => {
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    toast({ title: "Message deleted" });
  };

  // Delete an entire conversation
  const deleteConversation = async (conversationId: string): Promise<void> => {
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
    toast({ title: "Chat deleted" });
  };

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    streamingContent,
    researchState,
    sendMessage,
    createNewConversation,
    selectConversation,
    toggleFavorite,
    deleteMessage,
    deleteConversation,
    cancelRequest,
    fetchConversations,
  };
}
