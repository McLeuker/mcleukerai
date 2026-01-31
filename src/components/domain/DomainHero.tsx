import { useState, useRef, useEffect } from "react";
import { Sector } from "@/contexts/SectorContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectorConfig {
  id: Sector;
  label: string;
  placeholder: string;
  tagline: string;
  imageDirection: string;
}

interface DomainHeroProps {
  sector: Sector;
  config: SectorConfig;
  snapshot: string | null;
  isLoading: boolean;
  placeholder?: string;
  starters?: string[];
  onSubmit?: (query: string) => void;
}

// Royalty-free Unsplash images per sector
const sectorImages: Record<Sector, string> = {
  all: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80",
  fashion: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
  beauty: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&q=80",
  skincare: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1920&q=80",
  sustainability: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1920&q=80",
  "fashion-tech": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80",
  catwalks: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1920&q=80",
  culture: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1920&q=80",
  textile: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
  lifestyle: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1920&q=80",
};

// One-liner real-time insights per domain
const domainTaglines: Record<Sector, string> = {
  all: "Cross-domain intelligence for fashion professionals",
  fashion: "Runway signals, silhouettes & street style intelligence",
  beauty: "Backstage beauty, formulations & brand intelligence",
  skincare: "Clinical aesthetics, ingredients & regulatory insights",
  sustainability: "Circularity, materials & supply chain transparency",
  "fashion-tech": "Digital innovation, AI & future technologies",
  catwalks: "Live runway coverage, backstage energy & designer analysis",
  culture: "Art, exhibitions & social signals shaping fashion",
  textile: "Fibers, mills, material innovation & sourcing",
  lifestyle: "Consumer culture, wellness & lifestyle signals",
};

export function DomainHero({ 
  sector, 
  config, 
  snapshot, 
  isLoading,
  placeholder = "Ask anything...",
  starters = [],
  onSubmit,
}: DomainHeroProps) {
  const tagline = domainTaglines[sector] || config.tagline;
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!query.trim() || !onSubmit) return;
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
    if (onSubmit) {
      onSubmit(starter);
    }
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
    <section className="relative w-full overflow-hidden">
      {/* Background Image - 80% opacity */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{ backgroundImage: `url(${sectorImages[sector]})` }}
      />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-8 pt-16 md:pt-24 pb-20 md:pb-28">
        {/* Title and tagline */}
        <h1 className="font-editorial text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-white mb-4 text-center">
          {config.label}
        </h1>
        <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed mb-12 md:mb-16 text-center mx-auto">
          {tagline}
        </p>

        {/* Integrated Search Bar */}
        {onSubmit && (
          <div className="max-w-2xl mx-auto">
            {/* Input area */}
            <div className="relative flex items-end gap-3 mb-6">
              <Textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn(
                  "min-h-[56px] max-h-[120px] resize-none pr-14",
                  "bg-white/10 border-white/20 text-white placeholder:text-white/50",
                  "focus:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0",
                  "text-[15px] rounded-xl"
                )}
                rows={1}
              />
              <Button
                onClick={handleSubmit}
                disabled={!query.trim()}
                size="icon"
                className={cn(
                  "absolute right-3 bottom-3 h-10 w-10 rounded-lg",
                  "bg-white text-black hover:bg-white/90",
                  "disabled:opacity-40 disabled:bg-white/50"
                )}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggestion chips */}
            {starters.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {starters.slice(0, 4).map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStarterClick(starter)}
                    className={cn(
                      "text-[13px] px-4 py-2 rounded-full",
                      "border border-white/30 text-white/80",
                      "hover:bg-white hover:text-black hover:border-white",
                      "transition-all duration-150"
                    )}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </section>
  );
}
