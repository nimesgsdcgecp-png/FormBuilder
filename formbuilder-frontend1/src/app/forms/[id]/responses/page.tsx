'use client';

/**
 * Responses Page — /forms/[id]/responses
 *
 * Admin-only view for a single form's submission data. Displays all collected
 * responses in a scrollable data table, with one column per form field plus
 * system columns (ID, Date). Each row has Edit and Delete action buttons.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { deleteSubmission } from '@/services/api';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';

interface FormHeader {
  key: string;
  label: string;
  type?: string;
}

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [headers, setHeaders] = useState<FormHeader[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');
  const [publicToken, setPublicToken] = useState('');

  useEffect(() => {
    if (!formId) return;

    const fetchData = async () => {
      try {
        const formRes = await fetch(`http://localhost:8080/api/forms/${formId}`, { credentials: 'include' });
        if (formRes.status === 401) {
          router.push('/login');
          return;
        }
        if (!formRes.ok) throw new Error('Failed to fetch form data');

        const formData = await formRes.json();
        setFormTitle(formData.title);
        setPublicToken(formData.publicShareToken);

        const activeVersion = formData.versions?.[0];
        if (!activeVersion) {
          setLoading(false);
          return;
        }

        const currentFields = activeVersion.fields || [];
        const currentFieldNames = new Set(currentFields.map((f: any) => f.columnName));

        const dataRes = await fetch(`http://localhost:8080/api/forms/${formId}/submissions`, { credentials: 'include' });
        if (dataRes.status === 401) {
          router.push('/login');
          return;
        }
        if (!dataRes.ok) throw new Error('Failed to fetch submissions');

        const dataRows = await dataRes.json();
        setData(dataRows);

        let ghostHeaders: FormHeader[] = [];
        if (dataRows.length > 0) {
          const allDbKeys = Object.keys(dataRows[0]);
          const ghostKeys = allDbKeys.filter(key =>
            key !== 'submission_id' && key !== 'submitted_at' && !currentFieldNames.has(key)
          );
          ghostHeaders = ghostKeys.map(key => ({ key, label: `${formatLabel(key)} (Archived)` }));
        }

        const standardHeaders = [
          { key: 'submission_id', label: 'ID' },
          { key: 'submitted_at', label: 'Date' }
        ];
        const formHeaders = currentFields.map((f: any) => ({
          key: f.columnName, label: f.fieldLabel, type: f.fieldType
        }));

        setHeaders([...standardHeaders, ...formHeaders, ...ghostHeaders]);
      } catch (error) {
        console.error("Error loading responses:", error);
        toast.error("Failed to load response data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId, router]);

  const formatLabel = (key: string) =>
    key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const downloadCSV = () => {
    if (data.length === 0) return;
    const csvHeaders = headers.map(h => h.label).join(',');
    const csvRows = data.map(row =>
      headers.map(header => {
        const val = row[header.key];
        if (header.key === 'submitted_at') return `"${new Date(val).toLocaleString()}"`;
        return `"${val || ''}"`;
      }).join(',')
    );
    const blob = new Blob([csvHeaders + '\n' + csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle.replace(/\s+/g, '_')}_responses.csv`;
    a.click();
  };

  const handleDelete = (submissionId: string) => {
    toast('Delete this response permanently?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteSubmission(formId, submissionId);
            setData((prevData) => prevData.filter(row => row.submission_id !== submissionId));
            toast.success("Response deleted");
          } catch (err) {
            toast.error("Failed to delete response");
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => { } }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        Loading data...
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: back + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-px h-5" style={{ background: 'var(--border)' }} />
            <div>
              <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formTitle}</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.length} responses collected</p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href={`/f/${publicToken}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: '#3b82f6' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#2563eb'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#3b82f6'}
            >
              <Plus size={14} /> New
            </a>
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: '#10b981' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#059669'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#10b981'}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* ── Data Table ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                  {headers.map((header) => (
                    <th
                      key={header.key}
                      className="sticky top-0 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{
                        color: 'var(--text-faint)',
                        background: 'var(--bg-muted)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {header.label}
                    </th>
                  ))}
                  <th
                    className="sticky top-0 px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider"
                    style={{
                      color: 'var(--text-faint)',
                      background: 'var(--bg-muted)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length + 1}
                      className="px-6 py-16 text-center text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No responses yet. Share your form to collect data!
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-muted)',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-muted)'}
                    >
                      {headers.map((header) => (
                        <td
                          key={`${idx}-${header.key}`}
                          className="px-5 py-3.5 text-sm whitespace-nowrap max-w-xs truncate"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {header.key === 'submitted_at' ? (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {new Date(row[header.key]).toLocaleString()}
                            </span>
                          ) : header.type === 'FILE' && row[header.key] ? (
                            <a
                              href={`http://localhost:8080${row[header.key]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
                              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--accent-muted)' }}
                            >
                              <Download size={12} /> Download
                            </a>
                          ) : (
                            row[header.key]?.toString() || (
                              <span style={{ color: 'var(--text-faint)' }}>—</span>
                            )
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/f/${publicToken}?edit=${row.submission_id}`}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-muted)' }}
                            title="Edit"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                          >
                            <Edit size={15} />
                          </a>
                          <button
                            onClick={() => handleDelete(row.submission_id)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-muted)' }}
                            title="Delete"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}