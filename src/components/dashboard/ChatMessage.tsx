/**
 * McLeuker AI V4 - ChatMessage.tsx
 * 
 * WhatsApp-style white bubble design on black background
 * 
 * Design Specs:
 * - White bubbles with black text
 * - 16-22px rounded corners
 * - User messages right-aligned, AI messages left-aligned
 * - Both have profile headers (avatar, name, timestamp)
 * - 15px typography throughout
 * - Max-width 75% to prevent overflow
 * - overflow-wrap: anywhere to prevent horizontal scroll
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
  FileText,
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
        <h4 className="text-sm font-medium text-black/60">Sources</h4>
        {sources.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-black/50 hover:text-black/70"
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
            className="block p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-black/40 font-mono">[{index + 1}]</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-blue-600 truncate">
                    {safeToString(source.title)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-black/40 flex-shrink-0" />
                </div>
                {source.snippet && (
                  <p className="text-xs text-black/50 mt-1 line-clamp-2">
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
      <h4 className="text-sm font-medium text-black/60 mb-2">Follow-up questions</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onFollowUp(question)}
            className="text-xs text-black/70 border-black/20 hover:bg-black/5 gap-1"
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

  // User message - right aligned
  if (message.role === "user") {
    return (
      <div className="flex justify-end px-6 md:px-10">
        <div className="max-w-[75%] bg-white rounded-[18px] px-4 py-3 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-black text-white text-xs">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-black">You</span>
            <span className="text-xs text-black/50">·</span>
            <span className="text-xs text-black/50">{formatTime(message.created_at)}</span>
          </div>
          {/* Content */}
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
      <div className="flex justify-start px-6 md:px-10">
        <div className="max-w-[75%] bg-white rounded-[18px] px-4 py-3 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src="/mcleuker-avatar.png" />
              <AvatarFallback className="bg-black text-white text-xs">ML</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-black">McLeuker AI</span>
          </div>
          {/* Loading indicator */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-black/60 text-sm">{displayContent}</span>
          </div>
        </div>
      </div>
    );
  }

  // Error message
  if (message.isError) {
    return (
      <div className="flex justify-start px-6 md:px-10">
        <div className="max-w-[75%] bg-red-50 border border-red-200 rounded-[18px] px-4 py-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-red-500 text-white text-xs">ML</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-red-700">McLeuker AI</span>
          </div>
          {/* Error content */}
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 text-sm">{displayContent}</p>
              {message.canRetry && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(message.id)}
                  className="mt-2 text-red-600 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal assistant message - left aligned
  return (
    <div className="flex justify-start px-6 md:px-10">
      <div className="max-w-[75%] bg-white rounded-[18px] px-4 py-3 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src="/mcleuker-avatar.png" />
            <AvatarFallback className="bg-black text-white text-xs">ML</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-black">McLeuker AI</span>
          <span className="text-xs text-black/50">·</span>
          <span className="text-xs text-black/50">{formatTime(message.created_at)}</span>
        </div>

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
                  return <code className="bg-black/5 px-1 py-0.5 rounded text-sm">{children}</code>;
                }
                return (
                  <code className="block bg-black/5 p-3 rounded-lg text-sm overflow-x-auto">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="overflow-x-auto max-w-full">{children}</pre>,
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
                <th className="border border-black/10 bg-black/5 px-3 py-2 text-left text-sm font-medium">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-black/10 px-3 py-2 text-sm">{children}</td>
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
        <div className="flex items-center justify-between mt-4 pt-2 border-t border-black/10">
          <div className="flex items-center gap-2">
            {message.credits_used > 0 && (
              <span className="text-xs text-black/50">
                {message.credits_used} credit{message.credits_used !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 text-black/40 hover:text-black/70 hover:bg-black/5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleFavorite(message.id)}
              className="h-7 w-7 p-0 text-black/40 hover:text-black/70 hover:bg-black/5"
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
