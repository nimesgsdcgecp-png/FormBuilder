'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Inbox, CheckCircle2, XCircle, ArrowRight, Loader2, User, Clock, FileText, RotateCcw, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Header from '@/components/Header';

interface WorkflowStep {
  id: number;
  instance: {
    id: number;
    form: { id: number; title: string; description: string };
    creator: { username: string };
    currentStepIndex: number;
    totalSteps: number;
    history?: {
      approver: string;
      status: string;
      comments: string;
      decidedAt: string;
    }[];
  };
  stepIndex: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function ApprovalInbox() {
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const fetchPendingSteps = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/workflows/my-pending', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSteps(data);
      }
    } catch (err) {
      console.error("Failed to load approvals", err);
    } finally {
      setIsLoading(false);
    }

    try {
      const userRes = await fetch('http://localhost:8080/api/auth/me', { credentials: 'include' });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsername(userData.username);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchPendingSteps();
  }, []);

  const handleAction = async (stepId: number, action: 'approve' | 'reject', comments: string = "") => {
    try {
      const res = await fetch(`http://localhost:8080/api/workflows/steps/${stepId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments })
      });

      if (res.ok) {
        toast.success(`Request ${action}ed successfully`);
        fetchPendingSteps();
      } else {
        toast.error(`Failed to ${action} request`);
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  if (isLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
          <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest">Loading Requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Header 
        username={username} 
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Approval Inbox', href: '/admin/approvals' }
        ]}
        title="Pending Authorization"
        badge={{ label: 'Action Required', color: '#f59e0b' }}
      />

      {/* ── Toolbar ── */}
      <div className="sticky top-16 z-20 py-3 px-4 sm:px-8 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div className="flex bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 px-3 py-1 text-[10px] sm:text-xs font-black text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg">
                <Inbox size={14} />
                {steps.length} Requests
              </div>
            </div>
            <div className="hidden sm:block h-6 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] truncate">
              <Clock size={12} className="shrink-0" />
              <span className="truncate">Awaiting Decision</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchPendingSteps}
              className="p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-all shadow-sm"
              title="Refresh"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

      {/* ── Content ── */}
      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {steps.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-muted)]">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-base)] flex items-center justify-center mx-auto mb-6 shadow-sm border border-[var(--border)]">
                <CheckCircle2 size={40} className="text-emerald-500/50" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Queue is Empty</h3>
              <p className="text-sm text-[var(--text-muted)]">No pending approval requests assigned to your role.</p>
            </div>
          ) : (
            <>
              {/* Table View (Desktop) */}
              <div className="hidden lg:block rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)]">Progress</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)]">Form Identity</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)]">Requested By</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right text-[var(--text-faint)]">Decision Center</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {steps.map((step) => (
                      <tr key={step.id} className="group hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Step {step.stepIndex} of {step.instance.totalSteps}</span>
                            <div className="w-24 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden border border-[var(--border)]">
                              <div 
                                className="h-full gradient-accent" 
                                style={{ width: `${(step.stepIndex / step.instance.totalSteps) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                             <div className="flex flex-col">
                                <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                                  {step.instance.form.title}
                                </span>
                                <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 max-w-xs uppercase tracking-tight font-medium">
                                  {step.instance.form.description || "No description"}
                                </p>
                             </div>
                             
                             {/* Approval Trail */}
                             {step.instance.history && step.instance.history.length > 0 && (
                               <div className="flex -space-x-2 overflow-hidden items-center">
                                 {step.instance.history.map((h, i) => (
                                   <div 
                                      key={i} 
                                      className={`w-5 h-5 rounded-full border border-[var(--card-bg)] flex items-center justify-center text-[7px] font-black uppercase text-white ${h.status === 'REJECTED' ? 'bg-red-500' : 'bg-emerald-500'}`}
                                      title={`${h.approver}: ${h.status}${h.comments ? ` (${h.comments})` : ''}`}
                                   >
                                      {h.approver.charAt(0)}
                                   </div>
                                 ))}
                                 <span className="ml-3 text-[8px] font-black text-[var(--text-faint)] uppercase tracking-widest leading-none">Trail</span>
                               </div>
                             )}

                             <div className="mt-2">
                                <input 
                                  type="text"
                                  placeholder="Add optional reason/note..."
                                  value={comments[step.id] || ""}
                                  onChange={(e) => setComments(prev => ({ ...prev, [step.id]: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)] text-[10px] focus:ring-1 focus:ring-[var(--accent)] outline-none"
                                />
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                              <User size={12} />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">{step.instance.creator.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-3">
                            <Link 
                              href={`/builder?id=${step.instance.form.id}`}
                              className="p-2 rounded-lg hover:bg-[var(--bg-muted)] text-[var(--text-faint)] hover:text-[var(--accent)] transition-all flex items-center gap-2"
                              title="Preview Content"
                            >
                              <FileText size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-widest md:block hidden">Inspect</span>
                            </Link>
                            
                            <div className="h-6 w-px bg-[var(--border)] mx-1" />
                            
                            <button 
                              onClick={() => handleAction(step.id, 'reject', comments[step.id])}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 font-bold text-xs flex items-center gap-2 transition-all"
                            >
                              <XCircle size={16} />
                              <span className="md:block hidden">Reject</span>
                            </button>
                            
                            <button 
                              onClick={() => handleAction(step.id, 'approve', comments[step.id])}
                              className="px-4 py-2 rounded-lg gradient-accent text-white font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                              <CheckCircle2 size={16} />
                              <span className="md:block hidden">Approve</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card View (Mobile) */}
              <div className="lg:hidden space-y-4">
                {steps.map((step) => (
                  <div 
                    key={step.id} 
                    className="p-5 rounded-2xl border shadow-sm space-y-4"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Step {step.stepIndex} of {step.instance.totalSteps}</span>
                        <div className="w-24 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden border border-[var(--border)]">
                          <div 
                            className="h-full gradient-accent" 
                            style={{ width: `${(step.stepIndex / step.instance.totalSteps) * 100}%` }}
                          />
                        </div>
                      </div>
                      <Link 
                        href={`/builder?id=${step.instance.form.id}`}
                        className="p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)]"
                      >
                        <FileText size={18} />
                      </Link>
                    </div>

                    <div className="pt-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">{step.instance.form.title}</h3>
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 uppercase tracking-tight font-medium">
                        {step.instance.form.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 py-3 border-y border-[var(--border)] border-dashed">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                        <User size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-[var(--text-faint)] uppercase tracking-widest">Requested By</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{step.instance.creator.username}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-faint)] ml-1">Optional Note</label>
                      <input 
                        type="text"
                        placeholder="Why is this being processed?"
                        value={comments[step.id] || ""}
                        onChange={(e) => setComments(prev => ({ ...prev, [step.id]: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs focus:ring-2 focus:ring-[var(--accent)] outline-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                       <button 
                        onClick={() => handleAction(step.id, 'reject', comments[step.id])}
                        className="flex-1 py-2.5 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                      >
                        Reject
                      </button>
                      
                      <button 
                        onClick={() => handleAction(step.id, 'approve', comments[step.id])}
                        className="flex-[2] py-2.5 rounded-xl gradient-accent text-white text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                      >
                        Approve Access
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
