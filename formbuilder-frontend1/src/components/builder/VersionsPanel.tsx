'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Archive, CheckCircle, Clock, Copy, CornerDownRight, RotateCcw } from 'lucide-react';

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
    } catch (err) {
      toast.error('Failed to load version history');
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
      if (!res.ok) throw new Error('Activation failed');
      toast.success('Version restored and activated! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error('Failed to activate version');
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
    <div className="flex-1 overflow-y-auto bg-[var(--canvas-bg)] p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Version History</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Every time you publish changes, a snapshot is saved. You can restore previous structures here.
          </p>
        </div>

        <div className="relative pl-6 border-l-2 border-[var(--border)] space-y-8 mt-8">
          {versions.map((ver, idx) => (
            <div key={ver.id} className="relative group animate-in fade-in slide-in-from-bottom-2">
              <div 
                className={`absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-[var(--canvas-bg)] ${ver.isActive ? 'bg-emerald-500' : 'bg-[var(--border-strong)]'}`} 
              />
              
              <div className={`p-6 rounded-2xl border transition-all ${ver.isActive ? 'bg-[var(--card-bg)] border-emerald-500/30 shadow-xl shadow-emerald-500/5' : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--text-faint)]'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        v{ver.versionNumber}.0
                      </h3>
                      {ver.isActive && (
                         <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                           <CheckCircle size={12} /> Active Now
                         </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                      <div className="flex items-center gap-1.5"><Clock size={12} /> {new Date(ver.createdAt).toLocaleString()}</div>
                      <div className="flex items-center gap-1.5"><Copy size={12} /> {ver.fields?.length || 0} fields</div>
                      {ver.activatedBy && (
                        <div className="flex items-center gap-1.5"><CornerDownRight size={12} /> Restored by {ver.activatedBy} on {new Date(ver.activatedAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>

                  {!ver.isActive && (
                    <button
                      onClick={() => handleActivate(ver.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-[var(--bg-muted)] hover:bg-[var(--text-primary)] hover:text-[var(--canvas-bg)] hover:border-transparent"
                      style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                    >
                      <RotateCcw size={14} /> Restore Snapshot
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {versions.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] italic">No established versions yet. Publish your form to create the first version.</p>
          )}
        </div>
      </div>
    </div>
  );
}
