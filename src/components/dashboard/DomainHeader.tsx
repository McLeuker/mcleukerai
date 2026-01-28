import { useSector, Sector } from "@/contexts/SectorContext";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// Domain-specific gradient overlays (editorial black & white aesthetic)
const DOMAIN_GRADIENTS: Record<Sector, string> = {
  all: "from-background via-background/95 to-background/80",
  fashion: "from-background via-background/90 to-transparent",
  beauty: "from-background via-background/90 to-transparent",
  skincare: "from-background via-background/95 to-background/70",
  sustainability: "from-background via-background/90 to-transparent",
  "fashion-tech": "from-background via-background/90 to-transparent",
  catwalks: "from-background via-background/85 to-transparent",
  culture: "from-background via-background/90 to-transparent",
  textile: "from-background via-background/90 to-transparent",
  lifestyle: "from-background via-background/90 to-transparent",
};

// Placeholder image URLs - these would be replaced with actual editorial images
const DOMAIN_IMAGES: Record<Sector, string> = {
  all: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
  fashion: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1920&q=80",
  beauty: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1920&q=80",
  skincare: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1920&q=80",
  sustainability: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1920&q=80",
  "fashion-tech": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80",
  catwalks: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
  culture: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&q=80",
  textile: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80",
  lifestyle: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1920&q=80",
};

interface DomainHeaderProps {
  className?: string;
  showImage?: boolean;
}

export function DomainHeader({ className, showImage = true }: DomainHeaderProps) {
  const { currentSector, getSectorConfig } = useSector();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [prevSector, setPrevSector] = useState<Sector>(currentSector);
  
  const config = getSectorConfig();

  // Reset image loaded state on sector change for smooth transition
  useEffect(() => {
    if (currentSector !== prevSector) {
      setImageLoaded(false);
      setPrevSector(currentSector);
    }
  }, [currentSector, prevSector]);

  if (!showImage) {
    return (
      <div className={cn("px-6 py-4 border-b border-border", className)}>
        <h1 className="font-editorial text-2xl text-foreground tracking-tight">
          {config.label}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {config.tagline}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-32 sm:h-40 overflow-hidden", className)}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={DOMAIN_IMAGES[currentSector]}
          alt={`${config.label} visual`}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            imageLoaded ? "opacity-30" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
        />
        {/* Fallback gradient while loading */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-card to-accent animate-pulse" />
        )}
      </div>

      {/* Gradient Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r",
        DOMAIN_GRADIENTS[currentSector]
      )} />
      
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end px-6 pb-4">
        <h1 className="font-editorial text-3xl sm:text-4xl text-foreground tracking-tight">
          {config.label}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          {config.tagline}
        </p>
      </div>
    </div>
  );
}
