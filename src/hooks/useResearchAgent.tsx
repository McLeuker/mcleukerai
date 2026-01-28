import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { ResearchPhase } from "@/components/dashboard/ResearchProgress";
import type { Source } from "@/components/dashboard/SourceCitations";
import type { ModelId } from "@/components/dashboard/ModelSelector";
import { selectModelForQuery } from "@/components/dashboard/ModelSelector";

export interface ResearchState {
  isResearching: boolean;
  phase: ResearchPhase | null;
  currentStep: number;
  totalSteps: number;
  message: string;
  content: string;
  sources: Source[];
  creditsUsed: number;
  error: string | null;
  searchCount: number;
  scrapeCount: number;
  sourceCount: number;
  iteration: number;
  confidence: number;
  coverage: number;
  gaps: string[];
  contradictions: string[];
}

const initialState: ResearchState = {
  isResearching: false,
  phase: null,
  currentStep: 0,
  totalSteps: 0,
  message: "",
  content: "",
  sources: [],
  creditsUsed: 0,
  error: null,
  searchCount: 0,
  scrapeCount: 0,
  sourceCount: 0,
  iteration: 0,
  confidence: 0,
  coverage: 0,
  gaps: [],
  contradictions: [],
};

export function useResearchAgent() {
  const [state, setState] = useState<ResearchState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const startResearch = useCallback(async (
    query: string,
    conversationId?: string,
    model?: ModelId
  ): Promise<{ success: boolean; content: string; sources: Source[]; creditsUsed: number }> => {
    // Auto-select model based on query if "auto" is selected
    const resolvedModel = model ? selectModelForQuery(query, model) : "grok-4-latest";
    
    // Reset state
    setState({
      ...initialState,
      isResearching: true,
      phase: "planning",
      message: "Starting research...",
    });

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Please log in to continue");
      }

      abortControllerRef.current = new AbortController();

      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-agent`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          query,
          conversationId,
          model: resolvedModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage = "Research failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Request failed: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let finalSources: Source[] = [];
      let finalCreditsUsed = 0;

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const eventData = line.slice(6).trim();
                if (eventData === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(eventData);

                  // Handle different event types
                  if (parsed.phase) {
                    setState(prev => ({
                      ...prev,
                      phase: parsed.phase as ResearchPhase,
                      message: parsed.message || prev.message,
                      currentStep: parsed.step || prev.currentStep,
                      totalSteps: parsed.total || prev.totalSteps,
                      creditsUsed: parsed.creditsUsed || prev.creditsUsed,
                      searchCount: parsed.searchCount ?? prev.searchCount,
                      scrapeCount: parsed.scrapeCount ?? prev.scrapeCount,
                      sourceCount: parsed.sourceCount ?? prev.sourceCount,
                      iteration: parsed.iteration ?? prev.iteration,
                      confidence: parsed.confidence ?? prev.confidence,
                      coverage: parsed.coverage ?? prev.coverage,
                      gaps: parsed.gaps ?? prev.gaps,
                      contradictions: parsed.contradictions ?? prev.contradictions,
                    }));
                  }

                  // Handle streaming content
                  if (parsed.content) {
                    fullContent += parsed.content;
                    setState(prev => ({
                      ...prev,
                      content: fullContent,
                    }));
                  }

                  // Handle completion
                  if (parsed.sources) {
                    finalSources = parsed.sources;
                    setState(prev => ({
                      ...prev,
                      sources: parsed.sources,
                    }));
                  }

                  if (parsed.creditsUsed) {
                    finalCreditsUsed = parsed.creditsUsed;
                    setState(prev => ({
                      ...prev,
                      creditsUsed: parsed.creditsUsed,
                    }));
                  }

                  // Handle errors
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch (parseError) {
                  if (parseError instanceof SyntaxError) continue;
                  throw parseError;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Mark as completed
      setState(prev => ({
        ...prev,
        isResearching: false,
        phase: "completed",
        message: "Research complete",
      }));

      return {
        success: true,
        content: fullContent,
        sources: finalSources,
        creditsUsed: finalCreditsUsed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Research failed";
      
      if ((error as Error).name === "AbortError") {
        setState(prev => ({
          ...prev,
          isResearching: false,
          phase: null,
        }));
        return { success: false, content: "", sources: [], creditsUsed: 0 };
      }

      setState(prev => ({
        ...prev,
        isResearching: false,
        phase: "failed",
        error: errorMessage,
        message: errorMessage,
      }));

      toast({
        title: "Research Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return { success: false, content: "", sources: [], creditsUsed: 0 };
    } finally {
      abortControllerRef.current = null;
    }
  }, [toast]);

  const cancelResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isResearching: false,
      phase: null,
    }));
  }, []);

  return {
    ...state,
    startResearch,
    cancelResearch,
    reset,
  };
}
