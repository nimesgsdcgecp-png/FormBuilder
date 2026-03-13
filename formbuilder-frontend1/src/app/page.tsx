'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, Edit, Eye, Trash2, User, Link2, LayoutGrid, List as ListIcon, MoreVertical, ExternalLink, Copy, Check, RotateCcw, Archive, Shield, LogOut, Settings, Users, ShieldAlert, Clock, Ban } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
import Header from '@/components/Header';
import { deleteForm, getArchivedForms, restoreForm } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';

/** Shape of each form card item from GET /api/forms */
interface FormSummary {
  id: number;
  title: string;
  description: string;
  status: string;
  publicShareToken?: string;
  ownerName?: string;
  approvedByName?: string;
  approvalChain?: string;
  issuedByUsername?: string;
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
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [currentTab, setCurrentTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { hasPermission, assignments, refreshPermissions, clearCache } = usePermissions();

  useEffect(() => {
    fetchForms();
  }, [currentTab]);

  useEffect(() => {
    // Close profile dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Fetches the form list from the backend and updates local state. */
  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const url = currentTab === 'ACTIVE' 
        ? 'http://localhost:8080/api/forms' 
        : 'http://localhost:8080/api/forms/archived';

      const res = await fetch(url, {
        credentials: 'include' // Important for session cookie
      });
      if (res.status === 401) {
        // Not authenticated, redirect to login
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch forms');

      // Also fetch user profile information
      if (!username) {
        try {
          const userRes = await fetch('http://localhost:8080/api/auth/me', { credentials: 'include' });
          if (userRes.ok) {
            const userData = await userRes.json();
            setUsername(userData.username);
          }
        } catch (e) {
          console.error("Could not fetch user profile", e);
        }
      }

      const data = await res.json();
      setForms(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard.');
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

  const isAdmin = assignments.some(a => a.role.name === 'ADMIN' || a.role.name === 'ROLE_ADMINISTRATOR');

  /**
   * Restores a form from the archives.
   */
  const handleRestore = async (id: number) => {
    try {
      await restoreForm(id);
      toast.success("Form restored to drafts");
      setForms((prevForms) => prevForms.filter(f => f.id !== id));
    } catch (error) {
      toast.error("Failed to restore form");
    }
  };

  const handlePermanentDelete = (id: number) => {
    toast("Permanently delete this form?", {
      description: "This action is irreversible and all submissions will be lost.",
      action: {
        label: "Delete Now",
        onClick: async () => {
          try {
            const res = await fetch(`http://localhost:8080/api/forms/${id}/permanent`, {
              method: 'DELETE',
              credentials: 'include'
            });
            if (res.ok) {
              toast.success("Form deleted permanently!");
              setForms((prevForms) => prevForms.filter(f => f.id !== id));
            } else {
              const errorText = await res.text();
              console.error("Permanent delete failed:", errorText);
              toast.error("Failed to delete form: " + (errorText || "Server error"));
            }
          } catch (err) {
            console.error("Network error during permanent delete:", err);
            toast.error("Network error while deleting form");
          }
        }
      },
      duration: 10000,
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/api/auth/logout', { method: 'POST', credentials: 'include' });
      clearCache();
      router.push('/login');
      toast.success('Logged out successfully');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-base)' }}>
      {/* ── Header ── */}
      <Header username={username} />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Page title and Create Button */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {currentTab === 'ACTIVE' ? 'Your Forms' : 'Archived Forms'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {currentTab === 'ACTIVE' ? 'Manage and track your dynamic forms' : 'Previously deleted forms can be restored from here'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-[var(--bg-muted)] p-1 rounded-xl border border-[var(--border)] mr-2">
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}
                title="List View"
              >
                <ListIcon size={18} />
              </button>
            </div>

            {currentTab === 'ACTIVE' && (
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white gradient-accent shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus size={18} strokeWidth={3} />
                Create New Form
              </Link>
            )}
          </div>
        </div>

        {/* Sub-header with Tabs */}
        <div className="mb-8 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-8">
            <button
              onClick={() => setCurrentTab('ACTIVE')}
              className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${currentTab === 'ACTIVE' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
            >
              Active Forms
              {currentTab === 'ACTIVE' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 gradient-accent rounded-full" />
              )}
            </button>
            <button
              onClick={() => setCurrentTab('ARCHIVED')}
              className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${currentTab === 'ARCHIVED' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
            >
              Archived
              {currentTab === 'ARCHIVED' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 gradient-accent rounded-full" />
              )}
            </button>
          </div>
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
              {currentTab === 'ACTIVE' ? <FileText size={30} /> : <Archive size={30} />}
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {currentTab === 'ACTIVE' ? 'No forms yet' : 'Archive is empty'}
            </h3>
            <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              {currentTab === 'ACTIVE' 
                ? 'Get started by creating your first dynamic form. It only takes a few seconds.' 
                : 'Any forms you archive will appear here for 30 days before being permanently deleted.'}
            </p>
            {currentTab === 'ACTIVE' && (
              <Link
                href="/builder"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white gradient-accent shadow-sm hover:shadow-md transition-all"
              >
                <Plus size={16} /> Start Building
              </Link>
            )}
          </div>
        ) : (
          viewMode === 'GRID' ? (
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
                        className={`h-1 w-full ${isPublished ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : form.status === 'REJECTED' ? 'bg-red-500' : form.status.startsWith('PENDING') ? 'bg-amber-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
                      />

                    {/* Card body */}
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        {/* Status badge */}
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={{
                          background: currentTab === 'ARCHIVED' ? 'var(--bg-muted)' : (isPublished ? 'var(--status-pub-bg)' : form.status === 'REJECTED' ? '#fee2e2' : form.status.startsWith('PENDING') ? '#fff7ed' : 'var(--status-draft-bg)'),
                          color: currentTab === 'ARCHIVED' ? 'var(--text-muted)' : (isPublished ? 'var(--status-pub-text)' : form.status === 'REJECTED' ? '#ef4444' : form.status.startsWith('PENDING') ? '#f59e0b' : 'var(--text-primary)'),
                          borderColor: currentTab === 'ARCHIVED' ? 'var(--border)' : (isPublished ? 'var(--status-pub-ring)' : form.status === 'REJECTED' ? '#fecaca' : form.status.startsWith('PENDING') ? '#ffedd5' : 'var(--border)'),
                        }}
                      >
                        {currentTab === 'ARCHIVED' ? 'ARCHIVED' : (
                          form.status === 'PUBLISHED' ? '● Published' : 
                          form.status === 'DRAFT' ? '◌ Draft' : 
                          form.status === 'REJECTED' ? '✕ Rejected' : '◒ Pending'
                        )}
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

                      <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                          <User size={12} className="text-[var(--accent)]" />
                          <span>Owner: {form.ownerName || 'Unknown'}</span>
                        </div>
                        {form.issuedByUsername && (
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                            <Plus size={12} className="text-blue-500" />
                            <span>Issued By: {form.issuedByUsername}</span>
                          </div>
                        )}
                        {form.approvalChain && (
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                            <Shield size={12} className="text-emerald-500" />
                            <span>Approved By: {form.approvalChain}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card footer */}
                    <div
                      className="px-6 py-3 border-t flex justify-between items-center"
                      style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex gap-1">
                        {currentTab === 'ACTIVE' ? (
                          <>
                            {/* Edit Button */}
                            {hasPermission('EDIT', form.id) && (
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
                            )}

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
                                {(hasPermission('READ', form.id) || form.issuedByUsername === username) && (
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
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(form.id)}
                            className="p-2 rounded-lg transition-all"
                            style={{ color: 'var(--accent)' }}
                            title="Restore Form"
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>

                      {/* Archive Button (Only in ACTIVE tab) */}
                      {currentTab === 'ACTIVE' && hasPermission('DELETE', form.id) && (
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
                      )}

                      {currentTab === 'ARCHIVED' && isAdmin && (
                        <button
                          onClick={() => handlePermanentDelete(form.id)}
                          className="p-2 rounded-lg transition-all text-red-500 hover:bg-red-500/10"
                          title="Permanently Delete Form"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {/* Table View (Desktop) */}
              <div className="hidden lg:block rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-faint)]">ID</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-faint)]">Form Title</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-faint)]">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-right text-[var(--text-faint)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {forms.map((form) => {
                      const isPublished = form.status === 'PUBLISHED';
                      return (
                        <tr key={form.id} className="hover:bg-[var(--bg-subtle)] transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono font-medium text-[var(--text-faint)]">#{form.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{form.title}</p>
                              <div className="flex items-center gap-3 mt-1 overflow-hidden">
                                <p className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">{form.description || "No description"}</p>
                                <span className="w-1 h-1 rounded-full bg-[var(--border)] shrink-0" />
                                <span className="text-[9px] font-black text-[var(--text-faint)] uppercase tracking-tight whitespace-nowrap">Owner: {form.ownerName || 'Unknown'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border"
                              style={{
                                background: currentTab === 'ARCHIVED' ? 'var(--bg-muted)' : (isPublished ? 'var(--status-pub-bg)' : 'var(--status-draft-bg)'),
                                color: currentTab === 'ARCHIVED' ? 'var(--text-muted)' : (isPublished ? 'var(--status-pub-text)' : 'var(--status-draft-text)'),
                                borderColor: currentTab === 'ARCHIVED' ? 'var(--border)' : (isPublished ? 'var(--status-pub-ring)' : 'var(--status-draft-ring)'),
                              }}
                            >
                              {currentTab === 'ARCHIVED' ? 'ARCHIVED' : (isPublished ? 'PUBLISHED' : 'DRAFT')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              {currentTab === 'ACTIVE' ? (
                                <>
                                  <Link
                                    href={`/builder?id=${form.id}`}
                                    className="p-1.5 rounded-lg hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] text-[var(--text-muted)] transition-all"
                                    title="Edit"
                                  >
                                    <Edit size={16} />
                                  </Link>

                                  {isPublished && (
                                    <>
                                      <Link
                                        href={`/f/${form.publicShareToken}`}
                                        target="_blank"
                                        className="p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 text-[var(--text-muted)] transition-all"
                                        title="View Public"
                                      >
                                        <ExternalLink size={16} />
                                      </Link>
                                      {(hasPermission('READ', form.id) || form.issuedByUsername === username) && (
                                        <Link
                                          href={`/forms/${form.id}/responses`}
                                          className="p-1.5 rounded-lg hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/30 text-[var(--text-muted)] transition-all"
                                          title="Responses"
                                        >
                                          <FileText size={16} />
                                        </Link>
                                      )}
                                    </>
                                  )}

                                  <button
                                    onClick={() => handleDelete(form.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 text-[var(--text-faint)] transition-all"
                                    title="Archive"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleRestore(form.id)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--accent-subtle)] text-[var(--accent)] transition-all"
                                  title="Restore"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Card View (Mobile) */}
              <div className="lg:hidden space-y-4">
                {forms.map((form) => {
                  const isPublished = form.status === 'PUBLISHED';
                  return (
                    <div 
                      key={form.id} 
                      className="p-5 rounded-2xl border shadow-sm space-y-4"
                      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-mono font-medium text-[var(--text-faint)]">#{form.id}</span>
                          <span
                            className="inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[9px] font-black border"
                            style={{
                              background: currentTab === 'ARCHIVED' ? 'var(--bg-muted)' : (isPublished ? 'var(--status-pub-bg)' : 'var(--status-draft-bg)'),
                              color: currentTab === 'ARCHIVED' ? 'var(--text-muted)' : (isPublished ? 'var(--status-pub-text)' : 'var(--status-draft-text)'),
                              borderColor: currentTab === 'ARCHIVED' ? 'var(--border)' : (isPublished ? 'var(--status-pub-ring)' : 'var(--status-draft-ring)'),
                            }}
                          >
                            {currentTab === 'ARCHIVED' ? 'ARCHIVED' : (isPublished ? 'PUBLISHED' : 'DRAFT')}
                          </span>
                        </div>
                        <div className="flex gap-1">
                           {currentTab === 'ACTIVE' ? (
                            <>
                              {hasPermission('EDIT', form.id) && (
                                <Link
                                  href={`/builder?id=${form.id}`}
                                  className="p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)]"
                                >
                                  <Edit size={16} />
                                </Link>
                              )}
                            </>
                           ) : (
                             <button
                                onClick={() => handleRestore(form.id)}
                                className="p-2 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]"
                              >
                                <RotateCcw size={16} />
                              </button>
                           )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 leading-tight">{form.title}</h3>
                        <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {form.description || "No description provided."}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)] border-dashed">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-[var(--text-faint)] uppercase tracking-widest mb-0.5">Owner Identity</p>
                          <p className="text-[10px] font-bold text-[var(--text-secondary)] truncate">{form.ownerName || 'Unknown System User'}</p>
                        </div>
                        <div className="flex gap-2">
                           {isPublished && currentTab === 'ACTIVE' && (
                             <Link
                              href={`/forms/${form.id}/responses`}
                              className="px-3 py-1.5 rounded-lg bg-[var(--bg-muted)] text-[var(--text-primary)] text-[10px] font-black uppercase tracking-widest border border-[var(--border)]"
                            >
                              Stats
                            </Link>
                           )}
                           {currentTab === 'ACTIVE' && hasPermission('DELETE', form.id) && (
                              <button
                                onClick={() => handleDelete(form.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </button>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}