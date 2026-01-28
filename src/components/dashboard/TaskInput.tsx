import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  placeholder?: string;
  className?: string;
}

export function TaskInput({ onSubmit, isLoading, placeholder, className }: TaskInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
      setPrompt("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className={cn(
        "relative rounded-xl border bg-card transition-all duration-300",
        isFocused 
          ? "border-foreground/20 shadow-subtle" 
          : "border-border shadow-sm",
      )}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || "Describe your fashion research task..."}
          disabled={isLoading}
          className={cn(
            "w-full px-4 py-3.5 pr-14 bg-transparent text-foreground",
            "placeholder:text-muted-foreground/60 focus:outline-none",
            "resize-none text-sm min-h-[56px] max-h-36 rounded-xl"
          )}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 144) + "px";
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!prompt.trim() || isLoading}
          className={cn(
            "absolute right-2 bottom-2.5 h-9 w-9 rounded-lg transition-all duration-200",
            prompt.trim() && !isLoading && "shadow-sm"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[10px] text-muted-foreground">
          Press Enter to run • Shift+Enter for new line
        </p>
      </div>
    </form>
  );
}
