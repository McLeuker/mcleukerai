import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResearchModeToggle, ResearchMode } from "./ResearchModeToggle";
import { ModelSelector, ModelId } from "./ModelSelector";

interface ChatInputProps {
  onSubmit: (message: string, mode: ResearchMode, model?: ModelId) => void;
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
  const [selectedModel, setSelectedModel] = useState<ModelId>("auto");

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

  // Get credit range based on selected model and mode
  const getCreditHint = () => {
    if (researchMode === "deep") {
      return "8-25 credits";
    }
    if (selectedModel === "gpt-4.1") {
      return "6-18 credits";
    }
    return "4-12 credits";
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Research Mode & Model Toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap w-full">
        <div className="flex items-center gap-2 flex-wrap">
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
        <div className="flex items-center gap-2">
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
            "min-h-[60px] max-h-[200px] pr-14 resize-none rounded-2xl",
            "bg-zinc-800 border border-white/10 text-white",
            "focus:ring-1 focus:ring-white/20 focus:border-white/20",
            "placeholder:text-white/50",
            "shadow-lg"
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
              ? "bg-white text-black hover:bg-white/90"
              : "bg-white/10 text-white/40"
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
      <div className="flex items-center justify-between text-[11px] text-white/50 px-1">
        <span>
          {getCreditHint()} • Press Enter to send
        </span>
        <span className="hidden sm:inline">Shift + Enter for new line</span>
      </div>
    </form>
  );
}
