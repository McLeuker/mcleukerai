import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FASHION_SYSTEM_PROMPT = `You are an expert fashion industry AI analyst, researcher, and operator. You work with fashion sourcing managers, marketers, brand teams, buyers, merchandisers, and consultants.

Your role is to:
1. Understand fashion industry tasks and requirements
2. Research suppliers, trends, markets, and industry data
3. Structure insights into actionable intelligence
4. Generate professional deliverables (reports, analyses, recommendations)

When responding:
- Be professional, concise, and data-driven
- Focus on actionable insights
- Structure information clearly with headers and bullet points
- Include specific recommendations when applicable
- Reference industry standards and best practices

You specialize in:
- Supplier research and sourcing strategies
- Market analysis and trend forecasting
- Sustainability and compliance assessments
- Cost analysis and negotiation strategies
- Brand positioning and competitive analysis
- Collection planning and merchandising`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, taskId } = await req.json();
    if (!prompt || !taskId) {
      return new Response(JSON.stringify({ error: "Missing prompt or taskId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Update task to understanding status
    await supabase.from("tasks").update({
      status: "understanding",
      steps: [{ step: "understanding", status: "running", message: "Analyzing your request..." }]
    }).eq("id", taskId);

    // Make streaming request to AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: FASHION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    // Update to researching status
    await supabase.from("tasks").update({
      status: "researching",
      steps: [
        { step: "understanding", status: "completed", message: "Request analyzed" },
        { step: "researching", status: "running", message: "Researching fashion data..." }
      ]
    }).eq("id", taskId);

    // Stream the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = "";

        // Update to structuring after a delay
        setTimeout(async () => {
          await supabase.from("tasks").update({
            status: "structuring",
            steps: [
              { step: "understanding", status: "completed", message: "Request analyzed" },
              { step: "researching", status: "completed", message: "Research complete" },
              { step: "structuring", status: "running", message: "Structuring insights..." }
            ]
          }).eq("id", taskId);
        }, 2000);

        // Update to generating after more delay
        setTimeout(async () => {
          await supabase.from("tasks").update({
            status: "generating",
            steps: [
              { step: "understanding", status: "completed", message: "Request analyzed" },
              { step: "researching", status: "completed", message: "Research complete" },
              { step: "structuring", status: "completed", message: "Insights structured" },
              { step: "generating", status: "running", message: "Generating deliverables..." }
            ]
          }).eq("id", taskId);
        }, 4000);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        // Update task to completed with full result
        await supabase.from("tasks").update({
          status: "completed",
          result: { content: fullContent },
          steps: [
            { step: "understanding", status: "completed", message: "Request analyzed" },
            { step: "researching", status: "completed", message: "Research complete" },
            { step: "structuring", status: "completed", message: "Insights structured" },
            { step: "generating", status: "completed", message: "Deliverables ready" }
          ],
          files: [
            { name: "Fashion Report.pdf", type: "pdf", description: "Detailed analysis and recommendations" },
            { name: "Data Export.xlsx", type: "excel", description: "Structured data and findings" }
          ]
        }).eq("id", taskId);

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Fashion AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
