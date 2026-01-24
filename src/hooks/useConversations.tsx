import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

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

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
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
  const sendMessage = async (prompt: string): Promise<void> => {
    if (!user) return;

    setLoading(true);
    setStreamingContent("");

    // Get or create conversation
    const conversation = await getOrCreateConversation();
    if (!conversation) {
      setLoading(false);
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

    // Call AI endpoint
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Please log in to continue");
      }

      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fashion-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            prompt,
            conversationId: conversation.id,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        let errorMessage = "AI processing failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let modelUsed = "";
      let creditsUsed = 0;

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
                    content += parsed.content;
                    setStreamingContent(content);
                  }
                  if (parsed.modelUsed) {
                    modelUsed = parsed.modelUsed;
                  }
                  if (parsed.creditsUsed) {
                    creditsUsed = parsed.creditsUsed;
                  }
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch (parseError) {
                  if (parseError instanceof SyntaxError) continue;
                  throw parseError;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Save assistant message
      if (content) {
        const { data: assistantMsg, error: assistantError } = await supabase
          .from("chat_messages")
          .insert({
            conversation_id: conversation.id,
            user_id: user.id,
            role: "assistant",
            content,
            model_used: modelUsed || null,
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
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("AI processing error:", error);
        toast({
          title: "Message Failed",
          description: error instanceof Error ? error.message : "AI processing failed",
          variant: "destructive",
        });
      }
    }

    setLoading(false);
    abortControllerRef.current = null;
    await fetchConversations();
  };

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
    sendMessage,
    createNewConversation,
    selectConversation,
    toggleFavorite,
    deleteMessage,
    deleteConversation,
    fetchConversations,
  };
}
