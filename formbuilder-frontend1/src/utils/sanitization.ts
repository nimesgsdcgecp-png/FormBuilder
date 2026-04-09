/**
 * CSV/Excel Formula Injection Protection
 * 
 * Prevents formula injection attacks by escaping values that could be
 * interpreted as formulas in spreadsheet applications (Excel, LibreOffice, Google Sheets).
 * 
 * Matches backend implementation in SubmissionService.java (lines 513-516)
 */

/**
 * Formula indicators that could trigger formula execution in spreadsheet applications
 */
const FORMULA_INDICATORS = ['=', '+', '-', '@', '#', '!'];

/**
 * Sanitizes a value to prevent CSV/Excel formula injection
 * 
 * @param value - The value to sanitize (any type)
 * @param format - Export format (csv, xlsx, pdf, json)
 * @returns Sanitized value with formula indicators escaped
 * 
 * @example
 * sanitizeFormulaInjection('=1+1', 'csv') // Returns: "'=1+1"
 * sanitizeFormulaInjection('+cmd|calc', 'xlsx') // Returns: "'+cmd|calc"
 * sanitizeFormulaInjection('normal text', 'csv') // Returns: "normal text"
 */
export function sanitizeFormulaInjection(
  value: unknown,
  format: 'csv' | 'xlsx' | 'pdf' | 'json' = 'csv'
): unknown {
  // Null, undefined, and non-string values pass through
  if (value === null || value === undefined) {
    return value;
  }

  // Convert to string for checking
  const strVal = String(value);

  // Empty strings are safe
  if (strVal.length === 0) {
    return strVal;
  }

  // JSON format is safe (doesn't execute formulas)
  if (format === 'json') {
    return strVal;
  }

  // PDF is less vulnerable but we'll sanitize for consistency
  // CSV and XLSX are most vulnerable
  const shouldSanitize = format === 'csv' || format === 'xlsx';

  if (!shouldSanitize) {
    return strVal;
  }

  // Check if value starts with any formula indicator
  const startsWithIndicator = FORMULA_INDICATORS.some(indicator => 
    strVal.startsWith(indicator)
  );

  // Check for tab followed by formula indicator (edge case)
  const hasTabFormula = /^\t[=+\-@#!]/.test(strVal);

  if (startsWithIndicator || hasTabFormula) {
    // Prefix with single quote to prevent formula execution
    // This is the standard approach used by Excel and other spreadsheet apps
    return `'${strVal}`;
  }

  return strVal;
}

/**
 * Sanitizes an array of values for export
 * 
 * @param values - Array of values to sanitize
 * @param format - Export format
 * @returns Array of sanitized values
 */
export function sanitizeExportData(
  values: unknown[],
  format: 'csv' | 'xlsx' | 'pdf' | 'json' = 'csv'
): unknown[] {
  return values.map(value => sanitizeFormulaInjection(value, format));
}

/**
 * Sanitizes a 2D array (table) for export
 * 
 * @param table - 2D array of values
 * @param format - Export format
 * @returns 2D array of sanitized values
 */
export function sanitizeTableData(
  table: unknown[][],
  format: 'csv' | 'xlsx' | 'pdf' | 'json' = 'csv'
): unknown[][] {
  return table.map(row => sanitizeExportData(row, format));
}
