import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Types
interface TaskPlan {
  intent: string;
  domains: string[];
  requires_real_time_research: boolean;
  research_depth: "quick" | "standard" | "deep";
  outputs: string[];
  execution_plan: string[];
  search_queries?: string[];
  time_context?: string;
  geography?: string[];
  confidence: number;
  estimated_credits: number;
}

interface ReasoningBlueprint {
  task_summary: string;
  reasoning_objectives: string[];
  research_questions: string[];
  required_data_entities: string[];
  data_structure_plan: {
    tables: string[];
    documents: string[];
    presentations: string[];
    web_outputs: string[];
  };
  logic_steps: string[];
  quality_criteria: string[];
  risk_flags: string[];
}

interface ResearchResult {
  question: string;
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    content?: string;
    source_type: string;
    relevance_score: number;
  }>;
  synthesis?: string;
  confidence: number;
}

interface AgentPhase {
  phase: "interpreting" | "reasoning" | "researching" | "structuring" | "executing" | "completed" | "failed";
  message: string;
  progress: number;
  data?: unknown;
}

// Helper to call internal edge functions
async function callEdgeFunction(functionName: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${functionName} failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// SSE helper
function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  const send = (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  const close = () => {
    controller.close();
  };

  return { stream, send, close };
}

// Structuring layer - transforms research into structured outputs
async function structureData(
  blueprint: ReasoningBlueprint,
  researchResults: ResearchResult[],
  taskPlan: TaskPlan
): Promise<{ tables: unknown[]; report_outline: unknown[]; key_findings: string[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Compile all research into a context
  const researchContext = researchResults.map(r => ({
    question: r.question,
    synthesis: r.synthesis,
    sources: r.sources.slice(0, 5).map(s => ({
      title: s.title,
      snippet: s.snippet?.slice(0, 200),
      url: s.url,
    })),
  }));

  const structuringPrompt = `You are a data structuring agent. Transform research findings into structured outputs.

## Task Summary
${blueprint.task_summary}

## Required Outputs
- Tables: ${blueprint.data_structure_plan.tables.join(", ") || "None"}
- Documents: ${blueprint.data_structure_plan.documents.join(", ") || "None"}
- Presentations: ${blueprint.data_structure_plan.presentations.join(", ") || "None"}

## Research Findings
${JSON.stringify(researchContext, null, 2)}

## Instructions
Based on the research, create:
1. Structured tables with columns and data rows
2. Report outline with sections and key points
3. Key findings as bullet points

Respond using the structure_outputs function.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a professional data structuring agent." },
        { role: "user", content: structuringPrompt }
      ],
      tools: [{
        type: "function",
        function: {
          name: "structure_outputs",
          description: "Structure research into tables, reports, and findings",
          parameters: {
            type: "object",
            properties: {
              tables: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    columns: { type: "array", items: { type: "string" } },
                    rows: { type: "array", items: { type: "array", items: { type: "string" } } }
                  }
                }
              },
              report_outline: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    section: { type: "string" },
                    content: { type: "string" },
                    key_points: { type: "array", items: { type: "string" } }
                  }
                }
              },
              key_findings: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["tables", "report_outline", "key_findings"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "structure_outputs" } }
    }),
  });

  if (!response.ok) {
    throw new Error(`Structuring failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    return { tables: [], report_outline: [], key_findings: [] };
  }

  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { stream, send, close } = createSSEStream();

  // Process in background
  (async () => {
    try {
      const { prompt, deep_mode = false, user_id } = await req.json();

      if (!prompt) {
        send("error", { message: "Prompt is required" });
        close();
        return;
      }

      const startTime = Date.now();
      let creditsUsed = 0;

      // ========== PHASE 1: Task Interpretation ==========
      send("phase", { 
        phase: "interpreting", 
        message: "Understanding your request...", 
        progress: 10 
      });

      const interpretResult = await callEdgeFunction("task-interpreter", { prompt }) as {
        success: boolean;
        taskPlan: TaskPlan;
      };

      if (!interpretResult.success || !interpretResult.taskPlan) {
        throw new Error("Task interpretation failed");
      }

      const taskPlan = interpretResult.taskPlan;
      creditsUsed += 1;

      send("phase", { 
        phase: "interpreting", 
        message: `Detected: ${taskPlan.intent}`, 
        progress: 20,
        data: { taskPlan }
      });

      // ========== PHASE 2: Reasoning ==========
      send("phase", { 
        phase: "reasoning", 
        message: "Planning research strategy...", 
        progress: 25 
      });

      const reasoningResult = await callEdgeFunction("reasoning-layer", { 
        prompt, 
        taskPlan 
      }) as {
        success: boolean;
        blueprint: ReasoningBlueprint;
      };

      if (!reasoningResult.success || !reasoningResult.blueprint) {
        throw new Error("Reasoning failed");
      }

      const blueprint = reasoningResult.blueprint;
      creditsUsed += 2;

      send("phase", { 
        phase: "reasoning", 
        message: `${blueprint.research_questions.length} research questions defined`, 
        progress: 35,
        data: { 
          objectives: blueprint.reasoning_objectives,
          questions: blueprint.research_questions.slice(0, 3)
        }
      });

      // ========== PHASE 3: Web Research ==========
      send("phase", { 
        phase: "researching", 
        message: "Executing real-time research...", 
        progress: 40 
      });

      const researchResult = await callEdgeFunction("web-research", {
        research_questions: blueprint.research_questions,
        deep_mode: deep_mode || taskPlan.research_depth === "deep",
        max_sources: deep_mode ? 50 : 20,
      }) as {
        success: boolean;
        results: ResearchResult[];
        metadata: {
          total_sources: number;
          avg_confidence: number;
          duration_ms: number;
        };
      };

      if (!researchResult.success) {
        throw new Error("Research failed");
      }

      creditsUsed += deep_mode ? 10 : 3;

      send("phase", { 
        phase: "researching", 
        message: `Found ${researchResult.metadata.total_sources} sources`, 
        progress: 65,
        data: {
          sourceCount: researchResult.metadata.total_sources,
          confidence: researchResult.metadata.avg_confidence,
        }
      });

      // ========== PHASE 4: Structuring ==========
      send("phase", { 
        phase: "structuring", 
        message: "Organizing findings...", 
        progress: 70 
      });

      const structured = await structureData(blueprint, researchResult.results, taskPlan);
      creditsUsed += 2;

      send("phase", { 
        phase: "structuring", 
        message: `Created ${structured.tables.length} tables, ${structured.key_findings.length} findings`, 
        progress: 85,
        data: structured
      });

      // ========== PHASE 5: Final Synthesis ==========
      send("phase", { 
        phase: "executing", 
        message: "Generating final report...", 
        progress: 90 
      });

      // Generate final markdown report
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const synthesisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { 
              role: "system", 
              content: `You are a professional analyst. Generate a comprehensive, well-structured report.
              
Rules:
- Write for industry professionals (designers, buyers, strategists)
- Focus on actionable insights, not generic overviews
- Include specific data points, names, and metrics
- No emojis, no fluff, no introductory platitudes
- Structure with clear headers and bullet points
- Tables should appear at the end as summaries` 
            },
            { 
              role: "user", 
              content: `Generate a professional report based on:

Task: ${blueprint.task_summary}

Research Findings:
${researchResult.results.map(r => `
### ${r.question}
${r.synthesis || "No synthesis available"}
Sources: ${r.sources.slice(0, 3).map(s => s.url).join(", ")}
`).join("\n")}

Key Findings:
${structured.key_findings.map(f => `- ${f}`).join("\n")}

Tables:
${JSON.stringify(structured.tables, null, 2)}` 
            }
          ],
          max_tokens: 4000,
        }),
      });

      const synthesisData = await synthesisResponse.json();
      const finalReport = synthesisData.choices?.[0]?.message?.content || "";
      creditsUsed += 3;

      // Compile sources
      const allSources = researchResult.results.flatMap(r => 
        r.sources.slice(0, 5).map(s => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          relevance: s.relevance_score,
        }))
      );

      const duration = Date.now() - startTime;

      // ========== COMPLETED ==========
      send("phase", { 
        phase: "completed", 
        message: "Research complete", 
        progress: 100,
        data: {
          report: finalReport,
          sources: allSources,
          structured,
          metadata: {
            duration_ms: duration,
            credits_used: creditsUsed,
            source_count: researchResult.metadata.total_sources,
            confidence: researchResult.metadata.avg_confidence,
            deep_mode,
          }
        }
      });

      close();

    } catch (error) {
      console.error("Agent orchestrator error:", error);
      send("phase", { 
        phase: "failed", 
        message: error instanceof Error ? error.message : "Unknown error",
        progress: 0 
      });
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
