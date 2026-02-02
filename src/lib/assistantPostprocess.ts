/**
 * McLeuker AI V4 - assistantPostprocess.ts
 * 
 * MINIMAL ARTIFACT CLEANUP ONLY
 * 
 * Design Principles:
 * 1. ONLY clean display artifacts like [object Object]
 * 2. NO fake content generation
 * 3. NO response replacement
 * 4. TRANSPARENT - return exactly what was given (just cleaned)
 * 
 * IMPORTANT: This file should do MINIMAL processing.
 * The old version was generating fake "helpful" content which masked real responses.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PostprocessedResponse {
  content: string;
  wasModified: boolean;
  artifactsRemoved: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Clean artifacts from assistant response
 * 
 * ONLY removes display artifacts like [object Object]
 * DOES NOT generate fake content or replace responses
 */
export function postprocessAssistantResponse(content: string): PostprocessedResponse {
  // Handle null/undefined
  if (!content) {
    return {
      content: '',
      wasModified: false,
      artifactsRemoved: 0,
    };
  }

  // Ensure content is a string
  if (typeof content !== 'string') {
    console.warn('[assistantPostprocess] Content was not a string, converting:', typeof content);
    try {
      content = JSON.stringify(content);
    } catch {
      content = String(content);
    }
  }

  // Count artifacts before cleaning
  const objectObjectCount = (content.match(/\[object Object\]/g) || []).length;
  
  // Clean artifacts
  let cleaned = content
    // Remove [object Object] patterns
    .replace(/\[object Object\]/g, '')
    // Clean up resulting comma artifacts
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Clean up leading/trailing commas
    .replace(/^\s*,\s*/g, '')
    .replace(/\s*,\s*$/g, '')
    // Trim
    .trim();

  // Log if artifacts were removed
  if (objectObjectCount > 0) {
    console.log(`[assistantPostprocess] Removed ${objectObjectCount} [object Object] artifacts`);
  }

  return {
    content: cleaned,
    wasModified: objectObjectCount > 0,
    artifactsRemoved: objectObjectCount,
  };
}

/**
 * Check if content is empty or just whitespace
 */
export function isEmptyContent(content: string): boolean {
  if (!content) return true;
  return content.trim().length === 0;
}

/**
 * Check if content looks like an error message
 */
export function isErrorContent(content: string): boolean {
  if (!content) return false;
  const lowerContent = content.toLowerCase();
  return (
    lowerContent.includes('error:') ||
    lowerContent.includes('failed:') ||
    lowerContent.includes('exception:') ||
    lowerContent.startsWith('api error') ||
    lowerContent.startsWith('network error') ||
    lowerContent.startsWith('timeout')
  );
}

/**
 * Extract error message from content if it's an error
 */
export function extractErrorMessage(content: string): string | null {
  if (!isErrorContent(content)) return null;
  
  // Try to extract the actual error message
  const patterns = [
    /error:\s*(.+)/i,
    /failed:\s*(.+)/i,
    /exception:\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }

  return content;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy function name for backwards compatibility
 * @deprecated Use postprocessAssistantResponse instead
 */
export function cleanAssistantResponse(content: string): string {
  return postprocessAssistantResponse(content).content;
}

/**
 * Legacy function that was generating fake content
 * NOW: Just returns the cleaned content, no fake generation
 * @deprecated This function no longer generates fake content
 */
export function enhanceAssistantResponse(content: string): string {
  console.warn('[assistantPostprocess] enhanceAssistantResponse is deprecated and no longer generates fake content');
  return postprocessAssistantResponse(content).content;
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  postprocessAssistantResponse,
  isEmptyContent,
  isErrorContent,
  extractErrorMessage,
  cleanAssistantResponse,
  enhanceAssistantResponse,
};
