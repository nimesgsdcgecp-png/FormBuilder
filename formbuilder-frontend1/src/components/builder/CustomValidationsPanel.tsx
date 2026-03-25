'use client';

import React, { useState } from 'react';
import { PlusCircle, Trash2, Info, ChevronDown } from 'lucide-react';

export interface ValidationRule {
  id: string;
  scope: 'FIELD' | 'FORM';
  fieldKey: string;
  expression: string;
  errorMessage: string;
  executionOrder: number;
}

interface Props {
  fields: Array<{ columnName: string; label: string }>;
  rules: ValidationRule[];
  onChange: (rules: ValidationRule[]) => void;
}

const SCOPE_OPTIONS = [
  { value: 'FORM', label: 'Form-level (runs after all fields)' },
  { value: 'FIELD', label: 'Field-level (targets a specific field)' },
];

export default function CustomValidationsPanel({ fields, rules, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addRule = () => {
    const newRule: ValidationRule = {
      id: crypto.randomUUID(),
      scope: 'FORM',
      fieldKey: '',
      expression: '',
      errorMessage: '',
      executionOrder: rules.length,
    };
    onChange([...rules, newRule]);
    setExpandedId(newRule.id);
  };

  const updateRule = (id: string, patch: Partial<ValidationRule>) => {
    onChange(rules.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id).map((r, i) => ({ ...r, executionOrder: i })));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Custom Validations
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Write expression-based rules that run server-side on every submission.
          </p>
        </div>
        <button
          onClick={addRule}
          className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white gradient-accent shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={13} /> Add Rule
        </button>
      </div>

      {/* Info card */}
      <div className="flex gap-2 p-3 rounded-lg text-xs border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <Info size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <span>
          Expressions can reference field column names directly. Examples:
          <code className="mx-1 px-1 rounded" style={{ background: 'var(--bg-hover)' }}>end_date &gt; start_date</code>
          <code className="mx-1 px-1 rounded" style={{ background: 'var(--bg-hover)' }}>salary &gt; 50000</code>
          <code className="mx-1 px-1 rounded" style={{ background: 'var(--bg-hover)' }}>score &gt;= 0 &amp;&amp; score &lt;= 10</code>
        </span>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
            <PlusCircle size={22} style={{ color: 'var(--text-faint)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No validation rules yet</p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Click &quot;Add Rule&quot; to create your first expression-based rule.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((rule, idx) => (
            <div
              key={rule.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ borderColor: expandedId === rule.id ? 'var(--accent)' : 'var(--border)', background: 'var(--card-bg)' }}
            >
              {/* Rule header */}
              <div
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none"
                onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--accent)' }}>
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {rule.expression || <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>Empty expression</span>}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--text-faint)' }}>— {rule.scope}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                    className="p-1 rounded-md hover:text-red-500 transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronDown
                    size={14}
                    style={{ color: 'var(--text-faint)', transform: expandedId === rule.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  />
                </div>
              </div>

              {/* Expanded edit form */}
              {expandedId === rule.id && (
                <div className="px-3 pb-3 pt-0 flex flex-col gap-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                  {/* Scope */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Scope</label>
                    <select
                      value={rule.scope}
                      onChange={e => updateRule(rule.id, { scope: e.target.value as 'FIELD' | 'FORM', fieldKey: '' })}
                      className="w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1"
                      style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* Target field (only for FIELD scope) */}
                  {rule.scope === 'FIELD' && (
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Target Field</label>
                      <select
                        value={rule.fieldKey}
                        onChange={e => updateRule(rule.id, { fieldKey: e.target.value })}
                        className="w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1"
                        style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        <option value="">— choose field —</option>
                        {fields.map(f => <option key={f.columnName} value={f.columnName}>{f.label} ({f.columnName})</option>)}
                      </select>
                    </div>
                  )}

                  {/* Expression */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Expression</label>
                    <input
                      type="text"
                      value={rule.expression}
                      onChange={e => updateRule(rule.id, { expression: e.target.value })}
                      placeholder='e.g. end_value > start_value'
                      className="w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1 font-mono"
                      style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Error message */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Error Message</label>
                    <input
                      type="text"
                      value={rule.errorMessage}
                      onChange={e => updateRule(rule.id, { errorMessage: e.target.value })}
                      placeholder='Shown to the user when validation fails'
                      className="w-full text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1"
                      style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
