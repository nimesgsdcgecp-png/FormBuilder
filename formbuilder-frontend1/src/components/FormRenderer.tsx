'use client';

import React, { useState, useEffect } from 'react';
import { FormField, FormSchema, FormRule } from '@/types/schema';
import { FileText, Download, CheckCircle, UploadCloud, X, Info, ChevronDown, EyeOff, Search } from 'lucide-react';
import { toast } from 'sonner';

/** Maps font names to CSS font-family values */
export const FONT_MAP: Record<string, string> = {
    'Inter': 'Inter, sans-serif',
    'Geist Sans': 'var(--font-geist-sans), sans-serif',
    'Geist Mono': 'var(--font-geist-mono), monospace',
    'System UI': 'system-ui, sans-serif'
};

interface FormRendererProps {
    schema: FormSchema;
    initialAnswers?: Record<string, any>;
    onSubmit?: (answers: Record<string, any>, status: 'RESPONSE_DRAFT' | 'FINAL') => void;
    submitButtonText?: string;
    isPreview?: boolean;
}

export default function FormRenderer({
    schema,
    initialAnswers = {},
    onSubmit,
    submitButtonText = "Submit Response",
    isPreview = false
}: FormRendererProps) {
    const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
    const [lookupData, setLookupData] = useState<Record<string, string[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize answers from schema defaults if not provided
    useEffect(() => {
        const defaultAnswers: Record<string, any> = { ...initialAnswers };

        const processFields = (fields: FormField[]) => {
            fields.forEach(field => {
                if (defaultAnswers[field.columnName] === undefined) {
                    if (field.defaultValue) {
                        if (field.type === 'BOOLEAN') defaultAnswers[field.columnName] = field.defaultValue === 'true';
                        else if (field.type === 'NUMERIC') defaultAnswers[field.columnName] = Number(field.defaultValue);
                        else defaultAnswers[field.columnName] = field.defaultValue;
                    } else if (field.type === 'CHECKBOX_GROUP' || (field.type === 'DROPDOWN' && field.isMultiSelect)) {
                        defaultAnswers[field.columnName] = [];
                    } else if (field.type === 'GRID_RADIO' || field.type === 'GRID_CHECK') {
                        defaultAnswers[field.columnName] = {};
                    }
                }
                if (field.children && field.children.length > 0) {
                    processFields(field.children);
                }
            });
        };

        processFields(schema.fields);

        // Deep compare or just set if drastically different to avoid loops
        setAnswers(prev => {
            if (JSON.stringify(prev) === JSON.stringify(defaultAnswers)) return prev;
            return defaultAnswers;
        });
    }, [schema.id, schema.fields.length, JSON.stringify(initialAnswers)]);

    // Handle Lookup Fields
    useEffect(() => {
        const getAllFields = (fields: FormField[], collected: FormField[] = []) => {
            fields.forEach(f => {
                collected.push(f);
                if (f.children) getAllFields(f.children, collected);
            });
            return collected;
        };

        const allFields = getAllFields(schema.fields);
        const lookups = allFields.filter(f => f.type === 'LOOKUP' && f.options && typeof f.options === 'object' && 'formId' in f.options);

        if (lookups.length > 0) {
            Promise.all(
                lookups.map(f => {
                    const opts = f.options as { formId: string; columnName: string };
                    return fetch(`http://localhost:8080/api/v1/forms/${opts.formId}/columns/${opts.columnName}/values`)
                        .then(res => res.json())
                        .then(values => ({ col: f.columnName, values }))
                        .catch(() => ({ col: f.columnName, values: [] }));
                })
            ).then(results => {
                const newData: Record<string, string[]> = {};
                results.forEach(r => newData[r.col] = r.values.filter(Boolean));
                setLookupData(newData);
            });
        }
    }, [schema.fields]);

    const handleInputChange = (columnName: string, value: any) => {
        setAnswers(prev => ({ ...prev, [columnName]: value }));
        // Always try to clear the error for this field
        setErrors(prev => {
            if (!prev[columnName]) return prev;
            const newErrors = { ...prev };
            delete newErrors[columnName];
            return newErrors;
        });
    };

    // --- Calculation Engine ---
    useEffect(() => {
        const getAllFields = (fields: FormField[], collected: FormField[] = []) => {
            fields.forEach(f => {
                collected.push(f);
                if (f.children) getAllFields(f.children, collected);
            });
            return collected;
        };

        const allFields = getAllFields(schema.fields);
        const calculatedFields = allFields.filter(f => !!f.calculationFormula);

        if (calculatedFields.length === 0) {
            if (allFields.length > 0) {
                console.debug("Calculation Engine: No formulas to evaluate.");
            }
            return;
        }

        let hasUpdates = false;
        const newAnswers = { ...answers };

        calculatedFields.forEach(field => {
            try {
                let formula = field.calculationFormula || "";
                if (!formula.trim()) return;

                // Identify all dependencies
                allFields.forEach(dep => {
                    if (dep.columnName && formula.includes(dep.columnName)) {
                        const rawVal = answers[dep.columnName];
                        const val = (rawVal === undefined || rawVal === null || rawVal === '') ? 0 : Number(rawVal);
                        const regex = new RegExp(`\\b${dep.columnName}\\b`, 'g');
                        formula = formula.replace(regex, isNaN(val) ? '0' : val.toString());
                    }
                });

                if (/^[0-9+\-*/().\s]*$/.test(formula)) {
                    // eslint-disable-next-line no-eval
                    const result = Number(eval(formula));
                    if (!isNaN(result) && isFinite(result)) {
                        const rounded = Math.round(result * 100) / 100;
                        if (newAnswers[field.columnName] !== rounded) {
                            newAnswers[field.columnName] = rounded;
                            hasUpdates = true;
                        }
                    }
                }
            } catch (e) {
                console.error(`Calculation failed for ${field.columnName}:`, e);
            }
        });

        if (hasUpdates) {
            setAnswers(newAnswers);
        }
    }, [answers, schema.fields]);

    const evaluateRules = () => {
        const getAllFields = (fields: FormField[], collected: FormField[] = []) => {
            fields.forEach(f => {
                collected.push(f);
                if (f.children) getAllFields(f.children, collected);
            });
            return collected;
        };

        const allFields = getAllFields(schema.fields);
        let visibleCols = new Set(allFields.map(f => f.columnName));
        let disabledCols = new Set<string>();
        let enabledByRuleCols = new Set<string>();
        let disabledByRuleCols = new Set<string>();
        let readOnlyCols = new Set<string>();
        let dynamicallyRequiredCols = new Set<string>();
        let customErrors: string[] = [];

        const rules = schema.rules || [];

        // First pass: identify fields that are hidden or disabled by default
        rules.forEach(rule => {
            rule.actions.forEach((action) => {
                if (action.type === 'SHOW' && action.targetField) {
                    visibleCols.delete(action.targetField);
                } else if (action.type === 'ENABLE' && action.targetField) {
                    disabledCols.add(action.targetField);
                }
            });
        });

        // Initialize with static field-level flags
        allFields.forEach(f => {
            if (f.isDisabled) disabledCols.add(f.columnName);
            if (f.isReadOnly) readOnlyCols.add(f.columnName);
        });

        // Second pass: evaluate recursive conditions
        rules.forEach(rule => {
            if (!rule.conditions || rule.conditions.length === 0) return;

            const evaluateEntry = (entry: any): boolean => {
                if (entry.type === 'condition') {
                    const userAnswer = answers[entry.field];
                    // A missing or blank answer always returns false
                    if (userAnswer === undefined || userAnswer === "" || userAnswer === null) return false;

                    // Resolve the target value: either a static value or another field's value
                    let targetValue = entry.value;
                    if (entry.valueType === 'FIELD' && typeof entry.value === 'string') {
                        targetValue = answers[entry.value];
                        // If the target field is empty, the condition fails
                        if (targetValue === undefined || targetValue === "" || targetValue === null) return false;
                    }

                    const strVal1 = String(userAnswer).toLowerCase().trim();
                    const strVal2 = String(targetValue).toLowerCase().trim();
                    const numVal1 = Number(strVal1);
                    const numVal2 = Number(strVal2);
                    const isNumeric = !isNaN(numVal1) && !isNaN(numVal2) && strVal1 !== "" && strVal2 !== "";

                    switch (entry.operator) {
                        case 'EQUALS': return isNumeric ? numVal1 === numVal2 : strVal1 === strVal2;
                        case 'NOT_EQUALS': return isNumeric ? numVal1 !== numVal2 : strVal1 !== strVal2;
                        case 'GREATER_THAN': return isNumeric ? numVal1 > numVal2 : (strVal1 > strVal2);
                        case 'LESS_THAN': return isNumeric ? numVal1 < numVal2 : (strVal1 < strVal2);
                        case 'CONTAINS': return strVal1.includes(strVal2);
                        default: return false;
                    }
                } else if (entry.type === 'group') {
                    const logic = entry.logic || 'AND';
                    const results = (entry.conditions || []).map((subEntry: any) => evaluateEntry(subEntry));
                    return logic === 'OR' ? results.some((r: boolean) => r === true) : results.every((r: boolean) => r === true);
                }
                return false;
            };

            const ruleLogic = rule.conditionLogic || 'AND';
            const ruleResults = rule.conditions.map(entry => evaluateEntry(entry));
            const isMatch = ruleLogic === 'OR' ? ruleResults.some((r: boolean) => r === true) : ruleResults.every((r: boolean) => r === true);

            if (isMatch) {
                rule.actions.forEach((action) => {
                    if (action.type === 'SHOW' && action.targetField) {
                        visibleCols.add(action.targetField);
                    } else if (action.type === 'HIDE' && action.targetField) {
                        visibleCols.delete(action.targetField);
                    } else if (action.type === 'ENABLE' && action.targetField) {
                        disabledCols.delete(action.targetField);
                        enabledByRuleCols.add(action.targetField);
                    } else if (action.type === 'DISABLE' && action.targetField) {
                        disabledCols.add(action.targetField);
                        disabledByRuleCols.add(action.targetField);
                    } else if (action.type === 'REQUIRE' && action.targetField) {
                        dynamicallyRequiredCols.add(action.targetField);
                    } else if (action.type === 'VALIDATION_ERROR' && action.message) {
                        customErrors.push(action.message);
                    }
                });
            }
        });

        // Split into pages based on PAGE_BREAK
        const pages: FormField[][] = [[]];
        let pIdx = 0;
        schema.fields.forEach(field => {
            if (field.type === 'PAGE_BREAK') {
                pages.push([]);
                pIdx++;
            } else if (visibleCols.has(field.columnName)) {
                pages[pIdx].push(field);
            }
        });

        // Filter out empty pages
        const activePages = pages.filter(p => p.length > 0);

        return {
            pages: activePages.length > 0 ? activePages : [[]],
            disabledCols,
            enabledByRuleCols,
            disabledByRuleCols,
            dynamicallyRequiredCols,
            customErrors,
            visibleCols,
            readOnlyCols
        };
    };

    const { pages, disabledCols, enabledByRuleCols, disabledByRuleCols, dynamicallyRequiredCols, customErrors, visibleCols, readOnlyCols } = evaluateRules();

    // Safety check: if rules hide pages dynamically, ensure we don't end up on an out-of-bounds step
    if (currentStep >= pages.length && pages.length > 0) {
        setCurrentStep(pages.length - 1);
    }

    const safeCurrentStep = Math.min(currentStep, pages.length > 0 ? pages.length - 1 : 0);
    const currentPageFields = pages[safeCurrentStep] || [];
    const isFirstStep = safeCurrentStep === 0;
    const isLastStep = safeCurrentStep === pages.length - 1;

    const validateStep = (stepIdx: number): boolean => {
        const stepFields = pages[stepIdx] || [];
        const newErrors: Record<string, string> = {};

        for (const field of stepFields) {
            const isDynamicallyRequired = dynamicallyRequiredCols.has(field.columnName);
            const isEffectivelyRequired = field.validation.required || isDynamicallyRequired;

            if (isEffectivelyRequired) {
                const val = answers[field.columnName];
                if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
                    newErrors[field.columnName] = `"${field.label}" is required.`;
                }
            }
        }

        setErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            // Toast once to alert user, but they'll see the summary now
            toast.error("Please fix the highlighted errors before proceeding.");
            return false;
        }

        return true;
    };

    const handleNext = () => {
        if (validateStep(safeCurrentStep)) {
            setCurrentStep(safeCurrentStep + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        setCurrentStep(Math.max(safeCurrentStep - 1, 0));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLastStep) {
            handleNext();
            return;
        }

        if (!validateStep(safeCurrentStep)) return;

        await performSubmit('FINAL');
    };

    const handleSaveDraft = async () => {
        await performSubmit('RESPONSE_DRAFT');
    };

    const performSubmit = async (status: 'RESPONSE_DRAFT' | 'FINAL') => {
        if (isPreview) {
            toast.info("This is a preview. Form submission is disabled.");
            console.log("Preview Data:", answers);
            return;
        }
        if (status === 'FINAL') {
            for (let i = 0; i < pages.length; i++) {
                if (!validateStep(i)) {
                    setCurrentStep(i);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    toast.error(`Please fix errors on Step ${i + 1}`);
                    return;
                }
            }
            if (customErrors.length > 0) {
                toast.error("Please fix the validation errors before submitting.");
                return;
            }
        }
        setIsSubmitting(true);
        try {
            if (onSubmit) await onSubmit(answers, status);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Submission failed";
            toast.error(status === 'RESPONSE_DRAFT' ? `Draft Error: ${msg}` : msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate progress percentage
    const progress = pages.length > 1 ? ((safeCurrentStep + 1) / pages.length) * 100 : 100;

    const renderFieldNode = (field: FormField) => {
        if (!visibleCols.has(field.columnName) || field.isHidden) return null;

        if (field.type === 'SECTION_HEADER') {
            return (
                <div key={field.id} className="pt-8 mb-6">
                    <div className="pb-2 border-b-2 mb-6" style={{ borderColor: 'var(--border)' }}>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{field.label}</h2>
                        {field.placeholder && (
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{field.placeholder}</p>
                        )}
                    </div>
                    <div className="space-y-7 pl-4 border-l-2 ml-1" style={{ borderColor: 'var(--border)' }}>
                        {field.children?.map(child => renderFieldNode(child))}
                    </div>
                </div>
            );
        }

        if (field.type === 'INFO_LABEL') {
            return (
                <div key={field.id} className="p-4 rounded-xl flex gap-3 italic mb-4" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                    <Info size={18} className="shrink-0 mt-0.5 opacity-70" />
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {field.label}
                    </div>
                </div>
            );
        }

        if (field.type === 'PAGE_BREAK') return null;

        const isDynamicallyRequired = dynamicallyRequiredCols.has(field.columnName);
        const isEffectivelyRequired = field.validation.required || isDynamicallyRequired;

        return (
            <div key={field.id} className="transition-all duration-300 ease-in-out mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                        {field.label} {isEffectivelyRequired && <span className="text-red-500">*</span>}
                        {enabledByRuleCols.has(field.columnName) && (
                            <span className="text-[10px] font-normal italic opacity-70" style={{ color: 'var(--text-muted)' }}>
                                (enabled by rule)
                            </span>
                        )}
                        {disabledByRuleCols.has(field.columnName) && (
                            <span className="text-[10px] font-normal italic opacity-70" style={{ color: 'var(--text-muted)' }}>
                                (disabled by rule)
                            </span>
                        )}
                    </div>
                    {field.helpText && (
                        <p className="text-[11px] font-normal mt-1 leading-relaxed opacity-80" style={{ color: 'var(--text-muted)' }}>
                            {field.helpText}
                        </p>
                    )}
                </label>
                {renderInput(
                    field,
                    answers[field.columnName],
                    handleInputChange,
                    lookupData[field.columnName] || [],
                    isPreview,
                    disabledCols.has(field.columnName),
                    readOnlyCols.has(field.columnName),
                    !!errors[field.columnName],
                    schema.themeColor
                )}
                {errors[field.columnName] && (
                    <p className="text-xs mt-1.5 font-medium animate-in fade-in slide-in-from-top-1 duration-200" style={{ color: '#ef4444' }}>
                        {errors[field.columnName]}
                    </p>
                )}
                {field.type === 'NUMERIC' && field.validation?.min && !errors[field.columnName] && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Minimum value: {field.validation.min}</p>
                )}
            </div>
        );
    };

    return (
        <div
            className="w-full max-w-2xl mx-auto rounded-2xl border font-sans transition-all"
            style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                boxShadow: 'var(--card-shadow-lg)',
                fontFamily: FONT_MAP[schema.themeFont || 'Inter'] || FONT_MAP['Inter']
            }}
        >
            {/* Progress Bar Container */}
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 relative rounded-t-2xl overflow-hidden">
                <div
                    className="h-full transition-all duration-500 ease-out absolute left-0 top-0"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: schema.themeColor || 'var(--accent)'
                    }}
                />
            </div>

            {/* Step Indicator (Only if multi-step) */}
            {pages.length > 1 && (
                <div className="px-8 pt-6 pb-0 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                        Step {safeCurrentStep + 1} of {pages.length}
                    </span>
                    <div className="flex gap-1.5">
                        {pages.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all ${idx === safeCurrentStep ? 'w-6' : 'w-1.5'}`}
                                style={{
                                    backgroundColor: idx <= safeCurrentStep ? (schema.themeColor || 'var(--accent)') : 'var(--border)',
                                    opacity: idx === safeCurrentStep ? 1 : 0.4
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Form header */}
            <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--border)' }}>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{schema.title}</h1>
                {schema.description && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{schema.description}</p>
                )}
            </div>

            <form onSubmit={handleSubmit} noValidate className="px-8 py-8">
                {(customErrors.length > 0 || Object.keys(errors).length > 0) && (
                    <div className="border-l-4 p-4 rounded-xl mb-8 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <X size={18} className="text-red-600" />
                            <h3 className="text-sm font-bold" style={{ color: '#b91c1c' }}>Attention Required</h3>
                        </div>
                        <ul className="text-xs list-disc pl-5 space-y-1" style={{ color: '#dc2626' }}>
                            {customErrors.map((err, idx) => <li key={`custom-${idx}`}>{err}</li>)}
                            {Object.entries(errors).map(([col, err], idx) => (
                                <li key={`field-${idx}`}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="space-y-1">
                    {currentPageFields.map((field) => renderFieldNode(field))}
                </div>

                <div className="pt-6 border-t flex gap-4" style={{ borderColor: 'var(--border)' }}>
                    {!isFirstStep && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all border shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-900"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        >
                            Back
                        </button>
                    )}

                    {isLastStep ? (
                        <button
                            key="submit-btn"
                            type="submit"
                            disabled={isSubmitting || customErrors.length > 0}
                            className="flex-[2] flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110"
                            style={{ backgroundColor: schema.themeColor || 'var(--accent)' }}
                        >
                            {isSubmitting ? 'Submitting...' : submitButtonText}
                        </button>
                    ) : (
                        <button
                            key="next-btn"
                            type="button"
                            onClick={handleNext}
                            className="flex-[2] py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md hover:brightness-110"
                            style={{ backgroundColor: schema.themeColor || 'var(--accent)' }}
                        >
                            Next Step
                        </button>
                    )}

                    {/* Always show Save Draft as a subtle option if not in preview */}
                    {!isPreview && (
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSaveDraft}
                            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all border shadow-sm"
                            style={{
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-secondary)',
                                background: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-muted)';
                                e.currentTarget.style.borderColor = 'var(--border-strong)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                            }}
                        >
                            {isSubmitting ? '...' : 'Save Draft'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

// --- HELPER RENDERING FUNCTIONS ---

const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('http://localhost:8080/api/v1/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
};

const MultiSelectDropdown = ({ 
    field, 
    value, 
    listOptions, 
    onChange, 
    isDisabled, 
    isReadOnly, 
    hasError,
    themeColor
}: { 
    field: FormField; 
    value: any; 
    listOptions: string[]; 
    onChange: (key: string, val: any) => void;
    isDisabled: boolean;
    isReadOnly: boolean;
    hasError: boolean;
    themeColor?: string;
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const currentValues = Array.isArray(value) ? value : (value ? [value] : []);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = (opt: string) => {
        let newValues;
        if (currentValues.includes(opt)) {
            newValues = currentValues.filter((v: string) => v !== opt);
        } else {
            newValues = [...currentValues, opt];
        }
        onChange(field.columnName, newValues);
        setIsOpen(false); // Close as per user request flow: "again the user opens the dropdown"
    };

    const filteredOptions = listOptions.filter(opt => 
        opt.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-3" ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <div className="relative">
                <button
                    type="button"
                    disabled={isDisabled || isReadOnly}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center justify-between w-full rounded-lg border p-3 text-sm transition-all focus:outline-none focus:ring-2 ${
                        hasError ? 'border-red-500 focus:ring-red-500' : 'border-[var(--input-border)] focus:ring-indigo-500'
                    } bg-[var(--input-bg)] text-[var(--text-primary)]`}
                >
                    <span className={currentValues.length > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)]'}>
                        {currentValues.length > 0 
                            ? `${currentValues.length} item${currentValues.length > 1 ? 's' : ''} selected` 
                            : field.placeholder || "Select options..."}
                    </span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                        <div className="p-2 border-b" style={{ borderColor: 'var(--border-muted)' }}>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search options..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = currentValues.includes(opt);
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleToggle(opt)}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-slate-50 flex items-center justify-between group ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                        >
                                            <span className={isSelected ? 'font-bold text-indigo-600' : 'text-slate-600 group-hover:text-indigo-600'}>
                                                {opt}
                                            </span>
                                            {isSelected && (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: themeColor || '#4f46e5' }} />
                                                    <CheckCircle size={14} className="text-indigo-500" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-8 text-center text-xs text-slate-400 italic">
                                    No options found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Pills (Shown below) */}
            {currentValues.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                    {currentValues.map((v: string) => (
                        <span key={v} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 shadow-sm animate-in zoom-in-95 duration-200">
                            {v}
                            {!isDisabled && !isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => handleToggle(v)}
                                    className="hover:text-red-500 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

function renderInput(
    field: FormField,
    value: any,
    onChange: (key: string, val: any) => void,
    lookupOptions: string[] = [],
    isPreview: boolean = false,
    isDisabled: boolean = false,
    isReadOnly: boolean = false,
    hasError: boolean = false,
    themeColor?: string
) {
    const commonProps = {
        id: field.columnName,
        name: field.columnName,
        disabled: isDisabled,
        readOnly: isReadOnly,
        style: {
            background: 'var(--input-bg)',
            borderColor: hasError ? '#ef4444' : 'var(--input-border)',
            color: 'var(--text-primary)',
            boxShadow: hasError ? '0 0 0 1px #ef4444' : 'none'
        } as React.CSSProperties,
        className: `block w-full rounded-lg border p-3 text-sm transition-all focus:outline-none focus:ring-2 ${hasError ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`,
        value: (value !== undefined && value !== null) ? value : '',
        onChange: (e: any) => onChange(field.columnName, e.target.value),
        minLength: field.validation?.minLength,
        maxLength: field.validation?.maxLength,
        pattern: field.validation?.pattern,
    };

    // Safe parse options for choice types
    let listOptions: string[] = [];
    if (Array.isArray(field.options)) {
        listOptions = field.options;
    } else if (field.type === 'LOOKUP') {
        listOptions = lookupOptions;
    }

    switch (field.type) {
        case 'TEXT':
            return <input type="text" placeholder={field.placeholder || "Your answer"} {...commonProps} />;

        case 'NUMERIC':
            return (
                <input
                    type="number"
                    step="any"
                    placeholder="0"
                    min={field.validation?.min}
                    max={field.validation?.max}
                    {...commonProps}
                />
            );

        case 'DATE':
            return <input type="date" {...commonProps} />;

        case 'TIME':
            return <input type="time" {...commonProps} />;

        case 'DATE_TIME':
            return <input type="datetime-local" {...commonProps} />;

        case 'TEXTAREA':
            return <textarea rows={4} placeholder={field.placeholder || "Type here..."} {...commonProps} />;

        case 'BOOLEAN':
            return (
                <div className="flex items-center h-5">
                    <input
                        id={field.columnName}
                        name={field.columnName}
                        type="checkbox"
                        checked={!!value}
                        disabled={isDisabled}
                        onChange={(e) => onChange(field.columnName, e.target.checked)}
                        className="focus:ring-black h-5 w-5 text-black border-gray-300 rounded"
                    />
                    <label htmlFor={field.columnName} className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Confirm / Toggle
                    </label>
                </div>
            );

        case 'DROPDOWN': {
            if (field.isMultiSelect) {
                return (
                    <MultiSelectDropdown 
                        field={field}
                        value={value}
                        listOptions={listOptions}
                        onChange={onChange}
                        isDisabled={isDisabled}
                        isReadOnly={isReadOnly}
                        hasError={hasError}
                        themeColor={themeColor}
                    />
                );
            }
            return (
                <select {...commonProps}>
                    <option value="">Select an option...</option>
                    {listOptions.map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        case 'HIDDEN':
            if (isPreview) {
                return (
                    <div className="p-3 border rounded-lg bg-gray-50 flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
                        <div className="p-2 rounded-lg bg-gray-200 text-gray-500">
                            <EyeOff size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-700">Hidden Field</span>
                            <span className="text-[10px] text-gray-500">Value: {value || "(empty)"}</span>
                        </div>
                    </div>
                );
            }
            return <input type="hidden" {...commonProps} />;

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
                                disabled={isDisabled}
                                onChange={(e) => onChange(field.columnName, e.target.value)}
                                className="w-4 h-4 text-black focus:ring-black"
                            />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{opt}</span>
                        </label>
                    ))}
                </div>
            );

        case 'CHECKBOX_GROUP': {
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
                                disabled={isDisabled}
                                onChange={(e) => handleCheck(opt, e.target.checked)}
                                className="w-4 h-4 text-black focus:ring-black rounded"
                            />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{opt}</span>
                        </label>
                    ))}
                </div>
            );
        }

        case 'RATING':
            return (
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            disabled={isDisabled}
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
            const minS = field.validation?.min || 1;
            const maxS = field.validation?.max || 5;
            const scaleOptions = Array.from({ length: (maxS - minS) + 1 }, (_, i) => minS + i);

            return (
                <div className="flex flex-wrap items-center justify-between w-full py-2 gap-4">
                    <span className="text-xs text-gray-400 sm:mt-6">{minS}</span>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                        {scaleOptions.map((num) => (
                            <label key={num} className="flex flex-col items-center gap-2 cursor-pointer group">
                                <span className="text-sm font-medium text-gray-400 group-hover:text-black transition-colors">{num}</span>
                                <input
                                    type="radio"
                                    name={field.columnName}
                                    value={num}
                                    checked={Number(value) === num}
                                    disabled={isDisabled}
                                    onChange={(e) => onChange(field.columnName, Number(e.target.value))}
                                    className="w-5 h-5 text-black border-gray-300 focus:ring-black"
                                />
                            </label>
                        ))}
                    </div>
                    <span className="text-xs text-gray-400 sm:mt-6">{maxS}</span>
                </div>
            );

        case 'GRID_RADIO':
        case 'GRID_CHECK':
            const gridOpts = (typeof field.options === 'object' && !Array.isArray(field.options))
                ? (field.options as { rows: string[]; cols: string[] })
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
                <div className="border rounded-xl bg-gray-50/30 overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-3"></th>
                                    {cols.map((col, i) => (
                                        <th key={i} className="px-4 py-3 text-center text-xs font-black text-gray-400 uppercase tracking-widest">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white">
                                {rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{row}</td>
                                        {cols.map((col, cIdx) => {
                                            const isRadio = field.type === 'GRID_RADIO';
                                            const isSelected = isRadio ? gridValue[row] === col : (gridValue[row] || []).includes(col);
                                            return (
                                                <td key={cIdx} className="px-4 py-3 text-center">
                                                    <input
                                                        type={isRadio ? "radio" : "checkbox"}
                                                        name={`${field.columnName}-${row}`}
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={(e) => handleGridChange(row, col, !isRadio, e.target.checked)}
                                                        className={`w-5 h-5 text-black focus:ring-black border-gray-300 ${!isRadio ? 'rounded' : ''}`}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Stacked View */}
                    <div className="block sm:hidden divide-y divide-gray-200">
                        {rows.map((row, rIdx) => (
                            <div key={rIdx} className="p-4 space-y-3">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{row}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {cols.map((col, cIdx) => {
                                        const isRadio = field.type === 'GRID_RADIO';
                                        const isSelected = isRadio ? gridValue[row] === col : (gridValue[row] || []).includes(col);
                                        return (
                                            <label 
                                                key={cIdx} 
                                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                                    isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'
                                                }`}
                                            >
                                                <input
                                                    type={isRadio ? "radio" : "checkbox"}
                                                    name={`${field.columnName}-${row}-mobile`}
                                                    checked={isSelected}
                                                    disabled={isDisabled}
                                                    onChange={(e) => handleGridChange(row, col, !isRadio, e.target.checked)}
                                                    className={`w-4 h-4 text-black focus:ring-black border-gray-300 ${!isRadio ? 'rounded' : ''}`}
                                                />
                                                <span className={`text-[11px] font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                    {col}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'FILE':
            return (
                <div className="space-y-4">
                    {isPreview ? (
                        <div className="p-6 border-2 border-dashed rounded-xl text-center bg-gray-50/50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 opacity-60">
                            <UploadCloud className="mx-auto mb-2 text-gray-400" size={24} />
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">File uploads disabled in preview</p>
                        </div>
                    ) : (
                        <div className="relative group">
                            {!value ? (
                                <div
                                    className="relative p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer bg-gray-50/30 dark:bg-gray-900/10 hover:bg-gray-50 dark:hover:bg-gray-900/30 group-hover:border-opacity-100"
                                    style={{ borderColor: 'var(--border)' }}
                                    onClick={() => document.getElementById(`file-input-${field.columnName}`)?.click()}
                                >
                                    <input
                                        id={`file-input-${field.columnName}`}
                                        type="file"
                                        className="hidden"
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
                                    <div
                                        className="mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: 'var(--bg-muted)' }}
                                    >
                                        <UploadCloud size={20} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        Click to upload
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        PDF, PNG, JPG or DOC up to 10MB
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="flex items-center gap-4 p-4 rounded-2xl border bg-white dark:bg-gray-950/40 animate-in fade-in slide-in-from-bottom-2 duration-300"
                                    style={{ borderColor: 'var(--border)' }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: 'var(--bg-muted)' }}
                                    >
                                        <FileText className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {String(value).split('/').pop()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">Securely Uploaded</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <a
                                            href={`http://localhost:8080${value}`}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                                            title="Download File"
                                        >
                                            <Download size={18} />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => onChange(field.columnName, null)}
                                            className="p-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                            title="Remove File"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );

        case 'LOOKUP':
            return (
                <select {...commonProps}>
                    <option value="">Select from linked form...</option>
                    {lookupOptions.map((opt, idx) => (
                        <option key={idx} value={opt}>{opt}</option>
                    ))}
                </select>
            );

        case 'CALCULATED':
            return (
                <div className="relative">
                    <input
                        type="text"
                        {...commonProps}
                        readOnly={true}
                        value={value !== undefined && value !== null ? value : ''}
                        style={{ ...commonProps.style, background: 'var(--bg-muted)', cursor: 'not-allowed' }}
                        className={commonProps.className + " font-bold text-lg"}
                        placeholder="Waiting for calculation..."
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
                        Derived
                    </div>
                </div>
            );

        case 'SECTION_HEADER':
        case 'INFO_LABEL':
            return null; // Handled in the main loop for custom layout

        default:
            return <p className="text-xs text-red-500">Unknown field type: {field.type}</p>;
    }
}
