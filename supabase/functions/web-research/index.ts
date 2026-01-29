import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Types for research
interface ResearchQuestion {
  query: string;
  priority: "high" | "medium" | "low";
  entityTypes?: string[];
}

interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  content?: string;
  source_type: "search" | "crawl" | "ai_synthesis";
  relevance_score: number;
  timestamp: string;
  tool_used: string;
}

interface ResearchResult {
  question: string;
  sources: ResearchSource[];
  synthesis?: string;
  confidence: number;
  tool_stats: {
    perplexity_calls: number;
    firecrawl_calls: number;
    total_sources: number;
  };
}

// Perplexity search with AI synthesis
async function searchWithPerplexity(
  query: string,
  apiKey: string,
  options?: { recency?: string; domains?: string[] }
): Promise<{ sources: ResearchSource[]; synthesis: string }> {
  console.log(`[Perplexity] Searching: ${query}`);
  
  const body: Record<string, unknown> = {
    model: "sonar",
    messages: [
      { role: "system", content: "You are a professional research assistant. Provide factual, well-sourced information with specific details, numbers, and dates when available." },
      { role: "user", content: query }
    ],
    max_tokens: 2000,
  };

  if (options?.recency) {
    body.search_recency_filter = options.recency;
  }
  if (options?.domains && options.domains.length > 0) {
    body.search_domain_filter = options.domains;
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Perplexity] Error: ${response.status}`, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const synthesis = data.choices?.[0]?.message?.content || "";
  const citations = data.citations || [];

  const sources: ResearchSource[] = citations.map((url: string, idx: number) => ({
    url,
    title: `Source ${idx + 1}`,
    snippet: "",
    source_type: "ai_synthesis" as const,
    relevance_score: 0.8 - (idx * 0.05),
    timestamp: new Date().toISOString(),
    tool_used: "perplexity",
  }));

  console.log(`[Perplexity] Found ${sources.length} citations`);
  return { sources, synthesis };
}

// Firecrawl search for web results
async function searchWithFirecrawl(
  query: string,
  apiKey: string,
  options?: { limit?: number; scrape?: boolean }
): Promise<ResearchSource[]> {
  console.log(`[Firecrawl] Searching: ${query}`);
  
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: options?.limit || 10,
      scrapeOptions: options?.scrape ? { formats: ["markdown"] } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Firecrawl] Error: ${response.status}`, errorText);
    throw new Error(`Firecrawl API error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.data || [];

  const sources: ResearchSource[] = results.map((result: any, idx: number) => ({
    url: result.url || "",
    title: result.title || `Result ${idx + 1}`,
    snippet: result.description || "",
    content: result.markdown || undefined,
    source_type: "search" as const,
    relevance_score: 0.9 - (idx * 0.05),
    timestamp: new Date().toISOString(),
    tool_used: "firecrawl",
  }));

  console.log(`[Firecrawl] Found ${sources.length} results`);
  return sources;
}

// Firecrawl scrape for deep content extraction
async function scrapeWithFirecrawl(
  url: string,
  apiKey: string
): Promise<ResearchSource | null> {
  console.log(`[Firecrawl] Scraping: ${url}`);
  
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.error(`[Firecrawl] Scrape failed for ${url}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const scraped = data.data || data;

    return {
      url,
      title: scraped.metadata?.title || url,
      snippet: scraped.metadata?.description || "",
      content: scraped.markdown || "",
      source_type: "crawl",
      relevance_score: 0.95,
      timestamp: new Date().toISOString(),
      tool_used: "firecrawl_scrape",
    };
  } catch (error) {
    console.error(`[Firecrawl] Scrape error for ${url}:`, error);
    return null;
  }
}

