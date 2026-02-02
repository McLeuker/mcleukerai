/**
 * McLeuker AI V4 - proxy-railway Edge Function
 * 
 * SUPABASE EDGE FUNCTION FOR CORS HANDLING
 * 
 * This function proxies requests from the frontend to the Railway backend
 * to avoid CORS issues when calling the API directly from the browser.
 * 
 * Design Principles:
 * 1. TRANSPARENT proxy - pass through requests and responses unchanged
 * 2. PROPER CORS - handle preflight and response headers
 * 3. ERROR forwarding - pass backend errors to frontend unchanged
 * 4. LOGGING - for debugging
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// CONFIGURATION
// ============================================================================

const RAILWAY_BACKEND_URL = Deno.env.get("RAILWAY_BACKEND_URL") || "https://web-production-29f3c.up.railway.app";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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
  
  log('REQUEST', `[${requestId}] ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    log('CORS', `[${requestId}] Handling preflight request`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
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

    // Build backend URL
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/chat`;
    log('PROXY', `[${requestId}] Forwarding to ${backendUrl}`);

    // Forward request to Railway backend
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
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
