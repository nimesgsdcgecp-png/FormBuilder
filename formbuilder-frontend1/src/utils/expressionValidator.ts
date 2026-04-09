/**
 * Expression Validation Utilities
 * 
 * Client-side expression validation to provide real-time feedback.
 * This is a preview helper - the backend ExpressionEvaluatorService.java is authoritative.
 */

/**
 * Reserved keywords that should not be treated as field references
 */
const RESERVED_WORDS = new Set(['true', 'false', 'null', 'and', 'or', 'not']);

/**
 * Token types for simple expression parsing
 */
type TokenType = 'IDENTIFIER' | 'STRING' | 'NUMBER' | 'OPERATOR' | 'PAREN' | 'UNKNOWN';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Simple tokenizer for expression preview
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < expression.length) {
    const char = expression[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // String literals
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      i++; // Skip opening quote
      while (i < expression.length && expression[i] !== quote) {
        value += expression[i];
        i++;
      }
      i++; // Skip closing quote
      tokens.push({ type: 'STRING', value, position: i - value.length - 2 });
      continue;
    }
    
    // Numbers
    if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(expression[i + 1]))) {
      let value = '';
      if (char === '-') {
        value += char;
        i++;
      }
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        value += expression[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value, position: i - value.length });
      continue;
    }
    
    // Identifiers (field names)
    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      const start = i;
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        value += expression[i];
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value, position: start });
      continue;
    }
    
    // Two-character operators
    if (i + 1 < expression.length) {
      const twoChar = expression.substring(i, i + 2);
      if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
        tokens.push({ type: 'OPERATOR', value: twoChar, position: i });
        i += 2;
        continue;
      }
    }
    
    // Single-character operators
    if (['>', '<', '!'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char, position: i });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'PAREN', value: char, position: i });
      i++;
      continue;
    }
    
    // Unknown character
    tokens.push({ type: 'UNKNOWN', value: char, position: i });
    i++;
  }
  
  return tokens;
}

/**
 * Extracts field references from an expression
 * 
 * @param expression - The expression string
 * @returns Array of field names referenced in the expression
 */
export function extractFieldReferences(expression: string): string[] {
  const tokens = tokenize(expression);
  const fieldRefs: string[] = [];
  
  for (const token of tokens) {
    if (token.type === 'IDENTIFIER' && !RESERVED_WORDS.has(token.value.toLowerCase())) {
      if (!fieldRefs.includes(token.value)) {
        fieldRefs.push(token.value);
      }
    }
  }
  
  return fieldRefs;
}

/**
 * Validation result from expression validation
 */
export interface ExpressionValidationResult {
  valid: boolean;
  errors: ExpressionError[];
  warnings: ExpressionWarning[];
  fieldReferences: string[];
}

export interface ExpressionError {
  message: string;
  position?: number;
}

export interface ExpressionWarning {
  message: string;
  fieldName?: string;
}

/**
 * Validates an expression for syntax and field references
 * 
 * @param expression - The expression to validate
 * @param availableFields - Array of valid field column names
 * @returns Validation result with errors and warnings
 */
export function validateExpression(
  expression: string,
  availableFields: string[]
): ExpressionValidationResult {
  const errors: ExpressionError[] = [];
  const warnings: ExpressionWarning[] = [];
  
  if (!expression || expression.trim().length === 0) {
    return {
      valid: false,
      errors: [{ message: 'Expression is required' }],
      warnings: [],
      fieldReferences: []
    };
  }
  
  const tokens = tokenize(expression);
  const fieldReferences = extractFieldReferences(expression);
  
  // Check for unknown characters
  const unknownTokens = tokens.filter(t => t.type === 'UNKNOWN');
  for (const token of unknownTokens) {
    errors.push({
      message: `Unexpected character: "${token.value}"`,
      position: token.position
    });
  }
  
  // Check for balanced parentheses
  let parenCount = 0;
  for (const token of tokens) {
    if (token.value === '(') parenCount++;
    if (token.value === ')') parenCount--;
    if (parenCount < 0) {
      errors.push({
        message: 'Unmatched closing parenthesis',
        position: token.position
      });
    }
  }
  if (parenCount > 0) {
    errors.push({ message: 'Unmatched opening parenthesis' });
  }
  
  // Check field references exist
  const availableFieldsLower = availableFields.map(f => f.toLowerCase());
  for (const fieldRef of fieldReferences) {
    if (!availableFieldsLower.includes(fieldRef.toLowerCase())) {
      warnings.push({
        message: `Unknown field: "${fieldRef}"`,
        fieldName: fieldRef
      });
    }
  }
  
  // Check for common syntax issues
  const expressionTrimmed = expression.trim();
  
  // Check for dangling operators at start or end
  if (/^[&|=<>!]/.test(expressionTrimmed.replace(/^\s*!\s*/, ''))) {
    // Allow leading ! for NOT, but not other operators
    if (!expressionTrimmed.startsWith('!')) {
      errors.push({ message: 'Expression cannot start with an operator' });
    }
  }
  if (/[&|=<>!]$/.test(expressionTrimmed)) {
    errors.push({ message: 'Expression cannot end with an operator' });
  }
  
  // Check for double operators (except && and ||)
  if (/[=<>]{3,}/.test(expression)) {
    errors.push({ message: 'Invalid operator sequence' });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fieldReferences
  };
}

/**
 * Suggests possible field names based on partial input
 * 
 * @param partial - The partial field name typed by user
 * @param availableFields - All available field names
 * @returns Array of suggested field names
 */
export function suggestFieldNames(
  partial: string,
  availableFields: Array<{ columnName: string; label: string }>
): Array<{ columnName: string; label: string }> {
  if (!partial) return availableFields.slice(0, 5);
  
  const partialLower = partial.toLowerCase();
  
  return availableFields
    .filter(f => 
      f.columnName.toLowerCase().includes(partialLower) ||
      f.label.toLowerCase().includes(partialLower)
    )
    .slice(0, 10);
}

/**
 * Formats field references in an expression for display
 * Highlights valid vs invalid field references
 * 
 * @param expression - The expression
 * @param availableFields - Valid field names
 * @returns HTML-safe string with highlighting spans
 */
export function highlightFieldReferences(
  expression: string,
  availableFields: string[]
): string {
  const tokens = tokenize(expression);
  const availableFieldsLower = new Set(availableFields.map(f => f.toLowerCase()));
  
  let result = '';
  let lastEnd = 0;
  
  for (const token of tokens) {
    // Add text before this token
    result += expression.substring(lastEnd, token.position);
    
    if (token.type === 'IDENTIFIER' && !RESERVED_WORDS.has(token.value.toLowerCase())) {
      const isValid = availableFieldsLower.has(token.value.toLowerCase());
      if (isValid) {
        result += `<span class="text-green-600 font-semibold">${token.value}</span>`;
      } else {
        result += `<span class="text-red-500 font-semibold underline">${token.value}</span>`;
      }
    } else {
      result += token.value;
    }
    
    lastEnd = token.position + token.value.length;
  }
  
  // Add remaining text
  result += expression.substring(lastEnd);
  
  return result;
}
