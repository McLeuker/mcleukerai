/**
 * McLeuker AI V4 - proxy-railway Edge Function
 * 
 * SUPABASE EDGE FUNCTION FOR CORS HANDLING
 * 
 * This function proxies requests from the frontend to the Railway backend
 * to avoid CORS issues when calling the API directly from the browser.
 * 
 * Security Features:
 * 1. AUTHENTICATION REQUIRED - Validates JWT tokens
 * 2. RESTRICTED CORS - Only allows known origins
 * 3. CREDIT CHECK - Ensures user has credits before forwarding
 * 4. USER CONTEXT - Forwards user ID to backend
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CONFIGURATION
// ============================================================================

const RAILWAY_BACKEND_URL = Deno.env.get("RAILWAY_BACKEND_URL") || Deno.env.get("VITE_RAILWAY_API_URL") || "https://web-production-29f3c.up.railway.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://mcleukerai.lovable.app",
  "https://www.mcleukerai.com",
  "https://mcleukerai.com",
  "http://localhost:5173",
  "http://localhost:8080",
];

// Preview domain pattern (Lovable preview URLs)
const PREVIEW_DOMAIN_PATTERN = /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/;

// ============================================================================
// CORS HELPERS
// ============================================================================

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = getValidOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function getValidOrigin(origin: string | null): string {
  if (!origin) return ALLOWED_ORIGINS[0];
  
  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  
  // Check if origin matches Lovable preview pattern
  if (PREVIEW_DOMAIN_PATTERN.test(origin)) {
    return origin;
  }
  
  // Default to first allowed origin
  return ALLOWED_ORIGINS[0];
}

// ============================================================================
// LOGGING
// ============================================================================

function log(category: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [proxy-railway] [${category}]`, message, data ? JSON.stringify(data) : '');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  
  log('REQUEST', `[${requestId}] ${req.method} ${req.url}`, { origin });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    log('CORS', `[${requestId}] Handling preflight request`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // ========================================================================
    // AUTHENTICATION CHECK
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      log('AUTH', `[${requestId}] Missing or invalid authorization header`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication required",
          canRetry: false,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate token with Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      log('AUTH', `[${requestId}] Invalid token`, { error: authError?.message });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid authentication token",
          canRetry: false,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log('AUTH', `[${requestId}] User authenticated`, { userId: user.id });

    // ========================================================================
    // CREDIT CHECK
    // ========================================================================
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credit_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userError) {
      log('CREDITS', `[${requestId}] Error fetching user credits`, { error: userError.message });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Could not verify credit balance",
          canRetry: true,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!userData || userData.credit_balance < 1) {
      log('CREDITS', `[${requestId}] Insufficient credits`, { balance: userData?.credit_balance || 0 });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Insufficient credits. Please purchase more credits to continue.",
          canRetry: false,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log('CREDITS', `[${requestId}] Credit check passed`, { balance: userData.credit_balance });

    // ========================================================================
    // PARSE REQUEST BODY
    // ========================================================================
    let body: any = null;
    if (req.method === "POST") {
      try {
        body = await req.json();
        log('BODY', `[${requestId}] Request body`, {
          hasMessage: !!body.message,
          messageLength: body.message?.length,
          mode: body.mode,
        });
      } catch (e) {
        log('ERROR', `[${requestId}] Failed to parse request body`, e);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid request body",
            canRetry: false,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ========================================================================
    // FORWARD REQUEST TO RAILWAY BACKEND
    // ========================================================================
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/chat`;
    log('PROXY', `[${requestId}] Forwarding to ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-User-ID": user.id,
        "X-User-Email": user.email || "",
      },
      body: JSON.stringify(body),
    });

    log('RESPONSE', `[${requestId}] Backend responded with status ${backendResponse.status}`);

    // Get response body
    const responseText = await backendResponse.text();
    
    // Try to parse as JSON
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
      log('RESPONSE', `[${requestId}] Response data`, {
        success: responseData.success,
        hasResponse: !!responseData.response,
        responseLength: responseData.response?.length,
        hasError: !!responseData.error,
      });
    } catch {
      // If not JSON, wrap in error response
      log('ERROR', `[${requestId}] Backend returned non-JSON response`, responseText.substring(0, 200));
      responseData = {
        success: false,
        error: `Backend error: ${responseText.substring(0, 500)}`,
        canRetry: true,
      };
    }

    // Handle backend HTTP errors
    if (!backendResponse.ok) {
      log('ERROR', `[${requestId}] Backend HTTP error`, {
        status: backendResponse.status,
        error: responseData.error || responseData.detail,
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.error || responseData.detail || `Backend error (${backendResponse.status})`,
          canRetry: backendResponse.status >= 500,
        }),
        {
          status: backendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    log('ERROR', `[${requestId}] Proxy error`, {
      name: error.name,
      message: error.message,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: `Proxy error: ${error.message || "Connection failed"}`,
        canRetry: true,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
