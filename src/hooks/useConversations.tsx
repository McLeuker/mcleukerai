/**
 * McLeuker AI V5.1 - useConversations.tsx
 * 
 * RELIABLE CHAT HANDLING WITH V5.1 RESPONSE CONTRACT SUPPORT
 * 
 * Design Principles:
 * 1. TRANSPARENT responses - show exactly what backend returns
 * 2. VISIBLE errors - show actual errors with retry capability
 * 3. NO fake content - no fallback message generation
 * 4. GUARANTEED state reset - loading always stops
 * 5. CLEAN data - artifacts cleaned at display time only
 * 6. V5.1 RESPONSE CONTRACT - parse structured JSON responses
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
  publisher?: string;
  date?: string;
  type?: string;
}


export interface FileAttachment {
  name: string;
  url: string;
  type: string;
}


export interface KeyInsight {
  title: string;
  description: string;
  importance: string;
  icon?: string;
}


export interface ActionItem {
  action: string;
  details: string;
  link?: string;
  priority: string;
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
  // V5.1 Response Contract fields
  keyInsights?: KeyInsight[];
  actionItems?: ActionItem[];
  summary?: string;
  intent?: string;
  domain?: string;
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
// V5.1 RESPONSE CONTRACT PARSER
// ============================================================================


interface V51ResponseContract {
  session_id?: string;
  message_id?: string;
  timestamp?: string;
  intent?: string;
  domain?: string;
  confidence?: number;
  summary?: string;
  main_content?: string;
  key_insights?: KeyInsight[];
  tables?: any[];
  sections?: any[];
  sources?: Source[];
  action_items?: ActionItem[];
  follow_up_questions?: string[];
  files?: FileAttachment[];
  credits_used?: number;
  search_mode?: string;
  error?: string;
}


function isV51Response(content: any): boolean {
  // Check if the content is a V5.1 Response Contract
  if (typeof content === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      return parsed && (
        parsed.main_content !== undefined ||
        parsed.session_id !== undefined ||
        parsed.key_insights !== undefined ||
        parsed.sources !== undefined
      );
    } catch {
      return false;
    }
  }
  if (typeof content === 'object' && content !== null) {
    return content.main_content !== undefined ||
           content.session_id !== undefined ||
           content.key_insights !== undefined ||
           content.sources !== undefined;
  }
  return false;
}


function parseV51Response(content: any): V51ResponseContract | null {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  if (typeof content === 'object' && content !== null) {
    return content as V51ResponseContract;
  }
  return null;
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
  let content = msg.content;
  let sources = msg.sources;
  let followUpQuestions = msg.followUpQuestions;
  let keyInsights = msg.keyInsights;
  let actionItems = msg.actionItems;
  let summary = msg.summary;
  let intent = msg.intent;
  let domain = msg.domain;
  let creditsUsed = msg.credits_used || 0;
  
  // Check if content is a V5.1 Response Contract
  if (isV51Response(content)) {
    log('PARSE', 'Detected V5.1 Response Contract format');
    const parsed = parseV51Response(content);
    
    if (parsed) {
      // Extract main_content as the display content
      content = parsed.main_content || parsed.summary || content;
      
      // Extract sources from the response contract
      if (parsed.sources && parsed.sources.length > 0) {
        sources = parsed.sources.map(s => ({
          title: s.title || 'Source',
          url: s.url || '',
          snippet: s.snippet || '',
          source: s.publisher || s.source || '',
          publisher: s.publisher,
          date: s.date,
          type: s.type
        }));
      }
      
      // Extract follow-up questions
      if (parsed.follow_up_questions && parsed.follow_up_questions.length > 0) {
        followUpQuestions = parsed.follow_up_questions;
      }
      
      // Extract key insights
      if (parsed.key_insights && parsed.key_insights.length > 0) {
        keyInsights = parsed.key_insights;
      }
      
      // Extract action items
      if (parsed.action_items && parsed.action_items.length > 0) {
        actionItems = parsed.action_items;
      }
      
      // Extract metadata
      summary = parsed.summary || summary;
      intent = parsed.intent || intent;
      domain = parsed.domain || domain;
      creditsUsed = parsed.credits_used || creditsUsed;
      
      // Extract files
      if (parsed.files && parsed.files.length > 0) {
        msg.files = parsed.files;
      }
      
      log('PARSE', 'V5.1 Response parsed successfully', {
        hasContent: !!content,
        sourcesCount: sources?.length || 0,
        followUpCount: followUpQuestions?.length || 0,
        insightsCount: keyInsights?.length || 0
      });
    }
  }
  
  return {
    id: msg.id,
    conversation_id: msg.conversation_id || "",
    user_id: msg.user_id || "",
    role: msg.role,
    content: cleanDisplayArtifacts(content),
    model_used: msg.model_used || null,
    credits_used: creditsUsed,
    is_favorite: msg.is_favorite || false,
    created_at: msg.created_at || new Date().toISOString(),
    sources: sources,
    reasoning: msg.reasoning,
    files: msg.files,
    images: msg.images,
    followUpQuestions: followUpQuestions,
    isPlaceholder: msg.isPlaceholder,
    isError: msg.isError,
    canRetry: msg.canRetry,
    errorMessage: msg.errorMessage,
    // V5.1 fields
    keyInsights: keyInsights,
    actionItems: actionItems,
    summary: summary,
    intent: intent,
    domain: domain,
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
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });


      if (error) throw error;


      // Clean messages for display with V5.1 parsing
      const cleanedMessages = (data || []).map(cleanMessageForDisplay);
      
      log('LOAD', `Loaded ${cleanedMessages.length} messages`);
      setMessages(cleanedMessages);
    } catch (error) {
      log('LOAD', 'Error loading messages', error);
    }
  }, [user]);


  // ============================================================================
  // SELECT CONVERSATION
  // ============================================================================


  const selectConversation = useCallback(async (conversationId: string) => {
    log('SELECT', 'Selecting conversation', conversationId);
    
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      setCurrentConversation(conv);
      await loadMessages(conversationId);
    }
  }, [conversations, loadMessages]);


  // ============================================================================
  // CREATE NEW CONVERSATION
  // ============================================================================


  const createNewConversation = useCallback(async (): Promise<string | null> => {
    if (!user) return null;


    log('CREATE', 'Creating new conversation');


    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: "New Chat",
        })
        .select()
        .single();


      if (error) throw error;


      const newConv: Conversation = {
        id: data.id,
        title: data.title || "New Chat",
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };


      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversation(newConv);
      setMessages([]);


      log('CREATE', 'Created new conversation', newConv.id);
      return newConv.id;
    } catch (error) {
      log('CREATE', 'Error creating conversation', error);
      return null;
    }
  }, [user]);


  // ============================================================================
  // SEND MESSAGE
  // ============================================================================


  const sendMessage = useCallback(async (
    content: string,
    mode: "quick" | "deep" | "auto" = "quick",
    domain?: string
  ): Promise<void> => {
    if (!user || !content.trim()) return;


    log('SEND', 'Sending message', { content: content.substring(0, 50), mode, domain });


    // Ensure we have a conversation
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }
    }


    // Create user message
    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: content,
      model_used: null,
      credits_used: 0,
      is_favorite: false,
      created_at: new Date().toISOString(),
    };


    // Create placeholder for AI response
    const placeholderMessage: ChatMessage = {
      id: `temp-ai-${Date.now()}`,
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: "",
      model_used: null,
      credits_used: 0,
      is_favorite: false,
      created_at: new Date().toISOString(),
      isPlaceholder: true,
    };


    setMessages((prev) => [...prev, userMessage, placeholderMessage]);
    setLoading(true);
    setResearchState({
      isResearching: true,
      phase: "Starting research...",
      currentStep: 0,
      totalSteps: 5,
    });


    try {
      // Save user message to database
      const { data: savedUserMsg, error: userMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: content,
          credits_used: 0,
        })
        .select()
        .single();


      if (userMsgError) throw userMsgError;


      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = content.substring(0, 50) + (content.length > 50 ? "..." : "");
        await supabase
          .from("conversations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", conversationId);
        
        setCurrentConversation((prev) => prev ? { ...prev, title } : null);
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title } : c))
        );
      }


      // Update research state
      setResearchState({
        isResearching: true,
        phase: "Analyzing query...",
        currentStep: 1,
        totalSteps: 5,
      });


      // Call the API
      log('API', 'Calling mcLeukerAPI.chat', { mode, domain });
      
      const response = await mcLeukerAPI.chat({
        message: content,
        conversationId: conversationId,
        userId: user.id,
        mode: mode,
        domain: domain,
      });


      log('API', 'Received response', { 
        hasContent: !!response.content,
        contentLength: response.content?.length,
        sourcesCount: response.sources?.length 
      });


      // Update research state
      setResearchState({
        isResearching: true,
        phase: "Processing response...",
        currentStep: 4,
        totalSteps: 5,
      });


      // Prepare the AI message content
      let aiContent = response.content || response.message || "";
      let aiSources = response.sources || [];
      let aiFollowUp = response.followUpQuestions || [];
      
      // Check if the response is a V5.1 Response Contract
      if (isV51Response(aiContent) || isV51Response(response)) {
        log('API', 'Detected V5.1 Response Contract in API response');
        const parsed = parseV51Response(aiContent) || parseV51Response(response);
        
        if (parsed) {
          aiContent = parsed.main_content || parsed.summary || aiContent;
          if (parsed.sources && parsed.sources.length > 0) {
            aiSources = parsed.sources;
          }
          if (parsed.follow_up_questions && parsed.follow_up_questions.length > 0) {
            aiFollowUp = parsed.follow_up_questions;
          }
        }
      }


      // Save AI message to database
      const { data: savedAiMsg, error: aiMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: aiContent,
          model_used: response.model || "grok-3",
          credits_used: response.creditsUsed || (mode === "deep" ? 10 : 5),
        })
        .select()
        .single();


      if (aiMsgError) throw aiMsgError;


      // Create the final AI message with V5.1 parsing
      const finalAiMessage = cleanMessageForDisplay({
        ...savedAiMsg,
        content: aiContent,
        sources: aiSources,
        followUpQuestions: aiFollowUp,
      });


      // Update messages state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === userMessage.id) {
            return { ...msg, id: savedUserMsg.id };
          }
          if (msg.id === placeholderMessage.id) {
            return finalAiMessage;
          }
          return msg;
        })
      );


      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);


      log('SEND', 'Message sent successfully');


    } catch (error: any) {
      log('SEND', 'Error sending message', error);


      // Update placeholder with error
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === placeholderMessage.id) {
            return {
              ...msg,
              content: `Error: ${error.message || "Failed to get response"}`,
              isPlaceholder: false,
              isError: true,
              canRetry: true,
              errorMessage: error.message,
            };
          }
          return msg;
        })
      );


      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setResearchState(null);
    }
  }, [user, currentConversation, messages, createNewConversation, toast]);


  // ============================================================================
  // RETRY MESSAGE
  // ============================================================================


  const retryMessage = useCallback(async (messageId: string) => {
    const errorMessage = messages.find((m) => m.id === messageId);
    if (!errorMessage) return;


    // Find the user message before this error
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex <= 0) return;


    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== "user") return;


    // Remove the error message
    setMessages((prev) => prev.filter((m) => m.id !== messageId));


    // Resend the user message
    await sendMessage(userMessage.content);
  }, [messages, sendMessage]);


  // ============================================================================
  // TOGGLE FAVORITE
  // ============================================================================


  const toggleFavorite = useCallback(async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;


    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_favorite: !message.is_favorite })
        .eq("id", messageId);


      if (error) throw error;


      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_favorite: !m.is_favorite } : m
        )
      );
    } catch (error) {
      log('FAVORITE', 'Error toggling favorite', error);
    }
  }, [messages]);


  // ============================================================================
  // DELETE CONVERSATION
  // ============================================================================


  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
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


      log('DELETE', 'Deleted conversation', conversationId);
    } catch (error) {
      log('DELETE', 'Error deleting conversation', error);
    }
  }, [currentConversation]);


  // ============================================================================
  // EFFECTS
  // ============================================================================


  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);


  // ============================================================================
  // RETURN
  // ============================================================================


  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading,
    streamingContent,
    researchState,
    
    // Actions
    loadConversations,
    selectConversation,
    createNewConversation,
    sendMessage,
    retryMessage,
    toggleFavorite,
    deleteConversation,
  };
}
