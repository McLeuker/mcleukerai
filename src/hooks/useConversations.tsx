import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import { useToast } from "@/hooks/use-toast";
import { postProcessAssistantText } from "@/lib/assistantPostprocess";

// ═══════════════════════════════════════════════════════════════
// CONTEXTUAL ERROR RESPONSES - Never show raw errors to users
// ═══════════════════════════════════════════════════════════════

/**
 * Detect query intent for contextual fallbacks
 */
function detectQueryIntent(query: string): "research" | "personal" | "technical" | "creative" | "general" {
  const q = query.toLowerCase();
  
  if (/\b(find|search|research|look up|discover|list|compare|analyze|supplier|manufacturer)\b/i.test(q)) return "research";
  if (/\b(feel|life|advice|help me|should i|worried|stressed|relationship|personal)\b/i.test(q)) return "personal";
  if (/\b(code|api|implement|function|error|debug|programming|typescript|javascript)\b/i.test(q)) return "technical";
  if (/\b(write|poem|story|creative|imagine|compose)\b/i.test(q)) return "creative";
  
  return "general";
}

/**
 * Generate a contextual error response based on query
 * Never shows raw errors - always provides helpful guidance
 */
function getContextualErrorResponse(query: string): string {
  const intent = detectQueryIntent(query);
  const queryPreview = query.length > 50 ? query.slice(0, 50) + "..." : query;
  
  const responses: Record<string, string> = {
    research: `I'm working through some technical challenges with your research query. While I gather more data, here's what I can offer:

**For "${queryPreview}":**

I wasn't able to complete the full research, but here are some approaches that might help:
- Try breaking this into smaller, more specific questions
- Specify a particular region, time frame, or category
- Ask about one aspect at a time for more focused results

I'm still working on improving my research capabilities. Feel free to try again or rephrase your question.`,
    
    personal: `I want to acknowledge your question and provide what insight I can.

While I'm experiencing some technical challenges, I'm still here to help. What you're asking matters, and I want to give you a thoughtful response.

Could you tell me a bit more about what's on your mind? Sometimes it helps to break things down into smaller pieces.`,
    
    technical: `I ran into some issues processing your technical query.

**Here's what I suggest:**
- Try rephrasing the specific error or issue you're facing
- Share any error messages or code snippets for more targeted help
- Break down complex problems into smaller parts

I'm ready to help once you share more details.`,
    
    creative: `I'd love to help with your creative request.

Could you tell me more about the tone, style, or specific elements you're looking for? The more context you share, the better I can craft something meaningful for you.`,
    
    general: `I'm working through some technical challenges right now. While I couldn't fully process your request, here's what I can offer:

**What you can try:**
- Rephrase your question with more specific details
- Ask about one topic at a time
- Let me know if there's a particular aspect to focus on

I'm still here and ready to help once you try again.`,
  };
  
  return responses[intent];
}

// Export ChatMessage type for other components
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
  // Local-only properties
  isPlaceholder?: boolean;
  isError?: boolean;
  canRetry?: boolean;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  reasoning?: string[];
  followUpQuestions?: string[];
  retryData?: { prompt: string; mode: "quick" | "deep"; model?: string };
}

