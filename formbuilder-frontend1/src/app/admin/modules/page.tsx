'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  RotateCcw, 
  Edit2, 
  Trash2, 
  LayoutGrid, 
  ChevronRight,
  Info,
  ShieldCheck,
  Check,
  X,
  LayoutDashboard,
  FileEdit,
  Users,
  Shield,
  SearchCode,
  TrendingUp,
  Settings,
  History,
  Bell,
  FileText,
  FormInput,
  List,
  MessageSquare,
  Send
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { AUTH, MODULES } from '@/utils/apiConstants';
import { extractArray } from '@/utils/apiData';



interface Module {
  id: string;
  moduleName: string;
  prefix: string;
  isParent: boolean;
  isSubParent: boolean;
  parentId: string | null;
  subParentId: string | null;
  menuIconCss: string;
  active: boolean;
}

function normalizeModules(payload: unknown): Module[] {
  const raw = extractArray<Record<string, unknown>>(payload, ['modules', 'content', 'items']);
  return raw
    .map((item) => {
      const idRaw = item.id;
      const id = idRaw == null ? '' : String(idRaw).trim();
      if (!id) return null;
      return {
        id,
        moduleName: typeof item.moduleName === 'string' ? item.moduleName : '',
        prefix: typeof item.prefix === 'string' ? item.prefix : '',
        isParent: Boolean(item.isParent),
        isSubParent: Boolean(item.isSubParent),
        parentId: item.parentId == null ? null : String(item.parentId),
        subParentId: item.subParentId == null ? null : String(item.subParentId),
        menuIconCss: typeof item.menuIconCss === 'string' ? item.menuIconCss : 'LayoutGrid',
        active: item.active == null ? true : Boolean(item.active),
      } satisfies Module;
    })
    .filter((m): m is Module => m !== null);
}

const AVAILABLE_ICONS = [
  'LayoutDashboard', 'LayoutGrid', 'FileEdit', 'Users', 'Shield', 'ShieldCheck', 'SearchCode', 
  'TrendingUp', 'Settings', 'History', 'Bell', 'FileText', 'FormInput', 'Plus', 'List', 
  'MessageSquare', 'Send'
];

