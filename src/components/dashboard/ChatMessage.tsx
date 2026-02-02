import { useState, useMemo, ReactNode } from "react";
import { ChatMessage as ChatMessageType, ResearchState } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star, Trash2, User, Bot, Cpu, Coins, Copy, Check, ExternalLink, Sparkles, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DOMPurify from "dompurify";
import { TrendIndicator } from "./TrendIndicator";
import { ExportActions } from "./ExportActions";
import { cleanForDisplay } from "@/lib/assistantPostprocess";
import { FileDownloadList, GeneratedFile } from "./FileDownloadCard";
import { ReasoningDisplay } from "./ReasoningDisplay";
import { BackgroundActivityPanel, mapPhaseToSteps, ActivityStep } from "./BackgroundActivityPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Safely extract text from React children without causing [object Object]
 */
function extractTextFromChildren(children: ReactNode): string {
  if (children === null || children === undefined) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (typeof children === "boolean") return "";
  
  if (Array.isArray(children)) {
    const allPrimitives = children.every(
      child => typeof child === "string" || typeof child === "number" || child === null || child === undefined
    );
    if (allPrimitives) {
      return children.map(child => {
        if (child === null || child === undefined) return "";
        return String(child);
      }).join("");
    }
    return "";
  }
  
  return "";
}

interface ChatMessageProps {
  message: ChatMessageType;
  onToggleFavorite: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  isStreaming?: boolean;
  streamingContent?: string;
  onCodeRun?: (code: string, language: string) => void;
  onFollowUpClick?: (question: string) => void;
  onRetry?: (messageId: string) => void;
  researchState?: ResearchState;
}

