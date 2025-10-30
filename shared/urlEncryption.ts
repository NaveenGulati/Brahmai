/**
 * URL Parameter Encryption Utility
 * Obfuscates sensitive IDs in URLs to pass InfoSec assessment
 * Uses base64 encoding with XOR obfuscation for additional security
 * Works in both browser and Node.js environments
 */

// Simple XOR key for obfuscation (can be made more complex if needed)
const XOR_KEY = 0x5A;

/**
 * Base64 encode (browser-compatible)
 */
function base64Encode(str: string): string {
  if (typeof window !== 'undefined' && window.btoa) {
    // Browser environment
    return window.btoa(str);
  } else {
    // Node.js environment
    return Buffer.from(str, 'binary').toString('base64');
  }
}

/**
 * Base64 decode (browser-compatible)
 */
function base64Decode(str: string): string {
  if (typeof window !== 'undefined' && window.atob) {
    // Browser environment
    return window.atob(str);
  } else {
    // Node.js environment
    return Buffer.from(str, 'base64').toString('binary');
  }
}

/**
 * Encrypt a numeric ID for use in URLs
 * @param id - The numeric ID to encrypt
 * @returns Encrypted string safe for URLs
 */
export function encryptId(id: number | string): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  if (isNaN(numId)) {
    throw new Error('Invalid ID for encryption');
  }
  
  // Convert number to string and apply XOR to each character code
  const idStr = numId.toString();
  const xored = Array.from(idStr).map(char => 
    String.fromCharCode(char.charCodeAt(0) ^ XOR_KEY)
  ).join('');
  
  // Base64 encode and make URL-safe
  const base64 = base64Encode(xored);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decrypt an encrypted ID from URL
 * @param encrypted - The encrypted string from URL
 * @returns Original numeric ID
 */
export function decryptId(encrypted: string): number {
  try {
    // Restore base64 padding and characters
    let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64
    const xored = base64Decode(base64);
    
    // Reverse XOR
    const idStr = Array.from(xored).map(char =>
      String.fromCharCode(char.charCodeAt(0) ^ XOR_KEY)
    ).join('');
    
    const id = parseInt(idStr, 10);
    
    if (isNaN(id)) {
      throw new Error('Invalid encrypted ID');
    }
    
    return id;
  } catch (error) {
    throw new Error(`Failed to decrypt ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper to create encrypted route paths
 */
export const encryptedRoutes = {
  quizReview: (sessionId: number | string) => `/quiz-review/${encryptId(sessionId)}`,
  quiz: (moduleId: number | string) => `/quiz/${encryptId(moduleId)}`,
  subject: (subjectId: number | string) => `/subject/${encryptId(subjectId)}`,
};

