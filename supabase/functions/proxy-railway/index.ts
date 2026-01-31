import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use environment variable or fallback to hardcoded URL
const RAILWAY_BASE_URL = Deno.env.get("VITE_RAILWAY_API_URL") ?? "https://web-production-29f3c.up.railway.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, accept, range",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Paths that don't require authentication
const PUBLIC_PATHS = ["/health", "/api/status", "/api/config/status", "/api/pricing"];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathToForward = url.pathname.replace("/proxy-railway", "") || "/";
    const queryString = url.search;
    const targetUrl = `${RAILWAY_BASE_URL}${pathToForward}${queryString}`;

    console.log(`Proxying ${req.method} request to: ${targetUrl}`);

    // Check if path requires authentication
    const isPublicPath = PUBLIC_PATHS.some(p => pathToForward === p || pathToForward.startsWith(p));
    
    if (!isPublicPath) {
      // Validate authentication for protected paths
      const authHeader = req.headers.get("authorization");
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const token = authHeader.replace("Bearer ", "");
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
          console.log("Auth validation failed:", error?.message);
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log(`Authenticated user: ${data.user.id}`);
      }
      // Note: We allow requests without auth header to pass through
      // Railway backend may have its own auth handling
    }

    // Build headers to forward
    const headers: Record<string, string> = {};
    
    // Forward important headers
    const headersToForward = ["content-type", "accept", "range", "authorization"];
    for (const header of headersToForward) {
      const value = req.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }
    
    // Default content-type for POST/PUT/PATCH if not set
    if (["POST", "PUT", "PATCH"].includes(req.method) && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // Forward body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const body = await req.arrayBuffer();
      if (body.byteLength > 0) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    
    console.log(`Railway response status: ${response.status}`);

    // Get the response content-type to determine how to handle it
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // Build response headers - preserve upstream headers + add CORS
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
    };
    
    // Forward important response headers
    const responseHeadersToForward = [
      "content-type",
      "content-disposition",
      "content-length",
      "cache-control",
      "etag",
      "last-modified",
    ];
    
    for (const header of responseHeadersToForward) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders[header] = value;
      }
    }

    // Return the response body as-is (supports both JSON and binary)
    const responseBody = await response.arrayBuffer();

    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Proxy request failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
