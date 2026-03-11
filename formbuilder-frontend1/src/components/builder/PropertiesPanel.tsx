'use client';

/**
 * PropertiesPanel — Field Configuration Side Panel in the Builder.
 * Provides controls to configure label, default value, options, grid config,
 * lookup config, and validation rules for the currently selected field.
 */

import { useFormStore } from '@/store/useFormStore';
import { Plus, Trash2, Settings2, Divide, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';

/** Reusable section header for properties panel sections */
function SectionHeader({ label, color = 'var(--accent)' }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-2 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="h-[3px] w-3 rounded-full" style={{ background: color }} />
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
        {label}
      </span>
    </div>
  );
}

/** Reusable styled input */
function PanelInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg border text-sm transition-all"
      style={{
        background: 'var(--input-bg)',
        borderColor: 'var(--input-border)',
        color: 'var(--text-primary)',
        ...(props.disabled ? { color: 'var(--text-faint)', cursor: 'not-allowed' } : {}),
      }}
      onFocus={e => {
        if (!props.disabled) e.currentTarget.style.borderColor = 'var(--input-focus)';
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--input-border)';
      }}
    />
  );
}

/** Reusable styled select */
function PanelSelect({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 rounded-lg border text-sm transition-all"
      style={{
        background: 'var(--input-bg)',
        borderColor: 'var(--input-border)',
        color: 'var(--text-primary)',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--input-focus)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
    />
  );
}

import { X } from 'lucide-react';

export default function PropertiesPanel() {
  const { schema, selectedFieldId, updateField, setThemeColor, setThemeFont, isThemePanelOpen, setThemePanelOpen } = useFormStore();

  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [selectedFormSchema, setSelectedFormSchema] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/forms', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setAvailableForms(data))
      .catch(console.error);
  }, []);

  const findFieldRecursive = (fields: any[], id: string | null): any | undefined => {
    if (!id) return undefined;
    for (const f of fields) {
      if (f.id === id) return f;
      if (f.children) {
        const found = findFieldRecursive(f.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedField = findFieldRecursive(schema.fields, selectedFieldId);

  useEffect(() => {
    if (selectedField?.type === 'LOOKUP') {
      const config = selectedField.options as any;
      if (config?.formId) {
        fetch(`http://localhost:8080/api/forms/${config.formId}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => setSelectedFormSchema(data))
          .catch(console.error);
      }
    }
  }, [selectedField?.type, (selectedField?.options as any)?.formId]);

  // Form-level settings when Palette icon is clicked
  if (isThemePanelOpen) {
    const PRESET_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316'];
    const PRESET_FONTS = [
      { name: 'Inter', value: 'var(--font-inter)' },
      { name: 'Geist Sans', value: 'var(--font-geist-sans)' },
      { name: 'Geist Mono', value: 'var(--font-geist-mono)' },
      { name: 'System UI', value: 'system-ui, sans-serif' }
    ];

    const currentColor = schema.themeColor || '#6366f1';
    const currentFont = schema.themeFont || 'Inter';

    return (
      <aside
        className="w-80 border-l h-full flex flex-col shrink-0 relative"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="px-4 py-4 border-b shrink-0 flex justify-between items-center"
          style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Form Style</h2>
            <span
              className="text-[11px] font-bold uppercase tracking-widest mt-0.5 block"
              style={{ color: 'var(--text-faint)' }}
            >
              Global Settings
            </span>
          </div>
          <button
            onClick={() => setThemePanelOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-8 pt-6">
          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Theme Color</label>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: currentColor === color ? 'var(--text-primary)' : 'transparent',
                    boxShadow: currentColor === color ? '0 0 0 2px var(--bg-surface)' : 'none'
                  }}
                  title={`Set color to ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Font Picker */}
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Typography</label>
            <div className="space-y-2">
              {PRESET_FONTS.map(font => (
                <button
                  key={font.name}
                  onClick={() => setThemeFont(font.name)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between"
                  style={{
                    fontFamily: font.value,
                    background: currentFont === font.name ? 'var(--bg-subtle)' : 'transparent',
                    borderColor: currentFont === font.name ? 'var(--accent)' : 'var(--border)',
                    color: currentFont === font.name ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <span className="text-sm">{font.name}</span>
                  {currentFont === font.name && (
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
              These settings apply globally to the public form and the canvas preview.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // Empty state when no field is selected and Theme Panel is closed
  if (!selectedField) {
    return (
      <aside
        className="w-80 border-l flex flex-col items-center justify-center text-center px-8 shrink-0"
        style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-subtle)' }}
        >
          <Settings2 size={24} style={{ color: 'var(--text-faint)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Select a field to edit
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
          Properties will appear here
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="w-80 border-l h-full flex flex-col shrink-0"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      {/* Panel header */}
      <div
        className="px-4 py-4 border-b shrink-0"
        style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Field Properties</h2>
        <span
          className="text-[11px] font-bold uppercase tracking-widest mt-0.5 block"
          style={{ color: 'var(--accent)' }}
        >
          {selectedField.type} Field
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4 pt-2">
        {selectedField.type === 'CALCULATED' && (
          <div className="p-4 rounded-xl border mb-2 flex flex-col items-center text-center gap-3"
            style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
              <Hash size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Calculated Field</h3>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                This field derives its value from other fields using a formula.
              </p>
            </div>
          </div>
        )}
        {selectedField.type === 'PAGE_BREAK' && (
          <div className="p-4 rounded-xl border mb-2 flex flex-col items-center text-center gap-3"
            style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
              <Divide size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Wizard Step Boundary</h3>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Dropping this marker splits your form into multiple pages. Respondents must click "Next" to continue.
              </p>
            </div>
          </div>
        )}
        {/* Label / Title Input */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {selectedField.type === 'SECTION_HEADER' ? 'Section Title' : selectedField.type === 'INFO_LABEL' ? 'Information Content' : selectedField.type === 'PAGE_BREAK' ? 'Marker Label' : 'Label'}
          </label>
          {selectedField.type === 'INFO_LABEL' ? (
            <textarea
              className="w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)', minHeight: '80px' }}
              value={selectedField.label}
              onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
            />
          ) : (
            <PanelInput
              type="text"
              value={selectedField.label}
              onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
              disabled={selectedField.type === 'PAGE_BREAK'}
            />
          )}
          {selectedField.type === 'PAGE_BREAK' && (
            <p className="text-[10px] mt-2 italic" style={{ color: 'var(--text-faint)' }}>
              Markers act as "Step Ends". Fields below this point will appear on the next page.
            </p>
          )}
        </div>

        {/* Help Text Input */}
        {selectedField.type !== 'PAGE_BREAK' && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Help Text / Instructions
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)', minHeight: '60px' }}
              value={selectedField.helpText || ''}
              onChange={(e) => updateField(selectedField.id, { helpText: e.target.value })}
              placeholder="Provide extra context for respondents..."
            />
          </div>
        )}

        {/* Placeholder / Description Input */}
        {selectedField.type !== 'INFO_LABEL' && selectedField.type !== 'PAGE_BREAK' && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {selectedField.type === 'SECTION_HEADER' ? 'Sub-description' : 'Placeholder'}
            </label>
            <PanelInput
              type="text"
              placeholder={selectedField.type === 'SECTION_HEADER' ? 'e.g. This section covers personal details...' : 'Enter placeholder...'}
              value={selectedField.placeholder || ''}
              onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
            />
          </div>
        )}

        {/* Column Name (Read-Only) */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Column Name <span className="font-normal" style={{ color: 'var(--text-faint)' }}>(auto-generated)</span>
          </label>
          <PanelInput
            type="text"
            value={selectedField.columnName}
            disabled
            className="font-mono text-xs"
          />
        </div>

        {/* Calculation Formula */}
        {(selectedField.type === 'CALCULATED' || selectedField.type === 'NUMERIC') && (
          <div>
            <SectionHeader label="Calculation" color="#f59e0b" />
            <div className="mt-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Formula
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none font-mono"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)', minHeight: '60px' }}
                placeholder="e.g. price * quantity"
                value={selectedField.calculationFormula || ''}
                onChange={(e) => updateField(selectedField.id, { calculationFormula: e.target.value })}
              />
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-faint)' }}>
                Use column names as variables. Supported: +, -, *, /, ( )
              </p>
            </div>

            {/* Helper: List available variables */}
            <div className="mt-3 p-3 rounded-lg border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Available Variables</p>
              <div className="flex flex-wrap gap-1.5">
                {schema.fields
                  .filter(f => f.columnName && f.id !== selectedFieldId && (f.type === 'NUMERIC' || f.type === 'CALCULATED' || f.type === 'SCALE' || f.type === 'RATING'))
                  .map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        const current = selectedField.calculationFormula || '';
                        updateField(selectedField.id, { calculationFormula: current + ' ' + f.columnName });
                      }}
                      className="px-2 py-0.5 rounded border text-[10px] font-mono transition-colors"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                    >
                      {f.columnName}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Default Value */}
        {selectedField.type !== 'SECTION_HEADER' && selectedField.type !== 'INFO_LABEL' && selectedField.type !== 'PAGE_BREAK' && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Default Value</label>
            {selectedField.type === 'BOOLEAN' ? (
              <PanelSelect
                value={selectedField.defaultValue || ''}
                onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
              >
                <option value="">(None)</option>
                <option value="true">Checked (True)</option>
                <option value="false">Unchecked (False)</option>
              </PanelSelect>
            ) : (
              <PanelInput
                type={selectedField.type === 'NUMERIC' ? 'number' : 'text'}
                placeholder={selectedField.type === 'DATE' ? 'YYYY-MM-DD' : 'Enter default value...'}
                value={selectedField.defaultValue || ''}
                onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
              />
            )}
          </div>
        )}

        {/* Options Manager — Dropdown, Radio, Checkbox Group */}
        {(selectedField.type === 'DROPDOWN' || selectedField.type === 'RADIO' || selectedField.type === 'CHECKBOX_GROUP') && (
          <div>
            <SectionHeader label="Options" color="#8b5cf6" />
            <div className="space-y-2">
              {((Array.isArray(selectedField.options) ? selectedField.options : []) as string[]).map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <PanelInput
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(Array.isArray(selectedField.options) ? selectedField.options : [])];
                      newOptions[index] = e.target.value;
                      updateField(selectedField.id, { options: newOptions });
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    onClick={() => {
                      const newOptions = (Array.isArray(selectedField.options) ? selectedField.options : []).filter((_: string, i: number) => i !== index);
                      updateField(selectedField.id, { options: newOptions });
                    }}
                    className="p-2 rounded-lg shrink-0 transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const newOptions = [...(Array.isArray(selectedField.options) ? selectedField.options : []), ""];
                updateField(selectedField.id, { options: newOptions });
              }}
              className="flex items-center gap-1.5 mt-3 text-xs font-semibold transition-colors"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.75'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              <Plus size={13} /> Add Option
            </button>
            {selectedField.type === 'DROPDOWN' && (
              <label className="flex items-start gap-3 p-3 mt-3 rounded-xl border transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" 
                     style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={selectedField.isMultiSelect || false}
                    onChange={(e) => updateField(selectedField.id, { isMultiSelect: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Enable Multiple Selection</span>
                  <span className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Allow respondents to select more than one option.
                  </span>
                </div>
              </label>
            )}
          </div>
        )}

        {/* Grid Manager — Grid Radio / Grid Check */}
        {(selectedField.type === 'GRID_RADIO' || selectedField.type === 'GRID_CHECK') && (
          <div>
            <SectionHeader label="Grid Config" color="#10b981" />
            <div className="space-y-5">
              {['rows', 'cols'].map((dimension) => {
                const gridOpts = (
                  (typeof selectedField.options === 'object' && !Array.isArray(selectedField.options))
                    ? selectedField.options
                    : { rows: [], cols: [] }
                ) as { rows: string[], cols: string[] };

                const items = dimension === 'rows' ? (gridOpts.rows || []) : (gridOpts.cols || []);

                return (
                  <div key={dimension}>
                    <p className="text-xs font-semibold mb-2 capitalize" style={{ color: 'var(--text-muted)' }}>
                      {dimension === 'cols' ? 'Columns' : 'Rows'}
                    </p>
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <PanelInput
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index] = e.target.value;
                              updateField(selectedField.id, { options: { ...gridOpts, [dimension]: newItems } });
                            }}
                            placeholder={`Label ${index + 1}`}
                          />
                          <button
                            onClick={() => {
                              const newItems = items.filter((_, i) => i !== index);
                              updateField(selectedField.id, { options: { ...gridOpts, [dimension]: newItems } });
                            }}
                            className="p-2 rounded-lg shrink-0 transition-colors"
                            style={{ color: 'var(--text-faint)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const newItems = [...items, ""];
                        updateField(selectedField.id, { options: { ...gridOpts, [dimension]: newItems } });
                      }}
                      className="flex items-center gap-1.5 mt-2 text-xs font-semibold"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Plus size={13} /> Add {dimension === 'cols' ? 'Column' : 'Row'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Lookup Manager */}
        {selectedField.type === 'LOOKUP' && (
          <div>
            <SectionHeader label="Linked Database" color="#ec4899" />
            <div className="space-y-3">

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Source Form</label>
                <PanelSelect
                  value={(selectedField.options as any)?.formId || ''}
                  onChange={(e) => {
                    updateField(selectedField.id, { options: { formId: e.target.value, columnName: '' } });
                  }}
                >
                  <option value="">-- Select a Form --</option>
                  {availableForms
                    .filter(f => f.id.toString() !== schema.id?.toString())
                    .map(form => (
                      <option key={form.id} value={form.id}>{form.title}</option>
                    ))}
                </PanelSelect>
              </div>

              {(selectedField.options as any)?.formId && selectedFormSchema && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Display Column</label>
                  <PanelSelect
                    value={(selectedField.options as any)?.columnName || ''}
                    onChange={(e) => {
                      const currentConfig = selectedField.options as any;
                      updateField(selectedField.id, { options: { ...currentConfig, columnName: e.target.value } });
                    }}
                  >
                    <option value="">-- Select a Field --</option>
                    {selectedFormSchema.versions[0].fields
                      .filter((f: any) => ['TEXT', 'NUMERIC', 'DROPDOWN', 'RADIO'].includes(f.fieldType))
                      .map((field: any) => (
                        <option key={field.id} value={field.columnName}>{field.fieldLabel}</option>
                      ))}
                  </PanelSelect>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Rules */}
        {selectedField.type !== 'SECTION_HEADER' && selectedField.type !== 'INFO_LABEL' && selectedField.type !== 'PAGE_BREAK' && (
          <div>
            <SectionHeader label="Validation" color="#3b82f6" />
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                Field Behavior & Visibility
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Required Toggle */}
                <label className="flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" 
                       style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedField.validation.required}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          validation: { ...selectedField.validation, required: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Required Field</span>
                    <span className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Respondent must provide an answer to submit the form.
                    </span>
                  </div>
                </label>

                {/* Hidden Toggle */}
                <label className="flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" 
                       style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedField.isHidden || false}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          isHidden: e.target.checked
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Hidden Field</span>
                    <span className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Exists in database but is invisible to the user. Useful for metadata.
                    </span>
                  </div>
                </label>

                {/* Read-only Toggle */}
                <label className="flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" 
                       style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedField.isReadOnly || false}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          isReadOnly: e.target.checked
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Read-only</span>
                    <span className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Visible but cannot be edited. Good for pre-filled or calculated values.
                    </span>
                  </div>
                </label>

                {/* Disabled Toggle */}
                <label className="flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" 
                       style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedField.isDisabled || false}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          isDisabled: e.target.checked
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Disabled</span>
                    <span className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Grayed out and non-interactive. Clearly indicates an inactive field.
                    </span>
                  </div>
                </label>
              </div>

              {(selectedField.type === 'NUMERIC' || selectedField.type === 'SCALE') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--text-faint)' }}>
                      Min {selectedField.type === 'SCALE' ? '(Start)' : ''}
                    </label>
                    <PanelInput
                      type="number"
                      value={selectedField.validation?.min ?? (selectedField.type === 'SCALE' ? 1 : '')}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                        updateField(selectedField.id, { validation: { ...selectedField.validation, min: val } });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--text-faint)' }}>
                      Max {selectedField.type === 'SCALE' ? '(End)' : ''}
                    </label>
                    <PanelInput
                      type="number"
                      value={selectedField.validation?.max ?? (selectedField.type === 'SCALE' ? 5 : '')}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                        updateField(selectedField.id, { validation: { ...selectedField.validation, max: val } });
                      }}
                    />
                  </div>
                </div>
              )}

              {(selectedField.type === 'TEXT' || selectedField.type === 'TEXTAREA') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--text-faint)' }}>Min Length</label>
                      <PanelInput
                        type="number"
                        value={selectedField.validation?.minLength ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                          updateField(selectedField.id, { validation: { ...selectedField.validation, minLength: val } });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--text-faint)' }}>Max Length</label>
                      <PanelInput
                        type="number"
                        value={selectedField.validation?.maxLength ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                          updateField(selectedField.id, { validation: { ...selectedField.validation, maxLength: val } });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--text-faint)' }}>Regex Pattern</label>
                    <PanelInput
                      type="text"
                      placeholder="e.g. ^[0-9]{10}$"
                      className="font-mono"
                      value={selectedField.validation?.pattern ?? ''}
                      onChange={(e) => updateField(selectedField.id, {
                        validation: { ...selectedField.validation, pattern: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}