// Helper to render icon by name
const DynamicIcon = ({ name, size = 20, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconMap: Record<string, LucideIcon> = { 
    LayoutDashboard, LayoutGrid, FileEdit, Users, Shield, ShieldCheck, SearchCode, 
    TrendingUp, Settings, History, Bell, FileText, FormInput, Plus, List, 
    MessageSquare, Send 
  };
  const Icon = IconMap[name] || LayoutGrid;
  return <Icon size={size} className={className} />;
};

export default function ModuleManagementPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const [formData, setFormData] = useState({
    moduleName: '',
    prefix: '',
    isParent: false,
    isSubParent: false,
    parentId: null as string | null,
    subParentId: null as string | null,
    menuIconCss: 'LayoutGrid',
    active: true
  });

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(MODULES.LIST, { credentials: 'include' });
      if (res.ok) {
        const data = normalizeModules(await res.json());
        setModules(data);
      }

      const userRes = await fetch(AUTH.ME, { credentials: 'include' });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsername(userData.username);
      }
    } catch {
      toast.error("Failed to load modules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleOpenModal = (module: Module | null = null) => {
    if (module) {
      setEditingModule(module);
      setFormData({
        moduleName: module.moduleName,
        prefix: module.prefix || '',
        isParent: module.isParent,
        isSubParent: module.isSubParent,
        parentId: module.parentId,
        subParentId: module.subParentId,
        menuIconCss: module.menuIconCss || 'LayoutGrid',
        active: module.active
      });
    } else {
      setEditingModule(null);
      setFormData({
        moduleName: '',
        prefix: '',
        isParent: false,
        isSubParent: false,
        parentId: null,
        subParentId: null,
        menuIconCss: 'LayoutGrid',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    toast(`Delete this module?`, {
      description: "All associated role mappings will be removed permanently.",
      action: {
        label: "Delete Now",
        onClick: async () => {
          try {
            // MODULES doesn't have a DELETE constant, so we construct it similar to apiConstants pattern
            const deleteUrl = `${MODULES.LIST}/${id}`;
            const res = await fetch(deleteUrl, {
              method: 'DELETE',
              credentials: 'include'
            });
            if (res.ok) {
              toast.success("Module deleted successfully");
              fetchModules();
            } else {
              toast.error("Failed to delete module");
            }
          } catch {
            toast.error("An error occurred during deletion");
          }
        }
      },
      cancel: { label: "Cancel", onClick: () => {} }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logic check: if parent or subparent, prefix must be empty
    const submissionData = {
      ...formData,
      prefix: (formData.isParent || formData.isSubParent) ? null : formData.prefix
    };

    try {
      const url = editingModule 
        ? `${MODULES.LIST}/${editingModule.id}`
        : MODULES.LIST;
      
      const method = editingModule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        toast.success(`Module ${editingModule ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchModules();
      } else {
        toast.error("Failed to save module");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const parentModules = modules.filter(m => m.isParent && m.id !== editingModule?.id);
  const subParentModules = modules.filter(m => m.isSubParent && m.parentId === formData.parentId && m.id !== editingModule?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-main)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading Architecture...</p>
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
          { label: 'Module Management', href: '/admin/modules' }
        ]}
        title="Navigation Architecture"
        badge={{ label: 'Dynamic', color: '#3b82f6' }}
      />

      {/* ── Toolbar ── */}
      <div className="sticky top-16 z-20 py-3 px-4 sm:px-8 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
           <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div className="flex bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 px-3 py-1 text-[10px] sm:text-xs font-black text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg whitespace-nowrap">
                <LayoutGrid size={14} />
                <span className="hidden xs:inline">{modules.length} Modules Configured</span>
                <span className="xs:hidden">{modules.length} Modules</span>
              </div>
            </div>
            <div className="hidden sm:block h-6 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] truncate">
              <Info size={12} className="shrink-0" />
              <span className="truncate">3-Level Hierarchy</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black text-white gradient-accent shadow-sm hover:shadow-md transition-all active:scale-95 uppercase tracking-widest whitespace-nowrap"
            >
              <Plus size={14} />
              Add Module
            </button>
            <div className="hidden sm:block h-6 w-px bg-[var(--border)] mx-1" />
            <button 
              onClick={fetchModules} 
              className="p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-all shadow-sm"
              title="Refresh"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
           {modules.filter(m => !m.parentId && !m.subParentId).map(parent => (
             <div key={parent.id} className="space-y-4">
                <div className="p-4 rounded-2xl border flex items-center justify-between bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white">
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">{parent.moduleName}</h3>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                        {parent.isParent ? 'Parent Container' : 'Direct Link'} • {parent.prefix || 'No Route (Folder)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => handleOpenModal(parent)} className="p-2 hover:bg-blue-500/10 hover:text-blue-500 rounded-lg transition-colors text-[var(--text-muted)]">
                       <Edit2 size={16} />
                     </button>
                     <button onClick={() => handleDelete(parent.id)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-[var(--text-muted)]">
                       <Trash2 size={16} />
                     </button>
                  </div>
                </div>

                {/* SubParents or Direct Children */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  {modules.filter(m => m.parentId === parent.id && m.isSubParent).map(subParent => (
                    <div key={subParent.id} className="p-5 rounded-2xl border bg-[var(--card-bg)] space-y-4 shadow-sm" style={{ borderColor: 'var(--card-border)' }}>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                <ChevronRight size={14} />
                             </div>
                             <span className="font-bold text-sm">{subParent.moduleName}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleOpenModal(subParent)} className="p-1.5 hover:bg-blue-500/10 hover:text-blue-500 rounded-lg transition-colors text-[var(--text-muted)]">
                               <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(subParent.id)} className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-[var(--text-muted)]">
                               <Trash2 size={14} />
                            </button>
                          </div>
                       </div>
                       
                       {/* Modules under SubParent */}
                       <div className="space-y-2 border-l-2 border-dashed border-[var(--border)] ml-3 pl-4">
                          {modules.filter(m => m.subParentId === subParent.id).map(module => (
                            <div key={module.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-muted)] transition-colors rounded px-2 -mx-2">
                               <span className="text-xs text-[var(--text-muted)] font-medium">{module.moduleName}</span>
                               <div className="flex items-center gap-2">
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-faint)] font-mono">{module.prefix}</span>
                                  <button onClick={() => handleOpenModal(module)} className="p-1 hover:text-blue-500 text-[var(--text-faint)]">
                                     <Edit2 size={12} />
                                  </button>
                                  <button onClick={() => handleDelete(module.id)} className="p-1 hover:text-red-500 text-[var(--text-faint)]">
                                     <Trash2 size={12} />
                                  </button>
                               </div>
                            </div>
                          ))}
                          {modules.filter(m => m.subParentId === subParent.id).length === 0 && (
                            <p className="text-[10px] text-[var(--text-faint)] italic">Empty folder</p>
                          )}
                       </div>
                    </div>
                  ))}

                  {/* Modules directly under Parent (Level 2 but not sub-parents) */}
                  {modules.filter(m => m.parentId === parent.id && !m.isSubParent && !m.subParentId).map(module => (
                     <div key={module.id} className="p-4 rounded-2xl border border-dashed flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-all" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{module.moduleName}</span>
                          <span className="text-[9px] text-[var(--text-faint)] font-mono">{module.prefix}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenModal(module)} className="p-1.5 hover:bg-blue-500/10 hover:text-blue-500 rounded-lg transition-colors text-[var(--text-muted)]">
                             <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(module.id)} className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-[var(--text-muted)]">
                             <Trash2 size={14} />
                          </button>
                        </div>
                     </div>
                  ))}
                </div>
             </div>
           ))}
           {modules.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mb-4">
                  <LayoutGrid size={40} className="text-[var(--text-faint)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">No modules found</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">Start building your application architecture by adding your first parent module.</p>
             </div>
           )}
        </div>
      </main>

      {/* Modal - Refined for Minimalist Schema */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
           <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                 <div className="mb-8">
                   <h2 className="text-3xl font-black text-slate-900 leading-tight">
                     {editingModule ? 'Edit Module' : 'Create Module'}
                   </h2>
                   <p className="text-slate-500 font-medium">Configure navigation nodes and hierarchies.</p>
                 </div>
                 
                 <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Module Name <span className="text-red-500">*</span></label>
                          <input 
                            required
                            type="text"
                            value={formData.moduleName}
                            onChange={(e) => setFormData({...formData, moduleName: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
                            placeholder="e.g. Dashboard"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Route Prefix</label>
                          <input 
                            disabled={formData.isParent || formData.isSubParent}
                            type="text"
                            value={(formData.isParent || formData.isSubParent) ? '' : formData.prefix}
                            onChange={(e) => setFormData({...formData, prefix: e.target.value})}
                            className={`w-full px-5 py-4 rounded-2xl border transition-all outline-none ${
                                (formData.isParent || formData.isSubParent) 
                                ? 'bg-slate-200 cursor-not-allowed border-slate-200' 
                                : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50/50'
                            }`}
                            placeholder={(formData.isParent || formData.isSubParent) ? 'Folders have no route' : '/admin/dashboard'}
                          />
                       </div>
                    </div>
                                       <div className="flex items-center gap-12 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer group">
                           <input 
                             type="checkbox" 
                             className="hidden" 
                             checked={formData.isParent}
                             onChange={(e) => setFormData({
                               ...formData, 
                               isParent: e.target.checked, 
                               parentId: null, 
                               subParentId: null, 
                               isSubParent: e.target.checked ? false : formData.isSubParent
                             })}
                           />
                           <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.isParent ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30' : 'border-slate-300 bg-white'}`}>
                              {formData.isParent && <Check className="text-white" size={16} strokeWidth={4} />}
                           </div>
                           <span className={`font-bold text-sm ${formData.isParent ? 'text-blue-600' : 'text-slate-600'}`}>Top Level Parent</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                           <input 
                             type="checkbox" 
                             className="hidden" 
                             checked={formData.isSubParent}
                             onChange={(e) => setFormData({
                               ...formData, 
                               isSubParent: e.target.checked, 
                               isParent: e.target.checked ? false : formData.isParent,
                               subParentId: null
                             })}
                           />
                           <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.isSubParent ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30' : 'border-slate-300 bg-white'}`}>
                              {formData.isSubParent && <Check className="text-white" size={16} strokeWidth={4} />}
                           </div>
                           <span className={`font-bold text-sm ${formData.isSubParent ? 'text-blue-600' : 'text-slate-600'}`}>Sub-Parent Folder</span>
                        </label>
                     </div>
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Parent Module</label>
                          <select 
                            disabled={formData.isParent}
                            value={formData.parentId || ''}
                            onChange={(e) => setFormData({...formData, parentId: e.target.value || null, subParentId: null})}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                          >
                             <option value="">(None)</option>
                             {parentModules.map(m => (
                               <option key={m.id} value={m.id}>{m.moduleName}</option>
                             ))}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Inside Sub-Parent</label>
                          <select 
                            disabled={formData.isParent || formData.isSubParent || !formData.parentId}
                            value={formData.subParentId || ''}
                            onChange={(e) => setFormData({...formData, subParentId: e.target.value || null})}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                          >
                             <option value="">(None)</option>
                             {subParentModules.map(m => (
                               <option key={m.id} value={m.id}>{m.moduleName}</option>
                             ))}
                          </select>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Choose Sidebar Icon</label>
                       <div className="flex flex-wrap gap-3 p-6 rounded-[2rem] border border-slate-100 bg-slate-50 max-h-40 overflow-y-auto custom-scrollbar">
                          {AVAILABLE_ICONS.map(iconName => (
                            <button
                                key={iconName}
                                type="button"
                                onClick={() => setFormData({...formData, menuIconCss: iconName})}
                                className={`p-3 rounded-2xl transition-all border-2 ${
                                    formData.menuIconCss === iconName 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' 
                                    : 'bg-white border-transparent text-slate-500 hover:border-slate-200 hover:scale-105'
                                }`}
                                title={iconName}
                            >
                                <DynamicIcon name={iconName} size={20} />
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                       <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, active: !formData.active})}
                            className={`w-14 h-7 rounded-full transition-all relative ${formData.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          >
                             <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${formData.active ? 'right-1' : 'left-1'}`} />
                          </button>
                          <span className={`font-bold text-sm ${formData.active ? 'text-emerald-500' : 'text-slate-500'}`}>Node Active</span>
                       </div>

                       <div className="flex items-center gap-4">
                          <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-4 rounded-2xl text-slate-400 font-bold hover:text-slate-600 transition-all font-black uppercase tracking-widest text-xs"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="px-10 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                          >
                            {editingModule ? 'Save Changes' : 'Create Module'}
                          </button>
                       </div>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
