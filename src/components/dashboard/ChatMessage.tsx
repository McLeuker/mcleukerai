/**
 * McLeuker AI - ChatMessage.tsx
 * 
 * ChatGPT-like message display:
 * - No bubbles for AI messages
 * - User messages: text only, right-aligned, subtle styling
 * - AI messages: direct on black background, reading column width
 * - Copy button on hover for AI messages
 * - Table of Contents for long responses
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Copy, 
  Check, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage as ChatMessageType, ResearchState } from "@/hooks/useConversations";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

// Extract headings for TOC
function extractHeadings(content: string): { level: number; text: string; id: string }[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    headings.push({ level, text, id });
  }
  
  return headings;
}

// Check if content is "long" enough for TOC
function shouldShowTOC(content: string, headings: { level: number; text: string; id: string }[]): boolean {
  return content.length > 1500 || headings.length >= 3;
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
    <div className="mt-6 pt-6 border-t border-white/[0.08]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-medium text-white/[0.55]">Sources</h4>
        {sources.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-[12px] text-white/[0.45] hover:text-white/70 h-auto py-1 px-2"
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
            className="block p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/[0.06]"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-[11px] text-white/[0.40] font-mono">[{index + 1}]</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] text-[#60A5FA] hover:underline truncate">
                    {safeToString(source.title)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-white/[0.35] flex-shrink-0" />
                </div>
                {source.snippet && (
                  <p className="text-[12px] text-white/[0.50] mt-1 line-clamp-2">
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
    <div className="mt-6 pt-6 border-t border-white/[0.08]">
      <h4 className="text-[13px] font-medium text-white/[0.55] mb-3">Follow-up questions</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onFollowUp(question)}
            className="text-[12px] text-white/[0.65] border-white/[0.12] hover:bg-white/[0.06] hover:text-white/80 gap-1.5 h-auto py-1.5 px-3 rounded-full"
          >
            <Sparkles className="h-3 w-3" />
            {safeToString(question)}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface TableOfContentsProps {
  headings: { level: number; text: string; id: string }[];
  onScrollTo: (id: string) => void;
}

function TableOfContents({ headings, onScrollTo }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (headings.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[12px] text-white/50 hover:text-white/70 h-auto py-1.5 px-2.5 gap-1.5"
        >
          <List className="h-3.5 w-3.5" />
          Table of Contents
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <nav className="pl-3 border-l border-white/[0.08] space-y-1">
          {headings.map((heading, index) => (
            <button
              key={index}
              onClick={() => onScrollTo(heading.id)}
              className={cn(
                "block text-left text-[12px] text-white/50 hover:text-white/80 transition-colors py-0.5",
                heading.level === 3 && "pl-3"
              )}
            >
              {heading.text}
            </button>
          ))}
        </nav>
      </CollapsibleContent>
    </Collapsible>
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
  const [isHovered, setIsHovered] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  const displayContent = isStreaming && streamingContent 
    ? streamingContent 
    : cleanArtifacts(safeToString(message.content));

  const headings = useMemo(() => extractHeadings(displayContent), [displayContent]);
  const showTOC = useMemo(() => shouldShowTOC(displayContent, headings), [displayContent, headings]);

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

  const handleScrollToHeading = (id: string) => {
    const element = messageRef.current?.querySelector(`[data-heading-id="${id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // User message - text only, right aligned, minimal styling
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-3">
        <div className="max-w-[75%] lg:max-w-[65%]">
          <p className="text-[15px] text-white/[0.88] leading-[1.7] text-right">
            {displayContent}
          </p>
        </div>
      </div>
    );
  }

  // Placeholder message (thinking/researching)
  if (message.isPlaceholder) {
    return (
      <div className="py-4">
        <div className="max-w-[800px]">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-white/55 text-[14px]">{displayContent || 'Thinking...'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Error message
  if (message.isError) {
    return (
      <div className="py-4">
        <div className="max-w-[800px] bg-red-900/20 border border-red-500/20 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-200 text-[14px] leading-relaxed">{displayContent}</p>
              {message.canRetry && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(message.id)}
                  className="mt-3 text-red-300 border-red-500/30 hover:bg-red-900/30 text-[12px]"
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

  // Normal assistant message - ChatGPT-like, no bubble
  return (
    <div 
      className="py-4 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={messageRef}
    >
      {/* Copy button - top right, visible on hover */}
      <div className={cn(
        "absolute top-4 right-0 transition-opacity duration-150",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0 text-white/[0.40] hover:text-white/70 hover:bg-white/[0.06]"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      {/* Reading column container */}
      <div className="max-w-[800px] pr-12">
        {/* Table of Contents for long messages */}
        {showTOC && !isStreaming && (
          <TableOfContents headings={headings} onScrollTo={handleScrollToHeading} />
        )}

        {/* Main content with markdown */}
        <div className="ai-message-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              h1: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h1 data-heading-id={id} className="text-[17px] font-semibold mt-6 mb-3 first:mt-0 text-white/[0.92]">{children}</h1>;
              },
              h2: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h2 data-heading-id={id} className="text-[16px] font-semibold mt-6 mb-3 first:mt-0 text-white/[0.92]">{children}</h2>;
              },
              h3: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h3 data-heading-id={id} className="text-[15px] font-semibold mt-5 mb-2 first:mt-0 text-white/[0.92]">{children}</h3>;
              },
              strong: ({ children }) => <strong className="font-semibold text-white/[0.92]">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-[13px] text-white/[0.85]">{children}</code>;
                }
                return (
                  <code className="block bg-white/[0.06] p-4 rounded-lg text-[13px] overflow-x-auto text-white/[0.85]">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="overflow-x-auto max-w-full my-4">{children}</pre>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#60A5FA] hover:text-[#93C5FD] underline underline-offset-2">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-white/[0.15] pl-4 my-4 text-white/[0.70] italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-white/[0.10]">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-left text-[13px] font-medium text-white/[0.85]">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-white/[0.10] px-3 py-2 text-[13px] text-white/[0.75]">{children}</td>
              ),
              hr: () => <hr className="my-6 border-white/[0.08]" />,
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
      </div>
    </div>
  );
}

export default ChatMessageComponent;