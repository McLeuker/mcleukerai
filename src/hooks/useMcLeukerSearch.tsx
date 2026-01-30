import { useState, useCallback } from "react";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";
import type { AISearchResponse, QuickAnswerResponse, SearchOptions } from "@/types/mcLeuker";

interface UseMcLeukerSearchReturn {
  isSearching: boolean;
  results: AISearchResponse | null;
  quickAnswerResult: QuickAnswerResponse | null;
  error: string | null;
  search: (query: string, options?: SearchOptions) => Promise<AISearchResponse | null>;
  quickAnswer: (question: string) => Promise<QuickAnswerResponse | null>;
  clearResults: () => void;
  clearError: () => void;
}

export function useMcLeukerSearch(): UseMcLeukerSearchReturn {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AISearchResponse | null>(null);
  const [quickAnswerResult, setQuickAnswerResult] = useState<QuickAnswerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, options?: SearchOptions): Promise<AISearchResponse | null> => {
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const searchResults = await mcLeukerAPI.search(query, options);
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const quickAnswer = useCallback(async (question: string): Promise<QuickAnswerResponse | null> => {
    setIsSearching(true);
    setError(null);
    setQuickAnswerResult(null);

    try {
      const answer = await mcLeukerAPI.quickAnswer(question);
      setQuickAnswerResult(answer);
      return answer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Quick answer failed";
      setError(errorMessage);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setQuickAnswerResult(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSearching,
    results,
    quickAnswerResult,
    error,
    search,
    quickAnswer,
    clearResults,
    clearError,
  };
}
