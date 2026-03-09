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
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, Edit, Eye, Trash2, User, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
import { deleteForm } from '@/services/api';

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
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchForms();
  }, []);

  /** Fetches the form list from the backend and updates local state. */
  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/forms', {
        credentials: 'include' // Important for session cookie
      });
      if (res.status === 401) {
        // Not authenticated, redirect to login
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch forms');

      // Also fetch user profile information
      try {
        const userRes = await fetch('http://localhost:8080/api/auth/me', { credentials: 'include' });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUsername(userData.username);
        }
      } catch (e) {
        console.error("Could not fetch user profile", e);
      }

      const data = await res.json();
      setForms(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard. Ensure the backend is running on port 8080.');
    } finally {
      setIsLoading(false);
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
            await deleteForm(id);
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

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/login');
      toast.success('Logged out successfully');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-base)' }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: 'var(--bg-header)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105" title="Go to Dashboard">
              <div className="w-10 h-10 rounded-xl gradient-accent shadow-sm flex items-center justify-center text-white">
                <FileText size={22} className="stroke-[2.5]" />
              </div>
              <span className="text-xl font-black tracking-tight group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                FormBuilder
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* Profile Dropdown */}
            {username && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2"
                  style={{ background: 'var(--accent)', outlineColor: 'var(--accent-subtle)' }}
                  title="Account profile"
                >
                  {username.charAt(0).toUpperCase()}
                </button>

                {isProfileOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                  >
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{username}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Administrator</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <User size={16} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Page title and Create Button */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Your Forms</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage and track your dynamic forms</p>
          </div>
          <Link
            href="/builder"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white gradient-accent shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} strokeWidth={3} />
            Create New Form
          </Link>
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
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
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/f/${form.publicShareToken}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Share link copied!");
                              }}
                              className="p-2 rounded-lg transition-all"
                              style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                              title="Copy Share Link"
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle)', e.currentTarget.style.color = 'var(--accent)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                              <Link2 size={16} />
                            </button>
                          )}
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