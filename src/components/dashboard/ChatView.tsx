import { useRef, useEffect } from "react";
import { Message, ResearchState } from "@/hooks/useConversations";
import ChatMessageComponent from "./ChatMessage";
import { ResearchProgress, ResearchPhase } from "./ResearchProgress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Star, Filter } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DomainStarterPanel } from "./DomainStarterPanel";

interface ChatViewProps {
  messages: Message[];
  streamingContent: string | null;
  isLoading: boolean;
  researchState?: ResearchState;
  onToggleFavorite: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onNewChat: () => void;
  onSelectPrompt?: (prompt: string, mode?: "quick" | "deep", model?: string) => void;
  onFollowUpClick?: (question: string) => void;
  onRetry?: (messageId: string) => void;
  domainSnapshot?: string | null;
  domainSnapshotLoading?: boolean;
}

export function ChatView({
  messages,
  streamingContent,
  isLoading,
  researchState,
  onToggleFavorite,
  onDeleteMessage,
  onNewChat,
  onSelectPrompt,
  onFollowUpClick,
  onRetry,
  domainSnapshot,
  domainSnapshotLoading,
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

  // FIX: Check for placeholder in FULL messages array, not filteredMessages
  // This prevents double loading indicator when favorites filter is on
  const hasPlaceholder = messages.some((m) => m.isPlaceholder);

  // Show domain starter panel when no messages
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-black min-h-0">
        <DomainStarterPanel
          onSelectPrompt={onSelectPrompt || (() => {})}
          snapshot={domainSnapshot}
          snapshotLoading={domainSnapshotLoading}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black">
      {/* Filter Bar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/10 bg-black">
          <div className="flex items-center gap-3">
            <Button
              variant={showFavoritesOnly ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "h-8 gap-2 px-4",
                showFavoritesOnly 
                  ? "bg-white text-black hover:bg-white/90" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0",
                  showFavoritesOnly && "fill-black text-black"
                )}
              />
              <span>Favorites</span>
              {favoriteCount > 0 && (
                <span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded">
                  {favoriteCount}
                </span>
              )}
            </Button>
          </div>
          <div className="text-xs text-white/50">
            {filteredMessages.length}{" "}
            {filteredMessages.length === 1 ? "message" : "messages"}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="min-h-full py-4 space-y-4">
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
                onFollowUpClick={onFollowUpClick || onSelectPrompt}
                onRetry={onRetry}
                researchState={isLastAssistant ? researchState : undefined}
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
              researchState={researchState}
            />
          )}

          {/* Research Progress Indicator */}
          {researchState?.isResearching && researchState.phase && (
            <div className="px-4 py-4">
              <div className="max-w-3xl mx-auto">
                <ResearchProgress
                  phase={researchState.phase as ResearchPhase}
                  currentStep={typeof researchState.currentStep === 'number' ? researchState.currentStep : 0}
                  totalSteps={researchState.totalSteps || 1}
                  message={researchState.message || ""}
                />
              </div>
            </div>
          )}

          {/* Loading indicator (for quick mode) - only show if no placeholder message exists */}
          {(() => {
            // FIX: Use hasPlaceholder computed from FULL messages array
            return isLoading && !streamingContent && !researchState?.isResearching && !hasPlaceholder ? (
              <div className="px-4 py-6 bg-white/5">
                <div className="max-w-3xl mx-auto flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span>McLeuker AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Show message if filtering and no results */}
          {showFavoritesOnly && filteredMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Star className="h-12 w-12 text-white/30 mb-4" />
              <p className="text-white/60">No favorite messages yet</p>
              <p className="text-sm text-white/40 mt-1">
                Star messages to find them quickly
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFavoritesOnly(false)}
                className="mt-4 text-white/70 hover:text-white hover:bg-white/10"
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
