import { useState } from "react";
import { Sector } from "@/contexts/SectorContext";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ExternalLink, AlertCircle, ChevronDown, ChevronUp, Signal, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IntelligenceItem } from "@/hooks/useDomainIntelligence";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface DomainInsightsProps {
  sector: Sector;
  items: IntelligenceItem[];
  isLoading: boolean;
  error?: string | null;
  source?: 'perplexity' | 'grok' | 'fallback' | null;
  seasonContext?: string | null;
  onRefresh?: () => void;
}

function extractSourceName(sourceStr: string, url?: string): string {
  // If source is already a clean name, use it
  if (sourceStr && !sourceStr.includes('http') && !sourceStr.includes('.com')) {
    return sourceStr;
  }

  if (!url) return sourceStr || 'Source';

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    const domainNames: Record<string, string> = {
      'vogue.com': 'Vogue',
      'wwd.com': 'WWD',
      'fashionunited.com': 'Fashion United',
      'fashionunited.uk': 'Fashion United',
      'whowhatwear.com': 'Who What Wear',
      'marieclaire.com': 'Marie Claire',
      'harpersbazaar.com': 'Harper\'s Bazaar',
      'elle.com': 'ELLE',
      'businessoffashion.com': 'BoF',
      'highsnobiety.com': 'Highsnobiety',
      'hypebeast.com': 'Hypebeast',
      'complex.com': 'Complex',
      'refinery29.com': 'Refinery29',
      'glamour.com': 'Glamour',
      'instyle.com': 'InStyle',
      'cosmopolitan.com': 'Cosmopolitan',
      'allure.com': 'Allure',
      'byrdie.com': 'Byrdie',
      'nylon.com': 'NYLON',
      'thecut.com': 'The Cut',
      'gq.com': 'GQ',
      'esquire.com': 'Esquire',
      'forbes.com': 'Forbes',
      'bloomberg.com': 'Bloomberg',
      'reuters.com': 'Reuters',
      'bbc.com': 'BBC',
      'theguardian.com': 'The Guardian',
      'nytimes.com': 'NY Times',
      'wsj.com': 'WSJ',
    };

    if (domainNames[hostname]) {
      return domainNames[hostname];
    }

    for (const [domain, name] of Object.entries(domainNames)) {
      if (hostname.includes(domain.split('.')[0])) {
        return name;
      }
    }

    return hostname
      .split('.')[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return sourceStr || 'Source';
  }
}

// Confidence level styling
function getConfidenceBadge(confidence: 'high' | 'medium' | 'low') {
  const styles = {
    high: 'bg-foreground/10 text-foreground border-foreground/20',
    medium: 'bg-muted text-muted-foreground border-muted-foreground/20',
    low: 'bg-muted/50 text-muted-foreground/70 border-muted-foreground/10',
  };
  return styles[confidence] || styles.medium;
}

// Data type indicator
function getDataTypeIcon(dataType: 'realtime' | 'curated' | 'predictive') {
  switch (dataType) {
    case 'realtime':
      return <Signal className="h-3 w-3" />;
    case 'predictive':
      return <TrendingUp className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
}

function getDataTypeLabel(dataType: 'realtime' | 'curated' | 'predictive') {
  switch (dataType) {
    case 'realtime':
      return 'Real-time';
    case 'predictive':
      return 'Predictive';
    default:
      return 'Curated';
  }
}

export function DomainInsights({ 
  sector, 
  items, 
  isLoading, 
  error,
  source,
  seasonContext,
  onRefresh 
}: DomainInsightsProps) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

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

  // Extract unique sources for compact display
  const uniqueSources = items.reduce((acc, item) => {
    const name = extractSourceName(item.source, item.sourceUrl);
    if (!acc.find(s => s.name === name)) {
      acc.push({
        name,
        title: item.title,
        description: item.description,
        url: item.sourceUrl || '',
      });
    }
    return acc;
  }, [] as { name: string; title: string; description: string; url: string }[]);

  // Compact source list text
  const compactSourceList = uniqueSources
    .slice(0, 5)
    .map((s, i) => `${i + 1}. ${s.name}`)
    .join(' ');

  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-10 md:py-14">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-foreground" />
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              What's Happening Now
            </h2>
            {source === 'perplexity' && !isLoading && items.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-foreground/20">
                <Signal className="h-2.5 w-2.5 mr-1" />
                Live
              </Badge>
            )}
            {source === 'fallback' && !isLoading && items.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground border-muted-foreground/20">
                <TrendingUp className="h-2.5 w-2.5 mr-1" />
                Predictive
              </Badge>
            )}
          </div>
          {seasonContext && !isLoading && (
            <p className="text-[11px] text-muted-foreground/60 ml-3">
              Season: {seasonContext}
            </p>
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
        <div className="space-y-4">
          {/* Intelligence Cards */}
          <div className="space-y-3">
            {items.map((item, idx) => (
              <article
                key={idx}
                className={cn(
                  "group p-4 border border-border rounded-lg",
                  "bg-card hover:bg-accent/30 transition-colors duration-200"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[15px] font-medium text-foreground leading-snug flex-1">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 flex items-center gap-1",
                        getConfidenceBadge(item.confidence)
                      )}
                    >
                      {getDataTypeIcon(item.dataType)}
                      {item.confidence.charAt(0).toUpperCase() + item.confidence.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                  {item.description}
                </p>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getDataTypeIcon(item.dataType)}
                    {getDataTypeLabel(item.dataType)}
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{formatDate(item.date)}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{extractSourceName(item.source, item.sourceUrl)}</span>
                  {item.category && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="capitalize">{item.category}</span>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Compact Sources Section */}
          {uniqueSources.length > 0 && (
            <Collapsible
              open={sourcesExpanded}
              onOpenChange={setSourcesExpanded}
              className="mt-6 pt-4 border-t border-border"
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between text-left py-1.5 group">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      Sources:
                    </span>
                    <span className="text-xs text-muted-foreground/80 truncate">
                      {uniqueSources.map(s => s.name).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2 shrink-0">
                    <span className="group-hover:text-foreground transition-colors">
                      {sourcesExpanded ? 'Less' : 'More'}
                    </span>
                    {sourcesExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="pt-2 pb-1 space-y-1.5">
                  {uniqueSources.map((src, index) => (
                    <a
                      key={`${src.url}-${index}`}
                      href={src.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "block rounded py-1.5 px-2 -mx-2 transition-colors",
                        src.url ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"
                      )}
                    >
                      {/* Source Name (Title) */}
                      <span className={cn(
                        "text-sm font-medium text-foreground",
                        src.url && "group-hover:underline"
                      )}>
                        {src.name}
                      </span>
                      
                      {/* Article Title (Subtitle) */}
                      {src.title && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {src.title}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
