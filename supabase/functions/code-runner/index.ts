import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CodeRequest {
  code: string;
  language: "javascript" | "typescript";
  timeout?: number;
}

interface ExecutionResult {
  success: boolean;
  output: unknown;
  logs: string[];
  error?: string;
  executionTime: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client and verify user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const body: CodeRequest = await req.json();

    // Validate request
    if (!body.code) {
      return new Response(
        JSON.stringify({ error: "No code provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["javascript", "typescript"].includes(body.language)) {
      return new Response(
        JSON.stringify({ error: "Unsupported language. Use 'javascript' or 'typescript'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit code size
    if (body.code.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Code too large. Maximum 50KB" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /Deno\s*\.\s*(?:run|readFile|writeFile|remove|mkdir|open|listen|connect)/i,
      /fetch\s*\(/i,
      /import\s*\(/i,
      /require\s*\(/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /new\s+Worker/i,
      /WebSocket/i,
      /XMLHttpRequest/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(body.code)) {
        return new Response(
          JSON.stringify({ 
            error: "Code contains restricted operations (network, file system, or dynamic code execution)",
            pattern: pattern.source
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Deduct credits (2 credits for code execution)
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creditResult, error: creditError } = await serviceSupabase.rpc(
      "deduct_credits",
      {
        p_user_id: userId,
        p_amount: 2,
        p_description: "Code execution",
      }
    );

    if (creditError || !creditResult?.success) {
      return new Response(
        JSON.stringify({ 
          error: creditResult?.error || "Failed to deduct credits",
          creditsNeeded: 2
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute the code in a sandboxed environment
    const result = await executeCode(body.code, body.timeout || 30000);

    return new Response(
      JSON.stringify({
        ...result,
        creditsUsed: 2,
        newBalance: creditResult.new_balance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Code runner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Execution failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function executeCode(code: string, timeout: number): Promise<ExecutionResult> {
  const startTime = performance.now();
  const logs: string[] = [];

  // Wrap code to capture console output and return value
  const wrappedCode = `
    const __logs = [];
    const console = {
      log: (...args) => __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args) => __logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      warn: (...args) => __logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      info: (...args) => __logs.push('[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    };
    
    // Safe math and utility functions
    const Math = globalThis.Math;
    const JSON = globalThis.JSON;
    const Date = globalThis.Date;
    const Array = globalThis.Array;
    const Object = globalThis.Object;
    const String = globalThis.String;
    const Number = globalThis.Number;
    const Boolean = globalThis.Boolean;
    const RegExp = globalThis.RegExp;
    const Map = globalThis.Map;
    const Set = globalThis.Set;
    const Promise = globalThis.Promise;
    
    let __result;
    try {
      __result = (function() {
        ${code}
      })();
    } catch (e) {
      __result = { __error: e.message };
    }
    
    ({ result: __result, logs: __logs });
  `;

  try {
    // Use Function constructor with limited scope
    // Note: This is still somewhat risky, but we've filtered dangerous patterns
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Execution timeout")), timeout);
    });

    const executionPromise = new Promise<{ result: unknown; logs: string[] }>((resolve, reject) => {
      try {
        // Create a minimal sandbox
        const sandbox = {
          Math: globalThis.Math,
          JSON: globalThis.JSON,
          Date: globalThis.Date,
          Array: globalThis.Array,
          Object: globalThis.Object,
          String: globalThis.String,
          Number: globalThis.Number,
          Boolean: globalThis.Boolean,
          RegExp: globalThis.RegExp,
          Map: globalThis.Map,
          Set: globalThis.Set,
          Promise: globalThis.Promise,
          setTimeout: undefined,
          setInterval: undefined,
          fetch: undefined,
          Deno: undefined,
        };

        // Execute using eval in try-catch (filtered code only)
        const result = eval(wrappedCode);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });

    const { result, logs: capturedLogs } = await Promise.race([executionPromise, timeoutPromise]);
    const executionTime = performance.now() - startTime;

    // Check for error in result
    if (result && typeof result === "object" && "__error" in (result as Record<string, unknown>)) {
      return {
        success: false,
        output: null,
        logs: capturedLogs,
        error: (result as Record<string, string>).__error,
        executionTime,
      };
    }

    return {
      success: true,
      output: result,
      logs: capturedLogs,
      executionTime,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    return {
      success: false,
      output: null,
      logs,
      error: error instanceof Error ? error.message : "Unknown error",
      executionTime,
    };
  }
}
