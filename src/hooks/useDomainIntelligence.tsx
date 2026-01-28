import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sector } from "@/contexts/SectorContext";

export interface IntelligenceItem {
  title: string;
  description: string;
  date: string;
  source: string;
  sourceUrl?: string | null;
}

export interface IntelligenceState {
  loading: boolean;
  items: IntelligenceItem[];
  error: string | null;
  source: 'perplexity' | 'grok' | 'fallback' | null;
  lastFetched: Sector | null;
  generatedAt: string | null;
}

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache

export function useDomainIntelligence() {
  const [state, setState] = useState<IntelligenceState>({
    loading: false,
    items: [],
    error: null,
    source: null,
    lastFetched: null,
    generatedAt: null,
  });
  
  const cacheRef = useRef<Map<string, { data: IntelligenceState; timestamp: number }>>(new Map());

  const fetchIntelligence = useCallback(async (sector: Sector, forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = cacheRef.current.get(sector);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        setState(cached.data);
        return cached.data.items;
      }
    }

    // Skip if already fetched for this sector and not forcing refresh
    if (!forceRefresh && state.lastFetched === sector && state.items.length > 0) {
      return state.items;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('domain-intelligence', {
        body: { domain: sector },
      });

      if (error) {
        console.error('Domain intelligence error:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Unable to load intelligence. Please try again.',
        }));
        return [];
      }

      const newState: IntelligenceState = {
        loading: false,
        items: data.items || [],
        error: data.error || null,
        source: data.source || null,
        lastFetched: sector,
        generatedAt: data.generatedAt || new Date().toISOString(),
      };

      setState(newState);
      
      // Update cache
      cacheRef.current.set(sector, { data: newState, timestamp: Date.now() });
      
      return data.items || [];
    } catch (error) {
      console.error('Intelligence fetch error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch intelligence',
      }));
      return [];
    }
  }, [state.lastFetched, state.items.length]);

  const clearIntelligence = useCallback(() => {
    setState({
      loading: false,
      items: [],
      error: null,
      source: null,
      lastFetched: null,
      generatedAt: null,
    });
  }, []);

  const refresh = useCallback(async (sector: Sector) => {
    return fetchIntelligence(sector, true);
  }, [fetchIntelligence]);

  return {
    ...state,
    fetchIntelligence,
    clearIntelligence,
    refresh,
  };
}