export function ChatMessageComponent({
  message,
  onToggleFavorite,
  onDelete,
  isStreaming = false,
  streamingContent = "",
  onCodeRun,
  onFollowUpClick,
  onRetry,
  researchState,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [generatedFiles] = useState<GeneratedFile[]>([]);

  const displayContent = isStreaming ? streamingContent : message.content;
  const isUser = message.role === "user";

  // Sanitize and clean content for assistant messages
  const sanitizedContent = useMemo(() => {
    if (isUser) return displayContent;
    const cleaned = cleanForDisplay(displayContent);
    return DOMPurify.sanitize(cleaned, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }, [displayContent, isUser]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate activity steps for background panel
  const activitySteps: ActivityStep[] = useMemo(() => {
    if (isUser) return [];
    if (isStreaming || message.isPlaceholder) {
      return mapPhaseToSteps(researchState?.phase, researchState?.isResearching);
    }
    // Completed message - show all done
    if (!message.isError) {
      return mapPhaseToSteps("completed", false);
    }
    return [];
  }, [isUser, isStreaming, message.isPlaceholder, message.isError, researchState?.phase, researchState?.isResearching]);

  const showActivityPanel = !isUser && (isStreaming || message.isPlaceholder || (!message.isError && activitySteps.length > 0));

  return (
    <div className={cn(
      "px-4 md:px-8 py-2",
      isUser ? "flex justify-end" : "flex justify-start"
    )}>
      {/* Message Bubble */}
      <div
        className={cn(
          "relative group rounded-2xl px-5 py-4 max-w-[80%]",
          "bg-white text-black shadow-sm",
          message.is_favorite && "ring-2 ring-yellow-400/50"
        )}
      >
        {/* User Message */}
        {isUser ? (
          <div className="space-y-2">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-black">
              {sanitizedContent}
            </p>
            {/* User message actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mb-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-black/50 hover:text-black hover:bg-black/5" onClick={handleCopy}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-black/50 hover:text-black hover:bg-black/5" onClick={() => onToggleFavorite(message.id)}>
                      <Star className={cn("h-3.5 w-3.5", message.is_favorite && "fill-yellow-500 text-yellow-500")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{message.is_favorite ? "Remove favorite" : "Add favorite"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          /* Assistant Message */
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 text-xs text-black/60">
              <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-medium text-black">McLeuker AI</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
              {message.model_used && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    {message.model_used.split("-")[0]}
                  </span>
                </>
              )}
              {message.credits_used > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {message.credits_used}
                  </span>
                </>
              )}
            </div>

            {/* Background Activity Panel */}
            {showActivityPanel && (
              <BackgroundActivityPanel
                steps={activitySteps}
                isActive={isStreaming || !!message.isPlaceholder}
                defaultExpanded={isStreaming || !!message.isPlaceholder}
              />
            )}

            {/* Placeholder State */}
            {message.isPlaceholder ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-black/50" />
                <span className="text-black/60 text-[15px]">{message.content}</span>
              </div>
            ) : message.isError ? (
              /* Error State */
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-[15px]">{message.content}</p>
                </div>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(message.id)}
                    className="text-black border-black/20 hover:bg-black/5"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            ) : (
              /* Normal Content */
              <div className="prose prose-sm max-w-none prose-headings:text-black prose-p:text-black prose-strong:text-black prose-li:text-black">
                {/* Reasoning Display */}
                {message.reasoning && message.reasoning.length > 0 && (
                  <ReasoningDisplay reasoning={message.reasoning.join('\n')} />
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="font-editorial text-2xl text-black mt-6 mb-4 first:mt-0 pb-2 border-b border-black/10">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="font-editorial text-xl text-black mt-6 mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-black rounded-full" />
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-black mt-4 mb-2">{children}</h3>
                    ),
                    p: ({ children }) => {
                      const childText = extractTextFromChildren(children);
                      const hasTrendUp = childText.includes("↑");
                      const hasTrendDown = childText.includes("↓");
                      const hasCitations = /\[\d+\]/.test(childText);

                      if ((hasTrendUp || hasTrendDown) && typeof children === "string") {
                        return (
                          <p className="text-black leading-relaxed mb-4 text-[15px] flex items-center gap-1 flex-wrap">
                            {childText.split(/(↑|↓)/).map((part, i) => {
                              if (part === "↑") return <TrendIndicator key={i} direction="up" showIcon={false} />;
                              if (part === "↓") return <TrendIndicator key={i} direction="down" showIcon={false} />;
                              return <span key={i}>{part}</span>;
                            })}
                          </p>
                        );
                      }

                      if (hasCitations && typeof children === "string") {
                        return (
                          <p className="text-black leading-relaxed mb-4 text-[15px]">
                            {childText.split(/(\[\d+\])/).map((part, i) => {
                              if (/^\[\d+\]$/.test(part)) {
                                const num = part.slice(1, -1);
                                return (
                                  <sup key={i} className="text-xs font-medium text-black/50 hover:text-black cursor-pointer ml-0.5" title={`Citation ${num}`}>
                                    {part}
                                  </sup>
                                );
                              }
                              return <span key={i}>{part}</span>;
                            })}
                          </p>
                        );
                      }

                      return <p className="text-black leading-relaxed mb-4 text-[15px]">{children}</p>;
                    },
                    ul: ({ children }) => <ul className="list-none pl-0 mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>,
                    li: ({ children }) => (
                      <li className="text-black text-[15px] flex items-start gap-2">
                        <span className="text-black/40 mt-1.5 text-xs">●</span>
                        <span className="flex-1">{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => <strong className="font-semibold text-black">{children}</strong>,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-5 rounded-xl border border-black/10 shadow-sm">
                        <table className="min-w-full divide-y divide-black/10">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-black/5">{children}</thead>,
                    tr: ({ children }) => <tr className="hover:bg-black/5 transition-colors">{children}</tr>,
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider whitespace-nowrap">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => {
                      const cellText = extractTextFromChildren(children);
                      if (typeof children === "string" && (cellText.includes("↑") || cellText.includes("positive") || cellText.includes("Positive"))) {
                        return (
                          <td className="px-4 py-3 text-sm text-black border-t border-black/10">
                            <span className="flex items-center gap-1.5">
                              {children}
                              <TrendIndicator direction="up" showIcon />
                            </span>
                          </td>
                        );
                      }
                      if (typeof children === "string" && (cellText.includes("↓") || cellText.includes("negative") || cellText.includes("Negative"))) {
                        return (
                          <td className="px-4 py-3 text-sm text-black border-t border-black/10">
                            <span className="flex items-center gap-1.5">
                              {children}
                              <TrendIndicator direction="down" showIcon />
                            </span>
                          </td>
                        );
                      }
                      return <td className="px-4 py-3 text-sm text-black border-t border-black/10">{children}</td>;
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-3 border-black/30 pl-4 py-2 my-4 bg-black/5 rounded-r-lg">
                        <span className="text-black italic">{children}</span>
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="bg-black/5 px-1.5 py-0.5 rounded text-sm font-mono text-black">{children}</code>
                    ),
                    hr: () => <hr className="my-6 border-t border-black/10" />,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:text-black/70 underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        {children}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ),
                  }}
                >
                  {sanitizedContent}
                </ReactMarkdown>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-black/10">
                    <h4 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-black rounded-full" />
                      Sources ({message.sources.length})
                    </h4>
                    <ol className="space-y-2">
                      {message.sources.map((source, index) => (
                        <li key={index} className="text-sm text-black/60 flex items-start gap-2">
                          <span className="text-black font-medium">[{index + 1}]</span>
                          <div className="flex-1">
                            <span className="text-black">{source.title || "Source"}</span>
                            {source.url && (
                              <a href={source.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-black/50 hover:text-black hover:underline inline-flex items-center gap-1">
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Generated Files */}
                {generatedFiles.length > 0 && <FileDownloadList files={generatedFiles} />}

                {/* Follow-up Questions */}
                {message.followUpQuestions && message.followUpQuestions.length > 0 && !isStreaming && onFollowUpClick && (
                  <div className="mt-6 pt-4 border-t border-black/10">
                    <p className="text-xs font-medium text-black/50 mb-3 flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      Continue exploring
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.followUpQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => onFollowUpClick(question)}
                          className="group/chip text-left text-sm px-4 py-2 rounded-full border border-black/20 bg-white hover:bg-black hover:text-white hover:border-black transition-all duration-200 text-black/80"
                        >
                          <span className="flex items-center gap-2">
                            {question}
                            <span className="opacity-0 group-hover/chip:opacity-100 transition-opacity">→</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Actions */}
                {!isStreaming && displayContent.length > 100 && (
                  <ExportActions content={displayContent} onFileGenerated={() => {}} onCodeRun={onCodeRun} />
                )}

                {isStreaming && <span className="inline-block w-2 h-4 bg-black animate-pulse ml-1" />}
              </div>
            )}

            {/* Assistant message actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-black/5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-black/50 hover:text-black hover:bg-black/5" onClick={handleCopy}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-black/50 hover:text-black hover:bg-black/5" onClick={() => onToggleFavorite(message.id)}>
                      <Star className={cn("h-3.5 w-3.5", message.is_favorite && "fill-yellow-500 text-yellow-500")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{message.is_favorite ? "Remove favorite" : "Add favorite"}</TooltipContent>
                </Tooltip>
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-black/50 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete message?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. Credits will not be refunded.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(message.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
