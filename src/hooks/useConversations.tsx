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
  is_favorite?: boolean; // DB alias
  isPlaceholder?: boolean;
  isError?: boolean;
  canRetry?: boolean;
  creditsUsed?: number;
  credits_used?: number; // DB alias
  errorMessage?: string;
  model_used?: string | null;
  created_at?: string;
  conversation_id?: string;
  user_id?: string;
}

// Alias for backwards compatibility
export type ChatMessage = Message;

export interface ResearchState {
  isResearching: boolean;
  currentStep?: string;
  progress?: number;
  phase?: string;
  totalSteps?: number;
  message?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  updated_at?: string; // DB alias
}

// ============================================================================
// LOGGING
// ============================================================================

const DEBUG = true; // Enable for debugging

function log(category: string, message: string, data?: any) {
  if (DEBUG) {
    console.log(`[useConversations] [${category}]`, message, data || '');
  }
}

// ============================================================================
// ARTIFACT CLEANUP (Display-time only)
// ============================================================================

/**
 * Clean [object Object] artifacts from text
 * This is called at DISPLAY TIME only, not when saving
 */
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

/**
 * Clean message for display (not storage)
 */
function cleanMessageForDisplay(msg: any): Message {
  return {
    ...msg,
    content: cleanDisplayArtifacts(msg.content),
    timestamp: new Date(msg.timestamp),
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
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [researchState, setResearchState] = useState<{
    isResearching: boolean;
    currentStep: string;
    progress: number;
  } | null>(null);
  
  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // LOAD CONVERSATIONS
  // ============================================================================

  const loadConversations = useCallback(async () => {
    if (!user) return;

    log('LOAD', 'Loading conversations for user', user.id);

    try {
      // Load conversations
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // Load all messages for user's conversations
      const conversationIds = (convData || []).map(c => c.id);
      
      let messagesData: any[] = [];
      if (conversationIds.length > 0) {
        const { data: msgData, error: msgError } = await supabase
          .from("chat_messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true });
        
        if (!msgError) {
          messagesData = msgData || [];
        }
      }

      // Group messages by conversation_id
      const messagesByConv: Record<string, Message[]> = {};
      messagesData.forEach((msg: any) => {
        if (!messagesByConv[msg.conversation_id]) {
          messagesByConv[msg.conversation_id] = [];
        }
        messagesByConv[msg.conversation_id].push({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          created_at: msg.created_at,
          isFavorite: msg.is_favorite,
          is_favorite: msg.is_favorite,
          creditsUsed: msg.credits_used,
          credits_used: msg.credits_used,
          model_used: msg.model_used,
          conversation_id: msg.conversation_id,
          user_id: msg.user_id,
        });
      });

      const formattedConversations: Conversation[] = (convData || []).map((conv) => ({
        id: conv.id,
        title: conv.title || "New Chat",
        messages: messagesByConv[conv.id] || [],
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at),
        updated_at: conv.updated_at,
      }));

      log('LOAD', `Loaded ${formattedConversations.length} conversations`);
      setConversations(formattedConversations);
    } catch (error) {
      log('LOAD', 'Error loading conversations', error);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ============================================================================
  // CREATE CONVERSATION
  // ============================================================================

  const createConversation = useCallback(async () => {
    if (!user) return null;

    log('CREATE', 'Creating new conversation');

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
      });

      if (error) throw error;

      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      
      log('CREATE', 'Created conversation', newConversation.id);
      return newConversation;
    } catch (error) {
      log('CREATE', 'Error creating conversation', error);
      return null;
    }
  }, [user]);

  // ============================================================================
  // CANCEL REQUEST
  // ============================================================================

  const cancelRequest = useCallback(() => {
    log('CANCEL', 'Cancelling current request');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsLoading(false);
    setStreamingContent(null);
    setResearchState(null);
  }, []);

  // ============================================================================
  // SEND MESSAGE - CORE FUNCTION
  // ============================================================================

  const sendMessage = useCallback(
    async (content: string, mode: "quick" | "deep" = "quick", _model?: string, _sector?: string) => {
      if (!user || !content.trim()) {
        log('SEND', 'Aborted: no user or empty content');
        return;
      }

      log('SEND', 'Starting message send', { contentLength: content.length, mode });

      // Create conversation if needed
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await createConversation();
        if (!conversation) {
          log('SEND', 'Failed to create conversation');
          return;
        }
      }

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Create user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      // Create placeholder for assistant response
      const placeholderId = crypto.randomUUID();
      const placeholderMessage: Message = {
        id: placeholderId,
        role: "assistant",
        content: "Thinking...",
        timestamp: new Date(),
        isPlaceholder: true,
      };

      // Update UI immediately with user message and placeholder
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

      // OUTER TRY-FINALLY: Guarantees loading state ALWAYS resets
      try {
        // Prepare conversation history
        const history = conversation.messages.slice(-10).map((msg) => ({
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
          responseLength: chatResult.response?.length,
          hasError: !!chatResult.error,
        });

        // Handle needs_user_input response
        if (chatResult.needs_user_input && chatResult.user_input_prompt) {
          log('SEND', 'Backend needs more input');
          
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

          await this.saveAndUpdateConversation(conversation, finalMessages, content);
          return;
        }

        // Handle ERROR response - TRANSPARENT, show actual error
        if (!chatResult.success || chatResult.error) {
          log('SEND', 'API returned error', chatResult.error);
          
          const errorMessage: Message = {
            id: placeholderId,
            role: "assistant",
            content: chatResult.error || "An error occurred. Please try again.",
            timestamp: new Date(),
            isPlaceholder: false,
            isError: true,
            canRetry: chatResult.canRetry !== false,
            errorMessage: chatResult.error,
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

          // Show toast for errors
          toast({
            title: "Request Failed",
            description: chatResult.error || "An error occurred",
            variant: "destructive",
          });

          return;
        }

        // Handle SUCCESS response - TRANSPARENT, show actual content
        const responseContent = chatResult.response || chatResult.message || "";
        
        log('SEND', 'Processing successful response', {
          contentLength: responseContent.length,
          preview: responseContent.substring(0, 100),
        });

        // Create assistant message with ACTUAL backend response
        const assistantMessage: Message = {
          id: placeholderId,
          role: "assistant",
          content: responseContent, // ACTUAL response, no modification
          timestamp: new Date(),
          sources: chatResult.sources,
          reasoning: chatResult.reasoning,
          files: chatResult.files,
          images: chatResult.images,
          followUpQuestions: chatResult.follow_up_questions,
          creditsUsed: chatResult.credits_used || 1,
          isPlaceholder: false,
          isError: false,
        };

        // Update conversation
        const finalMessages = updatedMessages.map((msg) =>
          msg.id === placeholderId ? assistantMessage : msg
        );

        const finalConversation = {
          ...conversation,
          messages: finalMessages,
          title: conversation.title === "New Chat" 
            ? content.slice(0, 50) + (content.length > 50 ? "..." : "")
            : conversation.title,
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

        log('SEND', 'Message sent successfully');

      } catch (error: any) {
        log('SEND', 'Unexpected error', error);

        // Handle unexpected errors - TRANSPARENT
        const errorContent = error.name === "AbortError"
          ? "Request was cancelled."
          : `Unexpected error: ${error.message || "Unknown error"}`;

        const errorMessage: Message = {
          id: placeholderId,
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
          isPlaceholder: false,
          isError: true,
          canRetry: error.name !== "AbortError",
          errorMessage: error.message,
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

        if (error.name !== "AbortError") {
          toast({
            title: "Error",
            description: errorContent,
            variant: "destructive",
          });
        }

      } finally {
        // GUARANTEED: Always reset loading state
        log('SEND', 'Resetting loading state');
        setIsLoading(false);
        setStreamingContent(null);
        setResearchState(null);
        abortControllerRef.current = null;
      }
    },
    [user, currentConversation, createConversation, toast]
  );

  // ============================================================================
  // RETRY MESSAGE
  // ============================================================================

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (!currentConversation) return;

      log('RETRY', 'Retrying message', messageId);

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

  // ============================================================================
  // TOGGLE FAVORITE
  // ============================================================================

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

      // Update favorite in chat_messages table - find the message and update it
      // For now just update local state since messages are stored in chat_messages table
      // The actual DB update should find the message by id
      const toggledMessage = updatedMessages.find(m => m.isFavorite !== currentConversation.messages.find(om => om.id === m.id)?.isFavorite);
      if (toggledMessage) {
        await supabase
          .from("chat_messages")
          .update({ is_favorite: toggledMessage.isFavorite })
          .eq("id", toggledMessage.id);
      }
    },
    [currentConversation]
  );

  // ============================================================================
  // DELETE CONVERSATION
  // ============================================================================

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      log('DELETE', 'Deleting conversation', conversationId);

      try {
        await supabase.from("conversations").delete().eq("id", conversationId);

        setConversations((prev) => prev.filter((c) => c.id !== conversationId));

        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
        }
      } catch (error) {
        log('DELETE', 'Error deleting conversation', error);
      }
    },
    [currentConversation]
  );

  // ============================================================================
  // RETURN
  // ============================================================================

  // Computed messages from current conversation
  const messages = currentConversation?.messages || [];

  // Select a conversation
  const selectConversation = useCallback((conv: Conversation) => {
    setCurrentConversation(conv);
  }, []);

  // Delete a message from current conversation
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentConversation) return;
    
    const updatedMessages = currentConversation.messages.filter(m => m.id !== messageId);
    const updatedConversation = { ...currentConversation, messages: updatedMessages };
    
    setCurrentConversation(updatedConversation);
    setConversations(prev => prev.map(c => c.id === currentConversation.id ? updatedConversation : c));
    
    // Note: messages stored in conversation, update handled there
  }, [currentConversation]);

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    loading: isLoading,
    streamingContent,
    researchState,
    sendMessage,
    createConversation,
    createNewConversation: createConversation,
    selectConversation,
    deleteConversation,
    deleteMessage,
    toggleFavorite,
    cancelRequest,
    retryMessage,
    loadConversations,
  };
}
