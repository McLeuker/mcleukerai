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

// Intent classification categories
type IntentCategory = 
  | "fashion_business" 
  | "marketing_tech" 
  | "personal_life" 
  | "api_integration"
  | "education_career"
  | "general_knowledge";

// Intent classification tool schema
const classifyIntentTool = {
  type: "function",
  function: {
    name: "classify_intent",
    description: "Classify the user's query intent and topic before reasoning. This MUST happen first.",
    parameters: {
      type: "object",
      properties: {
        primary_intent: {
          type: "string",
          enum: ["fashion_business", "marketing_tech", "personal_life", "api_integration", "education_career", "general_knowledge"],
          description: "The primary category of the user's query"
        },
        confidence: {
          type: "number",
          description: "Confidence level 0-1 in the classification"
        },
        is_ambiguous: {
          type: "boolean",
          description: "Whether the query intent is unclear and needs clarification"
        },
        clarifying_question: {
          type: "string",
          description: "If ambiguous, the question to ask the user"
        },
        detected_signals: {
          type: "array",
          items: { type: "string" },
          description: "Key phrases or signals that led to this classification"
        }
      },
      required: ["primary_intent", "confidence", "is_ambiguous"]
    }
  }
};

const SYSTEM_PROMPT = `You are the Universal Reasoning Layer of an agentic AI platform.

CRITICAL: You must FIRST classify the user's intent before any reasoning.

## STEP 1: INTENT CLASSIFICATION (MANDATORY)

Before ANY reasoning, classify the query into one of these categories:

1. **fashion_business**: Fashion industry, luxury, brands, trends, supply chain, merchandising, retail
2. **marketing_tech**: Digital marketing, social media strategy, analytics, content optimization
3. **api_integration**: APIs, technical integration, authentication, endpoints, code implementation
4. **education_career**: Schools, programs, career paths, learning, professional development
5. **personal_life**: Personal advice, relationships, life decisions, well-being, non-professional topics
6. **general_knowledge**: Facts, definitions, explanations not fitting above categories

## CLASSIFICATION SIGNALS

- Fashion/Business: brands, collections, trends, suppliers, luxury, retail, fashion weeks
- Marketing/Tech: Instagram, TikTok, engagement, analytics, campaigns, influencers
- API/Integration: API, authentication, tokens, endpoints, SDK, integration, code
- Education/Career: schools, programs, degrees, internships, career, courses
- Personal/Life: relationship, health, personal decision, life advice, feelings
- General: facts, definitions, "what is", "explain", history

## STEP 2: DOMAIN-APPROPRIATE REASONING

After classification, apply domain-specific reasoning:

**Fashion/Business**: 
- Focus on industry dynamics, market positioning, trend analysis
- Structure outputs for buyers, merchandisers, brand strategists

**Marketing/Tech**:
- Focus on platform-specific best practices, metrics, ROI
- Include tools, automation options, analytics frameworks

**API/Integration**:
- Focus on step-by-step technical implementation
- Include authentication, permissions, error handling

**Education/Career**:
- Focus on comparison, requirements, outcomes
- Include practical next steps, application guidance

**Personal/Life**:
- DO NOT force industry context
- Provide empathetic, supportive, human-centered guidance
- Keep advice practical and safe

**General Knowledge**:
- Provide factual, concise answers
- Cite sources when possible

## NON-NEGOTIABLE RULES

1. NEVER force fashion/business framing on personal questions
2. NEVER assume industry context without clear signals
3. ALWAYS classify before reasoning
4. If confidence < 0.7, mark as ambiguous and suggest clarification
5. Match output structure to the detected intent category

Your role is to think, plan, and structure — not to execute.
Always respond using the function reason_task after classification.`;

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

interface IntentClassification {
  primary_intent: IntentCategory;
  confidence: number;
  is_ambiguous: boolean;
  clarifying_question?: string;
  detected_signals: string[];
}

interface ReasoningBlueprint {
  intent_classification: IntentClassification;
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
  response_style: "structured_analysis" | "step_by_step_guide" | "empathetic_advice" | "factual_summary";
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

