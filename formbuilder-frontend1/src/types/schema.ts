export type FieldType = 'TEXT' | 'NUMERIC' | 'DATE' | 'BOOLEAN' | 'TEXTAREA' 
  | 'DROPDOWN' | 'RADIO' | 'CHECKBOX_GROUP'
  | 'TIME' | 'RATING' | 'SCALE' | 'FILE'| 'GRID_RADIO' | 'GRID_CHECK'| 'LOOKUP';

export type RuleOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
export type ActionType = 'SHOW' | 'HIDE' | 'REQUIRE' | 'VALIDATION_ERROR'| 'SEND_EMAIL';
export type ConditionLogic = 'AND' | 'OR';

export interface RuleCondition {
  field: string;      // The columnName of the field we are checking (e.g., 'department')
  operator: RuleOperator; 
  value: string | number | boolean; // The value we are checking against (e.g., 'Engineering')
}

export interface RuleAction {
  type: ActionType;
  targetField?: string; // Which field to show/hide/require (if applicable)
  message?: string;     // Custom error message for VALIDATION_ERROR
}

export interface FormRule {
  id: string;
  name: string; // e.g., "Show GitHub for Engineers"
  conditionLogic: ConditionLogic;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string; // Regex for text
  minLength?: number; // <--- NEW
  maxLength?: number; // <--- NEW
}

export interface FormField {
  id: string; // Temporary UUID for the frontend
  type: FieldType;
  label: string;
  placeholder?: string;
  defaultValue?: string; // <--- ADD THIS
  options?: string | string[] | { rows: string[]; cols: string[] } | { formId: string; columnName: string };
  
  validation: ValidationRules;
  columnName: string; // The SQL column name (generated automatically)
}



export interface FormSchema {
  id?: number; // Null if new form
  publicShareToken?: string; // Add this!
  title: string;
  description: string;
  targetTableName: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fields: FormField[];
  rules?: FormRule[];
}

