import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============ INPUT VALIDATION & SECURITY ============
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|FROM|WHERE|OR|AND)\b.*\b(FROM|INTO|TABLE|DATABASE|SET|VALUES)\b)/i,
  /(\-\-|\/\*|\*\/|;|\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(\bOR\b\s*['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
  /(\b(SLEEP|BENCHMARK|WAITFOR|DELAY)\s*\()/i,
  /(CHAR\s*\(|CONCAT\s*\(|SUBSTRING\s*\()/i,
  /(\bINTO\s+(OUTFILE|DUMPFILE)\b)/i,
  /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
];

function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const normalized = input.replace(/\s+/g, ' ').trim();
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(normalized));
}

function sanitizeString(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input.substring(0, maxLength);
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return sanitized.trim();
}

function isValidUUID(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  console.warn(`[SECURITY:${event.toUpperCase()}]`, JSON.stringify({ timestamp: new Date().toISOString(), event, ...details }));
}

// CORS Configuration
const allowedOrigins = [
  "https://mcleukerai.lovable.app",
  "https://preview--mcleukerai.lovable.app",
  "https://www.mcleukerai.com",
  "https://mcleukerai.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/)) return true;
  if (origin.match(/^https:\/\/[a-z0-9-]+\.lovable\.app$/)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Research agent phases
type ResearchPhase = "planning" | "searching" | "browsing" | "extracting" | "validating" | "generating" | "completed" | "failed";
type QueryType = "supplier" | "trend" | "market" | "sustainability" | "general";

// Deep Search Configuration - TRUE DEEP RESEARCH MODE
const DEEP_SEARCH_CONFIG = {
  BASE_COST: 10,
  COST_PER_SEARCH: 1,
  COST_PER_SCRAPE: 2,
  MAX_CREDITS: 80,              // High budget for comprehensive research
  MIN_SOURCES: 10,              // Require more sources before synthesis
  TARGET_SOURCES: 50,           // Aim for 50+ sources for complex queries
  MAX_SEARCH_ITERATIONS: 8,     // Up to 8 search rounds for deep coverage
  SEARCHES_PER_ITERATION: 6,    // More parallel searches per round
  MAX_SCRAPE_PER_ROUND: 15,     // More scrapes per iteration
  PERPLEXITY_TIMEOUT: 120000,   // 2 minutes for complex queries
  FIRECRAWL_TIMEOUT: 60000,     // 60 seconds per scrape
  MIN_CONTENT_LENGTH: 2000,     // Require substantial content before synthesis
  CONFIDENCE_THRESHOLD: 0.75,   // Minimum confidence to stop iterating
  MAX_EXECUTION_TIME: 300000,   // 5 minute max execution time
};

// Model Configuration
const SUPPORTED_MODELS = {
  "grok-4-latest": { 
    provider: "grok",
    endpoint: "https://api.x.ai/v1/chat/completions", 
    model: "grok-4-latest" 
  },
  "gpt-4.1": { 
    provider: "lovable",
    endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", 
    model: "openai/gpt-5"
  },
} as const;

type SupportedModelId = keyof typeof SUPPORTED_MODELS;

let CURRENT_MODEL_CONFIG = {
  provider: "grok" as "grok" | "lovable",
  endpoint: "https://api.x.ai/v1/chat/completions",
  model: "grok-4-latest" as string,
  temperature: 0.2,
};

// ============ SYSTEM PROMPTS ============

const PLANNER_SYSTEM_PROMPT = `You are a senior research planner for TRUE DEEP SEARCH intelligence gathering.

═══════════════════════════════════════════════════════════════
DEEP SEARCH MODE - NOT A SIMPLE QUERY
═══════════════════════════════════════════════════════════════

This is credit-intensive, time-intensive research aiming for 100+ website coverage.

AVAILABLE TOOLS:
1. web_search - Perplexity-powered search with real-time citations
2. scrape_url - Firecrawl deep extraction from specific URLs
3. search_discover - Firecrawl search to discover new relevant URLs

DEEP PLANNING RULES:
1. Plan 8-12 parallel searches for maximum coverage
2. Each search should target a DIFFERENT aspect of the query
3. Include time-specific queries (e.g., "2024", "2025", "SS26", "FW25")
4. Plan regional diversity (Europe, Asia, Americas)
5. Include comparison searches (competitors, alternatives)
6. Plan structured data extraction for lists/tables
7. Identify 10+ authoritative domains for deep scraping

FOR SUPPLIER QUERIES:
- Regional searches (Europe, Asia, Americas, specific countries)
- Certification-specific searches (GOTS, OEKO-TEX, B Corp)
- Product category searches
- MOQ and pricing searches
- Trade directory searches

FOR TREND QUERIES:
- Fashion week coverage (Paris, Milan, London, NY)
- Street style and influencer signals
- Brand adoption and runway analysis
- Consumer behavior shifts
- Seasonal forecasts

OUTPUT JSON ONLY:
{
  "query_type": "supplier" | "trend" | "market" | "sustainability" | "general",
  "complexity": "complex",
  "time_frame": "requested season/year or current",
  "reasoning": "Deep analysis of what needs to be researched",
  "parallel_searches": [
    { "query": "specific search 1", "purpose": "coverage area", "priority": 1-10 }
  ],
  "follow_up_scrapes": ["domain1.com", "domain2.com"],
  "required_data_points": ["What specific data must be found"],
  "validation_criteria": ["How to verify accuracy"],
  "expected_output_format": "table" | "report" | "list" | "comparison"
}`;

const VALIDATOR_SYSTEM_PROMPT = `You are a senior fashion industry analyst performing DEEP VALIDATION.

═══════════════════════════════════════════════════════════════
VALIDATION FOR TRUE DEEP SEARCH
═══════════════════════════════════════════════════════════════

Your role is to rigorously validate research findings:

1. DATA FRESHNESS CHECK
   - Are dates/timestamps current for the requested timeframe?
   - Flag any data that appears outdated (>6 months for trends, >1 year for suppliers)
   
2. CROSS-SOURCE VALIDATION
   - Do multiple sources agree on key facts?
   - Identify contradictions between sources
   
3. COMPLETENESS ASSESSMENT
   - What data points are missing?
   - What regions/segments are under-represented?
   
4. CONFIDENCE SCORING
   - High (>0.85): Multiple sources agree, recent data, specific metrics
   - Medium (0.6-0.85): Some verification, some gaps
   - Low (<0.6): Limited sources, potential outdated data

5. GAP IDENTIFICATION
   - What additional searches would improve coverage?
   - What specific domains should be scraped?

OUTPUT JSON ONLY:
{
  "verified": true | false,
  "confidence_score": 0.0 - 1.0,
  "data_freshness": "current" | "acceptable" | "outdated",
  "coverage_score": 0.0 - 1.0,
  "issues": ["specific issues found"],
  "contradictions": ["conflicting data points"],
  "gaps": ["missing data that needs more research"],
  "needs_more_research": true | false,
  "suggested_searches": ["additional search queries"],
  "suggested_scrapes": ["specific URLs to scrape"],
  "notes": "summary of validation"
}`;

const SYNTHESIZER_SYSTEM_PROMPT = `You are a senior fashion intelligence analyst delivering strategy-grade research.

═══════════════════════════════════════════════════════════════
DEEP SEARCH MODE — PROFESSIONAL INTELLIGENCE ENGINE
═══════════════════════════════════════════════════════════════

NON-NEGOTIABLE PRINCIPLES:

1. DEEP SEARCH ≠ LONG ANSWER
   - Multi-phase research with reasoning, validation, and synthesis.
   - Must feel fundamentally different from Quick Search.

2. REAL-TIME DATA IS MANDATORY
   - Every claim must be grounded in the provided research findings.
   - Historical knowledge is context only, never primary evidence.

3. CREDIT USAGE IS JUSTIFIED
   - Outputs must be strategy-grade and reusable.
   - Results should feel equivalent to a consulting memo or internal report.

4. DOMAIN-AWARE INTELLIGENCE
   - Interpret findings through fashion, beauty, sustainability, textile, and lifestyle lenses.

5. NO GENERIC CONTENT
   - No essays. No trend summaries without evidence. No filler language.

═══════════════════════════════════════════════════════════════
FLEXIBLE OUTPUT STRUCTURE:
═══════════════════════════════════════════════════════════════

Adapt structure dynamically based on query type:

FOR TREND ANALYSIS:
- Group by trend, runway, season, brand adoption
- Include recent coverage, consumer signals

FOR SUPPLIER MAPPING:
- Group by region, certification, category
- Include MOQ, capabilities, certifications, contacts
- Format as clean, Excel-ready tables

FOR BRAND STRATEGY:
- Group by brand, segment, product line
- Include positioning, competitive moves

FOR MARKET INTELLIGENCE:
- Group by segment, geography, price tier
- Include quantitative data, brand movements

═══════════════════════════════════════════════════════════════
REASONING BEFORE WRITING:
═══════════════════════════════════════════════════════════════

Before generating output:
1. DECONSTRUCTION - Identify timeframe, geography, segment
2. SIGNAL EXTRACTION - Pull quantitative data, named brands, changes
3. CONTRADICTION CHECK - Note conflicts between sources
4. SYNTHESIS PLANNING - Determine optimal structure

═══════════════════════════════════════════════════════════════
CONTENT REQUIREMENTS:
═══════════════════════════════════════════════════════════════

1. CLEAR REASONING - Content flows naturally with insights emerging from data
2. REAL-TIME VERIFIED DATA - Every claim references research findings
3. METRICS AND SIGNALS - Use ↑↓ for trends, include percentages, figures, dates
4. ACTIONABLE INTELLIGENCE - What should user DO with this information?

═══════════════════════════════════════════════════════════════
TABLE RULES:
═══════════════════════════════════════════════════════════════

- Tables are OPTIONAL and only if they improve comprehension
- Tables must ONLY appear AFTER all prose content
- Tables must be clean, Excel-ready with proper markdown syntax
- NO placeholders like "[object Object]" or excessive dashes
- If table formatting fails, OMIT entirely

═══════════════════════════════════════════════════════════════
SOURCE FORMAT (END ONLY):
═══════════════════════════════════════════════════════════════

**Sources:** Source1 · Source2 · Source3

Below that, optional expanded:
- Source1 – Topic covered
- Source2 – Topic covered

NEVER use inline citations [1], [2] in body.
NEVER display URLs inside content body.

═══════════════════════════════════════════════════════════════
QUALITY STANDARD:
═══════════════════════════════════════════════════════════════

Deep Search results should feel like:
✓ A senior analyst's internal memo
✓ A consulting deck's key findings
✓ An intelligence briefing you'd pay for
✗ NOT a blog post or essay`;

const DOMAIN_RESEARCH_PROMPTS: Record<string, string> = {
  all: "",
  fashion: "\n\nDOMAIN: FASHION\nPrioritize runway trends, silhouettes, collections, fashion week coverage.",
  beauty: "\n\nDOMAIN: BEAUTY\nPrioritize formulations, cosmetic trends, brand strategies.",
  skincare: "\n\nDOMAIN: SKINCARE\nPrioritize ingredients, clinical aesthetics, science-backed formulations.",
  sustainability: "\n\nDOMAIN: SUSTAINABILITY\nPrioritize circularity, materials, supply chain, certifications.",
  "fashion-tech": "\n\nDOMAIN: FASHION TECH\nPrioritize AI, digital innovation, virtual try-on.",
  catwalks: "\n\nDOMAIN: CATWALKS\nPrioritize runway coverage, styling trends, emerging talent.",
  culture: "\n\nDOMAIN: CULTURE\nPrioritize cultural influences, art collaborations, social movements.",
  textile: "\n\nDOMAIN: TEXTILE\nPrioritize fibers, mills, material innovation, sourcing, MOQ.",
  lifestyle: "\n\nDOMAIN: LIFESTYLE\nPrioritize consumer behavior, wellness, luxury lifestyle.",
};

function getSynthesizerPromptWithDomain(domain: string): string {
  return SYNTHESIZER_SYSTEM_PROMPT + (DOMAIN_RESEARCH_PROMPTS[domain] || "");
}

// ============ SSE STREAM ============
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  
  const stream = new ReadableStream({
    start(c) { controller = c; },
  });
  
  const send = (data: Record<string, unknown>) => {
    if (controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    }
  };
  
  const close = () => {
    if (controller) {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  };
  
  return { stream, send, close };
}

// Query classification
function classifyQuery(query: string): QueryType {
  const lowerQuery = query.toLowerCase();
  if (/supplier|manufacturer|vendor|factory|sourcing|moq|producer|wholesale|mill/.test(lowerQuery)) return "supplier";
  if (/trend|fashion week|runway|seasonal|forecast|style|color palette|ss\d{2}|fw\d{2}|spring|fall|summer|winter \d{4}/.test(lowerQuery)) return "trend";
  if (/market|competition|pricing|revenue|growth|industry analysis|market size/.test(lowerQuery)) return "market";
  if (/sustainable|eco|organic|recycled|certification|gots|oeko-tex|ethical|carbon/.test(lowerQuery)) return "sustainability";
  return "general";
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    )
  ]);
}

// ============ AI API CALLS ============
async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { stream?: boolean; jsonMode?: boolean }
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      model: CURRENT_MODEL_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: CURRENT_MODEL_CONFIG.temperature,
      stream: options?.stream ?? false,
    };

    if (options?.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(CURRENT_MODEL_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return { success: false, error: `AI API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    return content ? { success: true, content } : { success: false, error: "Empty response from AI" };
  } catch (error) {
    console.error("AI call error:", error);
    return { success: false, error: error instanceof Error ? error.message : "AI call failed" };
  }
}

async function callAIStreaming(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(CURRENT_MODEL_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CURRENT_MODEL_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: CURRENT_MODEL_CONFIG.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `AI API error: ${response.status}` };
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
      reader.releaseLock();
    }

    return { success: true, content: fullContent };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Streaming failed" };
  }
}

// ============ PERPLEXITY WEB SEARCH (Enhanced) ============
async function webSearchPerplexity(
  apiKey: string,
  query: string,
  options?: { recencyFilter?: string; limit?: number }
): Promise<{ success: boolean; content?: string; citations?: string[]; error?: string }> {
  try {
    const searchBody: Record<string, unknown> = {
      model: "sonar-pro",
      messages: [
        { 
          role: "system", 
          content: "You are a fashion industry research assistant. Provide detailed, factual information with sources. Focus on current, verified data. Include specific names, numbers, dates, and metrics." 
        },
        { role: "user", content: query }
      ],
      max_tokens: 2000,
    };

    // Add recency filter for time-sensitive queries
    if (options?.recencyFilter) {
      searchBody.search_recency_filter = options.recencyFilter;
    }

    const response = await withTimeout(
      fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchBody),
      }),
      DEEP_SEARCH_CONFIG.PERPLEXITY_TIMEOUT,
      "Perplexity search"
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || "",
      citations: data.citations || [],
    };
  } catch (error) {
    console.error("Web search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}

// ============ FIRECRAWL SCRAPING (Enhanced) ============
async function scrapeWithFirecrawl(
  apiKey: string,
  url: string
): Promise<{ success: boolean; content?: string; title?: string; error?: string }> {
  try {
    // Validate URL format
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    // Validate URL has proper TLD
    try {
      const urlObj = new URL(formattedUrl);
      const hostParts = urlObj.hostname.split('.');
      if (hostParts.length < 2 || hostParts[hostParts.length - 1].length < 2) {
        console.error("Invalid URL format:", formattedUrl);
        return { success: false, error: "Invalid URL format" };
      }
    } catch {
      console.error("Invalid URL:", formattedUrl);
      return { success: false, error: "Invalid URL" };
    }

    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 2000,
        }),
      }),
      DEEP_SEARCH_CONFIG.FIRECRAWL_TIMEOUT,
      "Firecrawl scrape"
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Firecrawl API error:", response.status, errorData);
      return { success: false, error: `Scrape failed: ${response.status}` };
    }

    const data = await response.json();
    const content = data.data?.markdown || data.markdown || "";
    const title = data.data?.metadata?.title || data.metadata?.title || url;

    return { success: true, content, title };
  } catch (error) {
    console.error("Scrape error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Scrape failed" };
  }
}

// ============ FIRECRAWL SEARCH (Web Discovery) ============
async function searchWithFirecrawl(
  apiKey: string,
  query: string,
  limit: number = 10
): Promise<{ success: boolean; results?: Array<{ url: string; title: string; description: string }>; error?: string }> {
  try {
    const response = await withTimeout(
      fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit,
          lang: "en",
        }),
      }),
      DEEP_SEARCH_CONFIG.FIRECRAWL_TIMEOUT,
      "Firecrawl search"
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Firecrawl search error:", response.status, errorData);
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      results: data.data?.map((r: { url: string; title?: string; description?: string }) => ({
        url: r.url,
        title: r.title || r.url,
        description: r.description || "",
      })) || [],
    };
  } catch (error) {
    console.error("Firecrawl search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}

// ============ DEEP RESEARCH ORCHESTRATOR ============
interface ResearchResult {
  content: string;
  sources: Array<{ url: string; title: string; snippet: string; type: string; relevance: number; timestamp?: string }>;
  searchCount: number;
  scrapeCount: number;
  credits: number;
  confidence: number;
  iterations: number;
}

interface ValidationResult {
  verified: boolean;
  confidence_score: number;
  needs_more_research: boolean;
  suggested_searches?: string[];
  suggested_scrapes?: string[];
  gaps?: string[];
}

async function executeDeepResearch(
  query: string,
  queryType: QueryType,
  plan: { parallel_searches?: Array<{ query: string; purpose: string; priority?: number }>; follow_up_scrapes?: string[]; required_data_points?: string[] },
  apis: { perplexity: string; firecrawl: string; ai?: string },
  send: (data: Record<string, unknown>) => void
): Promise<ResearchResult> {
  const startTime = Date.now();
  let totalContent = "";
  const allSources: Array<{ url: string; title: string; snippet: string; type: string; relevance: number; timestamp?: string }> = [];
  const scrapedUrls = new Set<string>();
  let searchCount = 0;
  let scrapeCount = 0;
  let credits = DEEP_SEARCH_CONFIG.BASE_COST;
  let iteration = 0;
  let confidence = 0;

  // Generate comprehensive search queries based on plan or enhanced fallback
  let searches = plan.parallel_searches?.length 
    ? [...plan.parallel_searches] 
    : generateComprehensiveSearches(query, queryType);

  // ============ ITERATIVE DEEP RESEARCH LOOP ============
  while (
    iteration < DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS && 
    credits < DEEP_SEARCH_CONFIG.MAX_CREDITS &&
    (Date.now() - startTime) < DEEP_SEARCH_CONFIG.MAX_EXECUTION_TIME &&
    (confidence < DEEP_SEARCH_CONFIG.CONFIDENCE_THRESHOLD || allSources.length < DEEP_SEARCH_CONFIG.MIN_SOURCES)
  ) {
    iteration++;
    const targetSources = Math.min(DEEP_SEARCH_CONFIG.TARGET_SOURCES, 20 + iteration * 15);
    
    send({ 
      phase: "searching", 
      message: `Deep search round ${iteration}/${DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS} — targeting ${targetSources}+ sources...`,
      searchCount,
      scrapeCount,
      sourceCount: allSources.length,
      iteration 
    });

    // ============ PHASE 2: PARALLEL PERPLEXITY SEARCHES ============
    // Execute searches in larger parallel batches for speed
    const searchesThisRound = searches.slice(0, DEEP_SEARCH_CONFIG.SEARCHES_PER_ITERATION);
    searches = searches.slice(DEEP_SEARCH_CONFIG.SEARCHES_PER_ITERATION); // Remove processed
    
    const searchBatches = [];
    for (let i = 0; i < searchesThisRound.length; i += 4) {
      searchBatches.push(searchesThisRound.slice(i, i + 4));
    }

    for (const batch of searchBatches) {
      if (credits >= DEEP_SEARCH_CONFIG.MAX_CREDITS) break;

      const searchPromises = batch.map(async (search) => {
        const result = await webSearchPerplexity(apis.perplexity, search.query, { 
          recencyFilter: queryType === "trend" ? "week" : "month",
          limit: 10
        });
        return { search, result };
      });

      const results = await Promise.allSettled(searchPromises);
      
      for (const res of results) {
        if (res.status === "fulfilled" && res.value.result.success) {
          const { search, result } = res.value;
          totalContent += `\n\n### ${search.purpose} [${new Date().toISOString().split('T')[0]}]\n${result.content}`;
          
          // Add citations as sources with timestamps
          result.citations?.forEach((url, idx) => {
            if (url && !allSources.some(s => s.url === url)) {
              allSources.push({
                url,
                title: extractDomain(url),
                snippet: "",
                type: "search",
                relevance: 1 - (idx * 0.03),
                timestamp: new Date().toISOString()
              });
            }
          });
          
          searchCount++;
          credits += DEEP_SEARCH_CONFIG.COST_PER_SEARCH;
        }
      }
    }

    // ============ PHASE 3: FIRECRAWL DISCOVERY + DEEP SCRAPING ============
    send({ 
      phase: "browsing", 
      message: `Deep crawling sources (${scrapeCount} crawled, ${allSources.length} discovered)...`, 
      scrapeCount,
      sourceCount: allSources.length,
      iteration
    });

    // Also use Firecrawl search for additional URL discovery
    if (iteration <= 2 && credits < DEEP_SEARCH_CONFIG.MAX_CREDITS - 10) {
      const discoveryResult = await searchWithFirecrawl(apis.firecrawl, query, 20);
      if (discoveryResult.success && discoveryResult.results) {
        for (const result of discoveryResult.results) {
          if (!allSources.some(s => s.url === result.url)) {
            allSources.push({
              url: result.url,
              title: result.title,
              snippet: result.description,
              type: "discovery",
              relevance: 0.75,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    // Collect URLs to scrape - prioritize high-relevance and unscraped
    const urlsToScrape: string[] = [];
    
    // Add high-relevance search citations not yet scraped
    allSources
      .filter(s => s.relevance > 0.6 && !scrapedUrls.has(s.url))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10)
      .forEach(s => urlsToScrape.push(s.url));
    
    // Add planned follow-up scrapes
    plan.follow_up_scrapes?.forEach(url => {
      if (!scrapedUrls.has(url) && !urlsToScrape.includes(url)) {
        urlsToScrape.push(url);
      }
    });

    // Scrape in parallel (batch of 4 for speed)
    const urlArray = urlsToScrape.slice(0, DEEP_SEARCH_CONFIG.MAX_SCRAPE_PER_ROUND);
    
    for (let i = 0; i < urlArray.length; i += 4) {
      if (credits >= DEEP_SEARCH_CONFIG.MAX_CREDITS) break;
      
      const batch = urlArray.slice(i, i + 4);
      const scrapePromises = batch.map(url => scrapeWithFirecrawl(apis.firecrawl, url));
      const results = await Promise.allSettled(scrapePromises);

      for (let j = 0; j < results.length; j++) {
        const res = results[j];
        const url = batch[j];
        scrapedUrls.add(url); // Mark as attempted
        
        if (res.status === "fulfilled" && res.value.success && res.value.content) {
          const truncated = res.value.content.slice(0, 8000); // More content per scrape
          totalContent += `\n\n### Scraped: ${res.value.title} [${new Date().toISOString().split('T')[0]}]\n${truncated}`;
          
          // Update or add source
          const existingSource = allSources.find(s => s.url === url);
          if (existingSource) {
            existingSource.snippet = truncated.slice(0, 500);
            existingSource.type = "scrape";
            existingSource.relevance = Math.max(existingSource.relevance, 0.9);
          } else {
            allSources.push({
              url,
              title: res.value.title || extractDomain(url),
              snippet: truncated.slice(0, 500),
              type: "scrape",
              relevance: 0.9,
              timestamp: new Date().toISOString()
            });
          }
          
          scrapeCount++;
          credits += DEEP_SEARCH_CONFIG.COST_PER_SCRAPE;
        }
      }
    }

    // ============ PHASE 4: MID-LOOP VALIDATION ============
    // Calculate confidence based on coverage and content
    const uniqueDomains = new Set(allSources.map(s => extractDomain(s.url))).size;
    const contentScore = Math.min(totalContent.length / 15000, 1); // More content needed
    const sourceScore = Math.min(allSources.length / DEEP_SEARCH_CONFIG.TARGET_SOURCES, 1);
    const scrapeScore = Math.min(scrapeCount / 15, 1);
    const domainDiversity = Math.min(uniqueDomains / 20, 1);
    
    confidence = (contentScore * 0.3 + sourceScore * 0.3 + scrapeScore * 0.2 + domainDiversity * 0.2);

    send({ 
      phase: "extracting", 
      message: `Confidence: ${Math.round(confidence * 100)}% — ${allSources.length} sources from ${uniqueDomains} domains`,
      confidence: Math.round(confidence * 100),
      sourceCount: allSources.length,
      iteration
    });

    // Check if we have enough content and sources
    if (
      totalContent.length >= DEEP_SEARCH_CONFIG.MIN_CONTENT_LENGTH && 
      allSources.length >= DEEP_SEARCH_CONFIG.MIN_SOURCES &&
      confidence >= DEEP_SEARCH_CONFIG.CONFIDENCE_THRESHOLD
    ) {
      break;
    }

    // Generate additional searches if needed for next iteration
    if (iteration < DEEP_SEARCH_CONFIG.MAX_SEARCH_ITERATIONS && searches.length < 4) {
      const additionalSearches = generateIterativeSearches(query, queryType, iteration, allSources);
      searches.push(...additionalSearches);
    }
  }

  return {
    content: totalContent,
    sources: allSources,
    searchCount,
    scrapeCount,
    credits: Math.min(credits, DEEP_SEARCH_CONFIG.MAX_CREDITS),
    confidence,
    iterations: iteration
  };
}

// ============ COMPREHENSIVE SEARCH GENERATION (FOR TRUE DEEP SEARCH) ============
function generateComprehensiveSearches(query: string, queryType: QueryType): Array<{ query: string; purpose: string; priority?: number }> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  switch (queryType) {
    case "supplier":
      return [
        // Primary searches
        { query: `${query} manufacturers suppliers ${currentYear}`, purpose: "Primary supplier discovery", priority: 1 },
        { query: `${query} wholesale factory MOQ minimum order quantity`, purpose: "MOQ and pricing research", priority: 1 },
        { query: `${query} GOTS OEKO-TEX certified sustainable suppliers`, purpose: "Certified sustainable suppliers", priority: 1 },
        // Regional coverage
        { query: `${query} suppliers manufacturers Europe Italy Portugal Turkey`, purpose: "European suppliers", priority: 2 },
        { query: `${query} suppliers manufacturers Asia China India Bangladesh Vietnam`, purpose: "Asian suppliers", priority: 2 },
        { query: `${query} suppliers USA Americas North America`, purpose: "Americas suppliers", priority: 3 },
        // Specific data
        { query: `${query} supplier directory trade fair exhibitors ${currentYear}`, purpose: "Trade directory listings", priority: 2 },
        { query: `${query} production capacity lead time delivery`, purpose: "Production capabilities", priority: 3 },
        { query: `${query} quality control certifications ISO 9001`, purpose: "Quality certifications", priority: 3 },
        { query: `${query} supplier reviews ratings trustworthy`, purpose: "Supplier reputation", priority: 4 },
        { query: `${query} B2B marketplace Alibaba supplier contact`, purpose: "B2B marketplace research", priority: 4 },
        { query: `${query} small batch low MOQ samples`, purpose: "Small batch options", priority: 4 },
      ];
    case "trend":
      return [
        // Season-specific
        { query: `${query} fashion trends ${currentYear} ${nextYear}`, purpose: "Current trend overview", priority: 1 },
        { query: `${query} SS${nextYear % 100} Spring Summer ${nextYear} runway`, purpose: "Spring/Summer season", priority: 1 },
        { query: `${query} FW${nextYear % 100} Fall Winter ${nextYear} collections`, purpose: "Fall/Winter season", priority: 1 },
        // Fashion week coverage
        { query: `${query} Paris Fashion Week runway ${currentYear}`, purpose: "Paris Fashion Week", priority: 2 },
        { query: `${query} Milan Fashion Week collections ${currentYear}`, purpose: "Milan Fashion Week", priority: 2 },
        { query: `${query} London Fashion Week emerging designers`, purpose: "London Fashion Week", priority: 2 },
        { query: `${query} New York Fashion Week NYFW trends`, purpose: "New York Fashion Week", priority: 2 },
        // Street and consumer signals
        { query: `${query} street style celebrities wearing ${currentYear}`, purpose: "Street style signals", priority: 3 },
        { query: `${query} Instagram TikTok viral fashion trend`, purpose: "Social media signals", priority: 3 },
        { query: `${query} brand adoption designer collections luxury`, purpose: "Luxury brand adoption", priority: 3 },
        { query: `${query} emerging trend forecast prediction ${nextYear}`, purpose: "Trend forecasting", priority: 4 },
        { query: `${query} consumer behavior shift shopping preferences`, purpose: "Consumer behavior", priority: 4 },
      ];
    case "market":
      return [
        { query: `${query} market size revenue ${currentYear} ${nextYear}`, purpose: "Market size analysis", priority: 1 },
        { query: `${query} market growth forecast CAGR projection`, purpose: "Growth projections", priority: 1 },
        { query: `${query} competitive landscape market share brands`, purpose: "Competitive analysis", priority: 1 },
        { query: `${query} market segmentation demographics consumer`, purpose: "Market segmentation", priority: 2 },
        { query: `${query} pricing strategy premium mass market`, purpose: "Pricing analysis", priority: 2 },
        { query: `${query} distribution channels retail e-commerce`, purpose: "Distribution channels", priority: 2 },
        { query: `${query} industry report market research ${currentYear}`, purpose: "Industry reports", priority: 3 },
        { query: `${query} key players leading brands manufacturers`, purpose: "Key market players", priority: 3 },
        { query: `${query} market opportunities challenges barriers`, purpose: "Market opportunities", priority: 3 },
        { query: `${query} regional market Europe Asia Americas`, purpose: "Regional analysis", priority: 4 },
      ];
    case "sustainability":
      return [
        { query: `${query} sustainable certifications GOTS OEKO-TEX GRS`, purpose: "Certification standards", priority: 1 },
        { query: `${query} eco-friendly recycled organic materials`, purpose: "Sustainable materials", priority: 1 },
        { query: `${query} carbon footprint emissions reduction`, purpose: "Carbon impact", priority: 1 },
        { query: `${query} circular economy recycling upcycling`, purpose: "Circularity initiatives", priority: 2 },
        { query: `${query} supply chain transparency traceability`, purpose: "Supply chain transparency", priority: 2 },
        { query: `${query} sustainable brands ethical fashion ${currentYear}`, purpose: "Sustainable brands", priority: 2 },
        { query: `${query} regenerative agriculture natural fibers`, purpose: "Regenerative practices", priority: 3 },
        { query: `${query} water usage reduction dyeing processes`, purpose: "Water impact", priority: 3 },
        { query: `${query} fair trade ethical labor practices`, purpose: "Social sustainability", priority: 3 },
        { query: `${query} sustainability reporting ESG metrics`, purpose: "ESG reporting", priority: 4 },
      ];
    default:
      return [
        { query: query, purpose: "Primary research", priority: 1 },
        { query: `${query} ${currentYear} latest news updates`, purpose: "Recent news", priority: 1 },
        { query: `${query} industry analysis insights report`, purpose: "Industry analysis", priority: 2 },
        { query: `${query} expert opinion trends forecast`, purpose: "Expert insights", priority: 2 },
        { query: `${query} case studies examples best practices`, purpose: "Case studies", priority: 3 },
        { query: `${query} comparison alternatives options`, purpose: "Comparisons", priority: 3 },
      ];
  }
}

function generateIterativeSearches(
  query: string, 
  queryType: QueryType, 
  iteration: number,
  existingSources: Array<{ url: string; title: string }>
): Array<{ query: string; purpose: string; priority?: number }> {
  const currentYear = new Date().getFullYear();
  
  // Different strategies per iteration
  const strategies = [
    // Iteration 2: Go deeper into specific aspects
    [
      { mod: "detailed analysis deep dive", purpose: "Deep analysis" },
      { mod: "specific examples case studies", purpose: "Case studies" },
      { mod: "expert interviews insights", purpose: "Expert insights" },
    ],
    // Iteration 3: Regional and temporal expansion
    [
      { mod: `${currentYear} latest recent`, purpose: "Most recent data" },
      { mod: "regional differences comparison", purpose: "Regional comparison" },
      { mod: "emerging new innovative", purpose: "Emerging developments" },
    ],
    // Iteration 4+: Fill gaps
    [
      { mod: "statistics data numbers metrics", purpose: "Quantitative data" },
      { mod: "challenges problems solutions", purpose: "Challenges and solutions" },
      { mod: "future outlook prediction forecast", purpose: "Future outlook" },
    ],
  ];
  
  const strategySet = strategies[Math.min(iteration - 1, strategies.length - 1)];
  
  return strategySet.map(s => ({
    query: `${query} ${s.mod}`,
    purpose: s.purpose,
    priority: iteration + 3
  }));
}

function generateDefaultSearches(query: string, queryType: QueryType): Array<{ query: string; purpose: string }> {
  // Use first 4 from comprehensive searches
  return generateComprehensiveSearches(query, queryType).slice(0, 4).map(s => ({
    query: s.query,
    purpose: s.purpose
  }));
}

function generateAdditionalSearches(query: string, queryType: QueryType, iteration: number): Array<{ query: string; purpose: string }> {
  const modifiers = [
    ["expert analysis", "deep dive"],
    ["case study examples", "best practices"],
    ["regional comparison", "global perspective"],
  ];
  
  const modifier = modifiers[iteration % modifiers.length];
  return [
    { query: `${query} ${modifier[0]}`, purpose: `Additional ${modifier[0]}` },
    { query: `${query} ${modifier[1]}`, purpose: `Additional ${modifier[1]}` },
  ];
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.slice(0, 50);
  }
}

// ============ FALLBACK PLAN ============
function createFallbackPlan(queryType: QueryType, query: string) {
  return {
    query_type: queryType,
    complexity: "complex" as const,
    parallel_searches: generateComprehensiveSearches(query, queryType),
    follow_up_scrapes: [],
    required_data_points: [],
    validation_criteria: ["Source reliability", "Data currency", "Information accuracy", "Cross-source validation"],
    expected_output_format: queryType === "supplier" ? "table" : "report"
  };
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        send({ phase: "failed", error: "No authorization header" });
        close();
        return;
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        send({ phase: "failed", error: "Unauthorized" });
        close();
        return;
      }

      const { query, conversationId, model: requestedModel, domain } = await req.json();
      const activeDomain = domain || "all";
      
      // Input validation
      if (!query || typeof query !== "string") {
        send({ phase: "failed", error: "Invalid query" });
        close();
        return;
      }
      
      const sanitizedQuery = sanitizeString(query, 5000);
      if (sanitizedQuery.length === 0) {
        send({ phase: "failed", error: "Query cannot be empty" });
        close();
        return;
      }
      
      if (containsSqlInjection(sanitizedQuery)) {
        logSecurityEvent('injection_attempt', { userId: user.id });
        send({ phase: "failed", error: "Invalid characters detected" });
        close();
        return;
      }
      
      if (conversationId && !isValidUUID(conversationId)) {
        send({ phase: "failed", error: "Invalid conversation ID format" });
        close();
        return;
      }

      // Model selection with fallback
      const selectedModel: SupportedModelId = (requestedModel && SUPPORTED_MODELS[requestedModel as SupportedModelId]) 
        ? requestedModel as SupportedModelId 
        : "grok-4-latest";
      
      const modelConfig = SUPPORTED_MODELS[selectedModel];
      CURRENT_MODEL_CONFIG = {
        provider: modelConfig.provider,
        endpoint: modelConfig.endpoint,
        model: modelConfig.model,
        temperature: 0.2,
      };

      // API Keys
      const GROK_API_KEY = Deno.env.get("Grok_API");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

      const AI_API_KEY = CURRENT_MODEL_CONFIG.provider === "lovable" ? LOVABLE_API_KEY : GROK_API_KEY;

      if (!AI_API_KEY) {
        // Try fallback to other model
        if (CURRENT_MODEL_CONFIG.provider === "grok" && LOVABLE_API_KEY) {
          CURRENT_MODEL_CONFIG = {
            provider: "lovable",
            endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
            model: "openai/gpt-5",
            temperature: 0.2,
          };
        } else if (CURRENT_MODEL_CONFIG.provider === "lovable" && GROK_API_KEY) {
          CURRENT_MODEL_CONFIG = {
            provider: "grok",
            endpoint: "https://api.x.ai/v1/chat/completions",
            model: "grok-4-latest",
            temperature: 0.2,
          };
        } else {
          send({ phase: "failed", error: "AI service not configured" });
          close();
          return;
        }
      }

      const FINAL_AI_KEY = CURRENT_MODEL_CONFIG.provider === "lovable" ? LOVABLE_API_KEY : GROK_API_KEY;
      if (!FINAL_AI_KEY) {
        send({ phase: "failed", error: "AI service not available" });
        close();
        return;
      }

      // Credit check
      const { data: userData } = await supabase
        .from("users")
        .select("credit_balance, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (!userData || userData.credit_balance < DEEP_SEARCH_CONFIG.BASE_COST) {
        send({ 
          phase: "failed", 
          error: "Insufficient credits for deep research",
          insufficientCredits: true,
          requiredCredits: DEEP_SEARCH_CONFIG.BASE_COST
        });
        close();
        return;
      }

      const queryType = classifyQuery(sanitizedQuery);

      // Create research task
      const { data: taskData, error: taskError } = await supabase
        .from("research_tasks")
        .insert({
          user_id: user.id,
          conversation_id: conversationId || null,
          query: sanitizedQuery,
          phase: "planning",
        })
        .select()
        .single();

      if (taskError || !taskData) {
        send({ phase: "failed", error: "Failed to create research task" });
        close();
        return;
      }

      const taskId = taskData.id;

      // ============ PHASE 1: PLANNING ============
      send({ phase: "planning", message: "Deconstructing your research request...", queryType });

      let plan = createFallbackPlan(queryType, sanitizedQuery);
      
      if (FINAL_AI_KEY) {
        const planResult = await callAI(
          FINAL_AI_KEY,
          PLANNER_SYSTEM_PROMPT,
          `Research Query: ${sanitizedQuery}\n\nCreate a comprehensive deep research plan. Output JSON only.`,
          { jsonMode: true }
        );

        if (planResult.success && planResult.content) {
          try {
            plan = JSON.parse(planResult.content);
          } catch {
            console.log("Using fallback plan");
          }
        }
      }

      await supabase
        .from("research_tasks")
        .update({ plan, phase: "searching" })
        .eq("id", taskId);

      // ============ PHASES 2-4: DEEP RESEARCH ============
      let researchResult: ResearchResult;

      if (PERPLEXITY_API_KEY && FIRECRAWL_API_KEY) {
        researchResult = await executeDeepResearch(
          sanitizedQuery,
          queryType,
          plan,
          { perplexity: PERPLEXITY_API_KEY, firecrawl: FIRECRAWL_API_KEY },
          send
        );
      } else {
        // Fallback to just Perplexity if Firecrawl unavailable
        send({ phase: "searching", message: "Searching for information...", searchCount: 0 });
        
        const searches = plan.parallel_searches || generateDefaultSearches(sanitizedQuery, queryType);
        let content = "";
        const sources: Array<{ url: string; title: string; snippet: string; type: string; relevance: number }> = [];
        let searchCount = 0;

        for (const search of searches.slice(0, 4)) {
          if (PERPLEXITY_API_KEY) {
            const result = await webSearchPerplexity(PERPLEXITY_API_KEY, search.query);
            if (result.success && result.content) {
              content += `\n\n### ${search.purpose}\n${result.content}`;
              result.citations?.forEach((url, idx) => {
                if (url && !sources.some(s => s.url === url)) {
                  sources.push({ url, title: extractDomain(url), snippet: "", type: "search", relevance: 1 - idx * 0.1 });
                }
              });
              searchCount++;
            }
          }
        }

        researchResult = {
          content,
          sources,
          searchCount,
          scrapeCount: 0,
          credits: DEEP_SEARCH_CONFIG.BASE_COST + searchCount * DEEP_SEARCH_CONFIG.COST_PER_SEARCH,
          confidence: 0.6,
          iterations: 1
        };
      }

      // Save sources
      for (const source of researchResult.sources) {
        await supabase.from("research_sources").insert({
          task_id: taskId,
          url: source.url,
          title: source.title,
          snippet: source.snippet,
          source_type: source.type,
          relevance_score: source.relevance,
        });
      }

      // ============ PHASE 5: VALIDATION ============
      send({ phase: "validating", message: "Cross-referencing and validating findings...", sourceCount: researchResult.sources.length });

      await supabase
        .from("research_tasks")
        .update({ execution_steps: [], sources: researchResult.sources, phase: "validating" })
        .eq("id", taskId);

      let validationNotes: string[] = [];
      
      if (researchResult.content.length < 200) {
        validationNotes.push("Limited data retrieved - findings should be verified independently");
      }
      
      if (researchResult.sources.length < 3) {
        validationNotes.push("Fewer sources than optimal - recommend additional verification");
      }

      // AI validation
      if (FINAL_AI_KEY && researchResult.content.length > 100) {
        const validationResult = await callAI(
          FINAL_AI_KEY,
          VALIDATOR_SYSTEM_PROMPT,
          `Validate findings for: "${sanitizedQuery}"\n\nFINDINGS:\n${researchResult.content.slice(0, 6000)}\n\nSOURCES: ${researchResult.sources.length}`,
          { jsonMode: true }
        );

        if (validationResult.success && validationResult.content) {
          try {
            const validation = JSON.parse(validationResult.content);
            if (validation.issues?.length) validationNotes.push(...validation.issues);
            if (validation.confidence_score < 0.7) validationNotes.push("Moderate confidence - verify key findings");
          } catch { /* ignore */ }
        }
      }

      // ============ PHASE 6: SYNTHESIS ============
      send({ phase: "generating", message: "Synthesizing intelligence report..." });

      await supabase.from("research_tasks").update({ phase: "generating" }).eq("id", taskId);

      const sourceList = researchResult.sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join("\n");
      
      const generationPrompt = `Transform research findings into strategy-grade intelligence.

═══════════════════════════════════════════════════════════════
USER QUERY: ${sanitizedQuery}
QUERY TYPE: ${queryType}
FORMAT: ${plan.expected_output_format || "report"}
═══════════════════════════════════════════════════════════════

RESEARCH FINDINGS:
${researchResult.content || "Limited data available."}

SOURCES (${researchResult.sources.length} total):
${sourceList || "Limited sources."}

VALIDATION NOTES:
${validationNotes.join("\n") || "Findings validated."}

═══════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS:
1. ADAPT structure to query type
2. Include REASONING and INTERPRETATION
3. Use ONLY data from research findings
4. Make ACTIONABLE recommendations
5. Format sources at END only: **Sources:** Name1 · Name2 · Name3
6. Tables OPTIONAL, must be clean and Excel-ready
═══════════════════════════════════════════════════════════════`;

      let finalContent = "";
      const synthesizerPrompt = getSynthesizerPromptWithDomain(activeDomain);
      
      const streamResult = await callAIStreaming(
        FINAL_AI_KEY,
        synthesizerPrompt,
        generationPrompt,
        (chunk: string) => { send({ phase: "generating", content: chunk }); }
      );

      if (!streamResult.success || !streamResult.content) {
        const fallbackResult = await callAI(FINAL_AI_KEY, synthesizerPrompt, generationPrompt);
        
        if (!fallbackResult.success) {
          send({ phase: "failed", error: "Failed to generate response" });
          await supabase.from("research_tasks").update({ phase: "failed", error_message: fallbackResult.error }).eq("id", taskId);
          close();
          return;
        }
        
        finalContent = fallbackResult.content || "";
        for (let i = 0; i < finalContent.length; i += 50) {
          send({ phase: "generating", content: finalContent.slice(i, i + 50) });
          await new Promise(r => setTimeout(r, 10));
        }
      } else {
        finalContent = streamResult.content;
      }

      // Deduct credits
      const finalCredits = Math.min(researchResult.credits, DEEP_SEARCH_CONFIG.MAX_CREDITS);
      await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: finalCredits,
        p_description: `Deep Research - ${queryType} (${researchResult.searchCount} searches, ${researchResult.scrapeCount} scrapes)`
      });

      // Complete task
      await supabase
        .from("research_tasks")
        .update({
          phase: "completed",
          final_answer: finalContent,
          credits_used: finalCredits,
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);

      send({
        phase: "completed",
        sources: researchResult.sources,
        creditsUsed: finalCredits,
        taskId,
        queryType,
        modelUsed: CURRENT_MODEL_CONFIG.provider === "lovable" ? "GPT-4.1" : "Grok-4",
        searchCount: researchResult.searchCount,
        scrapeCount: researchResult.scrapeCount
      });

      close();
    } catch (error) {
      console.error("Research agent error:", error);
      send({ phase: "failed", error: error instanceof Error ? error.message : "Research failed" });
      close();
    }
  })();

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
});
