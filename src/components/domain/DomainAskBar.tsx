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
      {/* AI Interface Card Wrapper */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <div className="border border-border rounded-2xl bg-card p-6 md:p-8">
          {/* Starter suggestions */}
          {starters.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Suggested
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {starters.slice(0, 4).map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStarterClick(starter)}
                    className={cn(
                      "text-[13px] px-4 py-2 rounded-full border border-border",
                      "bg-background text-foreground/80",
                      "hover:bg-foreground hover:text-background hover:border-foreground",
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
          <div className="relative flex items-end gap-3">
            <Textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "min-h-[48px] max-h-[120px] resize-none pr-14",
                "bg-background border-border focus:border-foreground/30",
                "text-[15px] placeholder:text-muted-foreground rounded-xl"
              )}
              rows={1}
            />
            <Button
              onClick={handleSubmit}
              disabled={!query.trim()}
              size="icon"
              className={cn(
                "absolute right-3 bottom-3 h-9 w-9 rounded-lg",
                "bg-foreground text-background hover:bg-foreground/90",
                "disabled:opacity-40"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
