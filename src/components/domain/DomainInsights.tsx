import { Sector } from "@/contexts/SectorContext";
import { Skeleton } from "@/components/ui/skeleton";

interface DomainInsightsProps {
  sector: Sector;
  snapshot: string | null;
  isLoading: boolean;
}

export function DomainInsights({ sector, snapshot, isLoading }: DomainInsightsProps) {
  // Parse snapshot into bullet points
  const parseBullets = (text: string | null): string[] => {
    if (!text) return [];
    
    // Split by newlines and filter bullet-style lines
    const lines = text.split("\n").filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith("•") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("*") ||
        /^\d+\./.test(trimmed)
      );
    });

    // Clean up bullets
    return lines
      .map((line) =>
        line
          .replace(/^[\s•\-\*]+/, "")
          .replace(/^\d+\.\s*/, "")
          .trim()
      )
      .filter((line) => line.length > 0)
      .slice(0, 6);
  };

  const bullets = parseBullets(snapshot);

  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-10 md:py-14">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-1 rounded-full bg-foreground" />
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          What's Happening Now
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5 w-full max-w-xl" />
          ))}
        </div>
      ) : bullets.length > 0 ? (
        <ul className="space-y-3">
          {bullets.map((bullet, idx) => (
            <li
              key={idx}
              className="text-[15px] text-foreground/80 leading-relaxed flex items-start gap-3"
            >
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Loading intelligence for {sector}...
        </p>
      )}
    </section>
  );
}