// Main research orchestrator
async function executeResearch(
  questions: string[],
  config: {
    perplexityKey?: string;
    firecrawlKey?: string;
    deepMode: boolean;
    maxSourcesPerQuestion: number;
    domains?: string[];
  }
): Promise<ResearchResult[]> {
  const results: ResearchResult[] = [];
  
  for (const question of questions) {
    console.log(`\n=== Researching: ${question} ===`);
    
    const sources: ResearchSource[] = [];
    let synthesis = "";
    let perplexityCalls = 0;
    let firecrawlCalls = 0;

    // Step 1: Perplexity for AI-synthesized search
    if (config.perplexityKey) {
      try {
        const perplexityResult = await searchWithPerplexity(
          question,
          config.perplexityKey,
          { recency: "month", domains: config.domains }
        );
        sources.push(...perplexityResult.sources);
        synthesis = perplexityResult.synthesis;
        perplexityCalls++;
      } catch (error) {
        console.error("[Perplexity] Failed:", error);
      }
    }

    // Step 2: Firecrawl search for additional sources
    if (config.firecrawlKey) {
      try {
        const firecrawlResults = await searchWithFirecrawl(
          question,
          config.firecrawlKey,
          { limit: config.deepMode ? 15 : 5, scrape: config.deepMode }
        );
        sources.push(...firecrawlResults);
        firecrawlCalls++;
      } catch (error) {
        console.error("[Firecrawl] Search failed:", error);
      }
    }

    // Step 3: Deep scrape top sources (if deep mode)
    if (config.deepMode && config.firecrawlKey) {
      const topUrls = sources
        .filter(s => s.source_type === "search" && !s.content)
        .slice(0, 3)
        .map(s => s.url);

      for (const url of topUrls) {
        try {
          const scraped = await scrapeWithFirecrawl(url, config.firecrawlKey);
          if (scraped) {
            // Update existing source with content
            const existing = sources.find(s => s.url === url);
            if (existing) {
              existing.content = scraped.content;
              existing.source_type = "crawl";
            } else {
              sources.push(scraped);
            }
            firecrawlCalls++;
          }
        } catch (error) {
          console.error(`[Firecrawl] Scrape failed for ${url}:`, error);
        }
      }
    }

    // Deduplicate sources by URL
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.url, s])).values()
    ).sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, config.maxSourcesPerQuestion);

    // Calculate confidence based on source quality
    const confidence = Math.min(
      0.95,
      0.5 + (uniqueSources.length * 0.05) + (synthesis ? 0.2 : 0)
    );

    results.push({
      question,
      sources: uniqueSources,
      synthesis,
      confidence,
      tool_stats: {
        perplexity_calls: perplexityCalls,
        firecrawl_calls: firecrawlCalls,
        total_sources: uniqueSources.length,
      },
    });
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      research_questions, 
      deep_mode = false,
      max_sources = 20,
      preferred_domains,
      task_id
    } = await req.json();

    if (!research_questions || !Array.isArray(research_questions) || research_questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "research_questions array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API keys
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!perplexityKey && !firecrawlKey) {
      return new Response(
        JSON.stringify({ 
          error: "No research tools configured. Please connect Perplexity or Firecrawl." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting research with ${research_questions.length} questions (deep_mode: ${deep_mode})`);
    console.log(`Tools available: Perplexity: ${!!perplexityKey}, Firecrawl: ${!!firecrawlKey}`);

    const startTime = Date.now();

    // Execute research
    const results = await executeResearch(research_questions, {
      perplexityKey,
      firecrawlKey,
      deepMode: deep_mode,
      maxSourcesPerQuestion: Math.ceil(max_sources / research_questions.length),
      domains: preferred_domains,
    });

    const duration = Date.now() - startTime;

    // Aggregate stats
    const totalSources = results.reduce((sum, r) => sum + r.sources.length, 0);
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const totalPerplexityCalls = results.reduce((sum, r) => sum + r.tool_stats.perplexity_calls, 0);
    const totalFirecrawlCalls = results.reduce((sum, r) => sum + r.tool_stats.firecrawl_calls, 0);

    console.log(`\nResearch complete in ${duration}ms`);
    console.log(`Total sources: ${totalSources}, Avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        metadata: {
          task_id,
          duration_ms: duration,
          total_sources: totalSources,
          avg_confidence: avgConfidence,
          tools_used: {
            perplexity: totalPerplexityCalls > 0,
            firecrawl: totalFirecrawlCalls > 0,
          },
          api_calls: {
            perplexity: totalPerplexityCalls,
            firecrawl: totalFirecrawlCalls,
          },
          deep_mode,
          timestamp: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Web research error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
