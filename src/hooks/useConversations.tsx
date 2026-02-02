/**
 * McLeuker AI V4 - useConversations.tsx
 * 
 * RELIABLE CHAT HANDLING
 * 
 * Design Principles:
 * 1. TRANSPARENT responses - show exactly what backend returns
 * 2. VISIBLE errors - show actual errors with retry capability
 * 3. NO fake content - no fallback message generation
 * 4. GUARANTEED state reset - loading always stops
 * 5. CLEAN data - artifacts cleaned at display time only
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

export interface Source {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export interface FileAttachment {
  name: string;
  url: string;
  type: string;
}

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
  sources?: Source[];
  reasoning?: string[];
  files?: FileAttachment[];
  images?: string[];
  followUpQuestions?: string[];
  isPlaceholder?: boolean;
  isError?: boolean;
  canRetry?: boolean;
  errorMessage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchState {
  isResearching: boolean;
  phase?: string;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}

// ============================================================================
// LOGGING
// ============================================================================

const DEBUG = true;

function log(category: string, message: string, data?: any) {
  if (DEBUG) {
    console.log(`[useConversations] [${category}]`, message, data || '');
  }
}

// ============================================================================
// ARTIFACT CLEANUP (Display-time only)
// ============================================================================

function cleanDisplayArtifacts(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  
  return text
    .replace(/\[object Object\]/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*,\s*/g, '')
    .replace(/\s*,\s*$/g, '')
    .trim();
}

