import { useState, useMemo } from "react";
import { ChatMessage as ChatMessageType } from "@/hooks/useConversations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star, Trash2, User, Bot, Cpu, Coins, Copy, Check, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "react-markdown";
import DOMPurify from "dompurify";
import { TrendIndicator, parseTrendFromText } from "./TrendIndicator";
import { ExportActions } from "./ExportActions";
import { FileDownloadCard, FileDownloadList, GeneratedFile } from "./FileDownloadCard";
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

interface ChatMessageProps {
  message: ChatMessageType;
  onToggleFavorite: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  isStreaming?: boolean;
  streamingContent?: string;
  onCodeRun?: (code: string, language: string) => void;
}

export function ChatMessageComponent({
  message,
  onToggleFavorite,
  onDelete,
  isStreaming = false,
  streamingContent = "",
  onCodeRun,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>(message.generatedFiles || []);

  const displayContent = isStreaming ? streamingContent : message.content;

  // Sanitize content for assistant messages
  const sanitizedContent = useMemo(() => {
    if (message.role === "user") return displayContent;
    return DOMPurify.sanitize(displayContent, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }, [displayContent, message.role]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group relative px-4 py-5 transition-colors",
        isUser ? "bg-background" : "bg-muted/30",
        message.is_favorite && "ring-1 ring-inset ring-foreground/20 bg-secondary"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            isUser ? "bg-foreground" : "bg-muted"
          )}
        >
          {isUser ? (
            <User className="h-4 w-4 text-background" />
          ) : (
            <Bot className="h-4 w-4 text-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {isUser ? "You" : "McLeuker AI"}
            </span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
            
            {/* Model & Credits for assistant messages */}
            {!isUser && message.model_used && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {message.model_used.split("-")[0]}
                </span>
              </>
            )}
            {!isUser && message.credits_used > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {message.credits_used}
                </span>
              </>
            )}
          </div>

          {/* Message Content */}
          {isUser ? (
            <p className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap">
              {sanitizedContent}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="font-editorial text-2xl text-foreground mt-6 mb-4 first:mt-0 pb-2 border-b border-border">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="font-editorial text-xl text-foreground mt-6 mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-foreground rounded-full" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => {
                    // Check for trend indicators in text
                    const childText = String(children);
                    const hasTrendUp = childText.includes("↑");
                    const hasTrendDown = childText.includes("↓");
                    
                    if (hasTrendUp || hasTrendDown) {
                      return (
                        <p className="text-foreground leading-relaxed mb-4 text-[15px] flex items-center gap-1 flex-wrap">
                          {childText.split(/(↑|↓)/).map((part, i) => {
                            if (part === "↑") {
                              return <TrendIndicator key={i} direction="up" showIcon={false} />;
                            }
                            if (part === "↓") {
                              return <TrendIndicator key={i} direction="down" showIcon={false} />;
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </p>
                      );
                    }
                    
                    return (
                      <p className="text-foreground leading-relaxed mb-4 text-[15px]">
                        {children}
                      </p>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="list-none pl-0 mb-4 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 mb-4 space-y-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-foreground text-[15px] flex items-start gap-2">
                      <span className="text-muted-foreground mt-1.5 text-xs">●</span>
                      <span className="flex-1">{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-5 rounded-xl border border-border shadow-sm">
                      <table className="min-w-full divide-y divide-border">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/70">{children}</thead>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => {
                    const cellText = String(children);
                    // Check for trend indicators in cell
                    if (cellText.includes("↑") || cellText.includes("positive") || cellText.includes("Positive")) {
                      return (
                        <td className="px-4 py-3 text-sm text-foreground border-t border-border">
                          <span className="flex items-center gap-1.5">
                            {children}
                            <TrendIndicator direction="up" showIcon />
                          </span>
                        </td>
                      );
                    }
                    if (cellText.includes("↓") || cellText.includes("negative") || cellText.includes("Negative") || cellText.includes("polarized") || cellText.includes("Polarized")) {
                      return (
                        <td className="px-4 py-3 text-sm text-foreground border-t border-border">
                          <span className="flex items-center gap-1.5">
                            {children}
                            <TrendIndicator direction="down" showIcon />
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td className="px-4 py-3 text-sm text-foreground border-t border-border">
                        {children}
                      </td>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-muted-foreground pl-4 py-2 my-4 bg-muted rounded-r-lg">
                      <span className="text-foreground italic">{children}</span>
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                      {children}
                    </code>
                  ),
                  hr: () => (
                    <hr className="my-6 border-t border-border" />
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-muted-foreground underline underline-offset-2 inline-flex items-center gap-1"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                }}
              >
                {sanitizedContent}
              </ReactMarkdown>
              
              {/* Sources Section (if message has sources) */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-foreground rounded-full" />
                    Sources ({message.sources.length})
                  </h4>
                  <ol className="space-y-2">
                    {message.sources.map((source, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-foreground font-medium">[{index + 1}]</span>
                        <div className="flex-1">
                          <span className="text-foreground">{source.title || "Source"}</span>
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              
              {/* Generated Files */}
              {generatedFiles.length > 0 && (
                <FileDownloadList files={generatedFiles} />
              )}
              
              {/* Export Actions - only for completed assistant messages */}
              {!isUser && !isStreaming && displayContent.length > 100 && (
                <ExportActions
                  content={displayContent}
                  onFileGenerated={(file) => setGeneratedFiles(prev => [...prev, file])}
                  onCodeRun={onCodeRun}
                />
              )}
              
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>

        {/* Actions - visible on hover */}
        <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider delayDuration={300}>
            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>

            {/* Favorite */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onToggleFavorite(message.id)}
                >
                  <Star
                    className={cn(
                      "h-4 w-4 transition-colors",
                      message.is_favorite
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {message.is_favorite ? "Remove from favorites" : "Add to favorites"}
              </TooltipContent>
            </Tooltip>

            {/* Delete */}
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete message</TooltipContent>
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
                  <AlertDialogAction
                    onClick={() => onDelete(message.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
