import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Task interpretation tool schema
const interpretTaskTool = {
  type: "function",
  function: {
    name: "interpret_task",
    description: "Convert a user prompt into a structured task plan for execution",
    parameters: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          description: "Clear, action-oriented description of what the user wants to accomplish"
        },
        domains: {
          type: "array",
          items: {
            type: "string",
            enum: ["fashion", "beauty", "textile", "sustainability", "lifestyle", "technology", "market", "supply_chain", "general"]
          },
          description: "Industry domains relevant to the task"
        },
        requires_real_time_research: {
          type: "boolean",
          description: "Whether this task needs current web data vs static knowledge"
        },
        research_depth: {
          type: "string",
          enum: ["quick", "standard", "deep"],
          description: "How thorough the research should be"
        },
        outputs: {
          type: "array",
          items: {
            type: "string",
            enum: ["text", "excel", "csv", "pdf", "docx", "pptx", "web", "code"]
          },
          description: "Requested output formats"
        },
        execution_plan: {
          type: "array",
          items: {
            type: "string",
            enum: ["web_research", "data_structuring", "analysis", "comparison", "excel_generation", "pdf_generation", "pptx_generation", "code_generation"]
          },
          description: "Ordered steps to complete the task"
        },
        search_queries: {
          type: "array",
          items: { type: "string" },
          description: "Initial search queries to execute"
        },
        time_context: {
          type: "string",
          description: "Relevant time period (e.g., SS26, FW25, 2025, Q1 2026)"
        },
        geography: {
          type: "array",
          items: { type: "string" },
          description: "Geographic focus areas"
        }
      },
      required: ["intent", "domains", "requires_real_time_research", "research_depth", "outputs", "execution_plan"]
    }
  }
};

const SYSTEM_PROMPT = `You are the Task Interpretation Layer of an agentic AI platform.

Your job is to convert user prompts into structured, executable task plans.

Rules:
1. Identify the core intent in action-oriented language
2. Detect all relevant domains (can be multiple)
3. Determine if real-time web research is needed (most professional tasks do)
4. Assess research depth: quick (1-2 sources), standard (5-10 sources), deep (20+ sources)
5. Identify requested output formats (Excel for lists/data, PDF for reports, PPT for presentations)
6. Create an ordered execution plan
7. Generate initial search queries
8. Extract time context (seasons like SS26, FW25, years, quarters)
9. Identify geographic focus

Domain detection guide:
- "supplier", "factory", "manufacturer" → supply_chain
- "trend", "forecast", "prediction" → market
- "sustainable", "eco", "ethical" → sustainability
- "fabric", "material", "fiber" → textile
- "brand", "collection", "runway" → fashion
- "skincare", "cosmetic", "makeup" → beauty
- "lifestyle", "wellness", "consumer" → lifestyle

Output format detection:
- "list", "table", "spreadsheet", "data" → excel
- "report", "analysis", "document" → pdf
- "presentation", "deck", "slides" → pptx
- "compare", "comparison" → excel + pdf

Research depth guide:
- Simple questions, single data points → quick
- Multi-faceted analysis, multiple sources needed → standard  
- Comprehensive research, competitor analysis, trend forecasting → deep

Always respond using the interpret_task function.`;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[Task Interpreter] Processing: ${prompt.slice(0, 100)}...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this request and create a task plan:\n\n"${prompt}"` }
        ],
        tools: [interpretTaskTool],
        tool_choice: { type: "function", function: { name: "interpret_task" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "interpret_task") {
      throw new Error("Failed to interpret task");
    }

    let taskPlan: TaskPlan;
    try {
      taskPlan = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse task plan:", e);
      throw new Error("Failed to parse task interpretation");
    }

    // Enhance with validation and defaults
    taskPlan = enhanceTaskPlan(taskPlan, prompt);

    console.log(`[Task Interpreter] Result:`, JSON.stringify(taskPlan, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        taskPlan,
        metadata: {
          model: "google/gemini-3-flash-preview",
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Task interpreter error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function enhanceTaskPlan(plan: TaskPlan, prompt: string): TaskPlan {
  const lowerPrompt = prompt.toLowerCase();

  // Ensure outputs are detected from prompt
  if (!plan.outputs || plan.outputs.length === 0) {
    plan.outputs = ["text"];
  }
  
  // Detect output formats from prompt text
  if ((lowerPrompt.includes("excel") || lowerPrompt.includes("spreadsheet") || lowerPrompt.includes("table")) && !plan.outputs.includes("excel")) {
    plan.outputs.push("excel");
  }
  if ((lowerPrompt.includes("pdf") || lowerPrompt.includes("report")) && !plan.outputs.includes("pdf")) {
    plan.outputs.push("pdf");
  }
  if ((lowerPrompt.includes("ppt") || lowerPrompt.includes("presentation") || lowerPrompt.includes("deck") || lowerPrompt.includes("slides")) && !plan.outputs.includes("pptx")) {
    plan.outputs.push("pptx");
  }

  // Detect time context
  if (!plan.time_context) {
    const seasonMatch = prompt.match(/\b(SS|FW|AW|PF|Resort)\s*'?(\d{2}|\d{4})\b/i);
    if (seasonMatch) {
      plan.time_context = seasonMatch[0].toUpperCase();
    } else {
      const yearMatch = prompt.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        plan.time_context = yearMatch[1];
      }
    }
  }

  // Detect geography
  if (!plan.geography || plan.geography.length === 0) {
    const geoPatterns = [
      { pattern: /\b(europe|european|eu)\b/i, value: "Europe" },
      { pattern: /\b(asia|asian)\b/i, value: "Asia" },
      { pattern: /\b(north america|usa|us|american)\b/i, value: "North America" },
      { pattern: /\b(china|chinese)\b/i, value: "China" },
      { pattern: /\b(japan|japanese)\b/i, value: "Japan" },
      { pattern: /\b(korea|korean)\b/i, value: "Korea" },
      { pattern: /\b(italy|italian)\b/i, value: "Italy" },
      { pattern: /\b(france|french)\b/i, value: "France" },
      { pattern: /\b(uk|british|england)\b/i, value: "UK" },
      { pattern: /\b(germany|german)\b/i, value: "Germany" },
    ];
    
    plan.geography = geoPatterns
      .filter(p => p.pattern.test(prompt))
      .map(p => p.value);
  }

  // Calculate estimated credits
  const depthMultiplier = plan.research_depth === "deep" ? 15 : plan.research_depth === "standard" ? 5 : 2;
  const outputMultiplier = plan.outputs.filter(o => o !== "text").length;
  plan.estimated_credits = depthMultiplier + (outputMultiplier * 2);

  // Calculate confidence
  const hasIntent = plan.intent && plan.intent.length > 10;
  const hasDomains = plan.domains && plan.domains.length > 0;
  const hasSearchQueries = plan.search_queries && plan.search_queries.length > 0;
  
  plan.confidence = 0.5 + 
    (hasIntent ? 0.2 : 0) + 
    (hasDomains ? 0.15 : 0) + 
    (hasSearchQueries ? 0.15 : 0);

  // Ensure execution plan includes file generation for requested outputs
  if (!plan.execution_plan.includes("excel_generation") && plan.outputs.includes("excel")) {
    plan.execution_plan.push("excel_generation");
  }
  if (!plan.execution_plan.includes("pdf_generation") && plan.outputs.includes("pdf")) {
    plan.execution_plan.push("pdf_generation");
  }
  if (!plan.execution_plan.includes("pptx_generation") && plan.outputs.includes("pptx")) {
    plan.execution_plan.push("pptx_generation");
  }

  return plan;
}
