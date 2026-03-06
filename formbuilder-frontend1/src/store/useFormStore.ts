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
  setFields: (fields: FormField[]) => void;
  setAllowEditResponse: (allow: boolean) => void;

  // Field actions — called from Canvas, SortableField, PropertiesPanel
  addField: (type: FieldType) => void;
  removeField: (id: string) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  selectField: (id: string | null) => void;
  reorderFields: (newOrder: FormField[]) => void;
}

export const useFormStore = create<FormState>((set) => ({

  /** Default blank form state loaded when /builder is opened for a new form. */
  schema: {
    id: undefined, // Will be set after the first save or when loading an existing form
    title: 'Untitled Form',
    description: '',
    targetTableName: '',
    fields: [],
    allowEditResponse: false,
  },
  selectedFieldId: null,

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
    schema: { id: undefined, title: 'Untitled Form', description: '', targetTableName: '', fields: [] },
    selectedFieldId: null
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

  /**
   * Adds a new field of the given type to the end of the field list.
   * A UUID is generated for the client-side ID (replaced by the DB ID on reload).
   * A placeholder columnName uses the current timestamp to be unique enough
   * before the user types a label.
   * Automatically selects the new field so the PropertiesPanel opens immediately.
   */
  addField: (type) =>
    set((state) => {
      const newField: FormField = {
        id: uuidv4(),
        type,
        label: `New ${type} Field`,
        columnName: `field_${Date.now()}`, // Placeholder — replaced when user edits the label
        validation: { required: false },
      };
      return {
        schema: { ...state.schema, fields: [...state.schema.fields, newField] },
        selectedFieldId: newField.id  // Auto-select the new field
      };
    }),

  /** Removes a field by ID and clears the selection. */
  removeField: (id) =>
    set((state) => ({
      schema: {
        ...state.schema,
        fields: state.schema.fields.filter((f) => f.id !== id),
      },
      selectedFieldId: null,
    })),

  /**
   * Updates a field with partial changes. Two important side effects:
   *
   *   1. columnName sync: If the label is being changed, automatically re-derives
   *      the columnName using the same algorithm as the backend
   *      (lowercase → replace non-alphanums with "_" → strip leading/trailing "_").
   *
   *   2. Rules cascade: If the columnName changed, scans ALL existing rules and
   *      replaces the old columnName in conditions and actions with the new one.
   *      This prevents "ghost references" in rules after a field rename.
   */
  updateField: (id, updates) => set((state) => {
    const fieldToUpdate = state.schema.fields.find(f => f.id === id);
    if (!fieldToUpdate) return state;

    const oldColumnName = fieldToUpdate.columnName;
    let newColumnName = oldColumnName;

    // Sync columnName with label (matches backend FormService.mapFields() logic)
    if (updates.label !== undefined) {
      newColumnName = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')  // Replace spaces/special chars with underscores
        .replace(/(^_|_$)/g, '');      // Remove leading/trailing underscores
    }

    const updatedFields = state.schema.fields.map(field =>
      field.id === id ? { ...field, ...updates, columnName: newColumnName || field.columnName } : field
    );

    // Auto-update any rules that reference the old columnName
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
    }

    return {
      schema: {
        ...state.schema,
        fields: updatedFields,
        rules: updatedRules
      }
    };
  }),

  /** Sets or clears the selected field. The PropertiesPanel reads this to know what to display. */
  selectField: (id) => set({ selectedFieldId: id }),

  /** Replaces the entire field list with a reordered copy — called after @dnd-kit/sortable's arrayMove. */
  reorderFields: (newOrder) =>
    set((state) => ({ schema: { ...state.schema, fields: newOrder } })),
}));