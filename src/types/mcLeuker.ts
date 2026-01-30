// TypeScript interfaces for McLeuker Railway Backend API

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  files?: GeneratedFile[];
}

export interface GeneratedFile {
  filename: string;
  filepath: string;
  format: string;
  size_bytes?: number;
  download_url?: string;
}

export interface TaskInterpretation {
  intent: string;
  domain: string;
  complexity: "simple" | "medium" | "complex";
  required_outputs: string[];
  requires_research: boolean;
  confidence: number;
}

export interface TaskResult {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  interpretation?: TaskInterpretation;
  files?: GeneratedFile[];
  message?: string;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface AISearchResponse {
  query: string;
  expanded_queries?: string[];
  results: SearchResult[];
  summary: string;
  follow_up_questions?: string[];
}

export interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latency_ms?: number;
}

export interface ConfigStatus {
  status: "healthy" | "degraded" | "unhealthy";
  services: ServiceStatus[];
  default_llm: string;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
}

export interface StatusResponse {
  status: string;
  version?: string;
  uptime?: number;
}

export interface ResearchResponse {
  topic: string;
  depth: "shallow" | "medium" | "deep";
  findings: string;
  sources: SearchResult[];
  summary: string;
}

export interface ChatResponse {
  message: string;
  conversation_id?: string;
  files?: GeneratedFile[];
}

export interface QuickAnswerResponse {
  question: string;
  answer: string;
  confidence: number;
  sources?: SearchResult[];
}

export interface SearchOptions {
  max_results?: number;
  include_summary?: boolean;
  domains?: string[];
}