    // Step 1: Classify intent first
    const classificationMessage = `
Classify the intent of this query BEFORE any reasoning:

User Prompt: "${prompt}"

Task Context:
${JSON.stringify(taskPlan, null, 2)}

FIRST classify the intent, then generate the reasoning blueprint.`;

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
          { role: "user", content: classificationMessage }
        ],
        tools: [classifyIntentTool, reasonTaskTool],
        tool_choice: "auto"
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
    
    // Extract tool calls - may have classification + reasoning
    const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
    
    let intentClassification: IntentClassification | null = null;
    let blueprint: ReasoningBlueprint | null = null;

    for (const toolCall of toolCalls) {
      if (toolCall.function.name === "classify_intent") {
        try {
          intentClassification = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse intent classification:", e);
        }
      } else if (toolCall.function.name === "reason_task") {
        try {
          blueprint = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse blueprint:", e);
        }
      }
    }

    // If we got classification but no blueprint, we need a second call
    if (intentClassification && !blueprint) {
      // Check if ambiguous - return early with clarification needed
      if (intentClassification.is_ambiguous && intentClassification.clarifying_question) {
        return new Response(
          JSON.stringify({ 
            success: true,
            needs_clarification: true,
            clarifying_question: intentClassification.clarifying_question,
            intent_classification: intentClassification,
            metadata: {
              model: "google/gemini-3-flash-preview",
              timestamp: new Date().toISOString()
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate blueprint with classification context
      const reasoningResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Intent classified as: ${intentClassification.primary_intent}\n\nUser Prompt: "${prompt}"\n\nGenerate a domain-appropriate reasoning blueprint.` }
          ],
          tools: [reasonTaskTool],
          tool_choice: { type: "function", function: { name: "reason_task" } }
        }),
      });

      if (reasoningResponse.ok) {
        const reasoningData = await reasoningResponse.json();
        const reasoningCall = reasoningData.choices?.[0]?.message?.tool_calls?.[0];
        if (reasoningCall?.function.name === "reason_task") {
          blueprint = JSON.parse(reasoningCall.function.arguments);
        }
      }
    }

    if (!blueprint) {
      // Fallback: create a minimal blueprint
      blueprint = createFallbackBlueprint(prompt, taskPlan, intentClassification);
    }

    // Attach intent classification to blueprint
    if (intentClassification) {
      blueprint.intent_classification = intentClassification;
    } else {
      // Infer classification from task plan
      blueprint.intent_classification = inferIntentClassification(prompt, taskPlan);
    }

    // Set response style based on intent
    blueprint.response_style = getResponseStyle(blueprint.intent_classification.primary_intent);

    // Validate and enhance the blueprint
    blueprint = enhanceBlueprint(blueprint, taskPlan);

    return new Response(
      JSON.stringify({ 
        success: true, 
        blueprint,
        metadata: {
          model: "google/gemini-3-flash-preview",
          timestamp: new Date().toISOString(),
          intent: blueprint.intent_classification.primary_intent
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

function createFallbackBlueprint(prompt: string, taskPlan: TaskPlan, classification: IntentClassification | null): ReasoningBlueprint {
  const intent = classification?.primary_intent || "general_knowledge";
  
  return {
    intent_classification: classification || inferIntentClassification(prompt, taskPlan),
    task_summary: `Process user query: ${prompt.slice(0, 100)}...`,
    reasoning_objectives: ["Understand user intent", "Provide appropriate response"],
    research_questions: taskPlan.requires_real_time_research ? [`What is the current information about: ${prompt}`] : [],
    required_data_entities: inferDataEntities(taskPlan),
    data_structure_plan: { tables: [], documents: [], presentations: [], web_outputs: [] },
    logic_steps: ["Classify intent", "Gather relevant information", "Structure response appropriately"],
    quality_criteria: ["Response matches user intent", "Information is accurate and relevant"],
    risk_flags: ["none"],
    response_style: getResponseStyle(intent)
  };
}

function inferIntentClassification(prompt: string, taskPlan: TaskPlan): IntentClassification {
  const promptLower = prompt.toLowerCase();
  
  // Personal/life indicators
  const personalSignals = ["feel", "relationship", "advice", "should i", "my life", "personal", "help me decide", "worried", "stressed", "happy", "sad"];
  if (personalSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "personal_life",
      confidence: 0.8,
      is_ambiguous: false,
      detected_signals: personalSignals.filter(s => promptLower.includes(s))
    };
  }

  // API/Tech indicators
  const apiSignals = ["api", "endpoint", "authentication", "token", "sdk", "integration", "code", "implement", "developer"];
  if (apiSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "api_integration",
      confidence: 0.85,
      is_ambiguous: false,
      detected_signals: apiSignals.filter(s => promptLower.includes(s))
    };
  }

  // Marketing/Social Media indicators
  const marketingSignals = ["instagram", "tiktok", "social media", "engagement", "followers", "campaign", "influencer", "analytics", "content strategy"];
  if (marketingSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "marketing_tech",
      confidence: 0.85,
      is_ambiguous: false,
      detected_signals: marketingSignals.filter(s => promptLower.includes(s))
    };
  }

  // Education/Career indicators
  const educationSignals = ["school", "university", "program", "degree", "career", "internship", "course", "masters", "mba", "study"];
  if (educationSignals.some(s => promptLower.includes(s))) {
    return {
      primary_intent: "education_career",
      confidence: 0.8,
      is_ambiguous: false,
      detected_signals: educationSignals.filter(s => promptLower.includes(s))
    };
  }

  // Fashion/Business indicators
  const fashionSignals = ["fashion", "brand", "collection", "trend", "supplier", "luxury", "retail", "merchandise", "textile", "fabric", "designer"];
  if (fashionSignals.some(s => promptLower.includes(s)) || taskPlan.domains.includes("fashion")) {
    return {
      primary_intent: "fashion_business",
      confidence: 0.8,
      is_ambiguous: false,
      detected_signals: fashionSignals.filter(s => promptLower.includes(s))
    };
  }

  // Default to general knowledge
  return {
    primary_intent: "general_knowledge",
    confidence: 0.6,
    is_ambiguous: false,
    detected_signals: []
  };
}

function getResponseStyle(intent: IntentCategory): "structured_analysis" | "step_by_step_guide" | "empathetic_advice" | "factual_summary" {
  switch (intent) {
    case "fashion_business":
    case "marketing_tech":
      return "structured_analysis";
    case "api_integration":
      return "step_by_step_guide";
    case "personal_life":
      return "empathetic_advice";
    case "education_career":
      return "structured_analysis";
    case "general_knowledge":
    default:
      return "factual_summary";
  }
}

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

  // Skip structured outputs for personal/empathetic responses
  if (blueprint.response_style === "empathetic_advice") {
    // Personal queries don't need tables/documents unless specifically requested
    return blueprint;
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
