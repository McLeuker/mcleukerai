/**
 * McLeuker AI V5.1 - mcLeukerAPI.ts
 * 
 * DESIGN PRINCIPLES:
 * 1. PARSE V5.1 Response Contract - Extract main_content, sources, key_insights
 * 2. CLEAN DISPLAY - No raw JSON shown to users
 * 3. PROPER ERROR HANDLING - Transparent error messages
 * 4. BACKWARD COMPATIBLE - Works with both V5.0 and V5.1 responses
 */

// Environment configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://cvnpoarfgkzswwjkhoes.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const RAILWAY_URL = import.meta.env.VITE_RAILWAY_API_URL || "https://web-production-29f3c.up.railway.app";

// Endpoints
const PROXY_ENDPOINT = `${SUPABASE_URL}/functions/v1/proxy-railway`;
const DIRECT_ENDPOINT = `${RAILWAY_URL}/api/chat`;
const HEALTH_ENDPOINT = `${RAILWAY_URL}/health`;

// Logging utility
const DEBUG = true;
function log(category: string, message: string, data?: any) {
  if (DEBUG) {
    console.log(`[McLeukerAPI:${category}] ${message}`, data || '');
  }
}

// Types
export interface ChatResponse {
  success: boolean;
  response: string;
  sources?: Source[];
  follow_up_questions?: string[];
  key_insights?: KeyInsight[];
  sections?: Section[];
  action_items?: ActionItem[];
  credits_used?: number;
  session_id?: string;
  error?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  snippet?: string;
  date?: string;
  type?: string;
}

export interface KeyInsight {
  title: string;
  description: string;
  importance?: string;
  icon?: string;
}

export interface Section {
  id: string;
  title: string;
  content: string;
  subsections?: Section[];
}

export interface ActionItem {
  action: string;
  details: string;
  link?: string;
  priority?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  services: {
    grok: boolean;
    search: boolean;
    supabase: boolean;
  };
  features?: {
    response_contract: boolean;
    file_generation: boolean;
    intent_routing: boolean;
  };
}

/**
 * Parse V5.1 Response Contract format
 * Extracts main_content and structured data from the response
 */
function parseV51Response(data: any): ChatResponse {
  log('PARSE', 'Parsing V5.1 Response Contract', { keys: Object.keys(data) });
  
  // Check if this is a V5.1 Response Contract format
  const isV51Format = data.main_content !== undefined || 
                      data.summary !== undefined ||
                      data.key_insights !== undefined ||
                      data.sections !== undefined;
  
  if (isV51Format) {
    log('PARSE', 'Detected V5.1 Response Contract format');
    
    // Extract main content - prioritize main_content, then summary
    let responseText = '';
    
    if (data.main_content && typeof data.main_content === 'string') {
      responseText = data.main_content;
      log('PARSE', 'Using main_content', { length: responseText.length });
    } else if (data.summary && typeof data.summary === 'string') {
      responseText = data.summary;
      log('PARSE', 'Using summary', { length: responseText.length });
    }
    
    // If main_content is empty but we have sections, build content from sections
    if (!responseText && data.sections && Array.isArray(data.sections)) {
      responseText = data.sections.map((section: any) => {
        let sectionText = `## ${section.title}\n\n${section.content || ''}`;
        if (section.subsections && Array.isArray(section.subsections)) {
          section.subsections.forEach((sub: any) => {
            sectionText += `\n\n### ${sub.title}\n\n${sub.content || ''}`;
          });
        }
        return sectionText;
      }).join('\n\n');
      log('PARSE', 'Built content from sections', { length: responseText.length });
    }
    
    // Extract sources
    let sources: Source[] = [];
    if (data.sources && Array.isArray(data.sources)) {
      sources = data.sources.map((source: any) => ({
        id: source.id || String(Math.random()),
        title: source.title || 'Source',
        url: source.url || '',
        publisher: source.publisher || '',
        snippet: source.snippet || '',
        date: source.date || '',
        type: source.type || 'web'
      }));
      log('PARSE', 'Extracted sources', { count: sources.length });
    }
    
    // Extract key insights
    let keyInsights: KeyInsight[] = [];
    if (data.key_insights && Array.isArray(data.key_insights)) {
      keyInsights = data.key_insights.map((insight: any) => ({
        title: insight.title || 'Insight',
        description: insight.description || '',
        importance: insight.importance || 'medium',
        icon: insight.icon || '💡'
      }));
      log('PARSE', 'Extracted key insights', { count: keyInsights.length });
    }
    
    // Extract follow-up questions
    let followUpQuestions: string[] = [];
    if (data.follow_up_questions && Array.isArray(data.follow_up_questions)) {
      followUpQuestions = data.follow_up_questions;
      log('PARSE', 'Extracted follow-up questions', { count: followUpQuestions.length });
    }
    
    // Extract action items
    let actionItems: ActionItem[] = [];
    if (data.action_items && Array.isArray(data.action_items)) {
      actionItems = data.action_items.map((item: any) => ({
        action: item.action || '',
        details: item.details || '',
        link: item.link || '',
        priority: item.priority || 'medium'
      }));
      log('PARSE', 'Extracted action items', { count: actionItems.length });
    }
    
    // Build the final response text with proper formatting
    let finalResponse = responseText;
    
    // Add key insights section if available
    if (keyInsights.length > 0) {
      finalResponse += '\n\n## Key Insights\n\n';
      keyInsights.forEach((insight, index) => {
        finalResponse += `${insight.icon || '💡'} **${insight.title}**: ${insight.description}\n\n`;
      });
    }
    
    // Add action items section if available
    if (actionItems.length > 0) {
      finalResponse += '\n\n## Actionable Insights\n\n';
      actionItems.forEach((item, index) => {
        finalResponse += `- **${item.action}**: ${item.details}`;
        if (item.link) {
          finalResponse += ` [Learn more](${item.link})`;
        }
        finalResponse += '\n';
      });
    }
    
    // Add sources section if available
    if (sources.length > 0) {
      finalResponse += '\n\n## Sources\n\n';
      sources.forEach((source, index) => {
        finalResponse += `${index + 1}. [${source.title}](${source.url})`;
        if (source.publisher) {
          finalResponse += ` - ${source.publisher}`;
        }
        finalResponse += '\n';
      });
    }
    
    return {
      success: true,
      response: finalResponse,
      sources: sources,
      follow_up_questions: followUpQuestions,
      key_insights: keyInsights,
      action_items: actionItems,
      credits_used: data.credits_used || 0,
      session_id: data.session_id || ''
    };
  }
  
  // Fallback to V5.0 format parsing
  log('PARSE', 'Using V5.0 format parsing');
  return parseV50Response(data);
}

