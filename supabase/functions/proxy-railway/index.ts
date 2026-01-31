import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAILWAY_BASE_URL = "https://web-production-29f3c.up.railway.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

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

    // Forward the request to Railway
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Copy relevant headers from original request
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // Forward body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const body = await req.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseText = await response.text();

    console.log(`Railway response status: ${response.status}`);

    // Parse response to check if it's JSON
    let responseBody: string;
    try {
      JSON.parse(responseText);
      responseBody = responseText;
    } catch {
      responseBody = JSON.stringify({ data: responseText });
    }

    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
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
