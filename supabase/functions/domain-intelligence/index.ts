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
}

interface IntelligenceResponse {
  items: IntelligenceItem[];
  source: 'perplexity' | 'grok' | 'fallback';
  domain: string;
  generatedAt: string;
}

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

async function fetchWithPerplexity(domain: string, apiKey: string): Promise<IntelligenceItem[]> {
  const searchQuery = domainPrompts[domain] || `${domain} industry latest news and trends`;
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: `You are a ${domain} industry intelligence analyst. Provide exactly 5 recent, verified updates. Each update MUST include a real source URL. Format your response as a JSON array with objects containing: title (string, max 80 chars), description (string, max 200 chars), date (YYYY-MM-DD format, use today's date if exact date unknown), source (publication name), sourceUrl (full URL to the article). Only return the JSON array, no other text.`
        },
        {
          role: 'user',
          content: `What are the 5 most important recent developments in ${searchQuery}? Focus on news from the last 7 days. Include specific brands, designers, or companies mentioned.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
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

  // Parse JSON from response
  try {
    // Extract JSON array from response (handle markdown code blocks)
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
    }));
  } catch (parseError) {
    console.error('Failed to parse Perplexity response:', parseError);
    throw new Error('Failed to parse intelligence data');
  }
}

async function fetchWithGrok(domain: string, apiKey: string): Promise<IntelligenceItem[]> {
  const searchQuery = domainPrompts[domain] || `${domain} industry`;
  
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
          content: `You are a ${domain} industry analyst. Provide 5 recent industry updates. Format as JSON array with: title (max 80 chars), description (max 200 chars), date (YYYY-MM-DD), source (publication name). Only return the JSON array.`
        },
        {
          role: 'user',
          content: `List 5 recent significant developments in ${searchQuery}. Include specific brands, designers, or events.`
        }
      ],
      temperature: 0.4,
      max_tokens: 1200,
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
    }));
  } catch (parseError) {
    console.error('Failed to parse Grok response:', parseError);
    throw new Error('Failed to parse intelligence data');
  }
}

async function fetchWithLovableAI(domain: string, apiKey: string): Promise<IntelligenceItem[]> {
  const searchQuery = domainPrompts[domain] || `${domain} industry`;
  
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
          content: `You are a ${domain} industry analyst. Provide 5 current industry updates based on your knowledge. Format as JSON array with: title (max 80 chars), description (max 200 chars), date (YYYY-MM-DD, use recent dates), source (publication or "Industry Analysis"). Only return the JSON array, no other text.`
        },
        {
          role: 'user',
          content: `What are 5 notable current trends or developments in ${searchQuery}?`
        }
      ],
      temperature: 0.5,
      max_tokens: 1200,
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
    
    // Try Perplexity first (best for real-time intelligence)
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (perplexityKey) {
      try {
        console.log(`Fetching ${normalizedDomain} intelligence from Perplexity...`);
        const items = await fetchWithPerplexity(normalizedDomain, perplexityKey);
        
        const response: IntelligenceResponse = {
          items,
          source: 'perplexity',
          domain: normalizedDomain,
          generatedAt: new Date().toISOString(),
        };
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (perplexityError) {
        console.error('Perplexity failed, trying Grok:', perplexityError);
      }
    }

    // Fallback to Grok
    const grokKey = Deno.env.get('Grok_API');
    if (grokKey) {
      try {
        console.log(`Fetching ${normalizedDomain} intelligence from Grok...`);
        const items = await fetchWithGrok(normalizedDomain, grokKey);
        
        const response: IntelligenceResponse = {
          items,
          source: 'grok',
          domain: normalizedDomain,
          generatedAt: new Date().toISOString(),
        };
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (grokError) {
        console.error('Grok failed, trying Lovable AI:', grokError);
      }
    }

    // Final fallback to Lovable AI
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableKey) {
      try {
        console.log(`Fetching ${normalizedDomain} intelligence from Lovable AI...`);
        const items = await fetchWithLovableAI(normalizedDomain, lovableKey);
        
        const response: IntelligenceResponse = {
          items,
          source: 'fallback',
          domain: normalizedDomain,
          generatedAt: new Date().toISOString(),
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
