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

// Manus API configuration
const MANUS_API_BASE = "https://api.manus.ai/v1";

// Manus agent profiles and their credit costs
const MANUS_PROFILES = {
  "manus-1-5": { 
    name: "Manus Full Agent", 
    baseCost: 15, 
    maxCost: 40,
    description: "Deep autonomous research with full web browsing"
  },
  "manus-1-5-light": { 
    name: "Manus Light Agent", 
    baseCost: 8, 
    maxCost: 25,
    description: "Faster agent research for simpler tasks"
  },
} as const;

type ManusProfile = keyof typeof MANUS_PROFILES;

// Status mapping from Manus to our UI phases
const STATUS_TO_PHASE: Record<string, { phase: string; progress: number }> = {
  "queued": { phase: "planning", progress: 5 },
  "running": { phase: "searching", progress: 15 },
  "browsing": { phase: "browsing", progress: 35 },
  "analyzing": { phase: "validating", progress: 65 },
  "generating": { phase: "generating", progress: 85 },
  "completed": { phase: "completed", progress: 100 },
  "failed": { phase: "failed", progress: 0 },
};

// Stall detection configuration
const POLL_INTERVAL_MS = 3000;
const MAX_STALL_COUNT = 10; // Stop if no progress for 10 consecutive polls

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

