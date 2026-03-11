/**
 * useFormStore — Zustand Global State Store for the Form Builder
 *
 * What it does:
 *   This is the single source of truth for the entire form builder's state.
 *   All builder components (Canvas, Sidebar, PropertiesPanel, LogicPanel, builder/page.tsx)
 *   read from and write to this store instead of passing props through multiple layers.
 *
 * State management library: Zustand (lightweight, no boilerplate compared to Redux).
 *   - Uses zustand's {@code create} to define the store with state + actions in one object.
 *   - UUID generation via the {@code uuid} library (v4 UUIDs for new fields and rules).
 *   - No selectors/slices needed — components consume only what they need with destructuring.
 *
 * State shape:
 *   - {@code schema}          — the full {@link FormSchema}: title, description, fields,
 *                               rules, allowEditResponse, etc.
 *   - {@code selectedFieldId} — the currently selected field card on the canvas. Used by
 *                               Canvas and PropertiesPanel to show/highlight the active field.
 *
 * Key design patterns:
 *
 *   Auto-derived columnName ({@link updateField}):
 *     When a field's label is changed, the column name is automatically re-derived to
 *     match (e.g. "First Name" → "first_name"). This keeps the frontend columnName perfectly
 *     in sync with what the backend generates, preventing mismatches when saving.
 *
 *   Auto-updating rules on rename ({@link updateField}):
 *     If a field is renamed and its columnName changes, all existing logic rules that
 *     reference the old columnName in their conditions ({@code rule.conditions[].field})
 *     or actions ({@code rule.actions[].targetField}) are automatically updated to use
 *     the new columnName. This prevents rules from silently breaking when a field is renamed.
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { FormField, FormSchema, FieldType } from '@/types/schema';

/** All store state + all action functions in one flat interface. */
interface FormState {
  schema: FormSchema;
  selectedFieldId: string | null;
  isThemePanelOpen: boolean;

  // Rule actions — called from LogicPanel
  addRule: (rule: any) => void;
  setRules: (rules: any[]) => void;
  updateRule: (id: string, rule: any) => void;
  deleteRule: (id: string) => void;

  // Schema lifecycle actions
  resetForm: () => void;
  setFormId: (id: number) => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setThemeColor: (color: string) => void;
  setThemeFont: (font: string) => void;
  setFields: (fields: FormField[]) => void;
  setAllowEditResponse: (allow: boolean) => void;

  // Field actions — called from Canvas, SortableField, PropertiesPanel
  addField: (type: FieldType, parentId?: string | null) => void;
  insertField: (type: FieldType, index: number, parentId?: string | null) => void;
  removeField: (id: string) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  selectField: (id: string | null) => void;
  reorderFields: (newOrder: FormField[], parentId?: string | null) => void;
  setThemePanelOpen: (isOpen: boolean) => void;
}

/** Recursive helper to update a field within a tree of fields */
const updateFieldInTree = (fields: FormField[], id: string, updates: Partial<FormField>): FormField[] => {
  return fields.map(field => {
    if (field.id === id) {
      return { ...field, ...updates };
    }
    if (field.children && field.children.length > 0) {
      return { ...field, children: updateFieldInTree(field.children, id, updates) };
    }
    return field;
  });
};

