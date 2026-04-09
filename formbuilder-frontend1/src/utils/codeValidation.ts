/**
 * Form Code Validation Utilities
 * 
 * Matches backend validation in FormService.java (lines 60-98)
 */

/**
 * SQL Reserved Keywords that cannot be used as form codes or field keys
 * Matches backend implementation in FormService.java (lines 60-65)
 */
export const SQL_RESERVED_KEYWORDS = new Set([
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'FROM', 'WHERE', 'JOIN',
  'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'GROUP', 'ORDER',
  'BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'DISTINCT', 'TABLE',
  'COLUMN', 'INDEX', 'PRIMARY', 'FOREIGN', 'KEY', 'CONSTRAINT',
  'REFERENCES', 'VIEW', 'SEQUENCE', 'TRIGGER', 'USER', 'ROLE',
  'GRANT', 'REVOKE', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS',
  'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'
]);

/**
 * Form code validation regex
 * Must start with a letter, contain only lowercase alphanumeric and underscores, max 100 chars
 * Matches backend regex in FormService.java (lines 71, 86)
 */
export const FORM_CODE_REGEX = /^[a-z][a-z0-9_]{0,99}$/;

/**
 * Validates a form code according to backend rules
 * 
 * @param code - The form code to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateFormCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Form code is required' };
  }

  // Check format (lowercase, alphanumeric + underscore, starts with letter)
  if (!FORM_CODE_REGEX.test(code)) {
    return {
      valid: false,
      error: 'Code must start with a letter and contain only lowercase letters, numbers, and underscores (max 100 chars)'
    };
  }

  // Check for SQL reserved keywords
  if (SQL_RESERVED_KEYWORDS.has(code.toUpperCase())) {
    return {
      valid: false,
      error: `"${code}" is a reserved SQL keyword and cannot be used`
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a form code input by:
 * - Converting to lowercase
 * - Replacing invalid characters with underscores
 * - Ensuring it starts with a letter
 * 
 * @param input - Raw user input
 * @returns Sanitized form code
 */
export function sanitizeFormCode(input: string): string {
  // Convert to lowercase
  let sanitized = input.toLowerCase();

  // Replace invalid characters with underscores
  sanitized = sanitized.replace(/[^a-z0-9_]+/g, '_');

  // Remove leading underscores or numbers
  sanitized = sanitized.replace(/^[^a-z]+/, '');

  // Trim to max length
  sanitized = sanitized.substring(0, 100);

  return sanitized;
}

/**
 * Field key validation (similar to form code but for field column names)
 * Matches FormMapper.java field key validation
 */
export function validateFieldKey(key: string): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'Field key is required' };
  }

  if (!FORM_CODE_REGEX.test(key)) {
    return {
      valid: false,
      error: 'Field key must start with a letter and contain only lowercase letters, numbers, and underscores'
    };
  }

  if (SQL_RESERVED_KEYWORDS.has(key.toUpperCase())) {
    return {
      valid: false,
      error: `"${key}" is a reserved SQL keyword`
    };
  }

  return { valid: true };
}
