/**
 * LogicPanel — IF→THEN Form Logic Rule Builder
 *
 * Lets form creators define conditional rules that run server-side at submission
 * time via the Java RuleEngineService. Rules are: IF [field] [operator] [value]
 * THEN [action] [target/message].
 */
import { useFormStore } from '@/store/useFormStore';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { RuleOperator, ActionType } from '@/types/schema';

export default function LogicPanel() {
  const { schema, addRule, updateRule, deleteRule } = useFormStore();
  const rules = schema.rules || [];
  const fields = schema.fields || [];

  const handleAddRule = () => {
    const newRule = {
      id: crypto.randomUUID(),
      name: `Rule ${rules.length + 1}`,
      conditionLogic: 'AND',
      conditions: [{ field: '', operator: 'EQUALS', value: '' }],
      actions: [{ type: 'SHOW', targetField: '', message: '' }]
    };
    addRule(newRule);
  };

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
          {rules.map((rule) => (
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
                {/* IF — Condition */}
                <div
                  className="p-4 rounded-xl border"
                  style={{ background: 'var(--accent-subtle)', borderColor: 'var(--accent-muted)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      IF
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Condition is met</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={rule.conditions[0]?.field || ''}
                      onChange={(e) => {
                        const newConditions = [...rule.conditions];
                        newConditions[0].field = e.target.value;
                        updateRule(rule.id, { ...rule, conditions: newConditions });
                      }}
                      style={{ ...selectStyle, flex: '1 1 130px' }}
                    >
                      <option value="">Select Field...</option>
                      {fields
                        .filter(f => f.type !== 'SECTION_HEADER' && f.type !== 'INFO_LABEL')
                        .map(f => <option key={f.id} value={f.columnName}>{f.label}</option>)}
                    </select>

                    <select
                      value={rule.conditions[0]?.operator || 'EQUALS'}
                      onChange={(e) => {
                        const newConditions = [...rule.conditions];
                        newConditions[0].operator = e.target.value as RuleOperator;
                        updateRule(rule.id, { ...rule, conditions: newConditions });
                      }}
                      style={{ ...selectStyle, flex: '0 0 130px' }}
                    >
                      <option value="EQUALS">Equals</option>
                      <option value="NOT_EQUALS">Not Equals</option>
                      <option value="GREATER_THAN">Greater Than</option>
                      <option value="LESS_THAN">Less Than</option>
                      <option value="CONTAINS">Contains</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Value..."
                      value={rule.conditions[0]?.value as string || ''}
                      onChange={(e) => {
                        const newConditions = [...rule.conditions];
                        newConditions[0].value = e.target.value;
                        updateRule(rule.id, { ...rule, conditions: newConditions });
                      }}
                      style={{ ...inputStyle, flex: '1 1 100px' }}
                    />
                  </div>
                </div>

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
                        {fields
                          .filter(f => f.type !== 'SECTION_HEADER' && f.type !== 'INFO_LABEL')
                          .map(f => <option key={f.id} value={f.columnName}>{f.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {rules.length === 0 && (
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