import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, X, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResearchModeToggle, ResearchMode } from "./ResearchModeToggle";
import { ModelSelector, ModelId, isManusModel } from "./ModelSelector";

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
  const [selectedModel, setSelectedModel] = useState<ModelId>("grok-4-latest");

  const isAgentMode = isManusModel(selectedModel);

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

  // Get credit range based on selected model
  const getCreditHint = () => {
    if (isAgentMode) {
      return selectedModel === "manus-1-5" ? "15-40 credits" : "8-25 credits";
    }
    if (researchMode === "deep") {
      return "8-25 credits";
    }
    return "4-18 credits";
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
            showAgentModels
          />
        </div>
        <div className="flex items-center gap-2">
          {isAgentMode && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Bot className="h-3 w-3" />
              Agent Mode
            </Badge>
          )}
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
            isAgentMode
              ? "Describe your research task for the AI agent (may take 5-30 minutes)..."
              : researchMode === "deep"
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
          {getCreditHint()} • Press Enter to send
          {isAgentMode && " • May take 5-30 min"}
        </span>
        <span className="hidden sm:inline">Shift + Enter for new line</span>
      </div>
    </form>
  );
}
