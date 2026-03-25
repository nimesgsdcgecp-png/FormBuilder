'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { extractApiError } from '@/utils/error-handler';
import ThemeToggle from '@/components/ThemeToggle';
import FormRenderer from '@/components/FormRenderer';
import { FormSchema, FormField as SchemaField } from '@/types/schema';

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
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [initialAnswers, setInitialAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    // 0. Fetch Current User (if any)
    fetch(`http://localhost:8080/api/v1/auth/me`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setCurrentUserId(data.id))
      .catch(() => { });

    if (!token) return;

    fetch(`http://localhost:8080/api/v1/forms/public/${token}`, { 
      credentials: 'include',
      cache: 'no-store'
    })
      .then((res) => {
        if (!res.ok) throw new Error('Form not found or link is invalid');
        return res.json();
      })
      .then(async (data) => {
        const versions = data.versions || [];
        if (versions.length === 0) throw new Error('Form version data is missing');

        const activeVersion = versions.find((v: any) => v.isActive) || versions[0];
        setOwnerId(data.ownerId);
        setVersionId(activeVersion.id);

        const mapFieldsRecursive = (fields: any[]): SchemaField[] => {
          return fields.map((f: any) => {
            let parsedOptions = f.options;
            if (typeof f.options === 'string') {
              try { parsedOptions = JSON.parse(f.options); } catch (e) { }
            }
            return {
              id: f.id.toString(),
              type: f.fieldType,
              label: f.fieldLabel,
              columnName: f.columnName,
              defaultValue: f.defaultValue,
              options: parsedOptions,
              validation: { required: f.isMandatory, ...f.validationRules },
              placeholder: '',
              calculationFormula: f.calculationFormula,
              helpText: f.helpText,
              isHidden: f.isHidden,
              isReadOnly: f.isReadOnly,
              isDisabled: f.isDisabled,
              isMultiSelect: f.isMultiSelect,
              children: f.children ? mapFieldsRecursive(f.children) : (f.fieldType === 'SECTION_HEADER' ? [] : undefined)
            };
          });
        };

        const mappedFields = mapFieldsRecursive(activeVersion.fields || []);

        // Map backend rules
        let parsedRules = [];
        if (activeVersion.rules) {
          let raw = activeVersion.rules;
          if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch (e) { }
          }
          if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as any).logic) {
            parsedRules = (raw as any).logic;
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
            const subRes = await fetch(`http://localhost:8080/api/v1/forms/public/${token}/submissions/${editSubmissionId}`, { credentials: 'include' });
            if (subRes.ok) {
              const subData = await subRes.json();
              if (!subData) {
                setLoading(false);
                return;
              }

              const answers: Record<string, any> = {};
              const subDataLower: Record<string, any> = {};
              Object.keys(subData).forEach(k => subDataLower[k.toLowerCase()] = subData[k]);

              const mapAnswersRecursive = (fields: SchemaField[]) => {
                fields.forEach(f => {
                  const colLower = f.columnName.toLowerCase();
                  const val = subDataLower[colLower];

                  if (val !== undefined && val !== null) {
                    if (f.type === 'CHECKBOX_GROUP' || f.type === 'DROPDOWN' || f.type === 'GRID_RADIO' || f.type === 'GRID_CHECK') {
                      try {
                        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                        answers[f.columnName] = parsed;
                      } catch (e) {
                        answers[f.columnName] = val;
                      }
                    } else {
                      answers[f.columnName] = val;
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
          } catch (e) {
            console.error("Failed to load submission data", e);
          }
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, editSubmissionId]);

  const handleSubmit = async (answers: Record<string, any>, status: 'RESPONSE_DRAFT' | 'FINAL' = 'FINAL') => {
    try {
      const url = editSubmissionId
        ? `http://localhost:8080/api/v1/forms/public/${token}/submissions/${editSubmissionId}`
        : `http://localhost:8080/api/v1/forms/public/${token}/submissions`;

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
      if (currentUserId && ownerId && Number(ownerId) === Number(currentUserId)) {
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
              {(schema.allowEditResponse || (currentUserId && ownerId && Number(ownerId) === Number(currentUserId))) && (submittedId || editSubmissionId) && (
                <a href={`/f/${token}?edit=${submittedId || editSubmissionId}`} className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors text-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--accent-muted)' }}>
                  Edit {currentUserId && ownerId && Number(ownerId) === Number(currentUserId) ? 'this' : 'your'} response
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