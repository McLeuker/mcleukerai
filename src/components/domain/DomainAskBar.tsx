import { useState, useRef, useEffect } from "react";
import { Sector } from "@/contexts/SectorContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DomainAskBarProps {
  sector: Sector;
  placeholder: string;
  starters: string[];
  onSubmit: (query: string) => void;
}

export function DomainAskBar({
  sector,
  placeholder,
  starters,
  onSubmit,
}: DomainAskBarProps) {
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!query.trim()) return;
    onSubmit(query.trim());
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStarterClick = (starter: string) => {
    onSubmit(starter);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [query]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      {/* Starter suggestions */}
      {starters.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Suggested
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {starters.slice(0, 4).map((starter, idx) => (
              <button
                key={idx}
                onClick={() => handleStarterClick(starter)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border border-border",
                  "bg-card hover:bg-accent text-foreground/80 hover:text-foreground",
                  "transition-all duration-150"
                )}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none pr-12",
              "bg-card border-border focus:border-foreground/30",
              "text-sm placeholder:text-muted-foreground"
            )}
            rows={1}
          />
          <Button
            onClick={handleSubmit}
            disabled={!query.trim()}
            size="icon"
            className={cn(
              "absolute right-2 bottom-2 h-8 w-8",
              "bg-foreground text-background hover:bg-foreground/90",
              "disabled:opacity-40"
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
