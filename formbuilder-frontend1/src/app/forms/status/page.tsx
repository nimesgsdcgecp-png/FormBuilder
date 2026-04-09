'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { WORKFLOW } from '@/utils/apiConstants';

interface WorkflowHistory {
  id: number;
  stepIndex: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver: string;
  approverRole?: string;
  comments: string;
  decidedAt: string;
}

interface WorkflowInstance {
  id: number;
  currentStepIndex: number;
  totalSteps: number;
  status: 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  form: { id: number; title: string; description: string };
  history: WorkflowHistory[];
}

export default function MyFormStatus() {
  const { isLoading: permsLoading } = usePermissions();
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMySubmissions = async () => {
    try {
      const res = await fetch(WORKFLOW.MY_SUBMISSIONS, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInstances(data);
      }
    } catch (err) {
      console.error("Failed to load submissions", err);
      toast.error("Failed to load your submissions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMySubmissions();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'ACTIVE': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  if (isLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg-base">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-accent animate-spin" />
          <p className="text-sm font-medium text-text-muted uppercase tracking-widest">Loading Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* ── SaaS Header ── */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ background: 'var(--bg-header)', borderColor: 'var(--border)' }}>
        <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <nav className="hidden lg:flex items-center gap-2 text-sm font-medium">
              <Link href="/" className="text-text-muted hover:text-accent transition-colors">Dashboard</Link>
              <span className="text-text-faint">/</span>
              <span className="text-text-primary font-bold">My Form Status</span>
            </nav>
            <div className="hidden lg:block h-4 w-px bg-border-color mx-2" />
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-text-primary truncate">Submission Tracking</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-accent-subtle text-accent text-[10px] font-black uppercase tracking-widest shrink-0">Real-time</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {instances.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border-2 border-dashed bg-bg-muted" style={{ borderColor: 'var(--border)' }}>
              <div className="w-20 h-20 rounded-full bg-bg-base flex items-center justify-center mx-auto mb-6 shadow-sm border" style={{ borderColor: 'var(--border)' }}>
                <FileText size={40} className="text-text-faint" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-1">No Submissions Yet</h3>
              <p className="text-sm text-text-muted">Forms you submit for approval will appear here.</p>
              <Link href="/" className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent/20">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className="group rounded-3xl border p-6 sm:p-8 transition-all hover:shadow-xl hover:shadow-accent/5"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg sm:text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                          {instance.form.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getStatusColor(instance.status)}`}>
                          {instance.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted flex items-center gap-2">
                        <Clock size={12} />
                        Submitted on {new Date(instance.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-faint">
                          Phase {instance.currentStepIndex} of {instance.totalSteps}
                        </span>
                        <div className="w-full h-2 bg-bg-muted rounded-full overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                          <div
                            className={`h-full transition-all duration-1000 ${instance.status === 'REJECTED' ? 'bg-red-500' :
                                instance.status === 'COMPLETED' ? 'bg-emerald-500' : 'gradient-accent'
                              }`}
                            style={{ width: `${(instance.currentStepIndex / instance.totalSteps) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Timeline Section ── */}
                  <div className="relative space-y-6">
                    <div className="absolute left-4 top-2 bottom-2 w-px border-dashed hidden sm:block" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--border)' }} />

                    {instance.history.map((step) => {
                      const isComplete = step.status !== 'PENDING';
                      const isRejected = step.status === 'REJECTED';

                      return (
                        <div key={step.id} className="relative flex items-start gap-4 group/step">
                          <div className={`
                            relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all shadow-sm
                            ${isRejected ? 'bg-red-500/10 border-red-500 text-red-500' :
                              isComplete ? 'bg-emerald-500 border-emerald-500 text-white' :
                                'bg-bg-base text-text-faint group-hover/step:border-accent'}
                          `}>
                            {isRejected ? <XCircle size={14} /> :
                              isComplete ? <CheckCircle2 size={14} /> :
                                <Activity size={14} className="animate-pulse" />}
                          </div>

                          <div className="flex-1 bg-bg-muted/50 rounded-2xl p-4 sm:p-5 border border-transparent hover:bg-bg-muted transition-all" style={{}} onMouseEnter={(e) => {e.currentTarget.style.borderColor = 'var(--border)'}} onMouseLeave={(e) => {e.currentTarget.style.borderColor = 'transparent'}}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                <span className="opacity-40">#{step.stepIndex}</span>
                                {step.approver} {step.approverRole && <span className="text-text-faint font-medium opacity-100">({step.approverRole})</span>}
                                {!isComplete && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-accent-subtle text-accent text-[8px] font-black uppercase tracking-widest ml-2">Next Authority</span>
                                )}
                              </h4>
                              {step.decidedAt && (
                                <span className="text-[10px] font-bold text-text-faint uppercase tracking-tight">
                                  {new Date(step.decidedAt).toLocaleString()}
                                </span>
                              )}
                            </div>

                            {step.comments ? (
                              <div className="p-3 rounded-xl bg-bg-base text-xs text-text-secondary italic border shadow-sm" style={{ borderColor: 'var(--border)' }}>
                                &quot;{step.comments}&quot;
                              </div>
                            ) : (
                              <p className="text-xs text-text-faint">
                                {step.status === 'PENDING' ? 'Awaiting evaluation...' : 'No comments provided.'}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {instance.status === 'COMPLETED' && (
                      <div className="flex items-center gap-4 text-emerald-500 font-bold text-sm">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                          <CheckCircle2 size={16} />
                        </div>
                        <span>Form Approved and Published!</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
