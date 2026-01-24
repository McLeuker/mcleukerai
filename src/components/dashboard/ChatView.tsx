import { useRef, useEffect } from "react";
import { ChatMessage as ChatMessageType } from "@/hooks/useConversations";
import { ChatMessageComponent } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Star, Filter } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  messages: ChatMessageType[];
  streamingContent: string;
  isLoading: boolean;
  onToggleFavorite: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onNewChat: () => void;
}

export function ChatView({
  messages,
  streamingContent,
  isLoading,
  onToggleFavorite,
  onDeleteMessage,
  onNewChat,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const filteredMessages = showFavoritesOnly
    ? messages.filter((m) => m.is_favorite)
    : messages;

  const favoriteCount = messages.filter((m) => m.is_favorite).length;

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6">
          <MessageSquarePlus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-editorial text-foreground mb-2">
          Start a conversation
        </h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Ask McLeuker AI to help with supplier research, trend analysis, market
          intelligence, or sustainability audits.
        </p>
        <Button variant="outline" onClick={onNewChat}>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Filter Bar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
          <div className="flex items-center gap-2">
            <Button
              variant={showFavoritesOnly ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="h-8 gap-1.5"
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  showFavoritesOnly && "fill-gold text-gold"
                )}
              />
              Favorites
              {favoriteCount > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                  {favoriteCount}
                </span>
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredMessages.length}{" "}
            {filteredMessages.length === 1 ? "message" : "messages"}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="min-h-full">
          {filteredMessages.map((message, index) => {
            const isLastAssistant =
              message.role === "assistant" &&
              index === filteredMessages.length - 1 &&
              isLoading;

            return (
              <ChatMessageComponent
                key={message.id}
                message={message}
                onToggleFavorite={onToggleFavorite}
                onDelete={onDeleteMessage}
                isStreaming={isLastAssistant}
                streamingContent={isLastAssistant ? streamingContent : undefined}
              />
            );
          })}

          {/* Streaming placeholder for new message */}
          {isLoading && streamingContent && messages.length > 0 && (
            <ChatMessageComponent
              message={{
                id: "streaming",
                conversation_id: "",
                user_id: "",
                role: "assistant",
                content: "",
                model_used: null,
                credits_used: 0,
                is_favorite: false,
                created_at: new Date().toISOString(),
              }}
              onToggleFavorite={() => {}}
              onDelete={() => {}}
              isStreaming={true}
              streamingContent={streamingContent}
            />
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="px-4 py-6 bg-muted/30">
              <div className="max-w-3xl mx-auto flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>McLeuker AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show message if filtering and no results */}
          {showFavoritesOnly && filteredMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No favorite messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Star messages to find them quickly
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFavoritesOnly(false)}
                className="mt-4"
              >
                <Filter className="h-4 w-4 mr-2" />
                Show all messages
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
