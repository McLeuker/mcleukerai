import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// ═══════════════════════════════════════════════════════════════
// NO-SILENCE, ALWAYS-DELIVER MODE - MCLEUKER AI BEHAVIORAL CONTRACT
// ═══════════════════════════════════════════════════════════════
const NO_SILENCE_CONFIG = {
  HEARTBEAT_INTERVAL: 5000,      // Send progress every 5 seconds
  MAX_SILENT_TIME: 10000,        // Max 10 seconds without update
  PARTIAL_OUTPUT_THRESHOLD: 3000, // Deliver partial after 30s of no progress
  ALWAYS_DELIVER_FALLBACK: true,  // Always return something usable
};

// Confidence levels for transparency
type ConfidenceLevel = "high" | "medium" | "low" | "exploratory";

interface ConfidenceAnnotation {
  level: ConfidenceLevel;
  score: number;
  reasoning: string;
  source_count: number;
  data_freshness: "real-time" | "recent" | "historical" | "mixed";
  gaps: string[];
}

function calculateConfidence(metadata: {
  total_sources: number;
  avg_confidence: number;
  duration_ms: number;
}): ConfidenceAnnotation {
  const score = metadata.avg_confidence;
  let level: ConfidenceLevel;
  
  if (score >= 0.85 && metadata.total_sources >= 10) {
    level = "high";
  } else if (score >= 0.7 && metadata.total_sources >= 5) {
    level = "medium";
  } else if (score >= 0.5 && metadata.total_sources >= 2) {
    level = "low";
  } else {
    level = "exploratory";
  }

  return {
    level,
    score,
    reasoning: level === "high" 
      ? "Multiple corroborating sources with consistent data" 
      : level === "medium"
      ? "Good source coverage with some verification gaps"
      : level === "low"
      ? "Limited sources - findings should be verified independently"
      : "Exploratory results - treat as starting point for deeper research",
    source_count: metadata.total_sources,
    data_freshness: metadata.duration_ms < 60000 ? "real-time" : "recent",
    gaps: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED FALLBACK OUTPUT - Query-aware, always helpful
// ═══════════════════════════════════════════════════════════════

// Intent detection for better fallbacks
function detectFallbackIntent(prompt: string): "supplier" | "trend" | "personal" | "technical" | "creative" | "general" {
  const p = prompt.toLowerCase();
  if (/\b(supplier|manufacturer|vendor|factory|sourcing|procurement)\b/i.test(p)) return "supplier";
  if (/\b(trend|fashion|style|season|runway|forecast)\b/i.test(p)) return "trend";
  if (/\b(feel|life|advice|help me|worried|stressed|relationship)\b/i.test(p)) return "personal";
  if (/\b(code|api|implement|function|error|debug)\b/i.test(p)) return "technical";
  if (/\b(write|poem|story|creative|imagine)\b/i.test(p)) return "creative";
  return "general";
}

// Generate fallback output when research fails or is incomplete
function generateFallbackOutput(prompt: string, phase: string, partialData?: unknown): string {
  const timestamp = new Date().toISOString();
  const intent = detectFallbackIntent(prompt);
  const queryPreview = prompt.length > 100 ? prompt.slice(0, 100) + "..." : prompt;
  
  // Intent-specific fallback templates
  const intentTemplates: Record<string, string> = {
    supplier: `## Supplier Research - Partial Results

**Your Query:** ${queryPreview}

I encountered some challenges gathering complete supplier data, but here's what I can offer:

### General Sourcing Guidance

When researching suppliers, consider these key factors:
- **Certifications**: Look for GOTS, OEKO-TEX, B Corp, or GRS certified manufacturers
- **MOQ Requirements**: Start with suppliers offering lower minimums for initial orders
- **Lead Times**: Factor in 4-8 weeks for sampling, 8-16 weeks for production
- **Communication**: Prioritize suppliers with responsive English-speaking contacts

### Recommended Directories
- Maker's Row (US-focused manufacturing)
- Kompass (European suppliers)
- Alibaba Verified Suppliers
- Industry trade show exhibitor lists

Would you like me to focus on a specific region or certification?`,

    trend: `## Trend Analysis - Partial Insights

**Your Query:** ${queryPreview}

I'm working on gathering complete trend data. Here's what I can share:

### Current Market Signals

Based on recent industry observations:
- **Sustainability Focus**: Continued emphasis on eco-friendly materials and transparency
- **Digital Integration**: Growing importance of digital-first brand strategies
- **Consumer Shifts**: Increased demand for versatile, quality-focused pieces

### Key Sources to Monitor
- Fashion week coverage (Vogue, WWD, BoF)
- Street style platforms and influencer signals
- Trade publication forecasts

I'm still working on getting more specific data. Feel free to narrow your query for focused insights.`,

    personal: `I want to acknowledge your question and provide what insight I can.

While I'm working through some technical challenges, I'm still here to help. What you're asking matters.

Sometimes it helps to break things down into smaller pieces. Could you tell me what feels most pressing right now? I'll do my best to offer thoughtful guidance.`,

    technical: `## Technical Assistance

I ran into some issues processing your technical query about "${queryPreview}".

**Here's what I suggest:**
- Share specific error messages or code snippets
- Break down complex problems into smaller parts
- Specify the technology stack you're working with

I'm ready to help once you provide more details.`,

    creative: `I'd love to help with your creative request about "${queryPreview}".

While I work through some technical challenges, could you tell me more about:
- The tone or style you're looking for
- Any specific elements to include
- The intended audience or purpose

The more context you share, the better I can craft something meaningful.`,

    general: `## Research Status: Working on It

**Your Query:** ${queryPreview}

I encountered some challenges gathering complete information, but I'm still working on your request.

### What I Can Offer

${partialData ? `Based on available data, here's a preview of findings:\n${JSON.stringify(partialData, null, 2).slice(0, 1000)}` : "I'm gathering data from multiple sources. In the meantime:"}

**Suggestions:**
- Try rephrasing with more specific details
- Break complex questions into smaller parts
- Specify a particular region, time frame, or category

I'm still here to help - feel free to try again or narrow your focus.`,
  };
  
  return intentTemplates[intent] + `

---
*This is a best-effort response. McLeuker AI never leaves you empty-handed.*
*Timestamp: ${timestamp}*`;
}

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

  // NO-SILENCE: Background processor with heartbeat
  (async () => {
    const startTime = Date.now();
    let lastUpdate = Date.now();
    let currentPhase = "starting";
    let partialData: Record<string, unknown> = {};
    let creditsUsed = 0;
    let prompt = "";

    // Heartbeat interval to prevent silence
    const heartbeatInterval = setInterval(() => {
      const silentTime = Date.now() - lastUpdate;
      if (silentTime > NO_SILENCE_CONFIG.HEARTBEAT_INTERVAL) {
        send("heartbeat", { 
          phase: currentPhase, 
          message: `Still working on ${currentPhase}...`,
          elapsed_ms: Date.now() - startTime,
          partial_available: Object.keys(partialData).length > 0,
        });
        lastUpdate = Date.now();
      }
    }, NO_SILENCE_CONFIG.HEARTBEAT_INTERVAL);

    // Helper to update state and prevent silence
    const updatePhase = (phase: string, message: string, progress: number, data?: unknown) => {
      currentPhase = phase;
      lastUpdate = Date.now();
      if (data) {
        partialData = { ...partialData, [phase]: data };
      }
      send("phase", { phase, message, progress, data });
    };

    try {
      const body = await req.json();
      prompt = body.prompt;
      const deep_mode = body.deep_mode || false;
      const user_id = body.user_id;

      if (!prompt) {
        send("error", { message: "Prompt is required" });
        clearInterval(heartbeatInterval);
        close();
        return;
      }

      // ========== PHASE 1: Task Interpretation ==========
      updatePhase("interpreting", "Understanding your request...", 10);

      let taskPlan: TaskPlan | null = null;
      try {
        const interpretResult = await callEdgeFunction("task-interpreter", { prompt }) as {
          success: boolean;
          taskPlan: TaskPlan;
        };

        if (interpretResult.success && interpretResult.taskPlan) {
          taskPlan = interpretResult.taskPlan;
          creditsUsed += 1;
          updatePhase("interpreting", `Detected: ${taskPlan.intent}`, 20, { taskPlan });
        }
      } catch (err) {
        console.error("Task interpretation error:", err);
        // NO-SILENCE: Continue with fallback plan
        taskPlan = {
          intent: "general research",
          domains: ["general"],
          requires_real_time_research: true,
          research_depth: deep_mode ? "deep" : "standard",
          outputs: ["report"],
          execution_plan: ["search", "synthesize"],
          confidence: 0.5,
          estimated_credits: 5,
        };
        updatePhase("interpreting", "Using standard research approach", 20, { taskPlan, fallback: true });
      }

      // ========== PHASE 2: Reasoning ==========
      updatePhase("reasoning", "Planning research strategy...", 25);

      let blueprint: ReasoningBlueprint | null = null;
      try {
        const reasoningResult = await callEdgeFunction("reasoning-layer", { 
          prompt, 
          taskPlan 
        }) as {
          success: boolean;
          blueprint: ReasoningBlueprint;
        };

        if (reasoningResult.success && reasoningResult.blueprint) {
          blueprint = reasoningResult.blueprint;
          creditsUsed += 2;
          updatePhase("reasoning", `${blueprint.research_questions.length} research questions defined`, 35, { 
            objectives: blueprint.reasoning_objectives,
            questions: blueprint.research_questions.slice(0, 3)
          });
        }
      } catch (err) {
        console.error("Reasoning error:", err);
        // NO-SILENCE: Create fallback blueprint
        blueprint = {
          task_summary: prompt,
          reasoning_objectives: ["Find relevant information", "Synthesize findings"],
          research_questions: [prompt],
          required_data_entities: [],
          data_structure_plan: { tables: [], documents: ["report"], presentations: [], web_outputs: [] },
          logic_steps: ["search", "synthesize"],
          quality_criteria: ["accuracy", "relevance"],
          risk_flags: ["using fallback reasoning"],
        };
        updatePhase("reasoning", "Using simplified research plan", 35, { blueprint, fallback: true });
      }

      // ========== PHASE 3: Web Research ==========
      updatePhase("researching", "Executing real-time research...", 40);

      interface WebResearchResponse {
        success: boolean;
        results: ResearchResult[];
        metadata: { total_sources: number; avg_confidence: number; duration_ms: number };
      }

      let researchResult: WebResearchResponse = {
        success: false,
        results: [],
        metadata: { total_sources: 0, avg_confidence: 0.3, duration_ms: 0 },
      };

      try {
        const webResearchResponse = await callEdgeFunction("web-research", {
          research_questions: blueprint?.research_questions || [prompt],
          deep_mode: deep_mode || taskPlan?.research_depth === "deep",
          max_sources: deep_mode ? 50 : 20,
        }) as WebResearchResponse;

        if (webResearchResponse?.success) {
          researchResult = webResearchResponse;
          creditsUsed += deep_mode ? 10 : 3;
          updatePhase("researching", `Found ${researchResult.metadata.total_sources} sources`, 65, {
            sourceCount: researchResult.metadata.total_sources,
            confidence: researchResult.metadata.avg_confidence,
          });
        } else {
          throw new Error("Research returned unsuccessful");
        }
      } catch (err) {
        console.error("Research error:", err);
        // NO-SILENCE: Create minimal research result
        researchResult = {
          success: true,
          results: [{
            question: prompt,
            sources: [],
            synthesis: "Research tools encountered temporary issues. Please try again.",
            confidence: 0.2,
          }],
          metadata: { total_sources: 0, avg_confidence: 0.2, duration_ms: Date.now() - startTime },
        };
        updatePhase("researching", "Limited data available - proceeding with best effort", 65, {
          sourceCount: 0,
          confidence: 0.2,
          fallback: true,
        });
      }

      // ========== PHASE 4: Structuring ==========
      updatePhase("structuring", "Organizing findings...", 70);

      let structured = { tables: [] as unknown[], report_outline: [] as unknown[], key_findings: [] as string[] };
      try {
        if (blueprint && researchResult) {
          structured = await structureData(blueprint, researchResult.results, taskPlan!);
          creditsUsed += 2;
        }
        updatePhase("structuring", `Created ${structured.tables.length} tables, ${structured.key_findings.length} findings`, 85, structured);
      } catch (err) {
        console.error("Structuring error:", err);
        // NO-SILENCE: Continue with empty structure
        structured.key_findings = ["Research completed with limited data - verify findings independently"];
        updatePhase("structuring", "Using simplified output structure", 85, { structured, fallback: true });
      }

      // ========== PHASE 5: Final Synthesis ==========
      updatePhase("executing", "Generating final report...", 90);

      let finalReport = "";
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      // Detect query intent for response styling
      const promptLower = prompt.toLowerCase();
      
      // ═══════════════════════════════════════════════════════════════
      // UNIFIED REASONING ENGINE - Intent Detection with Confidence
      // ═══════════════════════════════════════════════════════════════
      
      // Intent classification with confidence scoring
      const intentPatterns = {
        personal_emotional: {
          patterns: /\b(feel|lost|life|advice|should i|help me|worried|stressed|anxious|lonely|sad|happy|relationship|personal|stuck|overwhelmed|confused|scared|afraid)\b/i,
          weight: 0
        },
        technical: {
          patterns: /\b(api|code|implement|function|error|debug|sdk|token|endpoint|programming|javascript|python|typescript|react|sql)\b/i,
          weight: 0
        },
        creative: {
          patterns: /\b(write|poem|story|creative|imagine|compose|fiction|novel|song|lyrics)\b/i,
          weight: 0
        },
        business_research: {
          patterns: /\b(market|trend|supplier|manufacturer|industry|analysis|competitor|strategy|revenue|growth|forecast)\b/i,
          weight: 0
        },
        factual: {
          patterns: /\b(what is|who is|when did|where is|how many|define|explain|meaning)\b/i,
          weight: 0
        }
      };

      // Calculate intent confidence scores
      Object.keys(intentPatterns).forEach(key => {
        const pattern = intentPatterns[key as keyof typeof intentPatterns];
        const matches = promptLower.match(pattern.patterns);
        pattern.weight = matches ? matches.length * 25 : 0;
      });

      // Find highest confidence intent
      const sortedIntents = Object.entries(intentPatterns)
        .sort(([, a], [, b]) => b.weight - a.weight);
      
      const primaryIntent = sortedIntents[0];
      const primaryConfidence = Math.min(primaryIntent[1].weight, 100);
      const isAmbiguous = primaryConfidence < 80 || 
        (sortedIntents[1] && sortedIntents[1][1].weight > primaryConfidence * 0.6);

      const isPersonalQuery = primaryIntent[0] === "personal_emotional" && primaryConfidence >= 30;
      const isTechnicalQuery = primaryIntent[0] === "technical" && primaryConfidence >= 40;
      const isCreativeQuery = primaryIntent[0] === "creative" && primaryConfidence >= 30;
      const isBusinessQuery = primaryIntent[0] === "business_research" && primaryConfidence >= 40;

      // Emotional state detection
      const emotionalCues = {
        distress: /\b(lost|stuck|overwhelmed|confused|scared|worried|anxious|stressed|help)\b/i.test(promptLower),
        seeking_guidance: /\b(should i|what should|how do i|what can i|advice)\b/i.test(promptLower),
        neutral: !(/\b(lost|stuck|overwhelmed|confused|scared|worried|anxious|stressed|help|should|advice)\b/i.test(promptLower))
      };

      const emotionalState = emotionalCues.distress ? "distress" : 
                            emotionalCues.seeking_guidance ? "seeking_guidance" : "neutral";
      
      try {
        // Build the UNIFIED REASONING PROMPT
        const unifiedReasoningPrompt = `You are a Unified AI Agent that prioritizes REASONING, INTENT CLARITY, EMOTIONAL AWARENESS, and CONTINUITY.

═══════════════════════════════════════════════════════════════
CORE RULES (ABSOLUTE - VIOLATING ANY = FAILURE)
═══════════════════════════════════════════════════════════════

🚫 NEVER:
- Use preset headers like "REAL-TIME SNAPSHOT", "MARKET SIGNALS", "INDUSTRY IMPACT", "ACTIONABLE TAKEAWAYS"
- Jump to protocols/procedures without first understanding intent
- Ignore emotional undertones
- Output tables unless explicitly comparing data
- Use business/industry framing for personal questions
- Go silent or return empty output

✅ ALWAYS:
- Reason about what the user MEANS, FEELS, and EXPECTS
- Acknowledge ambiguity when confidence is low
- Provide something useful even if incomplete
- Ask clarifying questions when intent is unclear

═══════════════════════════════════════════════════════════════
INPUT ANALYSIS (ALREADY COMPUTED)
═══════════════════════════════════════════════════════════════

USER QUERY: "${prompt}"

DETECTED INTENT:
- Primary: ${primaryIntent[0].replace(/_/g, " ")} (${primaryConfidence}% confidence)
- Secondary: ${sortedIntents[1] ? sortedIntents[1][0].replace(/_/g, " ") + " (" + sortedIntents[1][1].weight + "%)" : "none"}
- Ambiguity detected: ${isAmbiguous ? "YES - must clarify" : "No"}
- Emotional state: ${emotionalState}

═══════════════════════════════════════════════════════════════
RESPONSE STRATEGY
═══════════════════════════════════════════════════════════════

${isAmbiguous ? `
**AMBIGUOUS QUERY - USE THIS STRUCTURE:**
1. Acknowledge the human state (short, natural, non-robotic)
2. Reflect the ambiguity (show you noticed it)
3. Offer 2-3 possible interpretations
4. Provide immediate value for the most likely case
5. Ask a single, gentle follow-up question

EXAMPLE (for reference only):
"Hey — I want to pause for a second, because that sentence sounds heavy.
When you say "my life got lost in Paris", do you mean:
- you're emotionally overwhelmed or feeling stuck,
- you're feeling alone or disoriented,
- or something practical went wrong?
If this is emotional: you're not weak for feeling this way.
Tell me what feels most urgent right now, and we'll tackle it together."
` : isPersonalQuery ? `
**PERSONAL/EMOTIONAL QUERY - USE THIS APPROACH:**
- Write like a thoughtful friend giving advice
- Use natural paragraphs, conversational warm tone
- NO headers, NO bullets, NO tables, NO business language
- Start directly with empathy and validation
- Offer practical, human advice
- End with genuine offer to help further
` : isTechnicalQuery ? `
**TECHNICAL QUERY - USE THIS APPROACH:**
- Use numbered steps for processes
- Include code blocks if relevant
- Be precise and actionable
- Focus on solving the technical problem
` : isCreativeQuery ? `
**CREATIVE REQUEST - USE THIS APPROACH:**
- Respond creatively without structured formatting
- Let the creative work speak for itself
- No meta-commentary unless asked
` : isBusinessQuery ? `
**BUSINESS/RESEARCH QUERY - USE THIS APPROACH:**
- Use structured analysis with CUSTOM headers that fit THIS query
- Tables only if comparing multiple items
- Present findings professionally but naturally
- Sources at end if citing data
` : `
**GENERAL QUERY - USE THIS APPROACH:**
- Direct answer first
- Supporting context after
- Keep it concise and helpful
`}

${!isPersonalQuery && !isCreativeQuery && !isAmbiguous && researchResult.results?.length > 0 ? `
═══════════════════════════════════════════════════════════════
RESEARCH DATA (only use if relevant to query type)
═══════════════════════════════════════════════════════════════

${researchResult.results.slice(0, 3).map(r => r.synthesis || "").filter(Boolean).join("\n\n") || "Limited research data."}

KEY FINDINGS:
${structured.key_findings.slice(0, 3).join("\n") || "None available"}
` : ''}

═══════════════════════════════════════════════════════════════
NOW GENERATE YOUR RESPONSE
═══════════════════════════════════════════════════════════════

Remember: The output should feel like it was written SPECIFICALLY for this user and this question.
${isAmbiguous ? "Since intent is unclear, you MUST ask a clarifying question." : ""}
${emotionalState === "distress" ? "User may be in distress - lead with empathy." : ""}`;

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
                content: unifiedReasoningPrompt
              },
              { 
                role: "user", 
                content: `Generate your response to: "${prompt}"`
              }
            ],
            max_tokens: 4000,
          }),
        });

        const synthesisData = await synthesisResponse.json();
        finalReport = synthesisData.choices?.[0]?.message?.content || "";
        creditsUsed += 3;

        // Post-process: Remove any accidentally generated banned headers
        const bannedHeaders = [
          /^#+\s*(REAL-TIME SNAPSHOT|CURRENT MARKET SIGNALS|INDUSTRY IMPACT|ACTIONABLE TAKEAWAYS|LOGISTICAL SIGNALS).*$/gim,
          /^●/gm,
          /Export as PDF/gi,
        ];
        
        bannedHeaders.forEach(pattern => {
          finalReport = finalReport.replace(pattern, "");
        });

      } catch (err) {
        console.error("Synthesis error:", err);
        // NO-SILENCE: Generate fallback report
        if (isPersonalQuery || isAmbiguous) {
          finalReport = `I want to make sure I understand what you're going through.

When you say "${prompt}", I'm not entirely sure if you're looking for:
- Emotional support and someone to listen
- Practical guidance on a specific situation
- General information or advice

Could you tell me a bit more about what's on your mind? I'm here to help however I can.`;
        } else {
          finalReport = generateFallbackOutput(prompt, "synthesis", partialData);
        }
      }

      // If report is empty, use appropriate fallback
      if (!finalReport.trim()) {
        if (isPersonalQuery || isAmbiguous) {
          finalReport = `I hear you, and I want to make sure I respond in a way that's actually helpful.

Could you tell me a bit more about your situation? Whether it's something you're feeling, a decision you're facing, or a practical problem, I'm here to help work through it with you.`;
        } else {
          finalReport = generateFallbackOutput(prompt, "empty_response", partialData);
        }
      }

      // Compile sources
      const allSources = researchResult?.results?.flatMap(r => 
        r.sources?.slice(0, 5).map(s => ({
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          relevance: s.relevance_score,
        })) || []
      ) || [];

      const duration = Date.now() - startTime;

      // Calculate confidence annotation
      const confidence = calculateConfidence(researchResult?.metadata || {
        total_sources: 0,
        avg_confidence: 0.3,
        duration_ms: duration,
      });

      // ========== COMPLETED - ALWAYS DELIVER ==========
      clearInterval(heartbeatInterval);
      
      send("phase", { 
        phase: "completed", 
        message: "Research complete", 
        progress: 100,
        data: {
          report: finalReport,
          sources: allSources,
          structured,
          confidence,
          metadata: {
            duration_ms: duration,
            credits_used: creditsUsed,
            source_count: researchResult?.metadata?.total_sources || 0,
            confidence_score: researchResult?.metadata?.avg_confidence || 0.3,
            confidence_level: confidence.level,
            deep_mode,
          }
        }
      });

      close();

    } catch (error) {
      // NO-SILENCE: Even on total failure, deliver something
      console.error("Agent orchestrator error:", error);
      clearInterval(heartbeatInterval);
      
      const fallbackReport = generateFallbackOutput(prompt || "unknown query", "failed", partialData);
      
      send("phase", { 
        phase: "completed",  // Note: "completed" not "failed" - we always deliver
        message: "Research completed with limitations",
        progress: 100,
        data: {
          report: fallbackReport,
          sources: [],
          structured: { tables: [], report_outline: [], key_findings: [] },
          confidence: {
            level: "exploratory" as ConfidenceLevel,
            score: 0.1,
            reasoning: "Research encountered issues - results are best-effort",
            source_count: 0,
            data_freshness: "mixed" as const,
            gaps: ["Full research not completed due to technical issues"],
          },
          metadata: {
            duration_ms: Date.now() - startTime,
            credits_used: creditsUsed,
            source_count: 0,
            confidence_score: 0.1,
            confidence_level: "exploratory",
            deep_mode: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
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