/**
 * Parse V5.0 response format (backward compatibility)
 */
function parseV50Response(data: any): ChatResponse {
  log('PARSE', 'Parsing V5.0 response format');
  
  // Try to extract response from various fields
  let responseText = '';
  
  const fields = ['response', 'message', 'content', 'text', 'answer', 'output', 'result'];
  for (const field of fields) {
    if (data[field] && typeof data[field] === 'string' && data[field].length > responseText.length) {
      responseText = data[field];
      log('PARSE', `Found content in field: ${field}`, { length: responseText.length });
    }
  }
  
  // Extract sources if available
  let sources: Source[] = [];
  if (data.sources && Array.isArray(data.sources)) {
    sources = data.sources;
  }
  
  // Extract follow-up questions if available
  let followUpQuestions: string[] = [];
  if (data.follow_up_questions && Array.isArray(data.follow_up_questions)) {
    followUpQuestions = data.follow_up_questions;
  }
  
  return {
    success: true,
    response: responseText,
    sources: sources,
    follow_up_questions: followUpQuestions,
    credits_used: data.credits_used || 0,
    session_id: data.session_id || ''
  };
}

/**
 * Normalize API response to ChatResponse format
 */
function normalizeResponse(data: any): ChatResponse {
  log('NORMALIZE', 'Raw response data', { 
    keys: Object.keys(data),
    hasMainContent: !!data.main_content,
    hasSummary: !!data.summary,
    hasSections: !!data.sections,
    hasResponse: !!data.response
  });
  
  // Check for error responses
  if (data.error) {
    return {
      success: false,
      response: '',
      error: typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
    };
  }
  
  // Check for V5.1 Response Contract format
  if (data.main_content !== undefined || 
      data.summary !== undefined || 
      data.key_insights !== undefined ||
      data.sections !== undefined) {
    return parseV51Response(data);
  }
  
  // Fallback to V5.0 parsing
  return parseV50Response(data);
}

/**
 * McLeuker API class
 */
class McLeukerAPI {
  private proxyUrl: string;
  private directUrl: string;
  private healthUrl: string;
  
  constructor() {
    this.proxyUrl = PROXY_ENDPOINT;
    this.directUrl = DIRECT_ENDPOINT;
    this.healthUrl = HEALTH_ENDPOINT;
    log('INIT', 'McLeukerAPI initialized', {
      proxy: this.proxyUrl,
      direct: this.directUrl,
      health: this.healthUrl
    });
  }
  
  /**
   * Check backend health
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(this.healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      log('HEALTH', 'Health check response', data);
      return data;
    } catch (error) {
      log('HEALTH', 'Health check error', error);
      return {
        status: 'unhealthy',
        version: 'unknown',
        services: {
          grok: false,
          search: false,
          supabase: false
        }
      };
    }
  }
  
  /**
   * Send a chat message
   */
  async chat(
    query: string,
    mode: 'quick' | 'deep' | 'auto' = 'quick',
    domain?: string,
    sessionId?: string
  ): Promise<ChatResponse> {
    log('CHAT', 'Sending chat request', { query, mode, domain, sessionId });
    
    const payload = {
      query,
      mode,
      domain: domain || 'general',
      session_id: sessionId || undefined
    };
    
    try {
      // Try proxy first
      log('CHAT', 'Trying proxy endpoint', { url: this.proxyUrl });
      
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log('CHAT', 'Proxy request failed', { status: response.status, error: errorText });
        throw new Error(`Proxy request failed: ${response.status}`);
      }
      
      const data = await response.json();
      log('CHAT', 'Proxy response received', { keys: Object.keys(data) });
      
      return normalizeResponse(data);
      
    } catch (proxyError) {
      log('CHAT', 'Proxy failed, trying direct endpoint', { error: proxyError });
      
      try {
        // Fallback to direct endpoint
        const response = await fetch(this.directUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          log('CHAT', 'Direct request failed', { status: response.status, error: errorText });
          throw new Error(`Direct request failed: ${response.status}`);
        }
        
        const data = await response.json();
        log('CHAT', 'Direct response received', { keys: Object.keys(data) });
        
        return normalizeResponse(data);
        
      } catch (directError) {
        log('CHAT', 'Both proxy and direct failed', { error: directError });
        
        return {
          success: false,
          response: '',
          error: 'Unable to connect to McLeuker AI backend. Please try again later.'
        };
      }
    }
  }
}

// Export singleton instance
export const mcLeukerAPI = new McLeukerAPI();
export default mcLeukerAPI;
