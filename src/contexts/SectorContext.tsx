import { createContext, useContext, useState, ReactNode } from "react";

export type Sector = 
  | "all"
  | "fashion"
  | "beauty"
  | "skincare"
  | "sustainability"
  | "fashion-tech"
  | "catwalks"
  | "culture";

interface SectorConfig {
  id: Sector;
  label: string;
  placeholder: string;
}

export const SECTORS: SectorConfig[] = [
  {
    id: "all",
    label: "All Domains",
    placeholder: "Describe your research task in natural language...",
  },
  {
    id: "fashion",
    label: "Fashion",
    placeholder: "Analyze SS26 womenswear trends from recent catwalks and export a PDF report.",
  },
  {
    id: "beauty",
    label: "Beauty",
    placeholder: "Research emerging clean beauty brands gaining market share in North America.",
  },
  {
    id: "skincare",
    label: "Skincare",
    placeholder: "Map skincare ingredient trends and regulatory changes in EU markets.",
  },
  {
    id: "sustainability",
    label: "Sustainability",
    placeholder: "Map sustainability claims and certifications for European fashion brands.",
  },
  {
    id: "fashion-tech",
    label: "Fashion Tech",
    placeholder: "Research AI adoption in fashion supply chains and generate an executive summary.",
  },
  {
    id: "catwalks",
    label: "Catwalks",
    placeholder: "Analyze color and silhouette trends from Paris Fashion Week FW25.",
  },
  {
    id: "culture",
    label: "Culture",
    placeholder: "Research cultural influences on luxury brand positioning in Asian markets.",
  },
];

interface SectorContextValue {
  currentSector: Sector;
  setSector: (sector: Sector) => void;
  getSectorConfig: () => SectorConfig;
}

const SectorContext = createContext<SectorContextValue | null>(null);

export function SectorProvider({ children }: { children: ReactNode }) {
  const [currentSector, setCurrentSector] = useState<Sector>("all");

  const getSectorConfig = () => {
    return SECTORS.find((s) => s.id === currentSector) || SECTORS[0];
  };

  return (
    <SectorContext.Provider
      value={{
        currentSector,
        setSector: setCurrentSector,
        getSectorConfig,
      }}
    >
      {children}
    </SectorContext.Provider>
  );
}

export function useSector() {
  const context = useContext(SectorContext);
  if (!context) {
    throw new Error("useSector must be used within a SectorProvider");
  }
  return context;
}