// Submit task to Manus API
async function submitManusTask(
  apiKey: string,
  query: string,
  profile: ManusProfile
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const response = await fetch(`${MANUS_API_BASE}/tasks`, {
      method: "POST",
      headers: {
        "API_KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile,
        prompt: query,
        settings: {
          max_iterations: 50,
          enable_web_browsing: true,
          enable_file_operations: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Manus API error:", response.status, errorText);
      
      if (response.status === 401) {
        return { success: false, error: "Manus API authentication failed" };
      }
      if (response.status === 429) {
        return { success: false, error: "Manus rate limit exceeded. Please try again later." };
      }
      return { success: false, error: `Manus API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, taskId: data.task_id || data.id };
  } catch (error) {
    console.error("Manus submit error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to submit task" };
  }
}

// Poll Manus task status
async function pollManusStatus(
  apiKey: string,
  taskId: string
): Promise<{ 
  success: boolean; 
  status?: string; 
  output?: string; 
  toolCalls?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${MANUS_API_BASE}/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "API_KEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Manus poll error:", response.status, errorText);
      return { success: false, error: `Poll failed: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      status: data.status || "unknown",
      output: data.output || data.result || "",
      toolCalls: data.tool_calls_count || data.iterations || 0,
    };
  } catch (error) {
    console.error("Manus poll error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Poll failed" };
  }
}

// Cancel Manus task
async function cancelManusTask(apiKey: string, taskId: string): Promise<boolean> {
  try {
    const response = await fetch(`${MANUS_API_BASE}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        "API_KEY": apiKey,
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Manus cancel error:", error);
    return false;
  }
}

// Request Manus to finalize with partial results
async function requestManusFinalize(apiKey: string, taskId: string): Promise<string> {
  try {
    const response = await fetch(`${MANUS_API_BASE}/tasks/${taskId}/finalize`, {
      method: "POST",
      headers: {
        "API_KEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.output || data.partial_result || "";
    }
    return "";
  } catch (error) {
    console.error("Manus finalize error:", error);
    return "";
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { stream, send, close } = createSSEStream();

  // Process in background
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

      const { 
        query, 
        conversationId, 
        profile: requestedProfile,
        maxBudget 
      } = await req.json();

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        send({ phase: "failed", error: "Invalid query" });
        close();
        return;
      }

      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 10000) {
        send({ phase: "failed", error: "Query too long (max 10000 characters)" });
        close();
        return;
      }

      // Validate profile
      const profile: ManusProfile = (requestedProfile && MANUS_PROFILES[requestedProfile as ManusProfile])
        ? requestedProfile as ManusProfile
        : "manus-1-5-light";

      const profileConfig = MANUS_PROFILES[profile];
      const userMaxBudget = Math.min(maxBudget || profileConfig.maxCost, profileConfig.maxCost);

      // Get Manus API key
      const MANUS_API_KEY = Deno.env.get("Manus_API");
      if (!MANUS_API_KEY) {
        send({ phase: "failed", error: "Manus AI service not configured" });
        close();
        return;
      }

      // PRE-FLIGHT CREDIT CHECK
      const { data: userData } = await supabase
        .from("users")
        .select("credit_balance, subscription_plan")
        .eq("user_id", user.id)
        .single();

      if (!userData) {
        send({ phase: "failed", error: "Unable to verify account" });
        close();
        return;
      }

      if (userData.credit_balance < profileConfig.baseCost) {
        send({ 
          phase: "failed", 
          error: "Insufficient credits for this research task",
          insufficientCredits: true,
          currentBalance: userData.credit_balance,
          requiredCredits: profileConfig.baseCost
        });
        close();
        return;
      }

      // Budget confirmation phase
      send({
        phase: "budget_confirmation",
        estimatedCost: { min: profileConfig.baseCost, max: userMaxBudget },
        userBalance: userData.credit_balance,
        maxAllowed: userMaxBudget,
        profile: profile,
        profileName: profileConfig.name,
        message: `This task may take 5-30 minutes. Maximum cost: ${userMaxBudget} credits.`
      });

      // Create research task record
      const { data: taskData, error: taskError } = await supabase
        .from("research_tasks")
        .insert({
          user_id: user.id,
          conversation_id: conversationId || null,
          query: trimmedQuery,
          phase: "planning",
          plan: { profile, maxBudget: userMaxBudget },
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

      // Submit to Manus
      send({ phase: "planning", message: "Submitting to Manus Agent...", step: 1, total: 5 });

      const submitResult = await submitManusTask(MANUS_API_KEY, trimmedQuery, profile);
      
      if (!submitResult.success || !submitResult.taskId) {
        send({ phase: "failed", error: submitResult.error || "Failed to start Manus task" });
        await supabase.from("research_tasks").update({ 
          phase: "failed", 
          error_message: submitResult.error 
        }).eq("id", taskId);
        close();
        return;
      }

      const manusTaskId = submitResult.taskId;
      let lastStatus = "";
      let stallCount = 0;
      let lastToolCalls = 0;
      let creditsUsed: number = profileConfig.baseCost;

      // Polling loop with stall detection
      while (true) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const pollResult = await pollManusStatus(MANUS_API_KEY, manusTaskId);
        
        if (!pollResult.success) {
          stallCount++;
          if (stallCount >= MAX_STALL_COUNT) {
            // Request partial results and stop
            const partialOutput = await requestManusFinalize(MANUS_API_KEY, manusTaskId);
            if (partialOutput) {
              send({ 
                phase: "completed", 
                content: partialOutput,
                creditsUsed,
                message: "Research completed with partial results due to stall"
              });
            } else {
              send({ phase: "failed", error: "Task stalled without progress" });
            }
            break;
          }
          continue;
        }

        const currentStatus = pollResult.status || "unknown";
        const currentToolCalls = pollResult.toolCalls || 0;

        // Progress detection
        const hasProgress = currentStatus !== lastStatus || currentToolCalls > lastToolCalls;
        
        if (hasProgress) {
          stallCount = 0;
          lastStatus = currentStatus;
          lastToolCalls = currentToolCalls;

          // Calculate progressive credits
          const additionalCredits = Math.floor(currentToolCalls / 5);
          creditsUsed = Math.min(profileConfig.baseCost + additionalCredits, userMaxBudget);

          // Map status to phase
          const phaseInfo = STATUS_TO_PHASE[currentStatus] || { phase: "searching", progress: 20 };
          
          send({ 
            phase: phaseInfo.phase,
            progress: phaseInfo.progress,
            message: `${profileConfig.name}: ${currentStatus}`,
            toolCalls: currentToolCalls,
            creditsUsed,
            manusStatus: currentStatus
          });
        } else {
          stallCount++;
        }

        // Budget check
        if (creditsUsed >= userMaxBudget) {
          const partialOutput = await requestManusFinalize(MANUS_API_KEY, manusTaskId);
          send({ 
            phase: "completed", 
            content: partialOutput || pollResult.output || "",
            creditsUsed,
            message: "Budget limit reached - returning results"
          });
          break;
        }

        // Stall detection
        if (stallCount >= MAX_STALL_COUNT) {
          const partialOutput = await requestManusFinalize(MANUS_API_KEY, manusTaskId);
          send({ 
            phase: "completed", 
            content: partialOutput || pollResult.output || "",
            creditsUsed,
            message: "Research completed (stall detected)"
          });
          break;
        }

        // Completion check
        if (currentStatus === "completed" || currentStatus === "done") {
          send({ 
            phase: "completed",
            content: pollResult.output || "",
            creditsUsed,
            sources: [], // Manus provides sources inline
          });
          break;
        }

        // Failure check
        if (currentStatus === "failed" || currentStatus === "error") {
          send({ phase: "failed", error: "Manus task failed" });
          break;
        }
      }

      // Deduct credits on success
      if (creditsUsed > 0) {
        await supabase.rpc("deduct_credits", {
          p_user_id: user.id,
          p_amount: creditsUsed,
          p_description: `Manus Agent: ${profile}`
        });
      }

      // Update task record
      await supabase.from("research_tasks").update({
        phase: "completed",
        credits_used: creditsUsed,
        completed_at: new Date().toISOString(),
      }).eq("id", taskId);

      close();

    } catch (error) {
      console.error("Manus agent error:", error);
      send({ phase: "failed", error: error instanceof Error ? error.message : "Unknown error" });
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
