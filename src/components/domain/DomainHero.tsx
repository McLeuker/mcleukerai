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
  all: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80",
  // Luxury shopping street - Bond Street aesthetic
  fashion: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=1920&q=80",
  // Golden luxury beauty products - Guerlain aesthetic
  beauty: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1920&q=80",
  // K-beauty minimal clean aesthetic
  skincare: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1920&q=80",
  // Raw cotton/linen fibers close-up
  sustainability: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
  // Futuristic digital holographic - Virtual AI
  "fashion-tech": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1920&q=80",
  // Haute couture Paris runway
  catwalks: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
  // Fashion museum gallery - Palais Galliera aesthetic
  culture: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1920&q=80",
  // Embroidery dress detail close-up
  textile: "https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=1920&q=80",
  // Influencer lifestyle - matcha outfit check aesthetic
  lifestyle: "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=1920&q=80",
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
        <h1 className="font-editorial text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-black mb-4 text-center">
          {config.label}
        </h1>
        <p className="text-lg md:text-xl text-black/70 max-w-2xl leading-relaxed mb-12 md:mb-16 text-center mx-auto">
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
                  "bg-gray-200/90 border-gray-300 text-black placeholder:text-black/50",
                  "focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0",
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
                      "border border-black/30 text-black/80",
                      "hover:bg-black hover:text-white hover:border-black",
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
