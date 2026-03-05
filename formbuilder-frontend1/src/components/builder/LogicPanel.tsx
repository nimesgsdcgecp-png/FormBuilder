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

  if (fields.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
        <GitBranch size={48} className="mb-4 opacity-50" />
        <p>Add fields to your form before creating logic rules.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Form Logic</h2>
            <p className="text-gray-500 text-sm">Create rules to show, hide, or require fields dynamically.</p>
          </div>
          <button 
            onClick={handleAddRule}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm"
          >
            <Plus size={16} /> Add Rule
          </button>
        </div>

        <div className="space-y-6">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <input 
                  type="text" 
                  value={rule.name}
                  onChange={(e) => updateRule(rule.id, { ...rule, name: e.target.value })}
                  className="font-semibold text-lg border-none focus:ring-0 px-0"
                  placeholder="Rule Name"
                />
                <button onClick={() => deleteRule(rule.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                  <Trash2 size={18} />
                </button>
              </div>

              {/* CONDITION (THE "IF") */}
              <div className="mb-6 bg-blue-50/50 p-4 rounded-md border border-blue-100">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 block">IF (Condition)</span>
                <div className="flex gap-3 items-center">
                  <select 
                    value={rule.conditions[0]?.field || ''}
                    onChange={(e) => {
                      const newConditions = [...rule.conditions];
                      newConditions[0].field = e.target.value;
                      updateRule(rule.id, { ...rule, conditions: newConditions });
                    }}
                    className="flex-1 border-gray-300 rounded text-sm p-2"
                  >
                    <option value="">Select Field...</option>
                    {fields.map(f => <option key={f.id} value={f.columnName}>{f.label}</option>)}
                  </select>

                  <select 
                    value={rule.conditions[0]?.operator || 'EQUALS'}
                    onChange={(e) => {
                      const newConditions = [...rule.conditions];
                      // Add "as RuleOperator" to fix the error
                      newConditions[0].operator = e.target.value as RuleOperator; 
                      updateRule(rule.id, { ...rule, conditions: newConditions });
                    }}
                    className="w-40 border-gray-300 rounded text-sm p-2"
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
                    className="flex-1 border-gray-300 rounded text-sm p-2"
                  />
                </div>
              </div>

              {/* ACTION (THE "THEN") */}
              <div className="bg-purple-50/50 p-4 rounded-md border border-purple-100">
                <span className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-2 block">THEN (Action)</span>
                <div className="flex gap-3 items-center">
                  <select 
                    value={rule.actions[0]?.type || 'SHOW'}
                    onChange={(e) => {
                      const newActions = [...rule.actions];
                      newActions[0].type = e.target.value as ActionType; 
                      updateRule(rule.id, { ...rule, actions: newActions });
                    }}
                    className="w-48 border-gray-300 rounded text-sm p-2"
                  >
                    <option value="SHOW">Show Field</option>
                    <option value="HIDE">Hide Field</option>
                    <option value="REQUIRE">Make Field Required</option>
                    <option value="VALIDATION_ERROR">Show Custom Error</option>
                    {/* ADD THIS NEW OPTION */}
                    <option value="SEND_EMAIL">Send Email To</option>
                  </select>

                  {/* Render the correct input based on the action type */}
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
                      className="flex-1 border-gray-300 rounded text-sm p-2"
                    />
                  ) : rule.actions[0]?.type === 'SEND_EMAIL' ? (
                    <input 
                      type="email" 
                      placeholder="admin@company.com"
                      value={rule.actions[0]?.message || ''} 
                      onChange={(e) => {
                        const newActions = [...rule.actions];
                        newActions[0].message = e.target.value; // Storing the email address in 'message'
                        updateRule(rule.id, { ...rule, actions: newActions });
                      }}
                      className="flex-1 border-gray-300 rounded text-sm p-2"
                    />
                  ) : (
                    <select 
                      value={rule.actions[0]?.targetField || ''}
                      onChange={(e) => {
                        const newActions = [...rule.actions];
                        newActions[0].targetField = e.target.value;
                        updateRule(rule.id, { ...rule, actions: newActions });
                      }}
                      className="flex-1 border-gray-300 rounded text-sm p-2"
                    >
                      <option value="">Select Target Field...</option>
                      {fields.map(f => <option key={f.id} value={f.columnName}>{f.label}</option>)}
                    </select>
                  )}
                </div>
              </div>

            </div>
          ))}
          {rules.length === 0 && (
             <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 border-dashed rounded-lg">
               No rules defined yet. Click "Add Rule" to start building logic.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}