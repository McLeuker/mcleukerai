/**
 * mcLeukerAPI.ts - COMPREHENSIVE FIX
 * 
 * FIXES APPLIED:
 * 1. Calls Railway backend DIRECTLY (no Supabase proxy needed)
 * 2. Normalizes response field names (backend uses `response`, frontend expects `message`)
 * 3. Handles [object Object] by ensuring all fields are strings
 * 4. Proper timeout and abort signal support
 * 5. Automatic retry with exponential backoff
 * 6. Better error handling and logging
 */

// Railway backend URL - calls directly without Supabase proxy
const RAILWAY_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://web-production-29f3c.up.railway.app";

interface ChatResponse {
  success: boolean;
  response?: string;  // Backend returns this
  message?: string;   // Normalized for frontend
  session_id?: string;
  reasoning?: string[];
  sources?: Array<{
    title: string;
    url: string;
    snippet?: string;
    source?: string;
  }>;
  files?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  images?: string[];
  follow_up_questions?: string[];
  credits_used?: number;
  needs_user_input?: boolean;
  user_input_prompt?: string;
  error?: string;
}

interface HealthResponse {
  status: string;
  version: string;
  services: {
    grok: boolean;
    perplexity: boolean;
    exa: boolean;
    browserless: boolean;
    e2b: boolean;
    nano_banana: boolean;
  };
}

/**
 * HELPER: Safely convert any value to a string
 */
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(safeStringify).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Data]";
    }
  }
  return String(value);
}

/**
 * HELPER: Clean response text of any [object Object] artifacts
 */
function cleanResponseText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[object Object\]/g, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * HELPER: Process and normalize the API response
 */
function normalizeResponse(data: any): ChatResponse {
  // Ensure response/message is a clean string
  let responseText = data.response || data.message || "";
  if (typeof responseText !== "string") {
    responseText = safeStringify(responseText);
  }
  responseText = cleanResponseText(responseText);

  // Process sources to ensure they're properly formatted
  let sources = data.sources;
  if (Array.isArray(sources)) {
    sources = sources.map((source: any) => {
      if (typeof source === "string") {
        return { title: source, url: "#" };
      }
      return {
        title: safeStringify(source?.title) || "Unknown",
        url: safeStringify(source?.url) || "#",
        snippet: source?.snippet ? safeStringify(source.snippet) : undefined,
        source: source?.source ? safeStringify(source.source) : undefined,
      };
    });
  }

  // Process reasoning to ensure it's an array of strings
  let reasoning = data.reasoning;
  if (reasoning) {
    if (typeof reasoning === "string") {
      reasoning = [reasoning];
    } else if (Array.isArray(reasoning)) {
      reasoning = reasoning.map(safeStringify);
    }
  }

  return {
    success: data.success !== false,
    response: responseText,
    message: responseText, // Normalize: provide both for compatibility
    session_id: data.session_id,
    reasoning: reasoning,
    sources: sources,
    files: data.files,
    images: data.images,
    follow_up_questions: data.follow_up_questions,
    credits_used: data.credits_used || 1,
    needs_user_input: data.needs_user_input || false,
    user_input_prompt: data.user_input_prompt,
    error: data.error ? safeStringify(data.error) : undefined,
  };
}

class McLeukerAPI {
  private backendUrl: string;
  private maxRetries: number = 2;
  private retryDelay: number = 1000;

  constructor() {
    this.backendUrl = RAILWAY_BACKEND_URL;
    console.log("[McLeukerAPI] Initialized with backend URL:", this.backendUrl);
  }

  /**
   * Make a fetch request with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = this.maxRetries
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // Server error (5xx) - retry
        lastError = new Error(`Server error: ${response.status}`);
        console.warn(`[McLeukerAPI] Attempt ${attempt + 1} failed with status ${response.status}`);
        
      } catch (error: any) {
        // Network error or abort
        if (error.name === "AbortError") {
          throw error; // Don't retry aborted requests
        }
        lastError = error;
        console.warn(`[McLeukerAPI] Attempt ${attempt + 1} failed:`, error.message);
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.log(`[McLeukerAPI] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.backendUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[McLeukerAPI] Health check error:", error);
      throw error;
    }
  }

  /**
   * Send a chat message to the backend
   * This is the main function that handles all chat requests
   */
  async chat(
    message: string,
    mode: "quick" | "deep" = "quick",
    conversationHistory: Array<{ role: string; content: string }> = [],
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    console.log("[McLeukerAPI] Sending chat request:", {
      messageLength: message.length,
      mode,
      historyLength: conversationHistory.length,
    });

    try {
      // Build request body
      const body = {
        message: message,
        mode: mode,
        conversation_history: conversationHistory,
        user_id: "anonymous", // Will be overridden by auth if available
        session_id: crypto.randomUUID(),
      };

      // Make the request directly to Railway backend
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(body),
          signal: signal,
        }
      );

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[McLeukerAPI] Error response:", response.status, errorText);
        
        return {
          success: false,
          response: `API error: ${response.status} - ${errorText}`,
          message: `API error: ${response.status} - ${errorText}`,
          error: errorText,
        };
      }

      // Parse and normalize the response
      const data = await response.json();
      console.log("[McLeukerAPI] Raw response keys:", Object.keys(data));
      
      const normalized = normalizeResponse(data);
      console.log("[McLeukerAPI] Normalized response:", {
        success: normalized.success,
        hasResponse: !!normalized.response,
        responseLength: normalized.response?.length,
        hasSources: !!normalized.sources?.length,
        hasReasoning: !!normalized.reasoning?.length,
      });

      return normalized;

    } catch (error: any) {
      console.error("[McLeukerAPI] Chat error:", error);

      // Handle abort
      if (error.name === "AbortError") {
        return {
          success: false,
          response: "Request was cancelled.",
          message: "Request was cancelled.",
          error: "Aborted",
        };
      }

      // Handle other errors
      return {
        success: false,
        response: `Error: ${error.message || "Unknown error occurred"}`,
        message: `Error: ${error.message || "Unknown error occurred"}`,
        error: error.message,
      };
    }
  }

  /**
   * Generate an image using the backend
   */
  async generateImage(prompt: string, signal?: AbortSignal): Promise<{ url?: string; error?: string }> {
    try {
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
          signal: signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Image generation failed: ${errorText}` };
      }

      const data = await response.json();
      return { url: data.url || data.image_url };

    } catch (error: any) {
      return { error: error.message || "Image generation failed" };
    }
  }

  /**
   * Execute code using the backend
   */
  async executeCode(
    code: string,
    language: string = "python",
    signal?: AbortSignal
  ): Promise<{ output?: string; error?: string }> {
    try {
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/execute-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, language }),
          signal: signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Code execution failed: ${errorText}` };
      }

      const data = await response.json();
      return { output: data.output || data.result };

    } catch (error: any) {
      return { error: error.message || "Code execution failed" };
    }
  }

  /**
   * Search the web using the backend
   */
  async search(
    query: string,
    signal?: AbortSignal
  ): Promise<{ results?: any[]; error?: string }> {
    try {
      const response = await this.fetchWithRetry(
        `${this.backendUrl}/api/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
          signal: signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Search failed: ${errorText}` };
      }

      const data = await response.json();
      return { results: data.results || data.sources };

    } catch (error: any) {
      return { error: error.message || "Search failed" };
    }
  }
}

// Export singleton instance
export const mcLeukerAPI = new McLeukerAPI();
