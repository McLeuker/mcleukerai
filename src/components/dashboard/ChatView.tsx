/**
 * ChatView.tsx - Premium Chat Container
 * 
 * Features:
 * - Premium ombre background (radial gradient)
 * - Graphite glass filter bar
 * - Proper scroll container with overflow protection
 * - Consistent message spacing (16px)
 */

import { useRef, useEffect, useState } from "react";
import { ChatMessage, ResearchState } from "@/hooks/useConversations";
import { ChatMessageComponent } from "./ChatMessage";
import { ResearchProgress, ResearchPhase } from "./ResearchProgress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Star, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { DomainStarterPanel } from "./DomainStarterPanel";

interface ChatViewProps {
  messages: ChatMessage[];
  streamingContent: string | null;
  isLoading: boolean;
  researchState?: ResearchState | null;
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

  // Check for placeholder in FULL messages array
  const hasPlaceholder = messages.some((m) => m.isPlaceholder);

  // Show domain starter panel when no messages
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden premium-ombre-bg">
        <DomainStarterPanel
          onSelectPrompt={onSelectPrompt || (() => {})}
          snapshot={domainSnapshot}
          snapshotLoading={domainSnapshotLoading}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden chat-panel-gradient">
      {/* Filter Bar - Graphite glass style */}
      {messages.length > 0 && (
        <div className={cn(
          "flex items-center justify-between px-6 md:px-8 py-3",
          "border-b border-white/[0.08]",
          "bg-gradient-to-b from-[hsl(0_0%_7%)] to-[hsl(0_0%_4%)]"
        )}>
          <div className="flex items-center gap-3">
            <Button
              variant={showFavoritesOnly ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "h-8 gap-2 px-4 rounded-full transition-all duration-160",
                showFavoritesOnly 
                  ? "bg-white text-black hover:bg-white/90" 
                  : "text-white/70 hover:text-white hover:bg-white/[0.08]"
              )}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0",
                  showFavoritesOnly && "fill-black text-black"
                )}
              />
              <span className="text-[13px]">Favorites</span>
              {favoriteCount > 0 && (
                <span className={cn(
                  "ml-1 text-[11px] px-1.5 py-0.5 rounded-full",
                  showFavoritesOnly ? "bg-black/10" : "bg-white/10"
                )}>
                  {favoriteCount}
                </span>
              )}
            </Button>
          </div>
          <div className="text-[12px] text-white/45">
            {filteredMessages.length}{" "}
            {filteredMessages.length === 1 ? "message" : "messages"}
          </div>
        </div>
      )}

      {/* Messages - Scroll container with proper overflow */}
      <ScrollArea className="flex-1 overflow-x-hidden" ref={scrollRef}>
        <div className="min-h-full py-6">
          {/* Centered message column */}
          <div className="max-w-[1040px] mx-auto px-6 lg:px-8 space-y-4">
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
                  streamingContent={isLastAssistant ? streamingContent || undefined : undefined}
                  onFollowUpClick={onFollowUpClick || onSelectPrompt}
                  onRetry={onRetry}
                  researchState={isLastAssistant ? researchState || undefined : undefined}
                />
              );
            })}

            {/* Research Progress Indicator */}
            {researchState?.isResearching && researchState.phase && (
              <div className="py-4">
                <div className="max-w-3xl">
                  <ResearchProgress
                    phase={researchState.phase as ResearchPhase}
                    currentStep={researchState.currentStep}
                    totalSteps={researchState.totalSteps}
                    message={researchState.message}
                  />
                </div>
              </div>
            )}

            {/* Loading indicator (for quick mode) - only show if no placeholder message exists */}
            {isLoading && !streamingContent && !researchState?.isResearching && !hasPlaceholder && (
              <div className="flex justify-start pl-3 lg:pl-4 py-2">
                <div className="max-w-[65%] graphite-bubble-ai rounded-[20px] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                    <span className="text-[14px] text-white/55">McLeuker AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Show message if filtering and no results */}
            {showFavoritesOnly && filteredMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Star className="h-12 w-12 text-white/25 mb-4" />
                <p className="text-white/55 text-[15px]">No favorite messages yet</p>
                <p className="text-[13px] text-white/35 mt-1.5">
                  Star messages to find them quickly
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFavoritesOnly(false)}
                  className="mt-4 text-white/60 hover:text-white hover:bg-white/[0.08] rounded-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Show all messages
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
