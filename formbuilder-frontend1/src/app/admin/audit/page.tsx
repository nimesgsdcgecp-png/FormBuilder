'use client';

import { useEffect, useState } from 'react';
import { Search, Shield, Activity, Clock, SearchCode, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { AUTH, ADMIN_AUDIT } from '@/utils/apiConstants';
import { extractArray } from '@/utils/apiData';

interface AuditLog {
  id: number;
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  details: string;
  createdAt: string;
}

function normalizeAuditLogs(payload: unknown): AuditLog[] {
  return extractArray<AuditLog>(payload, ['logs', 'content', 'items']);
}

export default function AuditLogsPage() {
  const { assignments } = usePermissions();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  void assignments;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const logsRes = await fetch(ADMIN_AUDIT.LIST, { credentials: 'include' });
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(normalizeAuditLogs(logsData));
      } else {
        toast.error("Access forbidden: Audit logs restricted. Please check your role.");
      }

      const userRes = await fetch(AUTH.ME, { credentials: 'include' });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsername(userData.username);
      }
    } catch (err) {
      console.error("Network error during audit logs fetch:", err);
      toast.error("Failed to load audit logs due to a server or network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await fetch(`${ADMIN_AUDIT.BASE}/clear`, { 
        method: 'DELETE',
        credentials: 'include' 
      });
      if (res.ok) {
        toast.success("Audit trail cleared successfully (Soft Delete)");
        setLogs([]);
        setIsClearModalOpen(false);
      } else {
        toast.error("Failed to clear audit trail");
      }
    } catch {
      toast.error("An error occurred while clearing logs");
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resourceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalElements = filteredLogs.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Header 
        username={username} 
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Audit Logs', href: '/admin/audit' }
        ]}
        title="Management Console"
        badge={{ label: 'Live Feed', color: '#3b82f6' }}
      />

      {/* ── SaaS Toolbar & Main Content ── */}
      <main className="max-w-[1600px] mx-auto px-8 py-6">
        {/* ... (existing toolbar and table) ... */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 dark:bg-[var(--bg-surface)] dark:border-[var(--border)]">
          <div className="relative group w-full md:w-96">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: searchTerm ? '#2563eb' : '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search all logs (Global Search)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm border-0 bg-slate-50 transition-all focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:bg-[var(--bg-muted)] dark:text-[var(--text-primary)] font-bold"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-white border-slate-200 text-slate-600 dark:bg-[var(--bg-muted)] dark:border-[var(--border)] dark:text-[var(--text-muted)]">
                <Shield size={16} className="text-blue-500" />
                <span className="hidden lg:inline uppercase tracking-widest text-[var(--text-primary)]">Secure Audit Trail</span>
             </div>
          </div>
        </div>

        {/* Table View (Desktop) */}
        <div className="hidden md:block rounded-3xl border shadow-sm overflow-hidden mb-8" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[var(--bg-muted)]/50">
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest border-b" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>Timestamp</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest border-b" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>Actor</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest border-b" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>Action</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest border-b" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>Resource</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest border-b" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {isLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-6 h-16 bg-[var(--bg-muted)]/20" />
                    </tr>
                  ))
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-[var(--text-muted)] italic">
                      <div className="flex flex-col items-center gap-3">
                        <SearchCode size={40} className="text-[var(--text-faint)]" />
                        No logs found
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                          <Clock size={12} className="text-blue-500/50" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                            {log.actor.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-extrabold text-[var(--text-primary)]">{log.actor}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tight border ${
                          log.action.includes('DELETE') ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          log.action.includes('CREATE') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          log.action.includes('APPROVE') ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                          <Shield size={12} className="text-blue-400" />
                          {log.resourceType}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs text-[var(--text-muted)] max-w-md line-clamp-1 group-hover:line-clamp-none transition-all duration-300" title={log.details}>
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card View (Mobile) */}
        <div className="md:hidden space-y-4 mb-8">
          {isLoading ? (
             Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="bg-white dark:bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] animate-pulse h-32" />
             ))
          ) : paginatedLogs.length === 0 ? (
            <div className="bg-white dark:bg-[var(--bg-surface)] px-6 py-12 rounded-2xl border border-[var(--border)] text-center">
               <SearchCode size={40} className="mx-auto text-[var(--text-faint)] mb-3" />
               <p className="text-[var(--text-muted)] font-bold italic">No logs found</p>
            </div>
          ) : (
            paginatedLogs.map((log) => (
              <div key={log.id} className="bg-white dark:bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border bg-[var(--bg-muted)] text-[var(--text-primary)]">
                       {log.actor.charAt(0).toUpperCase()}
                     </div>
                     <span className="text-sm font-black tracking-tight">{log.actor}</span>
                   </div>
                   <span className="text-[10px] font-bold text-[var(--text-faint)]">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                   <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                      log.action.includes('DELETE') ? 'bg-red-500/10 text-red-500 border-red-500/10' :
                      log.action.includes('CREATE') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/10'
                   }`}>
                      {log.action}
                   </span>
                   <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                      {log.resourceType}
                   </span>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                   {log.details || 'No additional details provided.'}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Pagination Logic */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 bg-transparent">
            {/* ... pagination details ... */}
            <p className="text-xs font-bold text-[var(--text-faint)] uppercase tracking-widest">
              Showing <span className="text-[var(--text-primary)]">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-[var(--text-primary)]">{Math.min(currentPage * pageSize, totalElements)}</span> of <span className="text-[var(--text-primary)]">{totalElements}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border transition-all hover:bg-[var(--bg-hover)] disabled:opacity-30"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border transition-all hover:bg-[var(--bg-hover)] disabled:opacity-30"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-1 mx-2">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-lg text-xs font-black transition-all border ${
                          currentPage === pageNum 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-blue-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="px-1 text-[var(--text-faint)]">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border transition-all hover:bg-[var(--bg-hover)] disabled:opacity-30"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border transition-all hover:bg-[var(--bg-hover)] disabled:opacity-30"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Clear Trail Confirmation Modal ── */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-[var(--bg-surface)] w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 dark:border-[var(--border)] animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                 <AlertTriangle size={32} className="text-red-600" />
              </div>
              
              <h3 className="text-2xl font-black tracking-tight text-[var(--text-primary)] mb-2">Clear Audit Trail?</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8">
                This will hide all current audit logs from the management console. This action is <span className="text-red-600 font-bold uppercase underline decoration-2 underline-offset-4">restricted</span> to super admins and is implemented as a soft delete for record keeping.
              </p>

              <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={() => setIsClearModalOpen(false)}
                    disabled={isClearing}
                    className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-[var(--border)] text-[var(--text-muted)] hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                 >
                    Nevermind
                 </button>
                 <button
                    onClick={handleClearLogs}
                    disabled={isClearing}
                    className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-red-600 text-white shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isClearing ? <Activity className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    Yes, Clear All
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
