'use client';

import { useFormStore } from '@/store/useFormStore';
import { Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PropertiesPanel() {
  const { schema, selectedFieldId, updateField } = useFormStore();
  
  // State for Lookup Feature
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [selectedFormSchema, setSelectedFormSchema] = useState<any>(null);

  // Fetch all forms when panel loads
  useEffect(() => {
    fetch('http://localhost:8080/api/forms')
      .then(res => res.json())
      .then(data => setAvailableForms(data))
      .catch(console.error);
  }, []);

  // Find the currently selected field object
  const selectedField = schema.fields.find((f) => f.id === selectedFieldId);

  // If the user selects a source form, fetch its full schema to get the columns
  useEffect(() => {
    if (selectedField?.type === 'LOOKUP') {
      const config = selectedField.options as any;
      if (config?.formId) {
        fetch(`http://localhost:8080/api/forms/${config.formId}`)
          .then(res => res.json())
          .then(data => setSelectedFormSchema(data))
          .catch(console.error);
      }
    }
  }, [selectedField?.type, (selectedField?.options as any)?.formId]);

  if (!selectedField) {
    return (
      <aside className="w-80 bg-gray-50 border-l border-gray-200 p-6 flex flex-col items-center justify-center text-center">
        <p className="text-gray-400">Select a field on the canvas to edit its properties.</p>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-800">Field Properties</h2>
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {selectedField.type} Field
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Label Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={selectedField.label}
            onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Database Column Name (Read-Only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Column Name (SQL)
          </label>
          <input
            type="text"
            value={selectedField.columnName}
            disabled
            className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-500 text-sm font-mono cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">
            Auto-generated for database integrity.
          </p>
        </div>

        {/* --- DEFAULT VALUE INPUT --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Value
          </label>
          {selectedField.type === 'BOOLEAN' ? (
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              value={selectedField.defaultValue || ''}
              onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
            >
              <option value="">(None)</option>
              <option value="true">Checked (True)</option>
              <option value="false">Unchecked (False)</option>
            </select>
          ) : (
            <input
              type={selectedField.type === 'NUMERIC' ? 'number' : 'text'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder={selectedField.type === 'DATE' ? 'YYYY-MM-DD' : 'Enter default value...'}
              value={selectedField.defaultValue || ''}
              onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })}
            />
          )}
          <p className="text-xs text-gray-400 mt-1">
            This value will be pre-filled for the user.
          </p>
        </div>

        {/* --- OPTIONS MANAGER (For Dropdown, Radio, Checkbox Group) --- */}
        {(selectedField.type === 'DROPDOWN' || selectedField.type === 'RADIO' || selectedField.type === 'CHECKBOX_GROUP') && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Options</h3>
            
            <div className="space-y-2">
              {/* Force cast to string[] because we know for these types it is an array */}
              {((Array.isArray(selectedField.options) ? selectedField.options : []) as string[]).map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const currentOptions = Array.isArray(selectedField.options) ? selectedField.options : [];
                      const newOptions = [...currentOptions];
                      newOptions[index] = e.target.value;
                      updateField(selectedField.id, { options: newOptions });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    onClick={() => {
                      const currentOptions = Array.isArray(selectedField.options) ? selectedField.options : [];
                      const newOptions = currentOptions.filter((_, i) => i !== index);
                      updateField(selectedField.id, { options: newOptions });
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const currentOptions = Array.isArray(selectedField.options) ? selectedField.options : [];
                // Add empty string as placeholder
                const newOptions = [...currentOptions, ""]; 
                updateField(selectedField.id, { options: newOptions });
              }}
              className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline mt-2"
            >
              <Plus size={14} /> Add Option
            </button>
          </div>
        )}

        {/* --- GRID MANAGER (For Grids) --- */}
        {(selectedField.type === 'GRID_RADIO' || selectedField.type === 'GRID_CHECK') && (
          <div className="space-y-6 pt-4 border-t border-gray-100">
            
            {/* We render two sections: one for Rows, one for Cols */}
            {['rows', 'cols'].map((dimension) => {
              // Safe cast to Grid Object
              const gridOpts = (
                (typeof selectedField.options === 'object' && !Array.isArray(selectedField.options)) 
                  ? selectedField.options 
                  : { rows: [], cols: [] }
              ) as { rows: string[], cols: string[] };

              const items = dimension === 'rows' ? (gridOpts.rows || []) : (gridOpts.cols || []);

              return (
                <div key={dimension} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 capitalize">
                    {dimension === 'cols' ? 'Columns' : 'Rows'}
                  </h3>
                  
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = e.target.value;
                          
                          // Update the specific dimension in the object
                          const newOpts = { ...gridOpts, [dimension]: newItems };
                          updateField(selectedField.id, { options: newOpts });
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder={`Label ${index + 1}`}
                      />
                      <button
                        onClick={() => {
                          const newItems = items.filter((_, i) => i !== index);
                          const newOpts = { ...gridOpts, [dimension]: newItems };
                          updateField(selectedField.id, { options: newOpts });
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                       const newItems = [...items, ""];
                       const newOpts = { ...gridOpts, [dimension]: newItems };
                       updateField(selectedField.id, { options: newOpts });
                    }}
                    className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                  >
                    <Plus size={14} /> Add {dimension === 'cols' ? 'Column' : 'Row'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* --- LOOKUP MANAGER --- */}
        {selectedField.type === 'LOOKUP' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Linked Database</h3>
            
            {/* 1. Select Source Form */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source Form</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                value={(selectedField.options as any)?.formId || ''}
                onChange={(e) => {
                   updateField(selectedField.id, { 
                     options: { formId: e.target.value, columnName: '' } 
                   });
                }}
              >
                <option value="">-- Select a Form --</option>
                {availableForms
                   // Don't let a form link to itself (infinite loop)
                   .filter(f => f.id.toString() !== schema.id?.toString()) 
                   .map(form => (
                     <option key={form.id} value={form.id}>{form.title}</option>
                ))}
              </select>
            </div>

            {/* 2. Select Display Column (Only shows if a form is selected) */}
            {(selectedField.options as any)?.formId && selectedFormSchema && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display Column</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                  value={(selectedField.options as any)?.columnName || ''}
                  onChange={(e) => {
                     const currentConfig = selectedField.options as any;
                     updateField(selectedField.id, { 
                       options: { ...currentConfig, columnName: e.target.value } 
                     });
                  }}
                >
                  <option value="">-- Select a Field --</option>
                  {selectedFormSchema.versions[0].fields
                     // Only allow linking to simple text/number fields
                     .filter((f: any) => ['TEXT', 'NUMERIC', 'DROPDOWN', 'RADIO'].includes(f.fieldType))
                     .map((field: any) => (
                       <option key={field.id} value={field.columnName}>
                         {field.fieldLabel}
                       </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">This is the data that will appear in the dropdown.</p>
              </div>
            )}
          </div>
        )}

        {/* Validation Rules */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Validation</h3>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedField.validation?.required || false}
              onChange={(e) =>
                updateField(selectedField.id, {
                  validation: { ...selectedField.validation, required: e.target.checked }
                })
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Required Field</span>
          </label>

          {/* Conditional Input based on type */}
          {(selectedField.type === 'NUMERIC' || selectedField.type === 'SCALE') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Min {selectedField.type === 'SCALE' ? '(Start)' : ''}</label>
                <input
                  type="number"
                  className="w-full border p-1 rounded"
                  value={selectedField.validation?.min ?? (selectedField.type === 'SCALE' ? 1 : '')}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                    updateField(selectedField.id, {
                      validation: { ...selectedField.validation, min: val }
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Max {selectedField.type === 'SCALE' ? '(End)' : ''}</label>
                <input
                  type="number"
                  className="w-full border p-1 rounded"
                  value={selectedField.validation?.max ?? (selectedField.type === 'SCALE' ? 5 : '')}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                    updateField(selectedField.id, {
                      validation: { ...selectedField.validation, max: val }
                    });
                  }}
                />
              </div>
            </div>
          )}

          {/* Text Validation */}
          {(selectedField.type === 'TEXT' || selectedField.type === 'TEXTAREA') && (
            <div className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Min Length</label>
                  <input
                    type="number"
                    className="w-full border p-1 rounded text-sm"
                    value={selectedField.validation?.minLength ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                      updateField(selectedField.id, {
                        validation: { ...selectedField.validation, minLength: val }
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Max Length</label>
                  <input
                    type="number"
                    className="w-full border p-1 rounded text-sm"
                    value={selectedField.validation?.maxLength ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                      updateField(selectedField.id, {
                        validation: { ...selectedField.validation, maxLength: val }
                      });
                    }}
                  />
                </div>
              </div>
              <div>
                 <label className="text-xs text-gray-500">Regex Pattern</label>
                 <input
                   type="text"
                   placeholder="e.g. ^[0-9]{10}$"
                   className="w-full border p-1 rounded text-sm font-mono text-gray-600"
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
    </aside>
  );
}