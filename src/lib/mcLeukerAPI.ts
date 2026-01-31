// McLeuker Railway Backend API Client v2 - Proxy Edition

import type {
  TaskResult,
  ChatResponse,
  DeepChatResponse,
  AISearchResponse,
  QuickAnswerResponse,
  ResearchResponse,
  TaskInterpretation,
  ConfigStatus,
  HealthResponse,
  StatusResponse,
  SearchOptions,
  UserCredits,
  PricingResponse,
} from "@/types/mcLeuker";

// Use the Supabase proxy function to avoid CORS issues
const PROXY_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-railway`;

class McLeukerAPI {
  private baseUrl: string;

  constructor(baseUrl: string = PROXY_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Construct the download URL for a generated file (through proxy)
   */
  getFileDownloadUrl(filename: string): string {
    return `${this.baseUrl}/api/files/${filename}`;
  }

  /**
   * Health check endpoint
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * System status endpoint
   */
  async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/status`);
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Configuration status endpoint
   */
  async getConfigStatus(): Promise<ConfigStatus> {
    const response = await fetch(`${this.baseUrl}/api/config/status`);
    if (!response.ok) {
      throw new Error(`Config status check failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Synchronous task execution - waits for completion
   */
  async createTask(prompt: string, userId?: string): Promise<TaskResult> {
    const response = await fetch(`${this.baseUrl}/api/tasks/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, user_id: userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Task creation failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Map files with download URLs
    if (result.files) {
      result.files = result.files.map((file: { filename: string }) => ({
        ...file,
        download_url: this.getFileDownloadUrl(file.filename),
      }));
    }

    return result;
  }

  /**
   * Async task creation - returns immediately with task ID
   */
  async createTaskAsync(prompt: string, userId?: string): Promise<{ task_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, user_id: userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Async task creation failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Poll task status
   */
  async getTaskStatus(taskId: string): Promise<TaskResult> {
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Task status check failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Map files with download URLs
    if (result.files) {
      result.files = result.files.map((file: { filename: string }) => ({
        ...file,
        download_url: this.getFileDownloadUrl(file.filename),
      }));
    }

    return result;
  }

  /**
   * Chat interaction (Quick mode - 1 credit)
   */
  async chat(message: string, conversationId?: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversation_id: conversationId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Chat request failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Map files with download URLs
    if (result.files) {
      result.files = result.files.map((file: { filename: string }) => ({
        ...file,
        download_url: this.getFileDownloadUrl(file.filename),
      }));
    }

    return result;
  }

  /**
   * Deep Chat with reasoning (Deep mode - 25 credits)
   */
  async chatDeep(message: string, conversationId?: string): Promise<DeepChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat/deep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversation_id: conversationId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Deep chat request failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Map files with download URLs
    if (result.files) {
      result.files = result.files.map((file: { filename: string }) => ({
        ...file,
        download_url: this.getFileDownloadUrl(file.filename),
      }));
    }

    return result;
  }

  /**
   * Get user credit balance
   */
  async getUserCredits(userId: string): Promise<UserCredits> {
    const response = await fetch(`${this.baseUrl}/api/credits/${userId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Credits fetch failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get pricing plans
   */
  async getPricing(): Promise<PricingResponse> {
    const response = await fetch(`${this.baseUrl}/api/pricing`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Pricing fetch failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * AI-powered search with summarization
   */
  async search(query: string, options?: SearchOptions): Promise<AISearchResponse> {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, ...options }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Search failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Quick Q&A endpoint
   */
  async quickAnswer(question: string): Promise<QuickAnswerResponse> {
    const response = await fetch(`${this.baseUrl}/api/search/quick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Quick answer failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Deep research endpoint
   */
  async research(topic: string, depth: "shallow" | "medium" | "deep" = "medium"): Promise<ResearchResponse> {
    const response = await fetch(`${this.baseUrl}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, depth }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Research failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Task interpretation endpoint (for debugging/preview)
   */
  async interpret(prompt: string): Promise<TaskInterpretation> {
    const response = await fetch(`${this.baseUrl}/api/interpret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Interpretation failed: ${response.status}`);
    }

    return response.json();
  }
}

// Export a singleton instance
export const mcLeukerAPI = new McLeukerAPI();

// Also export the class for custom instantiation
export { McLeukerAPI };
