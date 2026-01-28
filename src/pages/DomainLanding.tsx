import { useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSector, Sector, DOMAIN_STARTERS } from "@/contexts/SectorContext";
import { useDomainIntelligence } from "@/hooks/useDomainIntelligence";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { DomainHero } from "@/components/domain/DomainHero";
import { DomainInsights } from "@/components/domain/DomainInsights";
import { DomainModules } from "@/components/domain/DomainModules";
import { DomainAskBar } from "@/components/domain/DomainAskBar";
import { ScrollArea } from "@/components/ui/scroll-area";

// Map URL slugs to sector IDs
const slugToSector: Record<string, Sector> = {
  fashion: "fashion",
  beauty: "beauty",
  skincare: "skincare",
  sustainability: "sustainability",
  "fashion-tech": "fashion-tech",
  catwalks: "catwalks",
  culture: "culture",
  textile: "textile",
  lifestyle: "lifestyle",
};

const DomainLanding = () => {
  const { domain } = useParams<{ domain: string }>();
  const navigate = useNavigate();
  const { currentSector, setSector, getSectorConfig } = useSector();
  const { 
    items: intelligenceItems, 
    loading: intelligenceLoading, 
    error: intelligenceError,
    source: intelligenceSource,
    seasonContext: intelligenceSeasonContext,
    fetchIntelligence,
    refresh: refreshIntelligence,
  } = useDomainIntelligence();

  // Resolve sector from URL
  const resolvedSector = domain ? slugToSector[domain] : undefined;

  // Sync URL param to sector context
  useEffect(() => {
    if (resolvedSector && resolvedSector !== currentSector) {
      setSector(resolvedSector);
    } else if (!resolvedSector && domain) {
      // Invalid domain, redirect to dashboard
      navigate("/dashboard");
    }
  }, [resolvedSector, currentSector, setSector, domain, navigate]);

  // Fetch intelligence on mount/domain change
  useEffect(() => {
    if (resolvedSector) {
      fetchIntelligence(resolvedSector);
    }
  }, [resolvedSector, fetchIntelligence]);

  const sectorConfig = getSectorConfig();
  const starters = DOMAIN_STARTERS[currentSector] || [];

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (resolvedSector) {
      refreshIntelligence(resolvedSector);
    }
  }, [resolvedSector, refreshIntelligence]);

  // Handle module click - navigate to dashboard with pre-filled prompt
  const handleModuleClick = useCallback(
    (prompt: string) => {
      // Store prompt in sessionStorage to prefill in dashboard
      sessionStorage.setItem("domainPrompt", prompt);
      sessionStorage.setItem("domainContext", currentSector);
      navigate("/dashboard");
    },
    [currentSector, navigate]
  );

  // Handle ask AI submission
  const handleAskSubmit = useCallback(
    (query: string) => {
      sessionStorage.setItem("domainPrompt", query);
      sessionStorage.setItem("domainContext", currentSector);
      navigate("/dashboard");
    },
    [currentSector, navigate]
  );

  if (!resolvedSector) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavigation showSectorTabs={true} showCredits={true} />
      
      <div className="h-14 lg:h-[72px]" />

      <ScrollArea className="flex-1">
        <main className="pb-24">
          {/* Hero Section */}
          <DomainHero
            sector={currentSector}
            config={sectorConfig}
            snapshot={null}
            isLoading={false}
          />

          {/* What's Happening Now - Real-time Intelligence */}
          <DomainInsights
            sector={currentSector}
            items={intelligenceItems}
            isLoading={intelligenceLoading}
            error={intelligenceError}
            source={intelligenceSource}
            seasonContext={intelligenceSeasonContext}
            onRefresh={handleRefresh}
          />

          {/* Intelligence Modules */}
          <DomainModules
            sector={currentSector}
            onModuleClick={handleModuleClick}
          />
        </main>
      </ScrollArea>

      {/* Fixed Ask AI Bar */}
      <DomainAskBar
        sector={currentSector}
        placeholder={sectorConfig.placeholder}
        starters={starters}
        onSubmit={handleAskSubmit}
      />
    </div>
  );
};

export default DomainLanding;
