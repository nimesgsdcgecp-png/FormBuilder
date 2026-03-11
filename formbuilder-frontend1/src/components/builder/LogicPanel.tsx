/**
 * LogicPanel — IF→THEN Form Logic Rule Builder
 *
 * Lets form creators define conditional rules that run server-side at submission
 * time via the Java RuleEngineService. Rules are: IF [field] [operator] [value]
 * THEN [action] [target/message].
 */
import React from 'react';
import { useFormStore } from '@/store/useFormStore';
import { Plus, Trash2, GitBranch, Type, Columns } from 'lucide-react';
import { RuleOperator, ActionType, ConditionLogic } from '@/types/schema';

const selectStyle: React.CSSProperties = {
  background: 'var(--input-bg)',
  borderColor: 'var(--input-border)',
  color: 'var(--text-primary)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8125rem',
  outline: 'none',
  flex: 1,
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
};

export default function LogicPanel() {
  const { schema, addRule, updateRule, deleteRule } = useFormStore();
  const rules = schema.rules || [];
  const fields = schema.fields || [];

  const flattenedFields = React.useMemo(() => {
    const flat: any[] = [];
    const traverse = (list: any[]) => {
      list.forEach(f => {
        flat.push(f);
        if (f.children) traverse(f.children);
      });
    };
    traverse(fields);
    return flat;
  }, [fields]);

  const handleAddRule = () => {
    const newRule = {
      id: crypto.randomUUID(),
      name: `Rule ${rules.length + 1}`,
      conditionLogic: 'AND',
      conditions: [{ type: 'condition', field: '', operator: 'EQUALS', value: '' }],
      actions: [{ type: 'SHOW', targetField: '', message: '' }]
    };
    addRule(newRule);
  };

  if (fields.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4"
        style={{ background: 'var(--canvas-bg)', color: 'var(--text-muted)' }}
      >
        <GitBranch size={40} className="opacity-40" />
        <p className="text-sm">Add fields to your form before creating logic rules.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: 'var(--canvas-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Form Logic</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Create rules to show, hide, or require fields dynamically.
            </p>
          </div>
          <button
            onClick={handleAddRule}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white gradient-accent shadow-sm hover:shadow-md transition-all"
          >
            <Plus size={15} /> Add Rule
          </button>
        </div>

        <div className="space-y-5">
          {rules.length > 0 ? (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl border overflow-hidden"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                {/* Rule name bar */}
                <div
                  className="flex justify-between items-center px-5 py-3.5 border-b"
                  style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
                >
                  <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, { ...rule, name: e.target.value })}
                    className="font-semibold text-sm border-none focus:ring-0 bg-transparent outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder="Rule Name"
                  />
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* IF / THEN blocks */}
                <div className="p-5 space-y-4">
                  {/* IF — Condition (Recursive) */}
                  <ConditionGroupBuilder
                    conditions={rule.conditions}
                    logic={rule.conditionLogic || 'AND'}
                    onUpdate={(newConditions) => updateRule(rule.id, { ...rule, conditions: newConditions })}
                    onUpdateLogic={(newLogic) => updateRule(rule.id, { ...rule, conditionLogic: newLogic })}
                    isRoot={true}
                    fields={flattenedFields}
                  />

                  {/* THEN — Action */}
                  <div
                    className="p-4 rounded-xl border"
                    style={{
                      background: 'var(--then-bg, #f5f3ff25)',
                      borderColor: 'var(--then-border, #4f29f7)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{ background: '#8b5cf6', color: '#fff' }}
                      >
                        THEN
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Perform this action</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={rule.actions[0]?.type || 'SHOW'}
                        onChange={(e) => {
                          const newActions = [...rule.actions];
                          newActions[0].type = e.target.value as ActionType;
                          updateRule(rule.id, { ...rule, actions: newActions });
                        }}
                        style={{ ...selectStyle, flex: '0 0 170px' }}
                      >
                        <option value="SHOW">Show Field</option>
                        <option value="HIDE">Hide Field</option>
                        <option value="ENABLE">Enable Field</option>
                        <option value="DISABLE">Disable Field</option>
                        <option value="REQUIRE">Make Required</option>
                        <option value="VALIDATION_ERROR">Show Error</option>
                        <option value="SEND_EMAIL">Send Email To</option>
                      </select>

                      {rule.actions[0]?.type === 'VALIDATION_ERROR' ? (
                        <input
                          type="text"
                          placeholder="Error message..."
                          value={rule.actions[0]?.message || ''}
                          onChange={(e) => {
                            const newActions = [...rule.actions];
                            newActions[0].message = e.target.value;
                            updateRule(rule.id, { ...rule, actions: newActions });
                          }}
                          style={inputStyle}
                        />
                      ) : rule.actions[0]?.type === 'SEND_EMAIL' ? (
                        <input
                          type="email"
                          placeholder="admin@company.com"
                          value={rule.actions[0]?.message || ''}
                          onChange={(e) => {
                            const newActions = [...rule.actions];
                            newActions[0].message = e.target.value;
                            updateRule(rule.id, { ...rule, actions: newActions });
                          }}
                          style={inputStyle}
                        />
                      ) : (
                        <select
                          value={rule.actions[0]?.targetField || ''}
                          onChange={(e) => {
                            const newActions = [...rule.actions];
                            newActions[0].targetField = e.target.value;
                            updateRule(rule.id, { ...rule, actions: newActions });
                          }}
                          style={selectStyle}
                        >
                          <option value="">Select Target Field...</option>
                          {flattenedFields
                            .filter(f => f.type !== 'PAGE_BREAK')
                            .map(f => (
                              <option key={f.id} value={f.columnName}>
                                {f.label} {f.type === 'SECTION_HEADER' ? '(Section)' : ''}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              className="text-center py-16 rounded-xl border-2 border-dashed"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card-bg)' }}
            >
              <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No rules defined yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                Click "Add Rule" to start building logic.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ConditionGroupBuilder = ({
  conditions = [],
  logic,
  onUpdate,
  onUpdateLogic,
  onDelete,
  isRoot = false,
  fields,
}: {
  conditions: any[];
  logic: ConditionLogic;
  onUpdate: (newConditions: any[]) => void;
  onUpdateLogic: (newLogic: ConditionLogic) => void;
  onDelete?: () => void;
  isRoot?: boolean;
  fields: any[];
}) => {
  return (
    <div
      className={`p-4 rounded-xl border ${!isRoot ? 'ml-6 mt-2' : ''}`}
      style={{
        background: isRoot ? 'var(--accent-subtle)' : 'var(--bg-card)',
        borderColor: isRoot ? 'var(--accent-muted)' : 'var(--border)'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: isRoot ? 'var(--accent)' : 'var(--text-muted)', color: '#fff' }}
          >
            {isRoot ? 'IF' : 'GROUP'}
          </span>
          <select
            value={logic || 'AND'}
            onChange={(e) => onUpdateLogic(e.target.value as ConditionLogic)}
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border focus:ring-0 cursor-pointer outline-none"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--input-bg)',
              borderColor: 'var(--input-border)'
            }}
          >
            <option value="AND">All match (AND)</option>
            <option value="OR">Any match (OR)</option>
          </select>

          {!isRoot && onDelete && (
            <button
              onClick={onDelete}
              className="p-1 px-2 rounded-md hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-transparent hover:border-red-100"
            >
              <Trash2 size={12} /> Delete Group
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate([...conditions, { type: 'condition', field: '', operator: 'EQUALS', value: '' }])}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            style={{ color: 'var(--accent)' }}
          >
            <Plus size={12} /> Add Condition
          </button>
          <button
            onClick={() => onUpdate([...conditions, { type: 'group', id: crypto.randomUUID(), logic: 'AND', conditions: [{ type: 'condition', field: '', operator: 'EQUALS', value: '' }] }])}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <Plus size={12} /> Add Group
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {conditions.map((entry, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <div className="flex items-center gap-4 px-2">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 px-2 py-0.5 rounded-sm border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {logic}
                </span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
            )}

            {entry.type === 'condition' ? (
              <div className="flex gap-2 items-center">
                <select
                  value={entry.field || ''}
                  onChange={(e) => {
                    const updated = [...conditions];
                    updated[idx] = { ...updated[idx], field: e.target.value };
                    onUpdate(updated);
                  }}
                  style={{ ...selectStyle, flex: '1 1 130px' }}
                >
                  <option value="">Select Field...</option>
                  {fields
                    .filter((f: any) => f.type !== 'SECTION_HEADER' && f.type !== 'INFO_LABEL')
                    .map((f: any) => <option key={f.id} value={f.columnName}>{f.label}</option>)}
                </select>

                <select
                  value={entry.operator || 'EQUALS'}
                  onChange={(e) => {
                    const updated = [...conditions];
                    updated[idx] = { ...updated[idx], operator: e.target.value as RuleOperator };
                    onUpdate(updated);
                  }}
                  style={{ ...selectStyle, flex: '0 0 130px' }}
                >
                  <option value="EQUALS">Equals</option>
                  <option value="NOT_EQUALS">Not Equals</option>
                  <option value="GREATER_THAN">Greater Than</option>
                  <option value="LESS_THAN">Less Than</option>
                  <option value="CONTAINS">Contains</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...conditions];
                      const currentType = updated[idx].valueType || 'STATIC';
                      const newType = currentType === 'FIELD' ? 'STATIC' : 'FIELD';
                      updated[idx] = { ...updated[idx], valueType: newType, value: '' };
                      onUpdate(updated);
                    }}
                    className="p-2 rounded-lg border transition-all hover:bg-slate-100"
                    style={{ 
                      borderColor: 'var(--border)', 
                      background: entry.valueType === 'FIELD' ? 'var(--accent-subtle)' : 'var(--bg-muted)',
                      color: entry.valueType === 'FIELD' ? 'var(--accent)' : 'var(--text-faint)'
                    }}
                    title={entry.valueType === 'FIELD' ? "Switch to Static Value" : "Switch to Field Comparison"}
                  >
                    {entry.valueType === 'FIELD' ? <Columns size={14} /> : <Type size={14} />}
                  </button>

                  {entry.valueType === 'FIELD' ? (
                    <select
                      value={entry.value as string || ''}
                      onChange={(e) => {
                        const updated = [...conditions];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        onUpdate(updated);
                      }}
                      style={{ ...selectStyle, flex: '1 1 100px' }}
                    >
                      <option value="">Select Field...</option>
                      {fields
                        .filter((f: any) => f.id !== entry.field && f.type !== 'SECTION_HEADER' && f.type !== 'INFO_LABEL' && f.columnName !== entry.field)
                        .map((f: any) => <option key={f.id} value={f.columnName}>{f.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Value..."
                      value={entry.value as string || ''}
                      onChange={(e) => {
                        const updated = [...conditions];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        onUpdate(updated);
                      }}
                      style={{ ...inputStyle, flex: '1 1 100px' }}
                    />
                  )}
                </div>

                {conditions.length > 1 && (
                  <button
                    onClick={() => onUpdate(conditions.filter((_, i) => i !== idx))}
                    className="p-1.5 opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ) : (
              <ConditionGroupBuilder
                conditions={entry.conditions}
                logic={entry.logic}
                onUpdate={(newSubConditions) => {
                  const updated = [...conditions];
                  updated[idx] = { ...updated[idx], conditions: newSubConditions };
                  onUpdate(updated);
                }}
                onUpdateLogic={(newSubLogic) => {
                  const updated = [...conditions];
                  updated[idx] = { ...updated[idx], logic: newSubLogic };
                  onUpdate(updated);
                }}
                onDelete={() => onUpdate(conditions.filter((_, i) => i !== idx))}
                fields={fields}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};