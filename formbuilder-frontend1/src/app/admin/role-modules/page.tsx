'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  RotateCcw, 
  Check, 
  X, 
  Save,
  Search,
  Filter,
  ChevronDown,
  FolderOpen,
  Folder,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Header from '@/components/Header';

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Module {
  id: number;
  moduleName: string;
  isParent: boolean;
  isSubParent: boolean;
  parentId: number | null;
  subParentId: number | null;
}

export default function RoleModuleMappingPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [assignedModuleIds, setAssignedModuleIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<number[]>([]);
  const [expandedSubParents, setExpandedSubParents] = useState<number[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, modulesRes, userRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/admin/roles', { credentials: 'include' }),
        fetch('http://localhost:8080/api/v1/modules', { credentials: 'include' }),
        fetch('http://localhost:8080/api/v1/auth/me', { credentials: 'include' })
      ]);
      const rolesData = await rolesRes.json();
      const modulesData = await modulesRes.json();
      
      setRoles(rolesData.content || rolesData);
      setModules(modulesData);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUsername(userData.username);
      }
    } catch (err) {
      toast.error("Failed to load mapping data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchAssignments = async (roleId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/roles/${roleId}/modules`, { credentials: 'include' });
      if (res.ok) {
        const data: Module[] = await res.json();
        setAssignedModuleIds(data.map(m => Number(m.id)));
      }
    } catch (err) {
      toast.error("Failed to load role assignments");
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    fetchAssignments(role.id);
  };

  const toggleModule = (moduleId: number) => {
    setAssignedModuleIds(prev => {
      const isSelected = prev.includes(moduleId);
      let next = [...prev];

      if (isSelected) {
        // Deselecting: Remove module and all its recursive children
        const toRemove = new Set<number>([moduleId]);
        const findChildren = (pid: number, isSub: boolean) => {
          modules.forEach(m => {
            if (isSub && m.subParentId === pid) {
              toRemove.add(m.id);
            } else if (!isSub && m.parentId === pid) {
              toRemove.add(m.id);
              if (m.isSubParent) findChildren(m.id, true);
            }
          });
        };
        const m = modules.find(mod => mod.id === moduleId);
        if (m?.isParent) findChildren(moduleId, false);
        else if (m?.isSubParent) findChildren(moduleId, true);
        
        return next.filter(id => !toRemove.has(id));
      } else {
        // Selecting: Add module and all its parents
        const toAdd = new Set<number>([moduleId]);
        const m = modules.find(mod => mod.id === moduleId);
        if (m) {
          if (m.subParentId) {
            toAdd.add(m.subParentId);
            const subP = modules.find(s => s.id === m.subParentId);
            if (subP?.parentId) toAdd.add(subP.parentId);
          } else if (m.parentId) {
            toAdd.add(m.parentId);
          }
        }
        toAdd.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      }
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/roles/${selectedRole.id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ moduleIds: assignedModuleIds })
      });
      if (res.ok) {
        toast.success("Mappings updated successfully");
      } else {
        toast.error("Failed to update mappings");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading Mapping Tool...</p>
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
          { label: 'Role-Menu Mapping', href: '/admin/role-modules' }
        ]}
        title="Access Control"
        badge={{ label: 'Security', color: '#10b981' }}
      />

      {/* ── Toolbar ── */}
      <div className="sticky top-16 z-20 py-3 px-4 sm:px-8 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
           <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div className="flex bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 px-3 py-1 text-[10px] sm:text-xs font-black text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg whitespace-nowrap">
                <ShieldCheck size={14} />
                <span className="hidden xs:inline">{roles.length} Roles Identified</span>
                <span className="xs:hidden">{roles.length}R</span>
              </div>
            </div>
            <div className="hidden sm:block h-6 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] truncate">
              <LayoutGrid size={12} className="shrink-0" />
              <span className="truncate">{modules.length} Available Modules</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {selectedRole && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black text-white gradient-accent shadow-sm hover:shadow-md transition-all active:scale-95 uppercase tracking-widest whitespace-nowrap disabled:opacity-50"
              >
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save Mappings'}
              </button>
            )}
            <div className="hidden sm:block h-6 w-px bg-[var(--border)] mx-1" />
            <button 
              onClick={fetchData} 
              className="p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-all shadow-sm"
              title="Refresh"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Roles Selection */}
            <div className="space-y-4">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-faint)] ml-2">Select System Role</h2>
               <div className="space-y-2">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => handleSelectRole(role)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        selectedRole?.id === role.id 
                          ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)]' 
                          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--text-faint)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                         <Shield size={18} className={selectedRole?.id === role.id ? 'text-[var(--accent)]' : 'text-slate-400'} />
                         <span className="font-bold text-sm tracking-tight">{role.name}</span>
                      </div>
                      {selectedRole?.id === role.id && <Check size={16} />}
                    </button>
                  ))}
               </div>
            </div>

            {/* Modules Mapping */}
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-faint)] ml-1">
                    {selectedRole ? `Modules for ${selectedRole.name}` : 'Select a role to map modules'}
                  </h2>
                  {selectedRole && (
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black text-white gradient-accent shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Save size={14} />
                      {isSaving ? 'Saving...' : 'Save Mappings'}
                    </button>
                  )}
               </div>

               {selectedRole ? (
                 <div className="space-y-4">
                    {modules.filter(m => !m.parentId && !m.subParentId).map(parent => {
                      const isExpanded = expandedParents.includes(parent.id);
                      const isSelected = assignedModuleIds.includes(parent.id);
                      const subItems = modules.filter(m => m.parentId === parent.id);

                      return (
                        <div key={parent.id} className="rounded-2xl border bg-[var(--card-bg)] overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
                          <div 
                            className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-[var(--bg-muted)]' : ''}`}
                            onClick={() => setExpandedParents(prev => isExpanded ? prev.filter(id => id !== parent.id) : [...prev, parent.id])}
                          >
                             <div className="flex items-center gap-4">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleModule(parent.id); }}
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-slate-300 bg-white'}`}
                                >
                                   {isSelected && <Check className="text-white" size={14} />}
                                </button>
                                <div className="flex items-center gap-3">
                                   <div className={`p-2 rounded-xl ${isSelected ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'bg-slate-100 text-slate-400'}`}>
                                      {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="font-bold text-sm text-[var(--text-primary)]">{parent.moduleName}</span>
                                      <span className="text-[10px] text-[var(--text-faint)] font-bold uppercase tracking-wider">Parent Directory</span>
                                   </div>
                                </div>
                             </div>
                             <ChevronDown size={18} className={`text-[var(--text-faint)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {isExpanded && (
                            <div className="border-t border-[var(--border)] bg-[var(--bg-base)] p-4 space-y-3">
                               {!isSelected ? (
                                 <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <ShieldCheck className="text-slate-300 mb-2" size={24} />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select parent to configure sub-modules</p>
                                 </div>
                               ) : (
                                 <>
                                   {subItems.filter(m => m.isSubParent).map(subParent => {
                                     const isSubExpanded = expandedSubParents.includes(subParent.id);
                                     const isSubSelected = assignedModuleIds.includes(subParent.id);
                                     const leafItems = modules.filter(m => m.subParentId === subParent.id);

                                     return (
                                       <div key={subParent.id} className="rounded-xl border border-[var(--border)] overflow-hidden bg-white/50">
                                          <div 
                                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--bg-muted)] transition-colors"
                                            onClick={() => setExpandedSubParents(prev => isSubExpanded ? prev.filter(id => id !== subParent.id) : [...prev, subParent.id])}
                                          >
                                             <div className="flex items-center gap-3">
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); toggleModule(subParent.id); }}
                                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSubSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}
                                                >
                                                   {isSubSelected && <Check className="text-white" size={12} />}
                                                </button>
                                                <span className="font-bold text-xs">{subParent.moduleName}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-0.5 bg-slate-100 rounded">Sub Category</span>
                                             </div>
                                             <ChevronDown size={14} className={`text-[var(--text-faint)] transition-transform duration-300 ${isSubExpanded ? 'rotate-180' : ''}`} />
                                          </div>

                                          {isSubExpanded && (
                                            <div className="p-3 pl-12 bg-slate-50/50">
                                               {!isSubSelected ? (
                                                  <div className="p-4 text-center border border-dashed border-slate-200 rounded-lg">
                                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select sub-category to show items</p>
                                                  </div>
                                               ) : (
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                   {leafItems.map(leaf => (
                                                      <label key={leaf.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-all border border-transparent hover:border-slate-200">
                                                         <input 
                                                           type="checkbox" 
                                                           className="hidden" 
                                                           checked={assignedModuleIds.includes(leaf.id)}
                                                           onChange={() => toggleModule(leaf.id)}
                                                         />
                                                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${assignedModuleIds.includes(leaf.id) ? 'bg-blue-400 border-blue-400' : 'border-slate-300'}`}>
                                                            {assignedModuleIds.includes(leaf.id) && <Check className="text-white" size={10} />}
                                                         </div>
                                                         <span className="text-[11px] font-medium text-[var(--text-muted)]">{leaf.moduleName}</span>
                                                      </label>
                                                   ))}
                                                 </div>
                                               )}
                                            </div>
                                          )}
                                       </div>
                                     );
                                   })}

                                   {/* Level 2 Modules (non-subparents) */}
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                     {subItems.filter(m => !m.isSubParent).map(leaf => (
                                       <label key={leaf.id} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 hover:bg-white cursor-pointer transition-all bg-white/30">
                                          <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={assignedModuleIds.includes(leaf.id)}
                                            onChange={() => toggleModule(leaf.id)}
                                          />
                                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${assignedModuleIds.includes(leaf.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                             {assignedModuleIds.includes(leaf.id) && <Check className="text-white" size={12} />}
                                          </div>
                                          <span className="font-bold text-xs">{leaf.moduleName}</span>
                                       </label>
                                     ))}
                                   </div>
                                 </>
                               )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                 </div>
               ) : (
                 <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] p-12 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                    <div className="w-20 h-20 rounded-full bg-[var(--bg-muted)] flex items-center justify-center mb-6">
                       <ShieldCheck className="text-[var(--text-faint)]" size={40} />
                    </div>
                    <h3 className="text-lg font-black tracking-tight mb-2">Access Control Center</h3>
                    <p className="max-w-xs text-xs font-medium text-[var(--text-muted)] leading-relaxed">
                       Select a user role from the left panel to begin mapping sidebar modules and managing system access.
                    </p>
                 </div>
               )}
            </div>
         </div>
      </main>
    </div>
  );
}
