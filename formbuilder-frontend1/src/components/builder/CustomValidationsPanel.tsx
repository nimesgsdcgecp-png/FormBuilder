'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle, Trash2, Info, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateExpression } from '@/utils/expressionValidator';

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

  // Memoize field column names for validation
  const fieldColumnNames = useMemo(() => fields.map(f => f.columnName), [fields]);

  // Get validation result for a rule's expression
  const getExpressionValidation = (expression: string) => {
    if (!expression) return null;
    return validateExpression(expression, fieldColumnNames);
  };

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
        <div className="flex flex-col items-center justify-center flex-1 gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
            <PlusCircle size={32} style={{ color: 'var(--text-faint)' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No rules defined</p>
            <p className="text-[11px] mt-1 max-w-[200px]" style={{ color: 'var(--text-faint)' }}>Combine fields and logic to create complex server-side validations.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.sort((a,b) => a.executionOrder - b.executionOrder).map((rule, idx) => (
            <div
              key={rule.id}
              className="rounded-2xl border transition-all duration-300 group overflow-hidden"
              style={{ 
                borderColor: expandedId === rule.id ? 'var(--accent)' : 'var(--border)', 
                background: 'var(--card-bg)',
                boxShadow: expandedId === rule.id ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {/* Rule header */}
              <div
                className="flex items-center justify-between px-4 py-4 cursor-pointer select-none relative"
                onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
              >
                {expandedId === rule.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" />
                )}
                
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm" style={{ background: 'var(--bg-muted)', color: 'var(--accent)' }}>
                    {idx + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                      {rule.expression || <span className="italic font-normal opacity-40">New validation expression...</span>}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--bg-subtle)]" style={{ color: 'var(--text-faint)' }}>
                        {rule.scope}
                      </span>
                      {rule.fieldKey && (
                        <span className="text-[9px] font-bold text-[var(--accent)] truncate">
                          Target: {rule.fieldKey}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="p-2">
                    <ChevronDown
                      size={14}
                      className="transition-transform duration-300"
                      style={{ color: 'var(--text-faint)', transform: expandedId === rule.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Expanded content */}
              {expandedId === rule.id && (
                <div className="px-5 pb-5 pt-2 flex flex-col gap-5 border-t animate-in fade-in slide-in-from-top-1 duration-200" style={{ borderColor: 'var(--border)' }}>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-50">Operation Scope</label>
                      <select
                        value={rule.scope}
                        onChange={e => updateRule(rule.id, { scope: e.target.value as 'FIELD' | 'FORM', fieldKey: '' })}
                        className="w-full text-xs font-bold rounded-xl px-3 py-2.5 border bg-[var(--bg-muted)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {rule.scope === 'FIELD' && (
                      <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-50">Target Field</label>
                        <select
                          value={rule.fieldKey}
                          onChange={e => updateRule(rule.id, { fieldKey: e.target.value })}
                          className="w-full text-xs font-bold rounded-xl px-3 py-2.5 border bg-[var(--bg-muted)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                          <option value="">Choose Column...</option>
                          {fields.map(f => <option key={f.columnName} value={f.columnName}>{f.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.15em] opacity-50">Condition Expression</label>
                      <span className="text-[9px] font-mono text-[var(--text-faint)]">Logic Engine v1.0</span>
                    </div>
                    {(() => {
                      const validation = getExpressionValidation(rule.expression);
                      const hasErrors = validation && !validation.valid;
                      const hasWarnings = validation && validation.warnings.length > 0;
                      const isValid = validation && validation.valid && validation.warnings.length === 0;
                      
                      return (
                        <>
                          <div className="relative">
                            <input
                              type="text"
                              value={rule.expression}
                              onChange={e => updateRule(rule.id, { expression: e.target.value })}
                              placeholder='e.g. quantity > 10 && total < 1000'
                              className="w-full text-xs font-mono font-bold rounded-xl pl-4 pr-10 py-3 border bg-[var(--bg-muted)] focus:ring-2 outline-none transition-all"
                              style={{ 
                                borderColor: hasErrors ? '#ef4444' : hasWarnings ? '#f59e0b' : isValid ? '#22c55e' : 'var(--border)', 
                                color: 'var(--text-primary)' 
                              }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {hasErrors ? (
                                <AlertCircle size={14} className="text-red-500" />
                              ) : hasWarnings ? (
                                <AlertCircle size={14} className="text-amber-500" />
                              ) : isValid ? (
                                <CheckCircle2 size={14} className="text-green-500" />
                              ) : (
                                <Info size={14} className="text-[var(--accent)] opacity-50" />
                              )}
                            </div>
                          </div>
                          
                          {/* Validation errors */}
                          {hasErrors && (
                            <div className="flex flex-col gap-1 mt-1.5">
                              {validation.errors.map((err, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px] text-red-500">
                                  <AlertCircle size={10} />
                                  <span>{err.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Validation warnings (unknown fields) */}
                          {hasWarnings && !hasErrors && (
                            <div className="flex flex-col gap-1 mt-1.5">
                              {validation.warnings.map((warn, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-600">
                                  <AlertCircle size={10} />
                                  <span>{warn.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Referenced fields display */}
                          {validation && validation.fieldReferences.length > 0 && !hasErrors && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-[9px] text-[var(--text-faint)]">References:</span>
                              {validation.fieldReferences.map(ref => {
                                const isKnown = fieldColumnNames.includes(ref);
                                return (
                                  <span 
                                    key={ref}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isKnown ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                  >
                                    {ref}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-50">Failure Message</label>
                    <input
                      type="text"
                      value={rule.errorMessage}
                      onChange={e => updateRule(rule.id, { errorMessage: e.target.value })}
                      placeholder='Something went wrong...'
                      className="w-full text-xs font-bold rounded-xl px-4 py-3 border bg-[var(--bg-muted)] focus:ring-2 focus:ring-red-400 outline-none transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <p className="text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-widest text-center pt-2">
                    Rule will be evaluated upon submission
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
