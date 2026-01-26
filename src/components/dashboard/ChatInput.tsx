import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResearchModeToggle, ResearchMode } from "./ResearchModeToggle";
import { ModelSelector, GrokModel } from "./ModelSelector";

interface ChatInputProps {
  onSubmit: (message: string, mode: ResearchMode, model?: GrokModel) => void;
  isLoading: boolean;
  placeholder?: string;
  onCancel?: () => void;
}

export function ChatInput({
  onSubmit,
  isLoading,
  placeholder = "Ask McLeuker AI about fashion sourcing, trends, or market intelligence...",
  onCancel,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [researchMode, setResearchMode] = useState<ResearchMode>("quick");
  const [selectedModel, setSelectedModel] = useState<GrokModel>("grok-4-latest");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSubmit(message.trim(), researchMode, selectedModel);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Research Mode & Model Toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ResearchModeToggle
            mode={researchMode}
            onModeChange={setResearchMode}
            disabled={isLoading}
          />
          <div className="hidden sm:block h-4 w-px bg-border" />
          <ModelSelector
            model={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isLoading}
            compact
          />
        </div>
        {isLoading && onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      {/* Input Area */}
      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            researchMode === "deep"
              ? "Describe your research task in detail for comprehensive web search and analysis..."
              : placeholder
          }
          disabled={isLoading}
          className={cn(
            "min-h-[60px] max-h-[200px] pr-14 resize-none",
            "bg-background border-border",
            "focus:ring-1 focus:ring-foreground/20",
            "placeholder:text-muted-foreground/60"
          )}
          rows={2}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isLoading}
          className={cn(
            "absolute right-2 bottom-2 h-9 w-9",
            "transition-all duration-200",
            message.trim() && !isLoading
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Credit hint */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>
          {researchMode === "deep" ? "8-25 credits" : "4-18 credits"} • Press Enter to send
        </span>
        <span className="hidden sm:inline">Shift + Enter for new line</span>
      </div>
    </form>
  );
}
