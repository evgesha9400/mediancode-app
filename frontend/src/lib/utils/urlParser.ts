/**
 * Extracts path parameters from a URL path string.
 *
 * Supports curly brace notation: /users/{user_id}/posts/{post_id}
 *
 * @param path - The URL path string to parse
 * @returns Array of parameter names extracted from the path
 *
 * @example
 * extractPathParameters('/users/{user_id}/posts/{post_id}')
 * // Returns: ['user_id', 'post_id']
 */
export function extractPathParameters(path: string): string[] {
  const parameters: string[] = [];
  const seen = new Set<string>();

  // Match patterns like {param_name}
  const curlyBraceRegex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

  // Extract parameters from curly brace notation
  let match;
  while ((match = curlyBraceRegex.exec(path)) !== null) {
    const paramName = match[1];
    if (!seen.has(paramName)) {
      parameters.push(paramName);
      seen.add(paramName);
    }
  }

  return parameters;
}
