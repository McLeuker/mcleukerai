import { Sector } from "@/contexts/SectorContext";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IntelligenceItem } from "@/hooks/useDomainIntelligence";

interface DomainInsightsProps {
  sector: Sector;
  items: IntelligenceItem[];
  isLoading: boolean;
  error?: string | null;
  source?: 'perplexity' | 'grok' | 'fallback' | null;
  onRefresh?: () => void;
}

export function DomainInsights({ 
  sector, 
  items, 
  isLoading, 
  error,
  source,
  onRefresh 
}: DomainInsightsProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const truncateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url.slice(0, 30) + '...';
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-10 md:py-14">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-foreground" />
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            What's Happening Now
          </h2>
          {source === 'fallback' && !isLoading && items.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60 ml-2">
              (curated summary)
            </span>
          )}
        </div>
        
        {onRefresh && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Refresh</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <article
              key={idx}
              className={cn(
                "group p-4 border border-border rounded-lg",
                "bg-card hover:bg-accent/30 transition-colors duration-200"
              )}
            >
              <h3 className="text-[15px] font-medium text-foreground leading-snug mb-2">
                {item.title}
              </h3>
              
              <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                {item.description}
              </p>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDate(item.date)}</span>
                <span className="text-muted-foreground/40">•</span>
                
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <span>{item.source || truncateUrl(item.sourceUrl)}</span>
                    <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </a>
                ) : (
                  <span>{item.source}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No recent updates found for {sector}. Check back soon!
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4">
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