/** Recursive helper to find a field in a tree */
const findFieldInTree = (fields: FormField[], id: string): FormField | undefined => {
  for (const field of fields) {
    if (field.id === id) return field;
    if (field.children) {
      const found = findFieldInTree(field.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

/** Recursive helper to remove a field from a tree */
const removeFieldFromTree = (fields: FormField[], id: string): FormField[] => {
  return fields
    .filter(f => f.id !== id)
    .map(f => ({
      ...f,
      children: f.children ? removeFieldFromTree(f.children, id) : undefined
    }));
};

/** Recursive helper to insert a field into a tree at a specific parent */
const insertFieldIntoTree = (fields: FormField[], newField: FormField, index: number, parentId?: string | null): FormField[] => {
  if (!parentId) {
    const newFields = [...fields];
    newFields.splice(index, 0, newField);
    return newFields;
  }
  return fields.map(field => {
    if (field.id === parentId) {
      const newChildren = [...(field.children || [])];
      newChildren.splice(index, 0, newField);
      return { ...field, children: newChildren };
    }
    if (field.children) {
      return { ...field, children: insertFieldIntoTree(field.children, newField, index, parentId) };
    }
    return field;
  });
};

/** Recursive helper to apply reorder to a specific container in the tree */
const reorderInTree = (fields: FormField[], newOrder: FormField[], parentId?: string | null): FormField[] => {
  if (!parentId) return newOrder;
  return fields.map(field => {
    if (field.id === parentId) {
      return { ...field, children: newOrder };
    }
    if (field.children) {
      return { ...field, children: reorderInTree(field.children, newOrder, parentId) };
    }
    return field;
  });
};

/** Recursive helper to find all field columnNames in a tree */
const getAllColumnNames = (fields: FormField[], names: string[] = []) => {
  fields.forEach(f => {
    names.push(f.columnName);
    if (f.children) getAllColumnNames(f.children, names);
  });
  return names;
};

export const useFormStore = create<FormState>((set) => ({

  /** Default blank form state loaded when /builder is opened for a new form. */
  schema: {
    id: undefined,
    title: 'Untitled Form',
    description: '',
    targetTableName: '',
    fields: [],
    allowEditResponse: false,
    themeColor: '#6366f1',  // Default: indigo
    themeFont: 'Inter',     // Default: Inter
  },
  selectedFieldId: null,
  isThemePanelOpen: false,

  /** Replace the entire rules array — used when loading an existing form. */
  setRules: (rules) => set((state) => ({
    schema: { ...state.schema, rules }
  })),

  /** Toggle whether respondents can edit their submission after submitting. */
  setAllowEditResponse: (allow) =>
    set((state) => ({
      schema: { ...state.schema, allowEditResponse: allow },
    })),

  /** Append a single new rule to the rules array. Called from LogicPanel "Add Rule". */
  addRule: (rule) => set((state) => ({
    schema: { ...state.schema, rules: [...(state.schema.rules || []), rule] }
  })),

  /**
   * Replaces a rule by its ID with the updated rule object.
   * Used whenever any field in a rule row changes in the LogicPanel.
   */
  updateRule: (id, updatedRule) => set((state) => ({
    schema: {
      ...state.schema,
      rules: (state.schema.rules || []).map(r => r.id === id ? updatedRule : r)
    }
  })),

  /** Removes a rule by its ID from the rules list. */
  deleteRule: (id) => set((state) => ({
    schema: {
      ...state.schema,
      rules: (state.schema.rules || []).filter(r => r.id !== id)
    }
  })),

  /** Resets all state to the blank new-form defaults. Called at the start of /builder for a new form. */
  resetForm: () => set({
    schema: { id: undefined, title: 'Untitled Form', description: '', targetTableName: '', fields: [], themeColor: '#6366f1', themeFont: 'Inter' },
    selectedFieldId: null,
    isThemePanelOpen: false
  }),

  /** Sets the form's database ID after a save response. */
  setFormId: (id) =>
    set((state) => ({ schema: { ...state.schema, id } })),

  /** Replaces the entire field list — used when loading an existing form from the API. */
  setFields: (fields) =>
    set((state) => ({ schema: { ...state.schema, fields } })),

  setTitle: (title) =>
    set((state) => ({ schema: { ...state.schema, title } })),

  setDescription: (description) =>
    set((state) => ({ schema: { ...state.schema, description } })),

  setThemeColor: (color) =>
    set((state) => ({ schema: { ...state.schema, themeColor: color } })),

  setThemeFont: (font) =>
    set((state) => ({ schema: { ...state.schema, themeFont: font } })),

  /**
   * Adds a new field of the given type to the end of the field list or a parent's children.
   */
  addField: (type, parentId = null) =>
    set((state) => {
      const newField: FormField = {
        id: uuidv4(),
        type,
        label: `New ${type} Field`,
        columnName: `field_${Date.now()}`,
        validation: { required: false },
        children: type === 'SECTION_HEADER' ? [] : undefined,
      };

      const updatedFields = insertFieldIntoTree(state.schema.fields, newField,
        parentId ? (findFieldInTree(state.schema.fields, parentId)?.children?.length || 0) : state.schema.fields.length,
        parentId);

      return {
        schema: { ...state.schema, fields: updatedFields },
        selectedFieldId: newField.id
      };
    }),

  /**
   * Inserts a new field of the given type at a specific index within a parent.
   */
  insertField: (type, index, parentId = null) =>
    set((state) => {
      const newField: FormField = {
        id: uuidv4(),
        type,
        label: `New ${type} Field`,
        columnName: `field_${Date.now()}`,
        validation: { required: false },
        children: type === 'SECTION_HEADER' ? [] : undefined,
      };

      const updatedFields = insertFieldIntoTree(state.schema.fields, newField, index, parentId);

      return {
        schema: { ...state.schema, fields: updatedFields },
        selectedFieldId: newField.id
      };
    }),

  /** Removes a field by ID and clears the selection. */
  removeField: (id) =>
    set((state) => ({
      schema: {
        ...state.schema,
        fields: removeFieldFromTree(state.schema.fields, id),
      },
      selectedFieldId: null,
    })),

  /**
   * Updates a field with partial changes. Handles recursive search and rules cascade.
   */
  updateField: (id, updates) => set((state) => {
    const fieldToUpdate = findFieldInTree(state.schema.fields, id);
    if (!fieldToUpdate) return state;

    const oldColumnName = fieldToUpdate.columnName;
    let newColumnName = oldColumnName;

    if (updates.label !== undefined) {
      newColumnName = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
    }

    let updatedFields = updateFieldInTree(state.schema.fields, id, {
      ...updates,
      columnName: newColumnName || fieldToUpdate.columnName
    });

    // Rules cascade
    let updatedRules = state.schema.rules || [];
    if (newColumnName && oldColumnName && newColumnName !== oldColumnName) {
      updatedRules = updatedRules.map(rule => {
        const newConditions = rule.conditions.map((cond: any) =>
          cond.field === oldColumnName ? { ...cond, field: newColumnName } : cond
        );
        const newActions = rule.actions.map((act: any) =>
          act.targetField === oldColumnName ? { ...act, targetField: newColumnName } : act
        );
        return { ...rule, conditions: newConditions, actions: newActions };
      });

      // Recursive formula update
      const updateFormulas = (fields: FormField[]): FormField[] => {
        return fields.map(f => {
          let updatedF = { ...f };
          if (f.calculationFormula) {
            updatedF.calculationFormula = f.calculationFormula.replaceAll(
              new RegExp(`\\b${oldColumnName}\\b`, 'g'),
              newColumnName
            );
          }
          if (f.children) {
            updatedF.children = updateFormulas(f.children);
          }
          return updatedF;
        });
      };
      updatedFields = updateFormulas(updatedFields);
    }

    return {
      schema: {
        ...state.schema,
        fields: updatedFields,
        rules: updatedRules
      }
    };
  }),

  /** Sets or clears the selected field. */
  selectField: (id) => set({ selectedFieldId: id, isThemePanelOpen: false }),

  /** Toggle theme panel */
  setThemePanelOpen: (isOpen) => set({ isThemePanelOpen: isOpen, selectedFieldId: null }),

  /** Replaces the entire field list or children of a parent with a reordered copy. */
  reorderFields: (newOrder, parentId = null) =>
    set((state) => ({
      schema: {
        ...state.schema,
        fields: reorderInTree(state.schema.fields, newOrder, parentId),
      },
    })),
}));