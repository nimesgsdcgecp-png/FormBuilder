'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { submitFormResponse } from '@/services/api';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// 1. UPDATED INTERFACE
interface FormField {
  id: number;
  fieldLabel: string;
  columnName: string;
  fieldType: 'TEXT' | 'NUMERIC' | 'DATE' | 'BOOLEAN' | 'TEXTAREA' | 'DROPDOWN' | 'RADIO' | 'CHECKBOX_GROUP' | 'TIME' | 'RATING' | 'SCALE' | 'FILE' | 'GRID_RADIO' | 'GRID_CHECK' | 'LOOKUP';
  isMandatory: boolean;
  defaultValue?: string;
  options?: string | string[] | { rows: string[]; cols: string[] };
  parsedOptions?: string[] | { rows: string[]; cols: string[] };
  validationRules: Record<string, any>;
}

interface FormVersion {
  fields: FormField[];
  rules?: any; // Add rules to interface
}

interface FormData {
  title: string;
  description: string;
  versions: FormVersion[];
}

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;
  
  const searchParams = useSearchParams();
  const editSubmissionId = searchParams.get('edit');

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFields, setActiveFields] = useState<any[]>([]); // Need this to track base fields

  // NEW STATE: Store the options fetched from other forms
  const [lookupData, setLookupData] = useState<Record<string, string[]>>({});
  const [rules, setRules] = useState<any[]>([]);

  // 1. Fetch Form Definition
  useEffect(() => {
    if (!formId) return;

    fetch(`http://localhost:8080/api/forms/${formId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Form not found or server error');
        return res.json();
      })
      .then(async (data) => {
        const initialAnswers: Record<string, any> = {};
        const activeFieldsList = data.versions[0]?.fields || [];

        activeFieldsList.forEach((field: any) => {
          // 1. Parse Options JSON safely
          if (field.options && typeof field.options === 'string') {
            try {
              const parsed = JSON.parse(field.options);
              field.parsedOptions = parsed;
              field.options = parsed;
            } catch (e) {
              field.parsedOptions = [];
            }
          }

          // 2. Set Default Value
          if (field.defaultValue) {
            if (field.fieldType === 'BOOLEAN') {
              initialAnswers[field.columnName] = field.defaultValue === 'true';
            } else if (field.fieldType === 'NUMERIC') {
              initialAnswers[field.columnName] = Number(field.defaultValue);
            } else {
              initialAnswers[field.columnName] = field.defaultValue;
            }
          } else if (field.fieldType === 'CHECKBOX_GROUP') {
            initialAnswers[field.columnName] = [];
          } else if (field.fieldType === 'GRID_RADIO' || field.fieldType === 'GRID_CHECK') {
            initialAnswers[field.columnName] = {};
          }
        });

        setActiveFields(activeFieldsList);

        // --- ADD RULE PARSING HERE ---
        let parsedRules = [];
        if (data.versions[0].rules) {
          try {
            parsedRules = typeof data.versions[0].rules === 'string'
              ? JSON.parse(data.versions[0].rules)
              : data.versions[0].rules;
          } catch (e) {
            console.error("Failed to parse rules", e);
          }
        }
        setRules(parsedRules);
        // -----------------------------

        // --- FETCH LOOKUP DATA ---
        const lookupsToFetch: { fieldCol: string; formId: string; targetCol: string }[] = [];

        activeFieldsList.forEach((field: any) => {
          if (field.fieldType === 'LOOKUP' && field.parsedOptions?.formId && field.parsedOptions?.columnName) {
            lookupsToFetch.push({
              fieldCol: field.columnName,
              formId: field.parsedOptions.formId,
              targetCol: field.parsedOptions.columnName
            });
          }
        });

        if (lookupsToFetch.length > 0) {
          Promise.all(
            lookupsToFetch.map(l =>
              fetch(`http://localhost:8080/api/forms/${l.formId}/columns/${l.targetCol}/values`)
                .then(res => res.json())
                .then(values => ({ fieldCol: l.fieldCol, values }))
                .catch(() => ({ fieldCol: l.fieldCol, values: [] }))
            )
          ).then(results => {
            const newLookupData: Record<string, string[]> = {};
            results.forEach(r => {
              newLookupData[r.fieldCol] = r.values.filter(Boolean);
            });
            setLookupData(newLookupData);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }

        data.versions[0].fields = activeFieldsList;
        setForm(data);

        // --- NEW: FETCH EXISTING SUBMISSION IF EDITING ---
        if (editSubmissionId) {
          try {
            const subRes = await fetch(`http://localhost:8080/api/forms/${formId}/submissions/${editSubmissionId}`);
            const subData = await subRes.json();

            const prefilledAnswers: Record<string, any> = {};
            activeFieldsList.forEach((field: any) => {
              const val = subData[field.columnName];
              if (field.fieldType === 'CHECKBOX_GROUP' || field.fieldType === 'GRID_RADIO' || field.fieldType === 'GRID_CHECK') {
                try { prefilledAnswers[field.columnName] = typeof val === 'string' ? JSON.parse(val) : val; }
                catch (e) { prefilledAnswers[field.columnName] = val; }
              } else {
                prefilledAnswers[field.columnName] = val;
              }
            });
            setAnswers(prefilledAnswers);
          } catch (err) {
            console.error("Failed to load submission data");
            setAnswers(initialAnswers);
          }
        } else {
          setAnswers(initialAnswers);
        }

      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [formId, editSubmissionId]);

  const handleInputChange = (columnName: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- ADD THIS BLOCK TO STOP SUBMISSION ---
    if (customErrors.length > 0) {
      toast.error("Please fix the errors before submitting.");
      return;
    }
    // -----------------------------------------

    setIsSubmitting(true);

    try {
      if (editSubmissionId) {
        const response = await fetch(`http://localhost:8080/api/forms/${formId}/submissions/${editSubmissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(answers),
        });

        if (!response.ok) throw new Error("Failed to update");
        toast.success("Response updated successfully!");
      } else {
        await submitFormResponse(formId, answers);
        toast.success("Response submitted successfully!");
      }

      setAnswers({});
      router.push(`/forms/${formId}/responses`);

    } catch (err: any) {
      console.error(err);
      toast.error(editSubmissionId ? "Update Failed" : "Submission Failed", {
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- THE RULE ENGINE EVALUATOR ---

  // --- UPGRADED RULE ENGINE EVALUATOR ---
  const evaluateRules = () => {
    let visibleCols = new Set(activeFields.map((f: any) => f.columnName));
    let dynamicallyRequiredCols = new Set<string>();
    let customErrors: string[] = [];

    // 1. If a field is the target of a "SHOW" rule, hide it by default.
    rules.forEach(rule => {
      rule.actions.forEach((action: any) => {
        if (action.type === 'SHOW' && action.targetField) {
          visibleCols.delete(action.targetField);
        }
      });
    });

    // 2. Evaluate all rules against the user's current answers
    rules.forEach(rule => {
      const condition = rule.conditions[0];
      if (!condition) return;

      const userAnswer = answers[condition.field];
      let isMatch = false;

      if (userAnswer !== undefined && userAnswer !== "" && userAnswer !== null) {
        const strVal1 = String(userAnswer).toLowerCase().trim();
        const strVal2 = String(condition.value).toLowerCase().trim();
        const numVal1 = Number(strVal1);
        const numVal2 = Number(strVal2);
        const isNumeric = !isNaN(numVal1) && !isNaN(numVal2) && strVal1 !== "" && strVal2 !== "";

        switch (condition.operator) {
          case 'EQUALS': isMatch = isNumeric ? numVal1 === numVal2 : strVal1 === strVal2; break;
          case 'NOT_EQUALS': isMatch = isNumeric ? numVal1 !== numVal2 : strVal1 !== strVal2; break;
          case 'GREATER_THAN': isMatch = isNumeric ? numVal1 > numVal2 : strVal1 > strVal2; break;
          case 'LESS_THAN': isMatch = isNumeric ? numVal1 < numVal2 : strVal1 < strVal2; break;
          case 'CONTAINS': isMatch = strVal1.includes(strVal2); break;
        }
      }

      // 3. If the condition is met, apply the respective actions!
      if (isMatch) {
        rule.actions.forEach((action: any) => {
          if (action.type === 'SHOW' && action.targetField) {
            visibleCols.add(action.targetField);
          } else if (action.type === 'HIDE' && action.targetField) {
            visibleCols.delete(action.targetField);
          } else if (action.type === 'REQUIRE' && action.targetField) {
            dynamicallyRequiredCols.add(action.targetField); // Mark as required!
          } else if (action.type === 'VALIDATION_ERROR' && action.message) {
            customErrors.push(action.message); // Trigger custom error!
          }
        });
      }
    });

    return {
      visibleFields: activeFields.filter((f: any) => visibleCols.has(f.columnName)),
      dynamicallyRequiredCols,
      customErrors
    };
  };

  const { visibleFields, dynamicallyRequiredCols, customErrors } = evaluateRules();


  if (loading) return <div className="flex justify-center p-20 text-gray-500">Loading form...</div>;
  if (error || !form) return <div className="flex justify-center p-20 text-red-500">Error: {error || 'Form not found'}</div>;

  // const visibleFields = evaluateRules();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <div className="bg-white px-8 py-10 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-gray-600 text-lg">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {visibleFields.map((field) => {
            // Check if it's required by the database OR dynamically by the Rule Engine
            const isDynamicallyRequired = dynamicallyRequiredCols.has(field.columnName);
            const isEffectivelyRequired = field.isMandatory || isDynamicallyRequired;
            
            // Override the field definition temporarily for the renderInput function
            const fieldToRender = { ...field, isMandatory: isEffectivelyRequired };

            return (
              <div key={field.id} className="transition-all duration-300 ease-in-out">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.fieldLabel} {isEffectivelyRequired && <span className="text-red-500">*</span>}
                </label>

                {renderInput(fieldToRender, answers[field.columnName], handleInputChange, lookupData[field.columnName] || [])}

                {field.fieldType === 'NUMERIC' && field.validationRules?.min && (
                  <p className="text-xs text-gray-400 mt-1">Minimum value: {field.validationRules.min}</p>
                )}
              </div>
            );
          })}

          {/* --- DISPLAY CUSTOM VALIDATION ERRORS --- */}
          {customErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mt-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Validation Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {customErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting || customErrors.length > 0}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors
                ${isSubmitting || customErrors.length > 0
                  ? 'bg-blue-400 cursor-not-allowed opacity-70'
                  : 'bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900'
                }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Response'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- HELPER FUNCTIONS ---

const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('http://localhost:8080/api/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url;
};

function renderInput(
  field: FormField,
  value: any,
  onChange: (key: string, val: any) => void,
  lookupOptions: string[] = []
) {
  const commonProps = {
    id: field.columnName,
    name: field.columnName,
    required: field.isMandatory,
    disabled: false,
    className: "block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-3 border hover:border-gray-400 transition-colors bg-white",
    value: value || '',
    onChange: (e: any) => onChange(field.columnName, e.target.value),
    minLength: field.validationRules?.minLength,
    maxLength: field.validationRules?.maxLength,
    pattern: field.validationRules?.pattern,
  };

  const listOptions = (Array.isArray(field.parsedOptions) ? field.parsedOptions : []) as string[];

  switch (field.fieldType) {
    case 'TEXT':
      return <input type="text" placeholder="Your answer" {...commonProps} />;

    case 'NUMERIC':
      return (
        <input
          type="number"
          placeholder="0"
          min={field.validationRules?.min}
          max={field.validationRules?.max}
          {...commonProps}
        />
      );

    case 'DATE':
      return <input type="date" {...commonProps} />;

    case 'TIME':
      return <input type="time" {...commonProps} />;

    case 'TEXTAREA':
      return <textarea rows={4} placeholder="Type here..." {...commonProps} />;

    case 'BOOLEAN':
      return (
        <div className="flex items-center h-5">
          <input
            id={field.columnName}
            name={field.columnName}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(field.columnName, e.target.checked)}
            className="focus:ring-black h-5 w-5 text-black border-gray-300 rounded"
          />
          <label htmlFor={field.columnName} className="ml-3 text-sm text-gray-500">
            Yes, I agree / Confirm
          </label>
        </div>
      );

    case 'DROPDOWN':
      return (
        <select {...commonProps}>
          <option value="">Select an option...</option>
          {listOptions.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case 'RADIO':
      return (
        <div className="space-y-2 mt-2">
          {listOptions.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.columnName}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(field.columnName, e.target.value)}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'CHECKBOX_GROUP':
      const currentValues = Array.isArray(value) ? value : [];
      const handleCheck = (opt: string, checked: boolean) => {
        let newValues;
        if (checked) newValues = [...currentValues, opt];
        else newValues = currentValues.filter((v: string) => v !== opt);
        onChange(field.columnName, newValues);
      };

      return (
        <div className="space-y-2 mt-2">
          {listOptions.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentValues.includes(opt)}
                onChange={(e) => handleCheck(opt, e.target.checked)}
                className="w-4 h-4 text-black focus:ring-black rounded"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );

    case 'RATING':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(field.columnName, star)}
              className={`text-2xl focus:outline-none transition-colors ${(value || 0) >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                }`}
            >
              ★
            </button>
          ))}
        </div>
      );

    case 'SCALE':
      const min = field.validationRules?.min || 1;
      const max = field.validationRules?.max || 5;
      const scaleOptions = Array.from({ length: (max - min) + 1 }, (_, i) => min + i);

      return (
        <div className="flex items-center justify-between w-full overflow-x-auto py-2 gap-4">
          <span className="text-xs text-gray-400 mt-6">{min}</span>
          <div className="flex gap-4">
            {scaleOptions.map((num) => (
              <label key={num} className="flex flex-col items-center gap-2 cursor-pointer group">
                <span className="text-sm font-medium text-gray-500 group-hover:text-black transition-colors">{num}</span>
                <input
                  type="radio"
                  name={field.columnName}
                  value={num}
                  checked={Number(value) === num}
                  onChange={(e) => onChange(field.columnName, Number(e.target.value))}
                  className="w-5 h-5 text-black border-gray-300 focus:ring-black"
                />
              </label>
            ))}
          </div>
          <span className="text-xs text-gray-400 mt-6">{max}</span>
        </div>
      );

    case 'FILE':
      return (
        <div className="space-y-3">
          <input
            type="file"
            className="block w-full text-sm text-gray-500
                 file:mr-4 file:py-2.5 file:px-4
                 file:rounded-md file:border-0
                 file:text-sm file:font-semibold
                 file:bg-black file:text-white
                 hover:file:bg-gray-800 cursor-pointer"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const toastId = toast.loading("Uploading file...");
              try {
                const url = await uploadFile(file);
                onChange(field.columnName, url);
                toast.success("File uploaded successfully", { id: toastId });
              } catch (err) {
                toast.error("Upload failed", { id: toastId });
              }
            }}
          />
          {value && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group hover:border-blue-300 transition-colors">
              <div className="p-2 bg-white rounded-md border border-gray-100 shadow-sm">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{value.split('/').pop()}</p>
                <p className="text-xs text-green-600">Upload Complete</p>
              </div>
              <a href={`http://localhost:8080${value}`} download target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-gray-200">
                <Download size={18} />
              </a>
            </div>
          )}
        </div>
      );

    case 'GRID_RADIO':
    case 'GRID_CHECK':
      const gridOpts = (typeof field.parsedOptions === 'object' && !Array.isArray(field.parsedOptions))
        ? field.parsedOptions
        : { rows: [], cols: [] };

      const rows = gridOpts.rows || [];
      const cols = gridOpts.cols || [];

      const gridValue = (typeof value === 'object' && value !== null) ? value : {};

      const handleGridChange = (rowName: string, colName: string, isCheck: boolean, checked: boolean) => {
        const newGridValue = { ...gridValue };
        if (isCheck) {
          const currentArr = newGridValue[rowName] || [];
          if (checked) newGridValue[rowName] = [...currentArr, colName];
          else newGridValue[rowName] = currentArr.filter((c: string) => c !== colName);
        } else {
          newGridValue[rowName] = colName;
        }
        onChange(field.columnName, newGridValue);
      };

      return (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 bg-gray-50"></th>
                {cols.map((col: string, i: number) => (
                  <th key={i} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row: string, rIdx: number) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row}</td>
                  {cols.map((col: string, cIdx: number) => {
                    const isRadio = field.fieldType === 'GRID_RADIO';
                    const isSelected = isRadio
                      ? gridValue[row] === col
                      : (gridValue[row] || []).includes(col);
                    return (
                      <td key={cIdx} className="px-4 py-3 text-center">
                        <input
                          type={isRadio ? "radio" : "checkbox"}
                          name={`${field.columnName}-${row}`}
                          checked={isSelected}
                          onChange={(e) => handleGridChange(row, col, !isRadio, e.target.checked)}
                          className={`w-4 h-4 text-black focus:ring-black border-gray-300 ${!isRadio ? 'rounded' : ''}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'LOOKUP':
      return (
        <select {...commonProps}>
          <option value="">Select an option...</option>
          {lookupOptions.length === 0 ? (
            <option value="" disabled>No data found / Loading...</option>
          ) : (
            lookupOptions.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))
          )}
        </select>
      );

    default:
      return <input type="text" {...commonProps} />;
  }
}