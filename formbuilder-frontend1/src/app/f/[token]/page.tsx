'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { extractApiError } from '@/utils/error-handler';
import ThemeToggle from '@/components/ThemeToggle';
import FormRenderer from '@/components/FormRenderer';
import { FormSchema, FormField as SchemaField } from '@/types/schema';
import { AUTH, FORMS } from '@/utils/apiConstants';

type PublicAnswerValue = string | number | boolean | null | string[] | Record<string, unknown>;
type PublicAnswers = Record<string, PublicAnswerValue | undefined>;

interface PublicVersion {
  id: number;
  isActive?: boolean;
  rules?: unknown;
  fields?: Array<Record<string, unknown>>;
}

interface PublicFormResponse {
  id: number;
  ownerId?: number | string;
  title: string;
  description: string;
  targetTableName?: string;
  allowEditResponse?: boolean;
  themeColor?: string;
  themeFont?: string;
  versions?: PublicVersion[];
}

function PublicFormContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const editSubmissionId = searchParams.get('edit');

  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [initialAnswers, setInitialAnswers] = useState<PublicAnswers>({});
  
  // Version mismatch detection state
  const [versionMismatch, setVersionMismatch] = useState(false);
  const versionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionCheckRef = useRef<number>(0);

  // Version check function - polls for active version changes
  const checkVersionMismatch = useCallback(async () => {
    if (!token || !versionId || isSubmitted) return;
    
    // Throttle: at most once per 30 seconds
    const now = Date.now();
    if (now - lastVersionCheckRef.current < 30000) return;
    lastVersionCheckRef.current = now;
    
    try {
      const res = await fetch(FORMS.PUBLIC(token), { 
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!res.ok) return;
      
      const data = (await res.json()) as PublicFormResponse;
      const versions = data.versions || [];
      const activeVersion = versions.find((v) => v.isActive);
      
      if (activeVersion && activeVersion.id !== versionId) {
        setVersionMismatch(true);
        
        // Show warning toast only once
        if (!versionMismatch) {
          toast.warning(
            'This form has been updated since you started filling it out. Your submission will use the older version.',
            { duration: 10000, id: 'version-mismatch-warning' }
          );
        }
      }
    } catch (err) {
      // Silent failure - don't spam user with version check errors
      console.debug('Version check failed:', err);
    }
  }, [token, versionId, isSubmitted, versionMismatch]);

  // Set up periodic version checking (every 60 seconds)
  useEffect(() => {
    if (!versionId || isSubmitted) return;
    
    // Initial check after 30 seconds
    const initialTimeout = setTimeout(checkVersionMismatch, 30000);
    
    // Then check every 60 seconds
    versionCheckIntervalRef.current = setInterval(checkVersionMismatch, 60000);
    
    return () => {
      clearTimeout(initialTimeout);
      if (versionCheckIntervalRef.current) {
        clearInterval(versionCheckIntervalRef.current);
      }
    };
  }, [versionId, isSubmitted, checkVersionMismatch]);

  // Handle reload with new version
  const handleReloadWithNewVersion = () => {
    window.location.reload();
  };

  useEffect(() => {
    // 0. Fetch Current User (if any)
    fetch(AUTH.ME, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setCurrentUserId(String(data.id)))
      .catch(() => { });

    if (!token) return;

    fetch(FORMS.PUBLIC(token), { 
      credentials: 'include',
      cache: 'no-store'
    })
      .then((res) => {
        if (!res.ok) throw new Error('Form not found or link is invalid');
        return res.json();
      })
      .then(async (data: PublicFormResponse) => {
        const versions = data.versions || [];
        if (versions.length === 0) throw new Error('Form version data is missing');

        const activeVersion = versions.find((v) => v.isActive) || versions[0];
        setOwnerId(data.ownerId == null ? null : String(data.ownerId));
        setVersionId(activeVersion.id ?? null);

        const mapFieldsRecursive = (fields: Array<Record<string, unknown>>): SchemaField[] => {
          return fields.map((f) => {
            const rawOptions = f.options;
            let parsedOptions: unknown = rawOptions;
            if (typeof rawOptions === 'string') {
              try { parsedOptions = JSON.parse(rawOptions); } catch { }
            }
            return {
              id: String(f.id),
              type: f.type as SchemaField['type'],
              label: String(f.label || ''),
              columnName: String(f.columnName || ''),
              defaultValue: typeof f.defaultValue === 'string' ? f.defaultValue : undefined,
              options: parsedOptions as SchemaField['options'],
              validation: { required: Boolean(f.required), ...(typeof f.validation === 'object' && f.validation ? f.validation : {}) },
              placeholder: '',
              calculationFormula: typeof f.calculationFormula === 'string' ? f.calculationFormula : undefined,
              helpText: typeof f.helpText === 'string' ? f.helpText : undefined,
              isHidden: Boolean(f.isHidden),
              isReadOnly: Boolean(f.isReadOnly),
              isDisabled: Boolean(f.isDisabled),
              isMultiSelect: Boolean(f.isMultiSelect),
              children: Array.isArray(f.children)
                ? mapFieldsRecursive(f.children as Array<Record<string, unknown>>)
                : ((f.type as SchemaField['type']) === 'SECTION_HEADER' ? [] : undefined)
            };
          });
        };

        const mappedFields = mapFieldsRecursive(activeVersion.fields || []);

        // Map backend rules
        let parsedRules: FormSchema['rules'] = [];
        if (activeVersion.rules) {
          let raw: unknown = activeVersion.rules;
          if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch { }
          }
          if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'logic' in raw) {
            const logicRules = (raw as { logic?: unknown }).logic;
            parsedRules = Array.isArray(logicRules) ? logicRules : [];
          } else {
            parsedRules = Array.isArray(raw) ? raw : [];
          }
        }

        const formSchema: FormSchema = {
          id: data.id,
          title: data.title,
          description: data.description,
          targetTableName: data.targetTableName || '',
          allowEditResponse: data.allowEditResponse,
          themeColor: data.themeColor,
          themeFont: data.themeFont,
          fields: mappedFields,
          rules: parsedRules
        };

        setSchema(formSchema);

        // Fetch existing submission if editing
        if (editSubmissionId) {
          try {
            const subRes = await fetch(FORMS.PUBLIC_SUBMISSION_GET(token, editSubmissionId), { credentials: 'include' });
            if (subRes.ok) {
              const subData = await subRes.json();
              if (!subData) {
                setLoading(false);
                return;
              }

              const answers: PublicAnswers = {};
              const subDataLower: Record<string, unknown> = {};
              Object.keys(subData).forEach(k => subDataLower[k.toLowerCase()] = subData[k]);

              const mapAnswersRecursive = (fields: SchemaField[]) => {
                fields.forEach(f => {
                  const colLower = f.columnName.toLowerCase();
                  const val = subDataLower[colLower];

                  if (val !== undefined && val !== null) {
                    if (f.type === 'CHECKBOX_GROUP' || f.type === 'DROPDOWN' || f.type === 'GRID_RADIO' || f.type === 'GRID_CHECK') {
                      try {
                        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                        const normalized = toPublicAnswerValue(parsed);
                        if (normalized !== undefined) {
                          answers[f.columnName] = normalized;
                        }
                      } catch {
                        const normalized = toPublicAnswerValue(val);
                        if (normalized !== undefined) {
                          answers[f.columnName] = normalized;
                        }
                      }
                    } else {
                      const normalized = toPublicAnswerValue(val);
                      if (normalized !== undefined) {
                        answers[f.columnName] = normalized;
                      }
                    }
                  }
                  if (f.children) mapAnswersRecursive(f.children);
                });
              };
              mapAnswersRecursive(mappedFields);

              setInitialAnswers(answers);
            } else if (subRes.status === 403) {
              setError("This response has already been submitted and cannot be edited.");
            }
          } catch (err) {
            console.error("Failed to load submission data", err);
          }
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, editSubmissionId]);

  const handleSubmit = async (answers: PublicAnswers, status: 'RESPONSE_DRAFT' | 'FINAL' = 'FINAL') => {
    try {
      const url = editSubmissionId
        ? FORMS.PUBLIC_SUBMISSION_UPDATE(token, editSubmissionId)
        : FORMS.PUBLIC_SUBMISSIONS(token);

      const response = await fetch(url, {
        method: editSubmissionId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: answers, 
          status,
          formVersionId: versionId 
        }),
        credentials: 'include',
      });

      if (!response.ok) {
          const errMsg = await extractApiError(response);
          throw new Error(errMsg);
      }
      const resData = await response.json();

      // Redirect if form creator
      if (currentUserId && ownerId && ownerId === currentUserId) {
        toast.success("Submitted! Redirecting...");
        router.push(`/forms/${schema?.id}/responses`);
        return;
      }

      toast.success(status === 'RESPONSE_DRAFT' ? "Draft saved successfully!" : "Response submitted successfully!");
      setSubmittedId(resData.submissionId);

      // If it's a draft, update the URL so a refresh doesn't lose the ID
      if (status === 'RESPONSE_DRAFT' && !editSubmissionId) {
        const newUrl = `${window.location.pathname}?edit=${resData.submissionId}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        // Also update local state so subsequent saves use PUT
        router.push(newUrl, { scroll: false });
      }

      if (status === 'FINAL') setIsSubmitted(true);
    } catch (err) {
      // toast.error(msg); // Removed to prevent double notification (FormRenderer handles it)
      throw err;
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>Loading form...</div>;
  if (error || !schema) return <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-base)', color: '#ef4444' }}>Error: {error || 'Form not found'}</div>;

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-md w-full rounded-2xl overflow-hidden border text-center" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-lg)' }}>
          <div className="h-2 w-full" style={{ backgroundColor: schema.themeColor || 'var(--accent)' }} />
          <div className="p-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg" style={{ backgroundColor: schema.themeColor || 'var(--accent)' }}><CheckCircle className="w-9 h-9 text-white" /></div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Thank You!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Your response has been successfully {editSubmissionId ? 'updated' : 'submitted'}.</p>
            <div className="pt-4 flex flex-col gap-3">
              {(schema.allowEditResponse || (currentUserId && ownerId && ownerId === currentUserId)) && (submittedId || editSubmissionId) && (
                <a href={`/f/${token}?edit=${submittedId || editSubmissionId}`} className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors text-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--accent-muted)' }}>
                  Edit {currentUserId && ownerId && ownerId === currentUserId ? 'this' : 'your'} response
                </a>
              )}
              <button onClick={() => editSubmissionId ? window.location.href = `/f/${token}` : window.location.reload()} className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors border" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>Submit another response</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="border-b px-6 py-3 flex justify-between items-center" style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}>
        <div className="flex items-center"><span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>FormBuilder</span></div>
        <ThemeToggle />
      </div>
      
      {/* Version mismatch warning banner */}
      {versionMismatch && (
        <div 
          className="px-4 py-3 flex items-center justify-between gap-4 border-b"
          style={{ 
            background: 'linear-gradient(to right, #fef3c7, #fde68a)', 
            borderColor: '#f59e0b' 
          }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                This form has been updated
              </p>
              <p className="text-xs text-amber-700">
                Your submission will use the version you started with. Click &quot;Reload&quot; to get the latest version.
              </p>
            </div>
          </div>
          <button
            onClick={handleReloadWithNewVersion}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
          >
            <RefreshCw size={14} />
            Reload
          </button>
        </div>
      )}
      
      <div className="py-10 px-4 sm:px-6">
        <FormRenderer
          schema={schema}
          initialAnswers={initialAnswers}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

export default function PublicFormPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>Loading...</div>}>
      <PublicFormContent />
    </Suspense>
  );
}
  const toPublicAnswerValue = (value: unknown): PublicAnswerValue | undefined => {
    if (value == null) return undefined;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      return value.every((item) => typeof item === 'string') ? value : undefined;
    }
    if (typeof value === 'object') return value as Record<string, unknown>;
    return undefined;
  };
