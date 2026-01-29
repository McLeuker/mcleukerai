import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reasoning Blueprint schema for tool calling
const reasonTaskTool = {
  type: "function",
  function: {
    name: "reason_task",
    description: "Generate a structured reasoning blueprint to guide research, logic, and execution for an agentic AI system.",
    parameters: {
      type: "object",
      properties: {
        task_summary: {
          type: "string",
          description: "Concise restatement of the task in execution-oriented language."
        },
        reasoning_objectives: {
          type: "array",
          items: { type: "string" },
          description: "High-level objectives the system must achieve to complete the task successfully."
        },
        research_questions: {
          type: "array",
          items: { type: "string" },
          description: "Specific questions that must be answered through real-time research."
        },
        required_data_entities: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "brands", "companies", "products", "suppliers", "materials",
              "technologies", "markets", "trends", "pricing", "regulations",
              "certifications", "campaigns", "events", "statistics", "other"
            ]
          },
          description: "Types of structured data required to fulfill the task."
        },
        data_structure_plan: {
          type: "object",
          properties: {
            tables: { type: "array", items: { type: "string" } },
            documents: { type: "array", items: { type: "string" } },
            presentations: { type: "array", items: { type: "string" } },
            web_outputs: { type: "array", items: { type: "string" } }
          },
          description: "Planned structure of final outputs across formats."
        },
        logic_steps: {
          type: "array",
          items: { type: "string" },
          description: "Ordered reasoning steps to transform raw data into final outputs."
        },
        quality_criteria: {
          type: "array",
          items: { type: "string" },
          description: "Conditions that must be satisfied for the output to be considered complete and usable."
        },
        risk_flags: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "data_freshness_risk", "source_reliability_risk", "ambiguous_scope",
              "missing_inputs", "format_complexity", "none"
            ]
          },
          description: "Potential risks identified during reasoning."
        }
      },
      required: ["task_summary", "reasoning_objectives", "logic_steps", "quality_criteria"]
    }
  }
};

const SYSTEM_PROMPT = `You are the Unified Reasoning Layer of an agentic AI platform.

Your role is to think, plan, and structure — not to execute.

Rules:
- Do NOT browse the web.
- Do NOT generate final deliverables.
- Do NOT produce files or code.
- Do NOT explain your reasoning to the user.
- Always respond using the function reason_task.
- Optimize for clarity, structure, and downstream execution.

Your output must enable:
- Web research agents to know exactly what to look for
- Execution agents to know exactly what to build
- Quality control to verify completeness

When analyzing tasks:
1. Identify the core intent and break it into actionable objectives
2. Formulate precise research questions that can be answered with web search
3. Determine what data entities are needed (brands, suppliers, trends, etc.)
4. Plan the output structure based on requested formats
5. Define clear logic steps for transforming research into deliverables
6. Set quality criteria that are measurable and verifiable
7. Flag any risks that could affect task completion`;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, taskPlan } = await req.json() as { 
      prompt: string; 
      taskPlan: TaskPlan;
    };

    if (!prompt || !taskPlan) {
      return new Response(
        JSON.stringify({ error: "Missing prompt or taskPlan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the user message with context
    const userMessage = `
User Prompt: "${prompt}"

Task Interpretation:
${JSON.stringify(taskPlan, null, 2)}

Generate a comprehensive reasoning blueprint for this task.`;

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
          { role: "user", content: userMessage }
        ],
        tools: [reasonTaskTool],
        tool_choice: { type: "function", function: { name: "reason_task" } }
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "reason_task") {
      throw new Error("Failed to get reasoning blueprint from AI");
    }

    let blueprint: ReasoningBlueprint;
    try {
      blueprint = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse blueprint:", e);
      throw new Error("Failed to parse reasoning blueprint");
    }

    // Validate and enhance the blueprint
    blueprint = enhanceBlueprint(blueprint, taskPlan);

    return new Response(
      JSON.stringify({ 
        success: true, 
        blueprint,
        metadata: {
          model: "google/gemini-3-flash-preview",
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Reasoning layer error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function enhanceBlueprint(blueprint: ReasoningBlueprint, taskPlan: TaskPlan): ReasoningBlueprint {
  // Ensure data_structure_plan matches requested outputs
  if (!blueprint.data_structure_plan) {
    blueprint.data_structure_plan = {
      tables: [],
      documents: [],
      presentations: [],
      web_outputs: []
    };
  }

  // Map outputs to structure plan
  if (taskPlan.outputs.includes("excel") || taskPlan.outputs.includes("csv")) {
    if (blueprint.data_structure_plan.tables.length === 0) {
      blueprint.data_structure_plan.tables.push("Primary data table with structured findings");
    }
  }
  
  if (taskPlan.outputs.includes("pdf") || taskPlan.outputs.includes("docx")) {
    if (blueprint.data_structure_plan.documents.length === 0) {
      blueprint.data_structure_plan.documents.push("Analysis report document");
    }
  }
  
  if (taskPlan.outputs.includes("pptx")) {
    if (blueprint.data_structure_plan.presentations.length === 0) {
      blueprint.data_structure_plan.presentations.push("Executive summary presentation");
    }
  }

  // Add time context to research questions if relevant
  if (taskPlan.time_context && blueprint.research_questions) {
    blueprint.research_questions = blueprint.research_questions.map(q => {
      if (!q.toLowerCase().includes(taskPlan.time_context!.toLowerCase())) {
        // Add time context if not already present
        return q;
      }
      return q;
    });
  }

  // Ensure risk flags are present
  if (!blueprint.risk_flags || blueprint.risk_flags.length === 0) {
    blueprint.risk_flags = [];
    
    if (taskPlan.requires_real_time_research) {
      blueprint.risk_flags.push("data_freshness_risk");
    }
    if (taskPlan.research_depth === "deep") {
      blueprint.risk_flags.push("format_complexity");
    }
    if (blueprint.risk_flags.length === 0) {
      blueprint.risk_flags.push("none");
    }
  }

  // Ensure required fields have values
  if (!blueprint.required_data_entities || blueprint.required_data_entities.length === 0) {
    blueprint.required_data_entities = inferDataEntities(taskPlan);
  }

  return blueprint;
}

function inferDataEntities(taskPlan: TaskPlan): string[] {
  const entities: string[] = [];
  const intent = taskPlan.intent.toLowerCase();
  
  if (intent.includes("supplier") || intent.includes("sourcing")) {
    entities.push("suppliers");
  }
  if (intent.includes("trend") || intent.includes("forecast")) {
    entities.push("trends");
  }
  if (intent.includes("brand") || intent.includes("competitor")) {
    entities.push("brands", "companies");
  }
  if (intent.includes("material") || intent.includes("fabric")) {
    entities.push("materials");
  }
  if (intent.includes("market") || intent.includes("analysis")) {
    entities.push("markets", "statistics");
  }
  if (intent.includes("sustain") || intent.includes("certif")) {
    entities.push("certifications");
  }
  if (intent.includes("price") || intent.includes("cost")) {
    entities.push("pricing");
  }
  if (intent.includes("product")) {
    entities.push("products");
  }
  if (intent.includes("technology") || intent.includes("innovation")) {
    entities.push("technologies");
  }
  
  return entities.length > 0 ? entities : ["other"];
}
