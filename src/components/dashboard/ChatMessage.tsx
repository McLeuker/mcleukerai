/**
 * McLeuker AI V5 - ChatMessage.tsx
 * 
 * Premium WhatsApp-style bubbles on dark ombre background
 * 
 * Design Specs:
 * - AI bubbles: Off-white (#F6F6F6) with soft shadows
 * - User bubbles: Pure white with slightly stronger shadow
 * - 20px rounded corners
 * - Both have profile headers (avatar, name, timestamp) inside
 * - 15px typography throughout with 1.6 line-height
 * - Max-width 72% to keep content focused
 * - Stable gutters (24-32px) so bubbles never touch edges
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Copy, 
  Check, 
  Star, 
  StarOff, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage as ChatMessageType, ResearchState } from "@/hooks/useConversations";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function safeToString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(safeToString).join(', ');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Complex Object]';
    }
  }
  return String(value);
}

function cleanArtifacts(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\[object Object\]/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*,\s*/g, '')
    .replace(/\s*,\s*$/g, '')
    .trim();
}

function formatTime(dateString: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateString));
  } catch {
    return '';
  }
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface SourcesSectionProps {
  sources: Array<{ title: string; url: string; snippet?: string }>;
}

function SourcesSection({ sources }: SourcesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (!sources || sources.length === 0) return null;

  const displaySources = expanded ? sources : sources.slice(0, 3);

  return (
    <div className="mt-4 pt-4 border-t border-black/10">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[12px] font-medium text-black/55">Sources</h4>
        {sources.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-black/45 hover:text-black/70 h-auto py-1 px-2"
          >
            {expanded ? (
              <>Show less <ChevronUp className="ml-1 h-3 w-3" /></>
            ) : (
              <>Show {sources.length - 3} more <ChevronDown className="ml-1 h-3 w-3" /></>
            )}
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {displaySources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-[11px] text-black/40 font-mono">[{index + 1}]</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] text-blue-600 truncate">
                    {safeToString(source.title)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-black/35 flex-shrink-0" />
                </div>
                {source.snippet && (
                  <p className="text-[12px] text-black/50 mt-1 line-clamp-2">
                    {safeToString(source.snippet)}
                  </p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

interface FollowUpSectionProps {
  questions: string[];
  onFollowUp?: (q: string) => void;
}

function FollowUpSection({ questions, onFollowUp }: FollowUpSectionProps) {
  if (!questions || questions.length === 0 || !onFollowUp) return null;

  return (
    <div className="mt-4 pt-4 border-t border-black/10">
      <h4 className="text-[12px] font-medium text-black/55 mb-2">Follow-up questions</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onFollowUp(question)}
            className="text-[12px] text-black/65 border-black/15 hover:bg-black/[0.04] gap-1.5 h-auto py-1.5 px-3"
          >
            <Sparkles className="h-3 w-3" />
            {safeToString(question)}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// BUBBLE HEADER COMPONENT
// ============================================================================

interface BubbleHeaderProps {
  isUser: boolean;
  timestamp: string;
}

function BubbleHeader({ isUser, timestamp }: BubbleHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <Avatar className="h-6 w-6">
        {isUser ? (
          <AvatarFallback className="bg-black text-white text-[10px]">
            <User className="h-3 w-3" />
          </AvatarFallback>
        ) : (
          <>
            <AvatarImage src="/mcleuker-avatar.png" />
            <AvatarFallback className="bg-black text-white text-[10px] font-medium">ML</AvatarFallback>
          </>
        )}
      </Avatar>
      <span className="text-[12px] font-medium text-black/80">
        {isUser ? 'You' : 'McLeuker AI'}
      </span>
      <span className="text-[12px] text-black/45">·</span>
      <span className="text-[12px] text-black/45">{timestamp}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ChatMessageComponentProps {
  message: ChatMessageType;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  isStreaming?: boolean;
  streamingContent?: string;
  onFollowUpClick?: (question: string) => void;
  onRetry?: (id: string) => void;
  researchState?: ResearchState;
}

export function ChatMessageComponent({
  message,
  onToggleFavorite,
  onDelete,
  isStreaming,
  streamingContent,
  onFollowUpClick,
  onRetry,
  researchState,
}: ChatMessageComponentProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const displayContent = isStreaming && streamingContent 
    ? streamingContent 
    : cleanArtifacts(safeToString(message.content));

  const formattedTime = formatTime(message.created_at);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  // User message - right aligned with white bubble
  if (message.role === "user") {
    return (
      <div className="flex justify-end px-6 md:px-8">
        <div className={cn(
          "max-w-[72%] rounded-[20px] px-5 py-4",
          "premium-bubble-user"
        )}>
          <BubbleHeader isUser={true} timestamp={formattedTime} />
          <div className="chat-message-content text-black">
            {displayContent}
          </div>
        </div>
      </div>
    );
  }

  // Placeholder message (thinking/researching)
  if (message.isPlaceholder) {
    return (
      <div className="flex justify-start px-6 md:px-8">
        <div className={cn(
          "max-w-[72%] rounded-[20px] px-5 py-4",
          "premium-bubble-ai"
        )}>
          <BubbleHeader isUser={false} timestamp="" />
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-black/55 text-[14px]">{displayContent || 'Thinking...'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Error message
  if (message.isError) {
    return (
      <div className="flex justify-start px-6 md:px-8">
        <div className="max-w-[72%] bg-red-50 border border-red-200 rounded-[20px] px-5 py-4 shadow-[0_10px_28px_rgba(0,0,0,0.15)]">
          <BubbleHeader isUser={false} timestamp={formattedTime} />
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 text-[14px]">{displayContent}</p>
              {message.canRetry && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(message.id)}
                  className="mt-3 text-red-600 border-red-300 hover:bg-red-100 text-[12px]"
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal assistant message - left aligned with off-white bubble
  return (
    <div className="flex justify-start px-6 md:px-8">
      <div className={cn(
        "max-w-[72%] rounded-[20px] px-5 py-4",
        "premium-bubble-ai"
      )}>
        <BubbleHeader isUser={false} timestamp={formattedTime} />

        {/* Main content with markdown */}
        <div className="chat-message-content text-black">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-3">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-3">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              h1: ({ children }) => <h1 className="text-[15px] font-semibold mt-4 mb-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-[15px] font-semibold mt-4 mb-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-[15px] font-semibold mt-3 mb-2 first:mt-0">{children}</h3>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return <code className="bg-black/[0.06] px-1.5 py-0.5 rounded text-[13px]">{children}</code>;
                }
                return (
                  <code className="block bg-black/[0.06] p-3 rounded-lg text-[13px] overflow-x-auto">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="overflow-x-auto max-w-full my-3">{children}</pre>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className="min-w-full border-collapse border border-black/10">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-black/10 bg-black/[0.04] px-3 py-2 text-left text-[13px] font-medium">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-black/10 px-3 py-2 text-[13px]">{children}</td>
              ),
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <SourcesSection sources={message.sources} />
        )}

        {/* Follow-up questions */}
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <FollowUpSection questions={message.followUpQuestions} onFollowUp={onFollowUpClick} />
        )}

        {/* Footer with actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.08]">
          <div className="flex items-center gap-2">
            {message.credits_used > 0 && (
              <span className="text-[11px] text-black/45">
                {message.credits_used} credit{message.credits_used !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 text-black/35 hover:text-black/65 hover:bg-black/[0.05]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleFavorite(message.id)}
              className="h-7 w-7 p-0 text-black/35 hover:text-black/65 hover:bg-black/[0.05]"
            >
              {message.is_favorite ? (
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
              ) : (
                <StarOff className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMessageComponent;
