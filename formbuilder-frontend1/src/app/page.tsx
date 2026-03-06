'use client';

/**
 * Dashboard Page — /  (app/page.tsx)
 *
 * What it does:
 *   The home page of the Form Builder application. Displays a grid of form cards
 *   showing all non-archived forms fetched from the backend dashboard endpoint.
 *
 * Features:
 *   - Loads all forms via GET /api/forms on mount using useEffect + useState.
 *   - Each card shows the form's title, status badge, and action buttons:
 *       - Edit (pencil) → navigates to /builder?id={formId}
 *       - View (eye)    → opens the public form link /f/{publicShareToken} in a new tab
 *                         (only for PUBLISHED forms)
 *       - Responses     → navigates to /forms/{id}/responses (only for PUBLISHED forms)
 *       - Archive       → triggers a Sonner confirmation toast with an undo cancel option
 *   - Empty state is shown when no forms exist yet.
 *   - Uses Sonner toast notifications for success/error feedback.
 *
 * Navigation:
 *   "Create New Form" button → /builder (opens a blank canvas)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Edit, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';

/** Shape of each form card item from GET /api/forms */
interface FormSummary {
  id: number;
  title: string;
  description: string;
  status: string;
  publicShareToken?: string; // UUID for the public /f/{token} share link
}

/** Skeleton card shown while forms are loading */
function SkeletonCard() {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="p-6 space-y-3">
        <div className="flex justify-between">
          <div className="shimmer rounded-full h-5 w-20" />
          <div className="shimmer rounded h-4 w-10" />
        </div>
        <div className="shimmer rounded h-6 w-3/4" />
        <div className="shimmer rounded h-4 w-full" />
        <div className="shimmer rounded h-4 w-2/3" />
      </div>
      <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <div className="shimmer rounded h-8 w-8" />
            <div className="shimmer rounded h-8 w-8" />
          </div>
          <div className="shimmer rounded h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  /** Fetches the form list from the backend and updates local state. */
  const fetchForms = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/forms');
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setForms(data);
    } catch (error) {
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Shows a Sonner confirmation toast before archiving a form.
   */
  const handleDelete = (id: number) => {
    toast('Archive this form?', {
      description: 'It will be moved to your archives.',
      action: {
        label: 'Archive',
        onClick: async () => {
          try {
            await fetch(`http://localhost:8080/api/forms/${id}`, { method: 'DELETE' });
            toast.success("Form archived");
            setForms((prevForms) => prevForms.filter(f => f.id !== id));
          } catch (error) {
            toast.error("Failed to archive form");
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => { }
      }
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Top Navigation Bar ── */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{
          background: 'var(--header-bg)',
          borderColor: 'var(--header-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center">
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              FormBuilder
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/builder"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white gradient-accent shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              Create New Form
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Forms</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage and track your dynamic forms</p>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div
            className="rounded-2xl border p-16 text-center"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
            >
              <FileText size={30} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No forms yet</h3>
            <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              Get started by creating your first dynamic form. It only takes a few seconds.
            </p>
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white gradient-accent shadow-sm hover:shadow-md transition-all"
            >
              <Plus size={16} /> Start Building
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => {
              const isPublished = form.status === 'PUBLISHED';
              return (
                <div
                  key={form.id}
                  className="rounded-xl border flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg group"
                  style={{
                    background: 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  {/* Top colour accent bar by status */}
                  <div
                    className={`h-1 w-full ${isPublished ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
                  />

                  {/* Card body */}
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      {/* Status badge */}
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={{
                          background: isPublished ? 'var(--status-pub-bg)' : 'var(--status-draft-bg)',
                          color: isPublished ? 'var(--status-pub-text)' : 'var(--status-draft-text)',
                          borderColor: isPublished ? 'var(--status-pub-ring)' : 'var(--status-draft-ring)',
                        }}
                      >
                        {isPublished ? '● Published' : '◌ Draft'}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>#{form.id}</span>
                    </div>

                    <h3
                      className="text-base font-bold mb-1.5 truncate leading-snug"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {form.title}
                    </h3>
                    <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                      {form.description || "No description provided."}
                    </p>
                  </div>

                  {/* Card footer */}
                  <div
                    className="px-6 py-3 border-t flex justify-between items-center"
                    style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex gap-1">
                      {/* Edit Button */}
                      <Link
                        href={`/builder?id=${form.id}`}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        title="Edit Form"
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle)', e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <Edit size={16} />
                      </Link>

                      {isPublished && (
                        <>
                          {form.publicShareToken && (
                            <Link
                              href={`/f/${form.publicShareToken}`}
                              target="_blank"
                              className="p-2 rounded-lg transition-all"
                              style={{ color: 'var(--text-muted)' }}
                              title="View Public Form"
                              onMouseEnter={e => (e.currentTarget.style.background = '#d1fae5', e.currentTarget.style.color = '#059669')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                              <Eye size={16} />
                            </Link>
                          )}
                          <Link
                            href={`/forms/${form.id}/responses`}
                            className="p-2 rounded-lg transition-all"
                            style={{ color: 'var(--text-muted)' }}
                            title="View Responses"
                            onMouseEnter={e => (e.currentTarget.style.background = '#ede9fe', e.currentTarget.style.color = '#7c3aed')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--text-muted)')}
                          >
                            <FileText size={16} />
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Archive Button */}
                    <button
                      onClick={() => handleDelete(form.id)}
                      className="p-2 rounded-lg transition-all"
                      style={{ color: 'var(--text-faint)' }}
                      title="Archive Form"
                      onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2', e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--text-faint)')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}