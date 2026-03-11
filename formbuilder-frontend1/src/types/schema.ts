/**
 * schema.ts — Shared TypeScript Types for the Form Builder
 *
 * What it does:
 *   Single source of truth for all TypeScript types and interfaces used across the
 *   entire frontend application. Both the builder and the public form page import
 *   from this file.
 *
 * Why it matters:
 *   Keeping types centralised prevents drift between what the builder saves, what
 *   the API returns, and what the public form page renders.
 *
 * Key entities:
 *   - {@link FormSchema}       — the top-level form object held in the Zustand store.
 *   - {@link FormField}        — a single question/input on the form canvas.
 *   - {@link FormRule}         — an IF→THEN logic rule from the LogicPanel.
 *   - {@link ValidationRules}  — constraints applied both in the UI (visual feedback)
 *                                and enforced server-side by RuleEngineService.
 *
 * Type mirrors:
 *   - {@link FieldType}        — mirrors the Java {@code FieldType} enum (all 15 types).
 *   - {@link RuleOperator}     — mirrors the Java {@code RuleOperator} enum.
 *   - {@link ActionType}       — mirrors the Java {@code ActionType} enum.
 *   - {@link ConditionLogic}   — mirrors the Java {@code ConditionLogic} enum.
 *
 * Note: If a new field type, operator, or action is added to the backend enums, it
 * must also be added here to remain in sync.
 */

/** All possible field input types. Must stay in sync with the Java FieldType enum. */
export type FieldType = 'TEXT' | 'NUMERIC' | 'DATE' | 'BOOLEAN' | 'TEXTAREA'
  | 'DROPDOWN' | 'RADIO' | 'CHECKBOX_GROUP'
  | 'TIME' | 'RATING' | 'SCALE' | 'FILE' | 'GRID_RADIO' | 'GRID_CHECK' | 'LOOKUP'
  | 'CALCULATED' | 'SECTION_HEADER' | 'INFO_LABEL' | 'PAGE_BREAK' | 'DATE_TIME' | 'HIDDEN';

/** Comparison operators for rule conditions. Mirrors the Java RuleOperator enum. */
export type RuleOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';

/** Effects that a rule can trigger. Mirrors the Java ActionType enum. */
export type ActionType = 'SHOW' | 'HIDE' | 'REQUIRE' | 'ENABLE' | 'DISABLE' | 'VALIDATION_ERROR' | 'SEND_EMAIL';

/** How multiple conditions within one rule are combined. Mirrors Java ConditionLogic enum. */
export type ConditionLogic = 'AND' | 'OR';

/**
 * The IF check — one condition within a logic rule.
 * Evaluated server-side by RuleEngineService.evaluateCondition().
 */
export interface RuleCondition {
  field: string;      // The columnName of the field we are checking (e.g., 'department')
  operator: RuleOperator;
  value: string | number | boolean; // The static value OR the columnName of another field
  valueType?: 'STATIC' | 'FIELD';   // Whether 'value' refers to a static string or another field's value
}

/**
 * The THEN effect — one action within a logic rule.
 * For SHOW/HIDE/REQUIRE: targetField holds the affected column name.
 * For VALIDATION_ERROR/SEND_EMAIL: message holds the error text or email address.
 */
export interface RuleAction {
  type: ActionType;
  targetField?: string; // Which field to show/hide/require (if applicable)
  message?: string;     // Custom error message (VALIDATION_ERROR) or email (SEND_EMAIL)
}

/**
 * A complete IF→THEN logic rule configured in the LogicPanel.
 * Serialised to JSON and stored in FormVersion.rules on the backend.
 */
/** A group of conditions that can be nested. */
export interface ConditionGroup {
  type: 'group';
  id: string;
  logic: ConditionLogic;
  conditions: (RuleCondition | ConditionGroup)[];
}

/** A single logic rule: IF [conditions] THEN [actions]. */
export interface FormRule {
  id: string;
  name: string;               // Human-readable label (e.g., "Show GitHub for Engineers")
  conditionLogic: ConditionLogic;
  conditions: (RuleCondition | ConditionGroup)[];
  actions: RuleAction[];
}

/**
 * Validation constraints for a field. Applied in the builder's PropertiesPanel UI
 * and enforced server-side by RuleEngineService (for REQUIRE rules) and by browser
 * HTML5 validation attributes rendered on the public form page.
 */
export interface ValidationRules {
  required?: boolean;
  min?: number;            // Minimum numeric value (NUMERIC/SCALE)
  max?: number;            // Maximum numeric value (NUMERIC/SCALE)
  pattern?: string;        // Regex pattern for text validation
  minLength?: number;      // Minimum string length (TEXT/TEXTAREA)
  maxLength?: number;      // Maximum string length (TEXT/TEXTAREA)
}

/**
 * A single field on the form canvas. Each FormField corresponds to one
 * FormField JPA entity on the backend.
 *
 * The options field is polymorphic depending on field type:
 *   Dropdown/Radio/Checkboxes — string[]
 *   Grid fields               — { rows: string[], cols: string[] }
 *   Lookup field              — { formId: string, columnName: string }
 *   All other types           — undefined
 */
export interface FormField {
  id: string;         // Temporary frontend UUID (replaced by DB ID after save)
  type: FieldType;
  label: string;      // Human-readable question text
  placeholder?: string;
  defaultValue?: string;
  options?: string | string[] | { rows: string[]; cols: string[] } | { formId: string; columnName: string };
  validation: ValidationRules;
  columnName: string; // Auto-derived snake_case SQL column name (e.g., "first_name")
  calculationFormula?: string;
  helpText?: string;
  isHidden?: boolean;
  isReadOnly?: boolean;
  isDisabled?: boolean;
  isMultiSelect?: boolean;
  children?: FormField[];
}

/**
 * The top-level form object. This is the shape of state managed by the
 * Zustand store (useFormStore) in the builder, and what the backend's
 * FormDetailResponseDTO deserialises into on the frontend.
 */
export interface FormSchema {
  id?: number;                    // Null if this is an unsaved new form
  publicShareToken?: string;      // UUID used in the public /f/{token} URL
  title: string;
  description: string;
  targetTableName: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  allowEditResponse?: boolean;    // Whether respondents can edit their submission
  themeColor?: string;            // The custom primary color for the form
  themeFont?: string;             // The custom font family for the form
  fields: FormField[];
  rules?: FormRule[];
}
