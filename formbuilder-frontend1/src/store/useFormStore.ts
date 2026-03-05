import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { FormField, FormSchema, FieldType } from '@/types/schema';

interface FormState {
  schema: FormSchema;
  selectedFieldId: string | null;
  
  // Actions
  addRule: (rule: any) => void;
  setRules: (rules: any[]) => void;
  updateRule: (id: string, rule: any) => void;
  deleteRule: (id: string) => void;
  resetForm: () => void;
  setFormId: (id: number) => void; // <--- NEW
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setFields: (fields: FormField[]) => void; // <--- NEW
  addField: (type: FieldType) => void;
  removeField: (id: string) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  selectField: (id: string | null) => void;
  reorderFields: (newOrder: FormField[]) => void;

}

export const useFormStore = create<FormState>((set) => ({

  schema: {
    id: undefined, // Start undefined
    title: 'Untitled Form',
    description: '',
    targetTableName: '',
    fields: [],
  },
  selectedFieldId: null,

  setRules: (rules) => set((state) => ({ 
    schema: { ...state.schema, rules } 
  })),

  addRule: (rule) => set((state) => ({
    schema: { ...state.schema, rules: [...(state.schema.rules || []), rule] }
  })),

  updateRule: (id, updatedRule) => set((state) => ({
    schema: {
      ...state.schema,
      rules: (state.schema.rules || []).map(r => r.id === id ? updatedRule : r)
    }
  })),

  deleteRule: (id) => set((state) => ({
    schema: {
      ...state.schema,
      rules: (state.schema.rules || []).filter(r => r.id !== id)
    }
  })),

  resetForm: () => set({
    schema: { id: undefined, title: 'Untitled Form', description: '', targetTableName: '', fields: [] },
    selectedFieldId: null
  }),
  // --- NEW ACTIONS ---
  setFormId: (id) =>
    set((state) => ({ schema: { ...state.schema, id } })),

  setFields: (fields) =>
    set((state) => ({ schema: { ...state.schema, fields } })),
  // -------------------

  setTitle: (title) =>
    set((state) => ({ schema: { ...state.schema, title } })),

  setDescription: (description) =>
    set((state) => ({ schema: { ...state.schema, description } })),

  addField: (type) =>
    set((state) => {
      const newField: FormField = {
        id: uuidv4(),
        type,
        label: `New ${type} Field`,
        columnName: `field_${Date.now()}`,
        validation: { required: false },
      };
      return {
        schema: { ...state.schema, fields: [...state.schema.fields, newField] },
        selectedFieldId: newField.id
      };
    }),

  removeField: (id) =>
    set((state) => ({
      schema: {
        ...state.schema,
        fields: state.schema.fields.filter((f) => f.id !== id),
      },
      selectedFieldId: null,
    })),

updateField: (id, updates) => set((state) => {
    const fieldToUpdate = state.schema.fields.find(f => f.id === id);
    if (!fieldToUpdate) return state;

    const oldColumnName = fieldToUpdate.columnName;
    let newColumnName = oldColumnName;

    // MAGIC FIX 1: Keep frontend columnName perfectly synced with backend!
    if (updates.label !== undefined) {
      newColumnName = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_') // Replace spaces/special chars with underscores
        .replace(/(^_|_$)/g, '');    // Remove leading/trailing underscores
    }

    // Update the field with the new values and the synchronized columnName
    const updatedFields = state.schema.fields.map(field =>
      field.id === id ? { ...field, ...updates, columnName: newColumnName || field.columnName } : field
    );

    // MAGIC FIX 2: Auto-update rules if the columnName changed!
    // This prevents rules from breaking if the user renames a field later.
    let updatedRules = state.schema.rules || [];
    if (newColumnName && oldColumnName && newColumnName !== oldColumnName) {
      updatedRules = updatedRules.map(rule => {
        // Update the IF condition
        const newConditions = rule.conditions.map((cond: any) =>
          cond.field === oldColumnName ? { ...cond, field: newColumnName } : cond
        );
        // Update the THEN action
        const newActions = rule.actions.map((act: any) =>
          act.targetField === oldColumnName ? { ...act, targetField: newColumnName } : act
        );
        return { ...rule, conditions: newConditions, actions: newActions };
      });
    }

    return {
      schema: {
        ...state.schema,
        fields: updatedFields,
        rules: updatedRules
      }
    };
  }),

  selectField: (id) => set({ selectedFieldId: id }),

  reorderFields: (newOrder) =>
    set((state) => ({ schema: { ...state.schema, fields: newOrder } })),
}));