/**
 * McLeuker AI V4 - ChatMessage.tsx
 * 
 * SAFE MESSAGE RENDERING
 * 
 * Design Principles:
 * 1. SAFE rendering - never pass objects to String()
 * 2. CLEAN display - artifacts cleaned at render time
 * 3. ERROR visibility - show errors with retry button
 * 4. SOURCES display - properly formatted citations
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
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ============================================================================
// TYPES
// ============================================================================

interface Source {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

interface FileAttachment {
  name: string;
  url: string;
  type: string;
}

interface MessageData {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  timestamp?: Date;
  created_at?: string;
  sources?: Source[];
  reasoning?: string[];
  files?: FileAttachment[];
  images?: string[];
  followUpQuestions?: string[];
  isFavorite?: boolean;
  is_favorite?: boolean;
  isPlaceholder?: boolean;
  isError?: boolean;
  canRetry?: boolean;
  errorMessage?: string;
  creditsUsed?: number;
  credits_used?: number;
  model_used?: string | null;
  conversation_id?: string;
  user_id?: string;
}

interface ChatMessageProps {
  message: MessageData;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
  onFollowUpClick?: (question: string) => void;
  isStreaming?: boolean;
  streamingContent?: string | null;
  researchState?: any;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely convert any value to a displayable string
 * NEVER throws, NEVER returns [object Object]
 */
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

/**
 * Clean [object Object] artifacts from text
 */
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

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '';
  }
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Sources Section
 */
function SourcesSection({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!sources || sources.length === 0) return null;

  const displaySources = expanded ? sources : sources.slice(0, 3);

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-400">Sources</h4>
        {sources.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-300"
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
            className="block p-2 rounded bg-gray-800 hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 font-mono">[{index + 1}]</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-blue-400 truncate">
                    {safeToString(source.title)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-gray-500 flex-shrink-0" />
                </div>
                {source.snippet && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
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

/**
 * Reasoning Section
 */
function ReasoningSection({ reasoning }: { reasoning: string[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!reasoning || reasoning.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-gray-300 mb-2"
      >
        {expanded ? 'Hide' : 'Show'} reasoning ({reasoning.length} steps)
        {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
      </Button>
      {expanded && (
        <div className="space-y-2 pl-4 border-l-2 border-gray-700">
          {reasoning.map((step, index) => (
            <div key={index} className="text-sm text-gray-400">
              <span className="text-gray-500 font-mono mr-2">{index + 1}.</span>
              {safeToString(step)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Files Section
 */
function FilesSection({ files }: { files: FileAttachment[] }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <h4 className="text-sm font-medium text-gray-400 mb-2">Files</h4>
      <div className="flex flex-wrap gap-2">
        {files.map((file, index) => (
          <a
            key={index}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded bg-gray-800 hover:bg-gray-750 transition-colors"
          >
            <FileText className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">{safeToString(file.name)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * Images Section
 */
function ImagesSection({ images }: { images: string[] }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <h4 className="text-sm font-medium text-gray-400 mb-2">Images</h4>
      <div className="grid grid-cols-2 gap-2">
        {images.map((url, index) => (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img
              src={url}
              alt={`Generated image ${index + 1}`}
              className="w-full h-auto"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * Follow-up Questions Section
 */
function FollowUpSection({ 
  questions, 
  onFollowUp 
}: { 
  questions: string[]; 
  onFollowUp?: (q: string) => void;
}) {
  if (!questions || questions.length === 0 || !onFollowUp) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <h4 className="text-sm font-medium text-gray-400 mb-2">Follow-up questions</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onFollowUp(question)}
            className="text-xs text-gray-300 border-gray-600 hover:bg-gray-800"
          >
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

export function ChatMessage({
  message,
  onToggleFavorite,
  onDelete,
  onRetry,
  onFollowUpClick,
  isStreaming,
  streamingContent,
  researchState,
}: ChatMessageProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Extract message properties with fallbacks
  const {
    id,
    role,
    content: rawContent,
    timestamp,
    created_at,
    sources,
    reasoning,
    files,
    images,
    followUpQuestions,
    isFavorite: isFav,
    is_favorite,
    isPlaceholder = false,
    isError = false,
    canRetry = false,
    errorMessage,
    creditsUsed,
    credits_used,
  } = message;

  const isFavorite = isFav || is_favorite || false;
  const actualCreditsUsed = creditsUsed || credits_used;
  const displayTimestamp = timestamp || (created_at ? new Date(created_at) : new Date());
  
  // Handle streaming content
  const content = isStreaming && streamingContent ? streamingContent : rawContent;

  // Clean content for display
  const displayContent = cleanArtifacts(safeToString(content));

  // Copy to clipboard
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

  // User message
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-blue-600 rounded-lg px-4 py-3">
          <p className="text-white whitespace-pre-wrap">{displayContent}</p>
          <div className="text-xs text-blue-200 mt-1 text-right">
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // Placeholder message (thinking...)
  if (isPlaceholder) {
    return (
      <div className="flex gap-3 mb-4">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/mcleuker-avatar.png" />
          <AvatarFallback className="bg-purple-600 text-white text-xs">ML</AvatarFallback>
        </Avatar>
        <div className="flex-1 bg-gray-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="animate-pulse flex gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-gray-400 text-sm">Thinking...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error message
  if (isError) {
    return (
      <div className="flex gap-3 mb-4">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src="/mcleuker-avatar.png" />
          <AvatarFallback className="bg-red-600 text-white text-xs">ML</AvatarFallback>
        </Avatar>
        <div className="flex-1 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-300">{displayContent}</p>
              {canRetry && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(id)}
                  className="mt-2 text-red-300 border-red-700 hover:bg-red-900/50"
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

  // Normal assistant message
  return (
    <div className="flex gap-3 mb-4">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src="/mcleuker-avatar.png" />
        <AvatarFallback className="bg-purple-600 text-white text-xs">ML</AvatarFallback>
      </Avatar>
      <div className="flex-1 bg-gray-800 rounded-lg px-4 py-3">
        {/* Main content */}
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* Sources */}
        <SourcesSection sources={sources || []} />

        {/* Reasoning */}
        <ReasoningSection reasoning={reasoning || []} />

        {/* Files */}
        <FilesSection files={files || []} />

        {/* Images */}
        <ImagesSection images={images || []} />

        {/* Follow-up questions */}
        <FollowUpSection questions={followUpQuestions || []} onFollowUp={onFollowUpClick} />

        {/* Footer with actions */}
        <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatTime(displayTimestamp)}</span>
            {actualCreditsUsed && (
              <span className="text-xs text-gray-500">• {actualCreditsUsed} credit{actualCreditsUsed !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-300"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFavorite(id)}
                className="h-7 w-7 p-0 text-gray-500 hover:text-gray-300"
              >
                {isFavorite ? (
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                ) : (
                  <StarOff className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
