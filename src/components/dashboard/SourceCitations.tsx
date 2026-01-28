import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface Source {
  url: string;
  title: string;
  snippet?: string;
  type: "search" | "scrape" | "crawl";
  relevance_score?: number;
}

interface SourceCitationsProps {
  sources: Source[];
  className?: string;
}

function extractSourceName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Map common domains to readable names
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

    // Check for exact match
    if (domainNames[hostname]) {
      return domainNames[hostname];
    }

    // Check for partial match
    for (const [domain, name] of Object.entries(domainNames)) {
      if (hostname.includes(domain.split('.')[0])) {
        return name;
      }
    }

    // Capitalize first letter of each word in hostname
    return hostname
      .split('.')[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return 'Source';
  }
}

export function SourceCitations({ sources, className }: SourceCitationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  // Create unique sources list with names
  const uniqueSources = sources.reduce((acc, source) => {
    const name = extractSourceName(source.url);
    if (!acc.find(s => s.name === name)) {
      acc.push({ ...source, name });
    }
    return acc;
  }, [] as (Source & { name: string })[]);

  // Compact one-line view: just source names
  const sourceNames = uniqueSources.map(s => s.name).join(', ');

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className={cn("mt-3", className)}
    >
      {/* Compact View - Source names only in one line */}
      <CollapsibleTrigger asChild>
        <button
          className="w-full flex items-center justify-between text-left py-1.5 group"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              Sources:
            </span>
            <span className="text-xs text-muted-foreground/80 truncate">
              {sourceNames}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2 shrink-0">
            <span className="group-hover:text-foreground transition-colors">
              {isExpanded ? 'Less' : 'More'}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      {/* Expanded View - Title + Subtitle, clickable */}
      <CollapsibleContent>
        <div className="pt-2 pb-1 border-t border-border/50 space-y-1.5">
          {uniqueSources.map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group/item hover:bg-muted/40 rounded py-1.5 px-2 -mx-2 transition-colors cursor-pointer"
            >
              {/* Source Name (Title) */}
              <span className="text-sm font-medium text-foreground group-hover/item:underline">
                {source.name}
              </span>
              
              {/* Article Title (Subtitle) */}
              {source.title && source.title !== source.name && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {source.title}
                </p>
              )}
            </a>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
