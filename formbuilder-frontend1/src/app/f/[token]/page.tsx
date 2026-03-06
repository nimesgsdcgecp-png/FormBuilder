'use client';

/**
 * Public Form Page — /f/[token]
 *
 * What it does:
 *   The respondent-facing side of the Form Builder. Loads a published form by its
 *   UUID share token (not the internal numeric ID), renders all fields with the
 *   correct HTML input types, applies validation, and submits answers to the backend.
 *
 * URL patterns:
 *   /f/{token}             — New submission (blank form)
 *   /f/{token}?edit={uuid} — Edit mode: pre-fills the form with a previous submission
 *                            so the respondent can change their answers.
 *
 * Data loading (useEffect):
 *   1. Fetches the form schema via GET /api/forms/public/{token} (no auth required).
 *   2. Parses field options and logic rules from JSON (backend sends pre-parsed objects
 *      but falls back to JSON.parse for legacy string representations).
 *   3. Fetches distinct values for each LOOKUP field via GET /api/forms/{id}/columns/{col}/values.
 *   4. If ?edit={uuid} is present, fetches the existing submission via
 *      GET /api/forms/{formId}/submissions/{submissionId} and pre-fills the answers.
 *
 * Conditional field visibility (Logic Rules):
 *   Rules stored in FormVersion.rules are evaluated CLIENT-SIDE to show/hide fields
 *   in real time as the respondent types. The same rules are also evaluated SERVER-SIDE
 *   by RuleEngineService.validateSubmission() when the form is submitted.
 *   Only the SHOW and HIDE action types affect client-side visibility; REQUIRE and
 *   VALIDATION_ERROR are enforced server-side only.
 *
 * Submission:
 *   - New: POST /api/forms/public/{token}/submissions (token-based, no auth)
 *   - Edit: PUT /api/forms/{formId}/submissions/{submissionId}
 *   Returns a submissionId UUID used in the "Edit your response" link shown on the
 *   success screen (when form.allowEditResponse is true).
 *
 * Field types rendered:
 *   TEXT, NUMERIC, DATE, BOOLEAN (checkbox), TEXTAREA, DROPDOWN (select), RADIO,
 *   CHECKBOX_GROUP, TIME, RATING (star buttons), SCALE (numbered buttons),
 *   FILE (uploads to /api/upload then stores URL), GRID_RADIO, GRID_CHECK, LOOKUP.
 *
 * Uses Sonner for toast notifications, Lucide for icons.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, FileText, CheckCircle, Layers } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

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
  rules?: any;
}

interface FormData {
  id: number; // <-- Added to hold the internal database ID
  title: string;
  description: string;
  versions: FormVersion[];
  allowEditResponse: boolean;
}

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string; // <-- Now correctly using token instead of id

  const searchParams = useSearchParams();
  const editSubmissionId = searchParams.get('edit');

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFields, setActiveFields] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false); // <-- Added state for success screen
  const [submittedId, setSubmittedId] = useState<string | null>(null); // NEW: Track submission ID for edit link

  const [lookupData, setLookupData] = useState<Record<string, string[]>>({});
  const [rules, setRules] = useState<any[]>([]);

  // 1. Fetch Form Definition via Secure Token
  // 1. Fetch Form Definition via Secure Token
  useEffect(() => {
    if (!token) return;

    fetch(`http://localhost:8080/api/forms/public/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Form not found or link is invalid');
        return res.json();
      })
      .then(async (data) => {
        // --- 1. BULLETPROOF SAFETY CHECK ---
        const versions = data.versions || [];
        if (versions.length === 0) {
          throw new Error('Form version data is missing from the server.');
        }

        const activeVersion = versions[0];
        const initialAnswers: Record<string, any> = {};
        const activeFieldsList = activeVersion.fields || [];
        const internalFormId = data.id; // Capture the actual DB ID for edits/lookups

        activeFieldsList.forEach((field: any) => {
          if (field.options) {
            if (typeof field.options === 'string') {
              try {
                const parsed = JSON.parse(field.options);
                field.parsedOptions = parsed;
                field.options = parsed;
              } catch (e) {
                field.parsedOptions = [];
              }
            } else if (typeof field.options === 'object') {
              field.parsedOptions = field.options;
            }
          }

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

        let parsedRules = [];
        if (activeVersion.rules) {
          try {
            parsedRules = typeof activeVersion.rules === 'string'
              ? JSON.parse(activeVersion.rules)
              : activeVersion.rules;
          } catch (e) {
            console.error("Failed to parse rules", e);
          }
        }
        setRules(parsedRules);

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

        // Safely update the form state
        activeVersion.fields = activeFieldsList;
        data.versions = [activeVersion];
        setForm(data);

        // --- FETCH EXISTING SUBMISSION IF EDITING ---
        if (editSubmissionId) {
          try {
            const subRes = await fetch(`http://localhost:8080/api/forms/${internalFormId}/submissions/${editSubmissionId}`);
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
  }, [token, editSubmissionId]);

  const handleInputChange = (columnName: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (customErrors.length > 0) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editSubmissionId && form?.id) {
        const response = await fetch(`http://localhost:8080/api/forms/${form.id}/submissions/${editSubmissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(answers),
        });

        if (!response.ok) throw new Error("Failed to update");
        toast.success("Response updated successfully!");
        setIsSubmitted(true);

      } else {
        const response = await fetch(`http://localhost:8080/api/forms/public/${token}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(answers),
        });

        if (!response.ok) throw new Error("Submission Failed");
        const resData = await response.json();

        toast.success("Response submitted successfully!");
        setSubmittedId(resData.submissionId);
        setIsSubmitted(true);
      }

    } catch (err: any) {
      console.error(err);
      toast.error(editSubmissionId ? "Update Failed" : "Submission Failed", {
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const evaluateRules = () => {
    let visibleCols = new Set(activeFields.map((f: any) => f.columnName));
    let dynamicallyRequiredCols = new Set<string>();
    let customErrors: string[] = [];

    rules.forEach(rule => {
      rule.actions.forEach((action: any) => {
        if (action.type === 'SHOW' && action.targetField) {
          visibleCols.delete(action.targetField);
        }
      });
    });

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

      if (isMatch) {
        rule.actions.forEach((action: any) => {
          if (action.type === 'SHOW' && action.targetField) {
            visibleCols.add(action.targetField);
          } else if (action.type === 'HIDE' && action.targetField) {
            visibleCols.delete(action.targetField);
          } else if (action.type === 'REQUIRE' && action.targetField) {
            dynamicallyRequiredCols.add(action.targetField);
          } else if (action.type === 'VALIDATION_ERROR' && action.message) {
            customErrors.push(action.message);
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

  if (loading) return (
    <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
      Loading form...
    </div>
  );
  if (error || !form) return (
    <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-base)', color: '#ef4444' }}>
      Error: {error || 'Form not found'}
    </div>
  );

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
        <div
          className="max-w-md w-full rounded-2xl overflow-hidden border text-center"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-lg)' }}
        >
          {/* Gradient top banner */}
          <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="p-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Thank You!</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Your response has been successfully {editSubmissionId ? 'updated' : 'submitted'}.
            </p>

            <div className="pt-4 flex flex-col gap-3">
              {form?.allowEditResponse && (submittedId || editSubmissionId) && (
                <a
                  href={`/f/${token}?edit=${submittedId || editSubmissionId}`}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--accent-muted)' }}
                >
                  Edit your response
                </a>
              )}
              <button
                onClick={() => {
                  if (editSubmissionId) { window.location.href = `/f/${token}`; }
                  else { window.location.reload(); }
                }}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border"
                style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              >
                Submit another response
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Minimal top nav with theme toggle */}
      <div
        className="border-b px-6 py-3 flex justify-between items-center"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      >
        <div className="flex items-center">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>FormBuilder</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="py-10 px-4 sm:px-6">
        <div
          className="max-w-2xl mx-auto rounded-2xl overflow-hidden border"
          style=
          {{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-lg)' }}
        >
          {/* Colored accent bar at top */}
          <div className="h-1.5 w-full gradient-accent" />

          {/* Form header */}
          <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--border)' }}>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{form.title}</h1>
            {form.description && (
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{form.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-7">
            {visibleFields.map((field) => {
              const isDynamicallyRequired = dynamicallyRequiredCols.has(field.columnName);
              const isEffectivelyRequired = field.isMandatory || isDynamicallyRequired;
              const fieldToRender = { ...field, isMandatory: isEffectivelyRequired };

              return (
                <div key={field.id} className="transition-all duration-300 ease-in-out">
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {field.fieldLabel} {isEffectivelyRequired && <span className="text-red-500">*</span>}
                  </label>
                  {renderInput(fieldToRender, answers[field.columnName], handleInputChange, lookupData[field.columnName] || [])}
                  {field.fieldType === 'NUMERIC' && field.validationRules?.min && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Minimum value: {field.validationRules.min}</p>
                  )}
                </div>
              );
            })}

            {customErrors.length > 0 && (
              <div className="border-l-4 p-4 rounded-r-lg" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
                <h3 className="text-sm font-semibold" style={{ color: '#b91c1c' }}>Validation Error</h3>
                <ul className="mt-2 text-sm list-disc pl-5 space-y-1" style={{ color: '#dc2626' }}>
                  {customErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="submit"
                disabled={isSubmitting || customErrors.length > 0}
                className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all gradient-accent shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </form>
        </div>
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
    style: {
      background: 'var(--input-bg)',
      borderColor: 'var(--input-border)',
      color: 'var(--text-primary)',
    } as React.CSSProperties,
    className: "block w-full rounded-lg border p-3 text-sm transition-all focus:outline-none focus:ring-2",
    value: value || '',
    onChange: (e: any) => onChange(field.columnName, e.target.value),
    minLength: field.validationRules?.minLength,
    maxLength: field.validationRules?.maxLength,
    pattern: field.validationRules?.pattern,
    onFocus: (e: any) => { e.currentTarget.style.borderColor = 'var(--input-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)'; },
    onBlur: (e: any) => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none'; },
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