function cleanMessageForDisplay(msg: any): ChatMessage {
  return {
    id: msg.id,
    conversation_id: msg.conversation_id || "",
    user_id: msg.user_id || "",
    role: msg.role,
    content: cleanDisplayArtifacts(msg.content),
    model_used: msg.model_used || null,
    credits_used: msg.credits_used || 0,
    is_favorite: msg.is_favorite || false,
    created_at: msg.created_at || new Date().toISOString(),
    sources: msg.sources,
    reasoning: msg.reasoning,
    files: msg.files,
    images: msg.images,
    followUpQuestions: msg.followUpQuestions,
    isPlaceholder: msg.isPlaceholder,
    isError: msg.isError,
    canRetry: msg.canRetry,
    errorMessage: msg.errorMessage,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useConversations() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [researchState, setResearchState] = useState<ResearchState | null>(null);
  
  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // LOAD CONVERSATIONS
  // ============================================================================

  const loadConversations = useCallback(async () => {
    if (!user) return;

    log('LOAD', 'Loading conversations for user', user.id);

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
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
      }));

      log('LOAD', `Loaded ${formattedConversations.length} conversations`);
      setConversations(formattedConversations);
    } catch (error) {
      log('LOAD', 'Error loading conversations', error);
    }
  }, [user]);

  // Load messages for current conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    log('LOAD', 'Loading messages for conversation', conversationId);

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map(cleanMessageForDisplay);
      log('LOAD', `Loaded ${formattedMessages.length} messages`);
      setMessages(formattedMessages);
    } catch (error) {
      log('LOAD', 'Error loading messages', error);
      setMessages([]);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation, loadMessages]);

  // ============================================================================
  // SELECT CONVERSATION
  // ============================================================================

  const selectConversation = useCallback((conversation: Conversation) => {
    log('SELECT', 'Selecting conversation', conversation.id);
    setCurrentConversation(conversation);
  }, []);

  // ============================================================================
  // CREATE CONVERSATION
  // ============================================================================

  const createNewConversation = useCallback(async () => {
    if (!user) return null;

    log('CREATE', 'Creating new conversation');

    const newId = crypto.randomUUID();
    const now = new Date();

    try {
      const { error } = await supabase.from("conversations").insert({
        id: newId,
        user_id: user.id,
        title: "New Chat",
      });

      if (error) throw error;

      const newConversation: Conversation = {
        id: newId,
        title: "New Chat",
        createdAt: now,
        updatedAt: now,
      };

      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);
      
      log('CREATE', 'Created conversation', newId);
      return newConversation;
    } catch (error) {
      log('CREATE', 'Error creating conversation', error);
      return null;
    }
  }, [user]);

  // ============================================================================
  // DELETE CONVERSATION
  // ============================================================================

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    log('DELETE', 'Deleting conversation', conversationId);

    try {
      // Delete messages first
      await supabase
        .from("chat_messages")
        .delete()
        .eq("conversation_id", conversationId);

      // Delete conversation
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      toast({ title: "Chat deleted" });
    } catch (error) {
      log('DELETE', 'Error deleting conversation', error);
      toast({ title: "Failed to delete chat", variant: "destructive" });
    }
  }, [user, currentConversation, toast]);

  // ============================================================================
  // CANCEL REQUEST
  // ============================================================================

  const cancelRequest = useCallback(() => {
    log('CANCEL', 'Cancelling current request');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setLoading(false);
    setStreamingContent(null);
    setResearchState(null);
  }, []);

  // ============================================================================
  // TOGGLE FAVORITE
  // ============================================================================

  const toggleFavorite = useCallback(async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const newValue = !message.is_favorite;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_favorite: newValue })
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_favorite: newValue } : m
        )
      );
    } catch (error) {
      log('FAVORITE', 'Error toggling favorite', error);
    }
  }, [messages]);

  // ============================================================================
  // DELETE MESSAGE
  // ============================================================================

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast({ title: "Message deleted" });
    } catch (error) {
      log('DELETE', 'Error deleting message', error);
      toast({ title: "Failed to delete message", variant: "destructive" });
    }
  }, [toast]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  const sendMessage = useCallback(
    async (content: string, mode: "quick" | "deep" = "quick", model?: string, sector?: string) => {
      if (!user || !content.trim()) {
        log('SEND', 'Aborted: no user or empty content');
        return;
      }

      log('SEND', 'Starting message send', { contentLength: content.length, mode });

      // Create conversation if needed
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await createNewConversation();
        if (!conversation) {
          log('SEND', 'Failed to create conversation');
          return;
        }
      }

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Create user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: content.trim(),
        model_used: null,
        credits_used: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      // Create placeholder for assistant response
      const placeholderId = crypto.randomUUID();
      const placeholderMessage: ChatMessage = {
        id: placeholderId,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "assistant",
        content: mode === "deep" ? "Researching..." : "Thinking...",
        model_used: null,
        credits_used: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
        isPlaceholder: true,
      };

      // Update UI immediately
      setMessages((prev) => [...prev, userMessage, placeholderMessage]);
      setLoading(true);

      if (mode === "deep") {
        setResearchState({
          isResearching: true,
          phase: "planning",
          currentStep: 0,
          totalSteps: 5,
          message: "Initializing research...",
        });
      }

      try {
        // Save user message to database
        await supabase.from("chat_messages").insert({
          id: userMessage.id,
          conversation_id: conversation.id,
          user_id: user.id,
          role: "user",
          content: userMessage.content,
        });

        // Prepare conversation history
        const history = messages.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        log('SEND', 'Calling API...');

        // Call the API
        const chatResult = await mcLeukerAPI.chat(
          content,
          mode,
          history,
          abortControllerRef.current.signal
        );

        log('SEND', 'API response received', {
          success: chatResult.success,
          hasResponse: !!chatResult.response,
        });

        // Handle ERROR response
        if (!chatResult.success || chatResult.error) {
          log('SEND', 'API returned error', chatResult.error);
          
          const errorMessage: ChatMessage = {
            id: placeholderId,
            conversation_id: conversation.id,
            user_id: user.id,
            role: "assistant",
            content: chatResult.error || "An error occurred. Please try again.",
            model_used: null,
            credits_used: 0,
            is_favorite: false,
            created_at: new Date().toISOString(),
            isPlaceholder: false,
            isError: true,
            canRetry: true,
            errorMessage: chatResult.error,
          };

          setMessages((prev) =>
            prev.map((m) => (m.id === placeholderId ? errorMessage : m))
          );

          toast({
            title: "Request Failed",
            description: chatResult.error || "An error occurred",
            variant: "destructive",
          });

          return;
        }

        // Handle SUCCESS response
        const responseContent = chatResult.response || chatResult.message || "";
        
        const assistantMessage: ChatMessage = {
          id: placeholderId,
          conversation_id: conversation.id,
          user_id: user.id,
          role: "assistant",
          content: responseContent,
          model_used: model || null,
          credits_used: chatResult.credits_used || 1,
          is_favorite: false,
          created_at: new Date().toISOString(),
          sources: chatResult.sources,
          reasoning: chatResult.reasoning,
          files: chatResult.files,
          images: chatResult.images,
          followUpQuestions: chatResult.follow_up_questions,
          isPlaceholder: false,
          isError: false,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? assistantMessage : m))
        );

        // Save assistant message to database
        await supabase.from("chat_messages").insert({
          id: assistantMessage.id,
          conversation_id: conversation.id,
          user_id: user.id,
          role: "assistant",
          content: assistantMessage.content,
          model_used: assistantMessage.model_used,
          credits_used: assistantMessage.credits_used,
        });

        // Update conversation title if it's new
        if (conversation.title === "New Chat") {
          const newTitle = content.slice(0, 50) + (content.length > 50 ? "..." : "");
          await supabase
            .from("conversations")
            .update({ title: newTitle })
            .eq("id", conversation.id);

          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversation!.id ? { ...c, title: newTitle } : c
            )
          );
          setCurrentConversation((prev) =>
            prev ? { ...prev, title: newTitle } : prev
          );
        }

        log('SEND', 'Message sent successfully');

      } catch (error: any) {
        log('SEND', 'Unexpected error', error);

        const errorContent = error.name === "AbortError"
          ? "Request was cancelled."
          : `Unexpected error: ${error.message || "Unknown error"}`;

        const errorMessage: ChatMessage = {
          id: placeholderId,
          conversation_id: conversation.id,
          user_id: user.id,
          role: "assistant",
          content: errorContent,
          model_used: null,
          credits_used: 0,
          is_favorite: false,
          created_at: new Date().toISOString(),
          isPlaceholder: false,
          isError: true,
          canRetry: error.name !== "AbortError",
          errorMessage: error.message,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? errorMessage : m))
        );

        if (error.name !== "AbortError") {
          toast({
            title: "Error",
            description: errorContent,
            variant: "destructive",
          });
        }

      } finally {
        log('SEND', 'Resetting loading state');
        setLoading(false);
        setStreamingContent(null);
        setResearchState(null);
        abortControllerRef.current = null;
      }
    },
    [user, currentConversation, createNewConversation, messages, toast]
  );

  // ============================================================================
  // RETRY MESSAGE
  // ============================================================================

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!currentConversation) return;

      log('RETRY', 'Retrying message', messageId);

      // Find the user message before the error
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex <= 0) return;

      const userMessage = messages[messageIndex - 1];
      if (userMessage.role !== "user") return;

      // Remove the error message
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // Retry the message
      await sendMessage(userMessage.content, "quick");
    },
    [currentConversation, messages, sendMessage]
  );

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
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
    retryMessage,
    loadConversations,
  };
}
