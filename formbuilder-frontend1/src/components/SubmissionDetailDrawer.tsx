'use client';

import React from 'react';
import { X, Calendar, User, FileText, CheckCircle2, Clock, Download, ExternalLink } from 'lucide-react';

interface SubmissionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
  headers: any[];
  formTitle: string;
}

const SubmissionDetailDrawer: React.FC<SubmissionDetailDrawerProps> = ({
  isOpen,
  onClose,
  submission,
  headers,
  formTitle
}) => {
  if (!isOpen || !submission) return null;

  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return <span className="italic" style={{ color: 'var(--text-faint)' }}>No response</span>;
    
    if (type === 'FILE' && value) {
      const fileUrl = value.startsWith('http') ? value : `http://localhost:8080${value}`;
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
          style={{ background: '#2563eb' }}
        >
          <Download size={14} /> Download File
        </a>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          value ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return (
            <div className="flex flex-wrap gap-2 mt-1">
              {parsed.map((item: any, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-xl text-[10px] font-bold border" style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  {String(item)}
                </span>
              ))}
            </div>
          );
        }
      } catch (e) {}
    }

    return <span className="break-words font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{String(value)}</span>;
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      
      <div 
        className="fixed inset-y-0 right-0 z-[101] w-full max-w-xl shadow-2xl flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-in slide-in-from-right"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="px-8 py-6 border-b flex items-center justify-between sticky top-0 backdrop-blur-md z-10" style={{ borderColor: 'var(--border)', background: 'var(--header-bg)' }}>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Submission Details</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mt-1">{formTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-xl transition-all active:scale-95"
            style={{ color: 'var(--text-faint)' }}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-12 scrollbar-thin scrollbar-thumb-[var(--border)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border transition-all hover:shadow-sm" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Clock size={16} className="opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 uppercase">Received</span>
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {new Date(submission.submitted_at).toLocaleString()}
              </p>
            </div>
            <div className="p-5 rounded-2xl border transition-all hover:shadow-sm" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 size={16} className="opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 uppercase">Status</span>
              </div>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  submission.submission_status === 'RESPONSE_DRAFT' 
                    ? 'bg-amber-50 text-amber-700 border-amber-100' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {submission.submission_status || 'FINAL'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>Form Responses</h3>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            <div className="grid grid-cols-1 gap-8">
              {headers.filter(h => h.key !== 'serial_no' && h.key !== 'submitted_at' && h.key !== 'submission_status').map((header) => (
                <div key={header.key} className="space-y-3 group">
                  <label className="text-[10px] font-bold uppercase tracking-widest group-hover:text-blue-600 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    {header.label}
                  </label>
                  <div className="p-5 rounded-2xl border transition-all group-hover:shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    {formatValue(submission[header.key], header.type)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-5 transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-6">
              <FileText size={240} />
            </div>
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-1 text-slate-100">System Records</h4>
              <p className="text-xs text-slate-400 mb-6 font-medium">Internal trace identifier</p>
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <code className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                  UUID: {submission.submission_id}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-t flex justify-end" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border active:scale-95 shadow-sm"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
};

export default SubmissionDetailDrawer;
