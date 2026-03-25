'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Archive, CheckCircle, Clock, Copy, RotateCcw } from 'lucide-react';
import { extractApiError } from '@/utils/error-handler';

interface FormVersion {
  id: number;
  versionNumber: number;
  createdAt: string;
  isActive: boolean;
  activatedAt: string;
  activatedBy: string;
  rules: any;
  fields: any[];
}

export default function VersionsPanel({ editFormId }: { editFormId: string | null }) {
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersions = async () => {
    if (!editFormId) return;
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8080/api/v1/forms/${editFormId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Sort by version number descending
      const sorted = (data.versions || []).sort((a: any, b: any) => b.versionNumber - a.versionNumber);
      setVersions(sorted);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [editFormId]);

  const handleActivate = async (versionId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/forms/${editFormId}/versions/${versionId}/activate`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const msg = await extractApiError(res);
        throw new Error(msg);
      }
      toast.success('Version restored and activated! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate version');
    }
  };

  if (!editFormId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--canvas-bg)]">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-muted)] flex items-center justify-center mb-4">
          <Archive className="text-[var(--text-faint)]" size={32} />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Save Form First</h3>
        <p className="text-[var(--text-muted)] text-sm max-w-sm">
          You need to save this draft at least once before version history becomes available.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-[var(--text-muted)]">Loading timeline...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--canvas-bg)] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Version History</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium opacity-70">
            Timeline of snapshots captured upon publication. Restore any previous state to the current builder.
          </p>
        </div>

        <div className="relative">
          {/* Vertical central line */}
          <div className="absolute left-[18px] top-6 bottom-0 w-0.5 bg-[var(--border)] rounded-full opacity-20" />
          
          <div className="space-y-6">
            {versions.map((ver, idx) => (
              <div key={ver.id} className="relative pl-12 group">
                {/* Node icon */}
                <div 
                  className={`absolute left-0 top-0.5 w-9 h-9 rounded-xl flex items-center justify-center border-2 border-[var(--canvas-bg)] transition-all duration-300 z-10 shadow-sm
                    ${ver.isActive 
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                      : 'bg-[var(--bg-muted)] text-[var(--text-faint)] group-hover:bg-[var(--accent-subtle)] group-hover:text-[var(--accent)]'}`}
                >
                  {ver.isActive ? <CheckCircle size={18} /> : <Clock size={16} />}
                </div>
                
                <div className={`p-6 md:px-10 rounded-[1.5rem] border transition-all duration-300 relative overflow-hidden
                  ${ver.isActive 
                    ? 'bg-[var(--card-bg)] border-emerald-500/20 shadow-xl shadow-emerald-500/5' 
                    : 'bg-transparent border-[var(--border)] hover:border-[var(--accent-muted)] hover:bg-[var(--card-bg)]/40'}`}>
                  
                  {ver.isActive && (
                    <div className="absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 bg-emerald-500/5 rounded-full blur-xl" />
                  )}

                  <div className="flex items-center justify-between relative z-10 gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col min-w-[80px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">Revision</span>
                          {ver.isActive && (
                            <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">Live</span>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] mt-0.5 tracking-tighter">
                          v{ver.versionNumber}.0
                        </h3>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-between md:ml-32 md:mr-12 gap-12">
                        <div className="flex flex-col min-w-[140px]">
                          <span className="text-[10px] font-black text-[var(--text-faint)] uppercase tracking-[0.4em] mb-2.5 opacity-80">Snapshot At</span>
                          <span className="text-sm font-bold text-[var(--text-secondary)]">
                            {ver.createdAt ? new Date(ver.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending...'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col min-w-[100px]">
                          <span className="text-[10px] font-black text-[var(--text-faint)] uppercase tracking-[0.4em] mb-2.5 opacity-80">Fields Count</span>
                          <span className="text-sm font-bold text-[var(--text-secondary)]">
                            {ver.fields?.length || 0} fields
                          </span>
                        </div>

                        {ver.activatedBy && (
                          <div className="flex flex-col min-w-[100px]">
                            <span className="text-[10px] font-black text-[var(--text-faint)] uppercase tracking-[0.4em] mb-2.5 opacity-80">Restored By</span>
                            <span className="text-sm font-bold text-[var(--accent)]">
                              {ver.activatedBy}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!ver.isActive && (
                      <button
                        onClick={() => handleActivate(ver.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all border bg-white dark:bg-black hover:scale-105 active:scale-95 shadow-sm hover:shadow-md shrink-0"
                        style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {versions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-muted)]/30 rounded-[3rem] border border-dashed border-[var(--border)]">
                 <Copy className="mb-4 text-[var(--text-faint)] opacity-20" size={48} />
                 <p className="text-sm font-bold opacity-40 uppercase tracking-widest">No revision history found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

  );
}
