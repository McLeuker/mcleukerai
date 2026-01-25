import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, FileText, Globe, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

interface SourceCitationsProps {
  sources: Source[];
  className?: string;
}

function getSourceIcon(type: Source["type"]) {
  switch (type) {
    case "search":
      return Search;
    case "scrape":
    case "crawl":
      return Globe;
    default:
      return FileText;
  }
}

function getSourceLabel(type: Source["type"]) {
  switch (type) {
    case "search":
      return "Web Search";
    case "scrape":
      return "Scraped Page";
    case "crawl":
      return "Crawled Site";
    default:
      return "Source";
  }
}

export function SourceCitations({ sources, className }: SourceCitationsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("mt-4 border border-border rounded-lg", className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between px-4 py-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Sources</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {sources.length}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border divide-y divide-border">
          {sources.map((source, index) => {
            const Icon = getSourceIcon(source.type);
            const label = getSourceLabel(source.type);

            return (
              <div
                key={`${source.url}-${index}`}
                className="px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Citation number */}
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>

                  {/* Source content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>

                    <h4 className="font-medium text-sm text-foreground truncate">
                      {source.title || "Untitled Source"}
                    </h4>

                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 truncate"
                      >
                        <span className="truncate">{source.url}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    )}

                    {source.snippet && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {source.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
