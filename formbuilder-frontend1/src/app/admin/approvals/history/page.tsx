'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  User, 
  FileText, 
  Search,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Header from '@/components/Header';

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
  creator: { username: string };
  history: WorkflowHistory[];
}

export default function ApprovalHistoryPage() {
  const { isLoading: permsLoading } = usePermissions();
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [username, setUsername] = useState<string | null>(null);

  const fetchHandledWorkflows = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/workflows/my-handled', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInstances(data);
      }
    } catch (err) {
      console.error("Failed to load history", err);
      toast.error("Failed to load approval history");
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
    fetchHandledWorkflows();
  }, []);

  const filteredInstances = instances.filter(inst => 
    inst.form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.creator.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
        <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Header 
        username={username} 
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Approvals', href: '/admin/approvals' },
          { label: 'Past Decisions', href: '/admin/approvals/history' }
        ]}
        title="Approval History"
        badge={{ label: 'Archives', color: '#3b82f6' }}
      />
      
      <div className="sticky top-16 z-20 py-3 px-8 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
             <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter past forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none"
                />
             </div>
             <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                {filteredInstances.length} Handled Archives
             </div>
      </div>

      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {filteredInstances.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-muted)]">
               <History size={48} className="mx-auto text-[var(--text-faint)] mb-4" />
               <h3 className="text-lg font-bold text-[var(--text-primary)]">No History Yet</h3>
               <p className="text-sm text-[var(--text-muted)]">Forms you approve or reject will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInstances.map((inst) => (
                <div 
                  key={inst.id}
                  className="p-6 rounded-3xl border transition-all hover:shadow-xl hover:shadow-blue-500/5 group"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        inst.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        inst.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                         {inst.status}
                      </div>
                      <Link href={`/builder?id=${inst.form.id}`} className="text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors">
                         <ExternalLink size={16} />
                      </Link>
                   </div>

                   <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors">
                      {inst.form.title}
                   </h3>
                   <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mb-6">
                      <User size={12} />
                      Requested by <span className="font-bold text-[var(--text-secondary)]">{inst.creator.username}</span>
                   </div>

                   <div className="space-y-3 pt-4 border-t border-[var(--border)] border-dashed">
                      {inst.history.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                           {step.status === 'APPROVED' ? (
                             <CheckCircle2 size={12} className="text-emerald-500 mt-0.5" />
                           ) : (
                             <XCircle size={12} className="text-red-500 mt-0.5" />
                           )}
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-[var(--text-primary)]">
                                 {step.approver} {step.approverRole && <span className="text-[var(--text-faint)] font-medium">({step.approverRole})</span>}
                              </p>
                              {step.comments && (
                                <p className="text-[9px] text-[var(--text-muted)] leading-tight italic truncate">
                                   "{step.comments}"
                                </p>
                              )}
                           </div>
                           <span className="text-[8px] font-bold text-[var(--text-faint)] shrink-0">
                              {new Date(step.decidedAt).toLocaleDateString()}
                           </span>
                        </div>
                      ))}
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
