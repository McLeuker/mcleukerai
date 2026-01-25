import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, FileText, Globe, Search, Star, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function getRelevanceBadge(score?: number) {
  if (!score) return null;
  if (score >= 0.9) return { label: "High", variant: "default" as const };
  if (score >= 0.7) return { label: "Medium", variant: "secondary" as const };
  return { label: "Low", variant: "outline" as const };
}

export function SourceCitations({ sources, className }: SourceCitationsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "search" | "scrape">("all");
  const [sortBy, setSortBy] = useState<"order" | "relevance">("order");

  if (!sources || sources.length === 0) {
    return null;
  }

  // Filter sources
  let filteredSources = filterType === "all" 
    ? sources 
    : sources.filter(s => s.type === filterType);

  // Sort sources
  if (sortBy === "relevance") {
    filteredSources = [...filteredSources].sort((a, b) => 
      (b.relevance_score || 0) - (a.relevance_score || 0)
    );
  }

  const searchCount = sources.filter(s => s.type === "search").length;
  const scrapeCount = sources.filter(s => s.type === "scrape" || s.type === "crawl").length;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("mt-4 border border-border rounded-lg bg-background", className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between px-4 py-3 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Sources & Citations</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {sources.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {searchCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                {searchCount}
              </Badge>
            )}
            {scrapeCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                {scrapeCount}
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {/* Filter Bar */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="search">Searches</SelectItem>
                <SelectItem value="scrape">Scraped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">By Order</SelectItem>
                <SelectItem value="relevance">By Relevance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border divide-y divide-border max-h-[300px] overflow-y-auto">
          {filteredSources.map((source, index) => {
            const Icon = getSourceIcon(source.type);
            const label = getSourceLabel(source.type);
            const relevance = getRelevanceBadge(source.relevance_score);
            const originalIndex = sources.indexOf(source);

            return (
              <div
                key={`${source.url}-${index}`}
                className="px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Citation number */}
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                    {originalIndex + 1}
                  </span>

                  {/* Source content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </span>
                      {relevance && (
                        <Badge variant={relevance.variant} className="text-[10px] h-5 px-1.5">
                          {relevance.label}
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-medium text-sm text-foreground line-clamp-1">
                      {source.title || "Untitled Source"}
                    </h4>

                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        <span className="truncate max-w-[250px]">{source.url}</span>
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

        {/* Footer with export hint */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          Citations are included in PDF and Excel exports
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
