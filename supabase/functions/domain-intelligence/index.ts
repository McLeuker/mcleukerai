import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IntelligenceItem {
  title: string;
  description: string;
  date: string;
  source: string;
  sourceUrl?: string;
  confidence: 'high' | 'medium' | 'low';
  dataType: 'realtime' | 'curated' | 'predictive';
  category?: string;
}

interface IntelligenceResponse {
  items: IntelligenceItem[];
  source: 'perplexity' | 'grok' | 'fallback';
  domain: string;
  generatedAt: string;
  seasonContext?: string;
}

// Current date for real-time context
const getCurrentSeasonContext = (): string => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  
  // Determine current fashion season context
  if (month >= 1 && month <= 4) {
    return `Spring/Summer ${year} (current) and Fall/Winter ${year} (upcoming previews)`;
  } else if (month >= 5 && month <= 7) {
    return `Fall/Winter ${year} (current focus) and Spring/Summer ${year + 1} (emerging)`;
  } else if (month >= 8 && month <= 10) {
    return `Fall/Winter ${year} (current) and Spring/Summer ${year + 1} (runway season)`;
  } else {
    return `Fall/Winter ${year} (current) and Spring/Summer ${year + 1} (pre-season)`;
  }
};

const domainPrompts: Record<string, string> = {
  fashion: "fashion industry news, runway shows, designer collections, fashion week updates, luxury brand announcements",
  beauty: "beauty industry trends, cosmetics launches, skincare innovations, makeup trends, beauty brand news",
  skincare: "skincare innovations, dermatology breakthroughs, ingredient trends, K-beauty updates, anti-aging research",
  sustainability: "sustainable fashion news, eco-friendly materials, circular economy initiatives, ethical fashion brands",
  "fashion-tech": "fashion technology innovations, wearable tech, AI in fashion, digital fashion, virtual try-on",
  catwalks: "runway shows, fashion week highlights, designer debuts, catwalk trends, haute couture presentations",
  culture: "fashion culture news, street style trends, celebrity fashion, fashion exhibitions, pop culture fashion",
  textile: "textile innovations, fabric technology, sustainable materials, fiber developments, manufacturing trends",
  lifestyle: "luxury lifestyle trends, wellness culture, consumer behavior shifts, lifestyle brand news",
};

const domainSearchScopes: Record<string, string[]> = {
  fashion: ["runway collections", "street style signals", "emerging designers", "brand movements", "fashion week coverage"],
  beauty: ["product launches", "ingredient innovations", "brand campaigns", "influencer trends", "clinical research"],
  skincare: ["active ingredients", "formulation trends", "dermatology advances", "K-beauty innovations", "clinical trials"],
  sustainability: ["circular fashion", "sustainable materials", "brand initiatives", "certifications", "policy updates"],
  "fashion-tech": ["AI applications", "virtual fashion", "wearable tech", "startup news", "digital innovation"],
  catwalks: ["runway shows", "designer presentations", "styling trends", "emerging talent", "fashion week highlights"],
  culture: ["cultural collaborations", "art exhibitions", "social movements", "regional trends", "celebrity style"],
  textile: ["fiber innovations", "mill capabilities", "sustainable textiles", "manufacturing tech", "sourcing trends"],
  lifestyle: ["consumer behavior", "wellness trends", "luxury experiences", "travel influence", "cross-category signals"],
};

