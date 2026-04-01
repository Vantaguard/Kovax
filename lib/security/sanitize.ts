/**
 * INPUT SANITIZATION
 * 
 * Sanitize user inputs to prevent XSS, SQL injection, and other attacks
 * All user-generated content should be sanitized
 */

/**
 * Sanitize string input
 * Removes dangerous HTML tags and scripts
 * 
 * @param input - Raw input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove object tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  
  // Remove embed tags
  sanitized = sanitized.replace(/<embed\b[^<]*>/gi, '');
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized.trim();
}

/**
 * Sanitize HTML content
 * Allows safe HTML tags but removes dangerous ones
 * 
 * @param html - Raw HTML string
 * @returns Sanitized HTML
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // List of allowed tags
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  
  let sanitized = html;
  
  // Remove all tags except allowed ones
  sanitized = sanitized.replace(/<(\/?)([\w]+)[^>]*>/g, (match, slash, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      // For anchor tags, only allow href attribute
      if (tag.toLowerCase() === 'a') {
        const hrefMatch = match.match(/href=["']([^"']*)["']/i);
        if (hrefMatch && !hrefMatch[1].startsWith('javascript:')) {
          return `<${slash}a${slash ? '' : ` href="${hrefMatch[1]}"`}>`;
        }
        return `<${slash}a>`;
      }
      return `<${slash}${tag}>`;
    }
    return '';
  });
  
  return sanitized;
}

/**
 * Sanitize search query
 * Removes SQL injection patterns and special characters
 * 
 * @param query - Search query string
 * @returns Sanitized query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  let sanitized = query;
  
  // Remove SQL keywords
  const sqlKeywords = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER', 'EXEC', 'EXECUTE',
    'UNION', 'SELECT', 'FROM', 'WHERE', '--', '/*', '*/', 'xp_', 'sp_'
  ];
  
  sqlKeywords.forEach(keyword => {
    // Escape special characters in the keyword to prevent regex syntax errors
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKeyword, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // Remove special SQL characters
  sanitized = sanitized.replace(/[;'"\\]/g, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 100);
  
  return sanitized.trim();
}

/**
 * Sanitize email address
 * Validates and cleans email format
 * 
 * @param email - Email address
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  const sanitized = email.toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }
  
  return sanitized;
}

/**
 * Sanitize URL
 * Ensures URL is safe and valid
 * 
 * @param url - URL string
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  const sanitized = url.trim();
  
  // Only allow http and https protocols
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    return '';
  }
  
  // Remove javascript: and data: protocols
  if (sanitized.includes('javascript:') || sanitized.includes('data:')) {
    return '';
  }
  
  try {
    new URL(sanitized);
    return sanitized;
  } catch {
    return '';
  }
}

/**
 * Sanitize filename
 * Removes dangerous characters from filenames
 * 
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  
  let sanitized = filename;
  
  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');
  
  // Remove special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  sanitized = sanitized.substring(0, 255);
  
  return sanitized;
}

/**
 * Sanitize JSON input
 * Safely parse and sanitize JSON data
 * 
 * @param json - JSON string
 * @returns Parsed and sanitized object or null
 */
export function sanitizeJSON(json: string): any {
  if (!json || typeof json !== 'string') {
    return null;
  }
  
  try {
    const parsed = JSON.parse(json);
    
    // Recursively sanitize string values
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeInput(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      
      return obj;
    };
    
    return sanitizeObject(parsed);
  } catch {
    return null;
  }
}

/**
 * Check if input contains dangerous patterns
 * 
 * @param input - Input string to check
 * @returns True if dangerous patterns detected
 */
export function containsDangerousPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}
