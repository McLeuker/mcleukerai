import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ReasoningDisplayProps {
  reasoning: string;
  defaultOpen?: boolean;
}

export function ReasoningDisplay({ reasoning, defaultOpen = false }: ReasoningDisplayProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!reasoning) return null;

  // Split reasoning into lines for better display
  const lines = reasoning.split('\n').filter(line => line.trim());

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-4 rounded-xl border border-border/50 bg-muted/20 overflow-hidden"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            {!isOpen && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-foreground/60 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground">
            {isOpen ? "Thought process" : "Thinking..."}
          </span>
          {!isOpen && (
            <span className="text-xs text-muted-foreground">
              Click to expand
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <span className="text-xs text-muted-foreground">
              {lines.length} step{lines.length !== 1 ? 's' : ''}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/30 bg-muted/10">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "text-sm text-muted-foreground pl-3 border-l-2 border-muted-foreground/30",
                line.startsWith('-') || line.startsWith('•') 
                  ? "ml-2" 
                  : ""
              )}
            >
              {line}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
