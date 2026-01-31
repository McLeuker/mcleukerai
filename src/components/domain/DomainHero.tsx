import { Sector } from "@/contexts/SectorContext";
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
}

// All domains use black gradient for editorial consistency
const domainGradients: Record<Sector, string> = {
  all: "from-black via-neutral-900 to-black",
  fashion: "from-black via-neutral-900 to-black",
  beauty: "from-black via-neutral-900 to-black",
  skincare: "from-black via-neutral-900 to-black",
  sustainability: "from-black via-neutral-900 to-black",
  "fashion-tech": "from-black via-neutral-900 to-black",
  catwalks: "from-black via-neutral-900 to-black",
  culture: "from-black via-neutral-900 to-black",
  textile: "from-black via-neutral-900 to-black",
  lifestyle: "from-black via-neutral-900 to-black",
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

export function DomainHero({ sector, config, snapshot, isLoading }: DomainHeroProps) {
  const gradient = domainGradients[sector] || domainGradients.all;
  const tagline = domainTaglines[sector] || config.tagline;

  return (
    <section
      className={cn(
        "relative w-full min-h-[320px] md:min-h-[420px] flex items-end",
        "bg-gradient-to-br",
        gradient
      )}
    >
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-8 pb-16 md:pb-24">
        <h1 className="font-editorial text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-white mb-4">
          {config.label}
        </h1>
        <p className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed">
          {tagline}
        </p>
      </div>

      {/* Bottom fade to background */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
