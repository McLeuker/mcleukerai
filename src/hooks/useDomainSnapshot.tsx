import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSector, Sector } from "@/contexts/SectorContext";

interface SnapshotState {
  loading: boolean;
  content: string | null;
  error: string | null;
  lastFetched: Sector | null;
}

export function useDomainSnapshot() {
  const { currentSector, getSectorConfig } = useSector();
  const [state, setState] = useState<SnapshotState>({
    loading: false,
    content: null,
    error: null,
    lastFetched: null,
  });

  const fetchSnapshot = useCallback(async (sector?: Sector) => {
    const targetSector = sector || currentSector;
    const config = getSectorConfig();
    
    // Skip if already fetched for this sector
    if (state.lastFetched === targetSector && state.content) {
      return state.content;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(prev => ({ ...prev, loading: false, error: "Not authenticated" }));
        return null;
      }

      const snapshotPrompt = `Give me a concise snapshot of what's happening right now in ${config.label}.

Focus on:
- Top 3 trending signals this week
- Key developments or shifts
- Notable brands, designers, or innovations making news

Keep it readable, inspiring, and under 200 words. Use bullet points for clarity.
DO NOT include sources or citations - this is a quick overview.`;

      const response = await supabase.functions.invoke("fashion-ai", {
        body: {
          prompt: snapshotPrompt,
          domain: targetSector,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch snapshot");
      }

      // Handle SSE response - collect all content
      const reader = response.data?.getReader?.();
      if (reader) {
        let content = "";
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  content += parsed.content;
                }
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }

        setState({
          loading: false,
          content,
          error: null,
          lastFetched: targetSector,
        });
        return content;
      }

      setState(prev => ({ ...prev, loading: false, error: "Invalid response format" }));
      return null;
    } catch (error) {
      console.error("Snapshot error:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch snapshot",
      }));
      return null;
    }
  }, [currentSector, getSectorConfig, state.lastFetched, state.content]);

  const clearSnapshot = useCallback(() => {
    setState({
      loading: false,
      content: null,
      error: null,
      lastFetched: null,
    });
  }, []);

  return {
    ...state,
    fetchSnapshot,
    clearSnapshot,
  };
}
