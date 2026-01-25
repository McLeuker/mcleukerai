import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS
const allowedOrigins = [
  "https://mcleukerai.lovable.app",
  "https://www.mcleukerai.com",
  "https://mcleukerai.com",
  "https://id-preview--697e9ee9-fa45-4e69-8ad9-6a04c8a6c0f7.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Research agent phases
type ResearchPhase = "planning" | "searching" | "browsing" | "extracting" | "validating" | "generating" | "completed" | "failed";

// Tool definitions for the planner
const AVAILABLE_TOOLS = {
  web_search: {
    name: "web_search",
    description: "Search the web for current information using Perplexity AI",
    parameters: { query: "string", limit: "number" }
  },
  scrape_url: {
    name: "scrape_url",
    description: "Extract content from a specific URL using Firecrawl",
    parameters: { url: "string", format: "markdown" }
  },
  extract_structured: {
    name: "extract_structured",
    description: "Extract structured data from a page with a schema",
    parameters: { url: "string", schema: "object" }
  }
};

// Credit costs for research agent
const BASE_RESEARCH_COST = 8;
const COST_PER_SEARCH = 1;
const COST_PER_SCRAPE = 2;
const MAX_CREDITS_PER_TASK = 25;

// Fashion industry system prompt for planner
const PLANNER_SYSTEM_PROMPT = `You are a research planning agent for the fashion industry. Given a user query, create an execution plan using available tools.

AVAILABLE TOOLS:
1. web_search - Search the web for current information (query, limit)
2. scrape_url - Extract content from a specific URL (url, format: markdown)
3. extract_structured - Extract structured data with a schema (url, schema)

PLANNING RULES:
1. Break complex queries into 2-5 search steps
2. For supplier/company queries, plan to scrape company websites after searching
3. For market data, use multiple search queries for cross-validation
4. For trend analysis, search recent fashion week coverage and industry publications
5. Always validate findings with multiple sources when possible

OUTPUT STRICT JSON FORMAT:
{
  "reasoning": "Brief explanation of the research approach",
  "steps": [
    { "tool": "web_search", "params": { "query": "specific search query", "limit": 5 }, "purpose": "Why this step" },
    { "tool": "scrape_url", "params": { "url": "https://example.com" }, "purpose": "Why scraping this" }
  ],
  "validation_criteria": ["Criterion 1", "Criterion 2"]
}

Focus on fashion industry sources: WWD, BOF, Vogue Business, fashion week coverage, sustainability certifications (GOTS, OEKO-TEX), and manufacturer databases.`;

const FASHION_SYSTEM_PROMPT = `You are an expert fashion industry AI analyst. Your role is to synthesize research findings into professional, actionable intelligence.

When generating the final answer:
- Use clear headers and sections with markdown formatting
- Present data in tables where appropriate (supplier lists, comparisons)
- Use bullet points for key insights
- Include inline citations using [1], [2], etc. format
- Be professional, concise, and data-driven
- Focus on actionable insights

For different query types:
- Supplier Research: Table format with Supplier Name, Location, Specialization, MOQ, Certifications
- Trend Analysis: Organize by category (colors, materials, silhouettes) with seasonal relevance
- Market Intelligence: Include competitive landscape, market size, key opportunities
- Sustainability: Focus on certifications, compliance, action items`;

// Helper to send SSE events
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
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

// Call Perplexity for web search
async function webSearch(
  apiKey: string,
  query: string,
  limit: number = 5
): Promise<{ success: boolean; results?: Array<{ url: string; title: string; content: string }>; citations?: string[]; error?: string }> {
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You are a research assistant. Provide detailed, factual information with sources." },
          { role: "user", content: query }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    return {
      success: true,
      results: [{ url: "", title: query, content }],
      citations,
    };
  } catch (error) {
    console.error("Web search error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}

// Call Firecrawl to scrape a URL
async function scrapeUrl(
  apiKey: string,
  url: string
): Promise<{ success: boolean; content?: string; title?: string; error?: string }> {
  try {
    // Format URL if needed
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
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

// Call Lovable AI for planning and generation
async function callLovableAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  useToolCall: boolean = false,
  toolSchema?: Record<string, unknown>
): Promise<{ success: boolean; content?: string; toolOutput?: Record<string, unknown>; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    if (useToolCall && toolSchema) {
      body.tools = [
        {
          type: "function",
          function: {
            name: "create_research_plan",
            description: "Create a structured research plan with tool calls",
            parameters: {
              type: "object",
              properties: {
                reasoning: { type: "string", description: "Brief explanation of research approach" },
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tool: { type: "string", enum: ["web_search", "scrape_url", "extract_structured"] },
                      params: { type: "object" },
                      purpose: { type: "string" }
                    },
                    required: ["tool", "params", "purpose"]
                  }
                },
                validation_criteria: { type: "array", items: { type: "string" } }
              },
              required: ["reasoning", "steps", "validation_criteria"]
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "create_research_plan" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Lovable AI error:", response.status, t);
      if (response.status === 429) return { success: false, error: "Rate limit exceeded. Please try again shortly." };
      if (response.status === 402) return { success: false, error: "AI credits exhausted." };
      return { success: false, error: "AI service temporarily unavailable." };
    }

    const data = await response.json();
    
    // Handle tool call response
    if (useToolCall && data.choices?.[0]?.message?.tool_calls?.[0]) {
      const toolCall = data.choices[0].message.tool_calls[0];
      try {
        const toolOutput = JSON.parse(toolCall.function.arguments);
        return { success: true, toolOutput };
      } catch {
        return { success: false, error: "Failed to parse tool call response" };
      }
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { success: false, error: "Empty response from AI" };

    return { success: true, content };
  } catch (error) {
    console.error("Lovable AI error:", error);
    return { success: false, error: error instanceof Error ? error.message : "AI call failed" };
  }
}

// Main research agent handler
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Set up SSE stream
  const { stream, send, close } = createSSEStream();

  // Start processing in background
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

      const { query, conversationId } = await req.json();
      
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        send({ phase: "failed", error: "Invalid query" });
        close();
        return;
      }

      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 5000) {
        send({ phase: "failed", error: "Query too long (max 5000 characters)" });
        close();
        return;
      }

      // Get API keys
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

      if (!LOVABLE_API_KEY) {
        send({ phase: "failed", error: "AI service not configured" });
        close();
        return;
      }

      // Check user credits
      const { data: userData } = await supabase
        .from("users")
        .select("credit_balance, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (!userData || userData.credit_balance < BASE_RESEARCH_COST) {
        send({ phase: "failed", error: "Insufficient credits for research task" });
        close();
        return;
      }

      // Create research task record
      const { data: taskData, error: taskError } = await supabase
        .from("research_tasks")
        .insert({
          user_id: user.id,
          conversation_id: conversationId || null,
          query: trimmedQuery,
          phase: "planning",
        })
        .select()
        .single();

      if (taskError || !taskData) {
        console.error("Error creating research task:", taskError);
        send({ phase: "failed", error: "Failed to create research task" });
        close();
        return;
      }

      const taskId = taskData.id;
      let totalCredits = BASE_RESEARCH_COST;
      const allSources: Array<{ url: string; title: string; snippet: string; type: string }> = [];
      const executionSteps: Array<{ step: number; tool: string; status: string; message: string }> = [];

      // ============ PHASE 1: PLANNING ============
      send({ phase: "planning", message: "Analyzing your research request..." });

      const planResult = await callLovableAI(
        LOVABLE_API_KEY,
        PLANNER_SYSTEM_PROMPT,
        `Research Query: ${trimmedQuery}\n\nCreate a detailed research plan.`,
        true,
        { type: "object" }
      );

      let plan: { steps: Array<{ tool: string; params: Record<string, unknown>; purpose: string }>; validation_criteria: string[] };
      
      if (planResult.success && planResult.toolOutput) {
        plan = planResult.toolOutput as typeof plan;
      } else {
        // Fallback: create a simple plan
        plan = {
          steps: [
            { tool: "web_search", params: { query: trimmedQuery, limit: 5 }, purpose: "Primary research" }
          ],
          validation_criteria: ["Information accuracy", "Source reliability"]
        };
      }

      // Save plan (hidden from user)
      await supabase
        .from("research_tasks")
        .update({ plan: plan, phase: "searching" })
        .eq("id", taskId);

      // ============ PHASE 2: TOOL EXECUTION ============
      let researchFindings = "";
      
      for (let i = 0; i < plan.steps.length && i < 5; i++) {
        const step = plan.steps[i];
        
        if (step.tool === "web_search" && PERPLEXITY_API_KEY) {
          send({ phase: "searching", step: i + 1, total: plan.steps.length, message: `Searching: ${step.purpose}` });
          
          const searchQuery = (step.params.query as string) || trimmedQuery;
          const searchResult = await webSearch(PERPLEXITY_API_KEY, searchQuery, (step.params.limit as number) || 5);
          
          if (searchResult.success && searchResult.results) {
            researchFindings += `\n\n### Search: ${searchQuery}\n${searchResult.results.map(r => r.content).join("\n")}`;
            
            // Add citations as sources
            if (searchResult.citations) {
              searchResult.citations.forEach((url, idx) => {
                allSources.push({
                  url,
                  title: `Source ${allSources.length + 1}`,
                  snippet: "",
                  type: "search"
                });
              });
            }
            
            totalCredits += COST_PER_SEARCH;
            executionSteps.push({ step: i + 1, tool: "web_search", status: "completed", message: step.purpose });
          } else {
            executionSteps.push({ step: i + 1, tool: "web_search", status: "failed", message: searchResult.error || "Search failed" });
          }
        }
        
        if (step.tool === "scrape_url" && FIRECRAWL_API_KEY) {
          const url = step.params.url as string;
          if (url) {
            send({ phase: "browsing", step: i + 1, total: plan.steps.length, message: `Browsing: ${url}` });
            
            const scrapeResult = await scrapeUrl(FIRECRAWL_API_KEY, url);
            
            if (scrapeResult.success && scrapeResult.content) {
              // Limit content length to avoid token overflow
              const truncatedContent = scrapeResult.content.slice(0, 3000);
              researchFindings += `\n\n### Scraped: ${scrapeResult.title || url}\n${truncatedContent}`;
              
              allSources.push({
                url,
                title: scrapeResult.title || url,
                snippet: truncatedContent.slice(0, 200),
                type: "scrape"
              });
              
              totalCredits += COST_PER_SCRAPE;
              executionSteps.push({ step: i + 1, tool: "scrape_url", status: "completed", message: step.purpose });
            } else {
              executionSteps.push({ step: i + 1, tool: "scrape_url", status: "failed", message: scrapeResult.error || "Scrape failed" });
            }
          }
        }

        // Cap credits
        if (totalCredits >= MAX_CREDITS_PER_TASK) {
          console.log("Credit cap reached, stopping execution");
          break;
        }
      }

      // Save sources to database
      for (const source of allSources) {
        await supabase.from("research_sources").insert({
          task_id: taskId,
          url: source.url,
          title: source.title,
          snippet: source.snippet,
          source_type: source.type,
        });
      }

      // Update execution steps
      await supabase
        .from("research_tasks")
        .update({ execution_steps: executionSteps, sources: allSources, phase: "validating" })
        .eq("id", taskId);

      // ============ PHASE 3: VALIDATION ============
      send({ phase: "validating", message: "Verifying findings..." });

      // Simple validation - check we have some findings
      if (!researchFindings || researchFindings.length < 100) {
        // If no external findings, do a direct AI query
        const directResult = await callLovableAI(
          LOVABLE_API_KEY,
          FASHION_SYSTEM_PROMPT,
          trimmedQuery
        );
        if (directResult.success && directResult.content) {
          researchFindings = directResult.content;
        }
      }

      // ============ PHASE 4: GENERATION ============
      send({ phase: "generating", message: "Synthesizing research findings..." });

      await supabase
        .from("research_tasks")
        .update({ phase: "generating" })
        .eq("id", taskId);

      const sourceList = allSources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join("\n");
      
      const generationPrompt = `Based on the following research findings, generate a comprehensive professional response to the user's query.

USER QUERY: ${trimmedQuery}

RESEARCH FINDINGS:
${researchFindings}

AVAILABLE SOURCES:
${sourceList}

INSTRUCTIONS:
1. Synthesize the findings into a clear, professional response
2. Use inline citations like [1], [2] when referencing sources
3. Format with markdown headers, bullet points, and tables where appropriate
4. Focus on actionable insights for the fashion industry
5. If information is incomplete or uncertain, acknowledge it`;

      const generationResult = await callLovableAI(
        LOVABLE_API_KEY,
        FASHION_SYSTEM_PROMPT,
        generationPrompt
      );

      if (!generationResult.success || !generationResult.content) {
        send({ phase: "failed", error: generationResult.error || "Failed to generate response" });
        await supabase.from("research_tasks").update({ phase: "failed", error_message: generationResult.error }).eq("id", taskId);
        close();
        return;
      }

      // Stream the final answer
      const finalContent = generationResult.content;
      const chunkSize = 50;
      
      for (let i = 0; i < finalContent.length; i += chunkSize) {
        const chunk = finalContent.slice(i, i + chunkSize);
        send({ phase: "generating", content: chunk });
        await new Promise(r => setTimeout(r, 20));
      }

      // Deduct credits
      const { error: deductError } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: Math.min(totalCredits, MAX_CREDITS_PER_TASK),
        p_description: `Research Agent - ${plan.steps.length} steps`
      });

      if (deductError) {
        console.error("Credit deduction error:", deductError);
      }

      // Mark task as completed
      await supabase
        .from("research_tasks")
        .update({
          phase: "completed",
          final_answer: finalContent,
          credits_used: Math.min(totalCredits, MAX_CREDITS_PER_TASK),
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);

      // Send completion event with sources
      send({
        phase: "completed",
        sources: allSources,
        creditsUsed: Math.min(totalCredits, MAX_CREDITS_PER_TASK),
        taskId
      });

      close();
    } catch (error) {
      console.error("Research agent error:", error);
      send({ phase: "failed", error: "An unexpected error occurred" });
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