async function fetchWithPerplexity(domain: string, apiKey: string): Promise<IntelligenceItem[]> {
  const searchQuery = domainPrompts[domain] || `${domain} industry latest news and trends`;
  const searchScopes = domainSearchScopes[domain] || ["industry news", "trends", "updates"];
  const seasonContext = getCurrentSeasonContext();
  
  const systemPrompt = `You are a ${domain} industry intelligence analyst providing REAL-TIME verified updates.

CRITICAL RULES:
1. Only include information from the LAST 7 DAYS - no outdated content
2. Season/Year Accuracy: Current context is ${seasonContext}. All trends must match this timeframe.
3. Multi-source validation: Cross-reference across fashion media, runway reports, social signals
4. Each item MUST include a real, verifiable source URL

SEARCH SCOPE (prioritize these signal types):
${searchScopes.map((s, i) => `${i + 1}. ${s}`).join('\n')}

CONFIDENCE LEVELS:
- "high": Verified by 2+ authoritative sources (Vogue, WWD, BoF, official brand announcements)
- "medium": Single authoritative source or emerging signals from influencers/social media
- "low": Predictive insights or early rumors not yet confirmed

DATA TYPE:
- "realtime": Live, verified news from past 48 hours
- "curated": Verified content from past 7 days
- "predictive": Forward-looking analysis or forecasts

OUTPUT: Return ONLY a valid JSON array with exactly 6 objects. Each object must have:
{
  "title": "string (max 80 chars, action-oriented headline)",
  "description": "string (max 200 chars, include trend implications)",
  "date": "YYYY-MM-DD",
  "source": "publication name",
  "sourceUrl": "full URL to article",
  "confidence": "high" | "medium" | "low",
  "dataType": "realtime" | "curated" | "predictive",
  "category": "one of: ${searchScopes.slice(0, 3).join(', ')}"
}`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `What are the 6 most important REAL-TIME developments in ${searchQuery}? Focus on verified news from the last 7 days. Include specific brands, designers, events, or companies. Current season context: ${seasonContext}` }
      ],
      max_tokens: 2000,
      temperature: 0.2,
      search_recency_filter: 'week',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in Perplexity response');
  }

  try {
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const items = JSON.parse(jsonStr);
    return items.slice(0, 6).map((item: any) => ({
      title: item.title || 'Untitled',
      description: item.description || '',
      date: item.date || new Date().toISOString().split('T')[0],
      source: item.source || 'Industry Source',
      sourceUrl: item.sourceUrl || item.source_url || null,
      confidence: ['high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium',
      dataType: ['realtime', 'curated', 'predictive'].includes(item.dataType) ? item.dataType : 'curated',
      category: item.category || null,
    }));
  } catch (parseError) {
    console.error('Failed to parse Perplexity response:', parseError);
    throw new Error('Failed to parse intelligence data');
  }
}

