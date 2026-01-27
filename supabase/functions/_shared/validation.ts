/**
 * Shared Input Validation & Security Utilities
 * 
 * Provides SQL injection protection, input sanitization, and validation
 * for all edge functions. This module helps prevent:
 * - SQL injection attacks
 * - NoSQL injection attacks
 * - XSS via stored content
 * - Parameter tampering
 */

// ============ SQL INJECTION PROTECTION ============

/**
 * Dangerous SQL patterns that indicate potential injection attempts
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|FROM|WHERE|OR|AND)\b.*\b(FROM|INTO|TABLE|DATABASE|SET|VALUES)\b)/i,
  /(\-\-|\/\*|\*\/|;|\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(\bOR\b\s*['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
  /(\b(SLEEP|BENCHMARK|WAITFOR|DELAY)\s*\()/i,
  /(CHAR\s*\(|CONCAT\s*\(|SUBSTRING\s*\()/i,
  /(\bINTO\s+(OUTFILE|DUMPFILE)\b)/i,
  /(\bLOAD_FILE\s*\()/i,
  /(0x[0-9a-fA-F]+)/i, // Hex encoded strings
  /(\bHAVING\b|\bGROUP\s+BY\b.*\bHAVING\b)/i,
  /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
];

/**
 * NoSQL injection patterns (for JSON-based queries)
 */
const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$gt|\$lt|\$gte|\$lte|\$ne|\$eq/i,
  /\$regex|\$options/i,
  /\$or|\$and|\$nor|\$not/i,
  /\$exists|\$type/i,
  /\{\s*\$\w+/,
];

/**
 * Check if a string contains potential SQL injection
 */
export function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  const normalized = input.replace(/\s+/g, ' ').trim();
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Check if a string contains potential NoSQL injection
 */
export function containsNoSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  return NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize string input by removing/escaping dangerous characters
 */
export function sanitizeString(input: string, options?: {
  maxLength?: number;
  allowHtml?: boolean;
  allowNewlines?: boolean;
}): string {
  if (!input || typeof input !== 'string') return '';
  
  const maxLength = options?.maxLength ?? 10000;
  let sanitized = input;
  
  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters except newlines/tabs if allowed
  if (options?.allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');
  }
  
  // HTML encode if not allowed
  if (!options?.allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  
  return sanitized.trim();
}

/**
 * Escape SQL special characters for safe string interpolation
 * NOTE: Always prefer parameterized queries over this!
 */
export function escapeSqlString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .replace(/\0/g, '')
    .replace(/\x1a/g, '\\Z');
}

// ============ INPUT VALIDATION ============

/**
 * Validate UUID format
 */
export function isValidUUID(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input);
}

/**
 * Validate email format
 */
export function isValidEmail(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  // RFC 5322 compliant regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(input) && input.length <= 254;
}

/**
 * Validate that a value is a safe positive integer
 */
export function isValidPositiveInt(input: unknown, maxValue = Number.MAX_SAFE_INTEGER): boolean {
  if (typeof input === 'string') {
    const parsed = parseInt(input, 10);
    return !isNaN(parsed) && parsed > 0 && parsed <= maxValue && String(parsed) === input;
  }
  if (typeof input === 'number') {
    return Number.isInteger(input) && input > 0 && input <= maxValue;
  }
  return false;
}

/**
 * Validate URL format
 */
export function isValidUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  try {
    const url = new URL(input);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize a prompt/query string
 */
export function validatePrompt(input: string, options?: {
  minLength?: number;
  maxLength?: number;
  checkInjection?: boolean;
}): { valid: boolean; sanitized?: string; error?: string } {
  const minLength = options?.minLength ?? 1;
  const maxLength = options?.maxLength ?? 5000;
  const checkInjection = options?.checkInjection ?? true;
  
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input type' };
  }
  
  const trimmed = input.trim();
  
  if (trimmed.length < minLength) {
    return { valid: false, error: `Input too short (minimum ${minLength} characters)` };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Input too long (maximum ${maxLength} characters)` };
  }
  
  // Check for SQL injection attempts
  if (checkInjection && containsSqlInjection(trimmed)) {
    console.warn('[SECURITY] Potential SQL injection detected in prompt');
    return { valid: false, error: 'Invalid characters in input' };
  }
  
  // Sanitize the prompt
  const sanitized = sanitizeString(trimmed, { 
    maxLength, 
    allowHtml: false,
    allowNewlines: true 
  });
  
  return { valid: true, sanitized };
}

// ============ REQUEST VALIDATION ============

/**
 * Validate and extract JSON body from request
 */
export async function parseAndValidateBody<T extends Record<string, unknown>>(
  req: Request,
  schema: {
    required?: string[];
    optional?: string[];
    types?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
    validators?: Record<string, (value: unknown) => boolean>;
  }
): Promise<{ valid: boolean; data?: T; error?: string }> {
  try {
    const body = await req.json();
    
    if (!body || typeof body !== 'object') {
      return { valid: false, error: 'Invalid request body' };
    }
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in body) || body[field] === undefined || body[field] === null) {
          return { valid: false, error: `Missing required field: ${field}` };
        }
      }
    }
    
    // Validate types
    if (schema.types) {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (field in body && body[field] !== undefined) {
          const actualType = Array.isArray(body[field]) ? 'array' : typeof body[field];
          if (actualType !== expectedType) {
            return { valid: false, error: `Invalid type for ${field}: expected ${expectedType}` };
          }
        }
      }
    }
    
    // Run custom validators
    if (schema.validators) {
      for (const [field, validator] of Object.entries(schema.validators)) {
        if (field in body && !validator(body[field])) {
          return { valid: false, error: `Validation failed for field: ${field}` };
        }
      }
    }
    
    // Only include allowed fields
    const allowedFields = new Set([...(schema.required || []), ...(schema.optional || [])]);
    const filtered: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.has(key)) {
        filtered[key] = value;
      }
    }
    
    return { valid: true, data: filtered as T };
  } catch (error) {
    return { valid: false, error: 'Failed to parse request body' };
  }
}

// ============ RATE LIMITING HELPERS ============

/**
 * Simple in-memory rate limiter (per instance)
 * For production, use Redis or database-backed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number }
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  // Clean up expired records periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k);
    }
  }
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.maxRequests - 1, resetIn: options.windowMs };
  }
  
  if (record.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }
  
  record.count++;
  return { allowed: true, remaining: options.maxRequests - record.count, resetIn: record.resetAt - now };
}

// ============ LOGGING HELPERS ============

/**
 * Log security events with consistent format
 */
export function logSecurityEvent(
  event: 'injection_attempt' | 'rate_limit' | 'auth_failure' | 'validation_error' | 'suspicious_activity',
  details: Record<string, unknown>
): void {
  console.warn(`[SECURITY:${event.toUpperCase()}]`, JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...details,
  }));
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitive(data: Record<string, unknown>, sensitiveFields: string[]): Record<string, unknown> {
  const masked = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in masked && typeof masked[field] === 'string') {
      const value = masked[field] as string;
      if (value.length > 4) {
        masked[field] = value.substring(0, 2) + '***' + value.substring(value.length - 2);
      } else {
        masked[field] = '***';
      }
    }
  }
  
  return masked;
}
