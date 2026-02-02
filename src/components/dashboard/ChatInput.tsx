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

      {/* Input Area - Premium Graphite */}
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
            // Premium graphite styling
            "rounded-[20px]",
            "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
            "border border-white/[0.10]",
            "text-white/[0.88]",
            "placeholder:text-white/40",
            "shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
            // Focus state
            "focus:border-white/[0.18]",
            "focus:ring-[3px] focus:ring-white/[0.06]",
            // Transitions
            "transition-all duration-160"
          )}
          rows={2}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isLoading}
          className={cn(
            "absolute right-3 bottom-3 h-9 w-9 rounded-full",
            "transition-all duration-160",
            message.trim() && !isLoading
              ? "bg-white text-black hover:bg-white/90"
              : "bg-white/[0.08] text-white/40"
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
