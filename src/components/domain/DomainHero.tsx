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

// Domain-specific hero images (using gradient overlays for now)
const domainGradients: Record<Sector, string> = {
  all: "from-neutral-900 via-neutral-800 to-neutral-900",
  fashion: "from-black via-zinc-900 to-black",
  beauty: "from-rose-950 via-neutral-900 to-black",
  skincare: "from-slate-900 via-neutral-900 to-black",
  sustainability: "from-emerald-950 via-neutral-900 to-black",
  "fashion-tech": "from-violet-950 via-neutral-900 to-black",
  catwalks: "from-amber-950 via-neutral-900 to-black",
  culture: "from-indigo-950 via-neutral-900 to-black",
  textile: "from-stone-900 via-neutral-900 to-black",
  lifestyle: "from-teal-950 via-neutral-900 to-black",
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
        "relative w-full min-h-[280px] md:min-h-[360px] flex items-end",
        "bg-gradient-to-br",
        gradient
      )}
    >
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-10 md:pb-14">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-3">
          {config.label}
        </h1>
        <p className="text-base md:text-lg text-white/70 max-w-2xl">
          {tagline}
        </p>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