async function fetchWithGrok(domain: string, apiKey: string): Promise<IntelligenceItem[]> {
  const searchQuery = domainPrompts[domain] || `${domain} industry`;
  const seasonContext = getCurrentSeasonContext();
  const searchScopes = domainSearchScopes[domain] || ["industry news", "trends"];
  
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: [
        {
          role: 'system',
          content: `You are a ${domain} industry analyst. Provide 6 current industry updates.

CRITICAL: Current season context is ${seasonContext}. All content must be temporally accurate.

CONFIDENCE LEVELS:
- "high": Well-established trends or verified news
- "medium": Emerging signals or single-source reports
- "low": Predictive or speculative insights

Format as JSON array with: title (max 80 chars), description (max 200 chars), date (YYYY-MM-DD), source (publication name), confidence ("high"|"medium"|"low"), dataType ("realtime"|"curated"|"predictive"), category (one of: ${searchScopes.slice(0, 3).join(', ')}). Only return the JSON array.`
        },
        {
          role: 'user',
          content: `List 6 significant current developments in ${searchQuery}. Include specific brands, designers, or events. Season context: ${seasonContext}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Grok API error:', response.status, errorText);
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in Grok response');
  }

  try {
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const items = JSON.parse(jsonStr);
    return items.slice(0, 6).map((item: any) => ({
      title: item.title || 'Untitled',
      description: item.description || '',
      date: item.date || new Date().toISOString().split('T')[0],
      source: item.source || 'Industry Analysis',
      sourceUrl: null,
      confidence: ['high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium',
      dataType: 'curated' as const,
      category: item.category || null,
    }));
  } catch (parseError) {
    console.error('Failed to parse Grok response:', parseError);
    throw new Error('Failed to parse intelligence data');
  }
}

async function fetchWithLovableAI(domain: string, apiKey: string): Promise<IntelligenceItem[]> {
  const searchQuery = domainPrompts[domain] || `${domain} industry`;
  const seasonContext = getCurrentSeasonContext();
  const searchScopes = domainSearchScopes[domain] || ["industry news", "trends"];
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `You are a ${domain} industry analyst. Provide 6 current industry updates based on your knowledge.

IMPORTANT: This is PREDICTIVE/CURATED content as real-time search is unavailable. Mark all items appropriately.

Current season context: ${seasonContext}. All content must be temporally relevant.

Format as JSON array with: title (max 80 chars), description (max 200 chars), date (YYYY-MM-DD, use recent dates), source (publication or "Industry Analysis"), confidence ("medium" or "low" only for fallback), dataType ("predictive"), category (one of: ${searchScopes.slice(0, 3).join(', ')}). Only return the JSON array.`
        },
        {
          role: 'user',
          content: `What are 6 notable current trends or developments in ${searchQuery}? Season: ${seasonContext}`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in Lovable AI response');
  }

  try {
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const items = JSON.parse(jsonStr);
    return items.slice(0, 6).map((item: any) => ({
      title: item.title || 'Untitled',
      description: item.description || '',
      date: item.date || new Date().toISOString().split('T')[0],
      source: item.source || 'Industry Analysis',
      sourceUrl: null,
      confidence: 'low' as const,
      dataType: 'predictive' as const,
      category: item.category || null,
    }));
  } catch (parseError) {
    console.error('Failed to parse Lovable AI response:', parseError);
    throw new Error('Failed to parse intelligence data');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedDomain = domain.toLowerCase().replace(/\s+/g, '-');
    const seasonContext = getCurrentSeasonContext();
    
    // Try Perplexity first (best for real-time intelligence with source URLs)
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (perplexityKey) {
      try {
        console.log(`Fetching ${normalizedDomain} intelligence from Perplexity (real-time)...`);
        const items = await fetchWithPerplexity(normalizedDomain, perplexityKey);
        
        const response: IntelligenceResponse = {
          items,
          source: 'perplexity',
          domain: normalizedDomain,
          generatedAt: new Date().toISOString(),
          seasonContext,
        };
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (perplexityError) {
        console.error('Perplexity failed, trying Grok:', perplexityError);
      }
    }

    // Fallback to Grok (curated content)
    const grokKey = Deno.env.get('Grok_API');
    if (grokKey) {
      try {
        console.log(`Fetching ${normalizedDomain} intelligence from Grok (curated)...`);
        const items = await fetchWithGrok(normalizedDomain, grokKey);
        
        const response: IntelligenceResponse = {
          items,
          source: 'grok',
          domain: normalizedDomain,
          generatedAt: new Date().toISOString(),
          seasonContext,
        };
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (grokError) {
        console.error('Grok failed, trying Lovable AI:', grokError);
      }
    }

    // Final fallback to Lovable AI (predictive content)
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableKey) {
      try {
        console.log(`Fetching ${normalizedDomain} intelligence from Lovable AI (predictive)...`);
        const items = await fetchWithLovableAI(normalizedDomain, lovableKey);
        
        const response: IntelligenceResponse = {
          items,
          source: 'fallback',
          domain: normalizedDomain,
          generatedAt: new Date().toISOString(),
          seasonContext,
        };
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (lovableError) {
        console.error('Lovable AI failed:', lovableError);
      }
    }

    // All APIs failed
    return new Response(
      JSON.stringify({ 
        error: 'Unable to fetch intelligence data',
        items: [],
        source: 'fallback',
        domain: normalizedDomain,
        generatedAt: new Date().toISOString(),
        seasonContext,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Domain intelligence error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