// Export ResearchState type for other components
export interface ResearchState {
  isResearching: boolean;
  phase?: string;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export function useConversations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [researchState, setResearchState] = useState<ResearchState>({ isResearching: false });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("[Conversations] Error loading:", error);
    }
  }, [user]);

  // Load messages for current conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant",
      })));
    } catch (error) {
      console.error("[Messages] Error loading:", error);
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

  // Select conversation
  const selectConversation = useCallback((conversation: Conversation) => {
    setCurrentConversation(conversation);
  }, []);

  // Create new conversation
  const createNewConversation = useCallback(async () => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    try {
      const { error } = await supabase.from("conversations").insert({
        id: newId,
        user_id: user.id,
        title: "New Chat",
        created_at: now,
        updated_at: now,
      });

      if (error) throw error;

      const newConv: Conversation = {
        id: newId,
        user_id: user.id,
        title: "New Chat",
        created_at: now,
        updated_at: now,
      };

      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (error) {
      console.error("[Conversations] Error creating:", error);
    }
  }, [user]);

  // Cancel request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreamingContent("");
    setResearchState({ isResearching: false });
  }, []);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    mode: "quick" | "deep" = "quick",
    model?: string,
    sector?: string
  ) => {
    if (!user || !content.trim()) return;

    let conversation = currentConversation;
    let placeholderId: string | null = null;

    // OUTER try-finally ensures loading always resets
    setLoading(true);
    
    try {
      // Create conversation if needed
      if (!conversation) {
        const newId = crypto.randomUUID();
        const now = new Date().toISOString();
        
        const { error } = await supabase.from("conversations").insert({
          id: newId,
          user_id: user.id,
          title: content.slice(0, 50),
          created_at: now,
          updated_at: now,
        });

        if (error) throw error;

        conversation = {
          id: newId,
          user_id: user.id,
          title: content.slice(0, 50),
          created_at: now,
          updated_at: now,
        };

        setConversations(prev => [conversation!, ...prev]);
        setCurrentConversation(conversation);
      }

      abortControllerRef.current = new AbortController();

      // Save user message to DB
      const userMsgId = crypto.randomUUID();
      const { error: userMsgError } = await supabase.from("chat_messages").insert({
        id: userMsgId,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: content.trim(),
        credits_used: 0,
        is_favorite: false,
      });

      if (userMsgError) throw userMsgError;

      const userMessage: ChatMessage = {
        id: userMsgId,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: content.trim(),
        model_used: null,
        credits_used: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };

      // Add placeholder
      placeholderId = crypto.randomUUID();
      const placeholder: ChatMessage = {
        id: placeholderId,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "assistant",
        content: "Thinking...",
        model_used: null,
        credits_used: 0,
        is_favorite: false,
        created_at: new Date().toISOString(),
        isPlaceholder: true,
      };

      setMessages(prev => [...prev, userMessage, placeholder]);

      // Set research state if deep mode
      if (mode === "deep") {
        setResearchState({
          isResearching: true,
          phase: "researching",
          message: "Researching your query...",
        });
      }

      // Update conversation title if first message
      if (messages.length === 0) {
        try {
          await supabase
            .from("conversations")
            .update({ title: content.slice(0, 50), updated_at: new Date().toISOString() })
            .eq("id", conversation.id);
        } catch (e) {
          console.warn("[Chat] Title update failed:", e);
        }
      }

      console.log("[Chat] Calling backend API...");

      // Call API
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const chatResult = await mcLeukerAPI.chat(
        content,
        mode,
        history,
        abortControllerRef.current.signal
      );

      console.log("[Chat] Backend response:", {
        hasResponse: !!chatResult.response,
        hasMessage: !!chatResult.message,
        responseLength: chatResult.response?.length || chatResult.message?.length,
      });

      // Get response content - apply post-processing to ensure user-friendly output
      let responseContent = chatResult.response || chatResult.message || "";
      
      // Post-process to clean artifacts and replace unhelpful content
      responseContent = postProcessAssistantText({
        query: content,
        text: responseContent,
      });

      // Save assistant message to DB
      const assistantMsgId = crypto.randomUUID();
      const { error: assistantMsgError } = await supabase.from("chat_messages").insert({
        id: assistantMsgId,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "assistant",
        content: responseContent,
        model_used: model || null,
        credits_used: chatResult.credits_used || 1,
        is_favorite: false,
      });

      if (assistantMsgError) {
        console.error("[Chat] Error saving assistant message:", assistantMsgError);
      }

      // Replace placeholder with real message
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        conversation_id: conversation.id,
        user_id: user.id,
        role: "assistant",
        content: responseContent,
        model_used: model || null,
        credits_used: chatResult.credits_used || 1,
        is_favorite: false,
        created_at: new Date().toISOString(),
        isPlaceholder: false,
        sources: chatResult.sources,
        reasoning: chatResult.reasoning,
        followUpQuestions: chatResult.follow_up_questions,
      };

      setMessages(prev => prev.map(m => m.id === placeholderId ? assistantMessage : m));

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation.id);

    } catch (error: any) {
      console.error("[Chat] Error:", error);

      // ROBUST FALLBACK: Replace placeholder with helpful fallback instead of raw error
      if (placeholderId) {
        // Generate contextual fallback content instead of showing raw error
        const fallbackContent = error.name === "AbortError" 
          ? "Your request was stopped. Feel free to ask again whenever you're ready."
          : getContextualErrorResponse(content);

        const fallbackMessage: ChatMessage = {
          id: placeholderId,
          conversation_id: conversation?.id || "",
          user_id: user.id,
          role: "assistant",
          content: fallbackContent,
          model_used: null,
          credits_used: 0,
          is_favorite: false,
          created_at: new Date().toISOString(),
          isPlaceholder: false,
          isError: false, // Don't mark as error - we provided helpful content
          canRetry: error.name !== "AbortError",
          retryData: { prompt: content, mode, model },
        };

        setMessages(prev => prev.map(m => m.id === placeholderId ? fallbackMessage : m));
      }

      // Show toast only for non-abort errors, with friendlier message
      if (error.name !== "AbortError") {
        toast({
          title: "Working on it",
          description: "I provided a partial response. You can try again for more details.",
          variant: "default",
        });
      }
    } finally {
      // ALWAYS reset loading state
      setLoading(false);
      setStreamingContent("");
      setResearchState({ isResearching: false });
      abortControllerRef.current = null;
    }
  }, [user, currentConversation, messages, toast]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const newFavorite = !message.is_favorite;
    
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, is_favorite: newFavorite } : m
    ));

    try {
      await supabase
        .from("chat_messages")
        .update({ is_favorite: newFavorite })
        .eq("id", messageId);
    } catch (error) {
      console.error("[Messages] Error toggling favorite:", error);
    }
  }, [messages]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    try {
      await supabase.from("chat_messages").delete().eq("id", messageId);
    } catch (error) {
      console.error("[Messages] Error deleting:", error);
    }
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      // Delete messages first (cascade would handle this but being explicit)
      await supabase.from("chat_messages").delete().eq("conversation_id", conversationId);
      await supabase.from("conversations").delete().eq("id", conversationId);

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("[Conversations] Error deleting:", error);
    }
  }, [currentConversation]);

  // Retry message
  const retryMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.retryData) return;

    // Remove the error message
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // Retry
    await sendMessage(message.retryData.prompt, message.retryData.mode, message.retryData.model);
  }, [messages, sendMessage]);

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
