import { useState, useCallback } from "react";
import { mcLeukerAPI } from "@/lib/mcLeukerAPI";

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface SearchResponse {
  query: string;
  summary: string;
  results: SearchResult[];
}

interface QuickAnswerResponse {
  answer: string;
  sources?: SearchResult[];
}

interface UseMcLeukerSearchReturn {
  isSearching: boolean;
  results: SearchResponse | null;
  quickAnswerResult: QuickAnswerResponse | null;
  error: string | null;
  search: (query: string) => Promise<SearchResponse | null>;
  quickAnswer: (question: string) => Promise<QuickAnswerResponse | null>;
  clearResults: () => void;
  clearError: () => void;
}

export function useMcLeukerSearch(): UseMcLeukerSearchReturn {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [quickAnswerResult, setQuickAnswerResult] = useState<QuickAnswerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<SearchResponse | null> => {
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      // Use chat API for search functionality
      const chatResponse = await mcLeukerAPI.chat(query, "quick", "general");
      const response: SearchResponse = {
        query,
        summary: chatResponse.response || "",
        results: (chatResponse.sources || []).map(s => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet
        })),
      };
      setResults(response);
      return response;
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
      const chatResponse = await mcLeukerAPI.chat(question, "quick", "general");
      const answer: QuickAnswerResponse = {
        answer: chatResponse.response || "",
        sources: (chatResponse.sources || []).map(s => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet
        })),
      };
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
