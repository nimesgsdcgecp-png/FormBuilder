'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Shield, UserPlus, Trash2, Plus, Info, Check, Search, Filter, ShieldCheck, FormInput, RotateCcw, Users, ShieldAlert, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

interface UserSummary {
  id: number;
  username: string;
  roles: string[];
}

interface Permission {
  id: number;
  name: string;
  category: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
}

interface Form {
  id: number;
  title: string;
}

export default function RoleManagementPage() {
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const router = useRouter();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedForm, setSelectedForm] = useState<string>("global");

  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: "", description: "", permissionIds: [] as number[] });

  useEffect(() => {
    if (editingRole) {
      setNewRole({
        name: editingRole.name,
        description: editingRole.description,
        permissionIds: editingRole.permissions.map(p => p.id)
      });
      setIsAddingRole(true);
    }
  }, [editingRole]);

  const handleModalClose = () => {
    setIsAddingRole(false);
    setEditingRole(null);
    setNewRole({ name: "", description: "", permissionIds: [] });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, usersRes, permsRes, formsRes] = await Promise.all([
        fetch('http://localhost:8080/api/admin/roles', { credentials: 'include' }),
        fetch('http://localhost:8080/api/admin/users/summary', { credentials: 'include' }),
        fetch('http://localhost:8080/api/admin/permissions', { credentials: 'include' }),
        fetch('http://localhost:8080/api/forms', { credentials: 'include' })
      ]);

      const rolesData = await rolesRes.json();
      const usersData = await usersRes.json();
      const permsData = await permsRes.json();
      const formsData = await formsRes.json();

      setRoles(rolesData.content || rolesData);
      setUsers(usersData);
      setPermissions(permsData);
      setForms(formsData);
    } catch (err) {
      toast.error("Failed to load management data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return toast.error("Role name is required");

    try {
      const url = editingRole 
        ? `http://localhost:8080/api/admin/roles/${editingRole.id}`
        : 'http://localhost:8080/api/admin/roles';
      
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newRole)
      });

      if (res.ok) {
        toast.success(editingRole ? "Role updated successfully" : "Role created successfully");
        handleModalClose();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${editingRole ? 'update' : 'create'} role`);
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteRole = async (id: number, name: string) => {
    if (['ADMIN', 'ROLE_ADMINISTRATOR', 'BUILDER', 'USER'].includes(name)) {
      toast.error("Cannot delete system protected role");
      return;
    }

    toast(`Delete role "${name}"?`, {
      description: "Users with this role will be automatically reassigned to USER.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(`http://localhost:8080/api/admin/roles/${id}`, {
              method: 'DELETE',
              credentials: 'include'
            });

            if (res.ok) {
              toast.success("Role deleted successfully");
              fetchData();
            } else {
              const err = await res.json();
              toast.error(err.error || "Failed to delete role");
            }
          } catch (err) {
            toast.error("An error occurred");
          }
        }
      },
      cancel: { label: "Cancel", onClick: () => {} }
    });
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRole) {
      toast.error("Please select both a user and a role");
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/api/admin/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: parseInt(selectedUser),
          roleId: parseInt(selectedRole),
          formId: selectedForm === 'global' ? null : parseInt(selectedForm)
        })
      });

      if (res.ok) {
        toast.success("Role assigned successfully");
        setIsAssigning(false);
        setSelectedUser("");
        setSelectedRole("");
        setSelectedForm("global");
      } else {
        const error = await res.json();
        toast.error(error.error || "Assignment failed");
      }
    } catch (err) {
      toast.error("An error occurred during assignment");
    }
  };

  if (isLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-main)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading Management Panel...</p>
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
              <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">Dashboard</Link>
              <span className="text-[var(--text-faint)]">/</span>
              <span className="text-[var(--text-primary)] font-bold">Role Management</span>
            </nav>
            <div className="hidden lg:block h-4 w-px bg-[var(--border)] mx-2" />
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-[var(--text-primary)] truncate">Security Logic</h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest shrink-0">Active</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-[var(--border)] mx-2" />
            <ThemeToggle />
            <Link 
              href="/"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-muted)] hover:bg-[var(--border)] transition-all"
              title="Close"
            >
              <Plus className="rotate-45 text-[var(--text-muted)]" size={20} />
            </Link>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="py-3 px-4 sm:px-8 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <div className="flex bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2 px-3 py-1 text-[10px] sm:text-xs font-black text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg whitespace-nowrap">
                <ShieldCheck size={14} />
                <span className="hidden xs:inline">{roles.length} Roles</span>
                <span className="xs:hidden">{roles.length}R</span>
              </div>
            </div>
            <div className="hidden sm:block h-6 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] truncate">
              <Users size={12} className="shrink-0" />
              <span className="truncate">{users.length} Users</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setIsAddingRole(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all uppercase tracking-widest whitespace-nowrap"
            >
              <Plus size={14} />
              New Role
            </button>
            <button 
              onClick={() => setIsAssigning(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black text-white gradient-accent shadow-sm hover:shadow-md transition-all active:scale-95 uppercase tracking-widest whitespace-nowrap"
            >
              <UserPlus size={14} />
              Assign
            </button>
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
      </header>

      {/* ── Content ── */}
      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* Roles List */}
          <div className="flex-1 space-y-6 order-2 lg:order-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <div 
                  key={role.id} 
                  className="group p-5 sm:p-6 rounded-2xl border transition-all hover:shadow-lg relative overflow-hidden"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                  <div className="flex justify-between items-start relative z-10 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${['ADMIN', 'ROLE_ADMINISTRATOR'].includes(role.name) ? 'bg-red-500/10 text-red-500' : 'bg-[var(--accent-subtle)] text-[var(--accent)]'}`}>
                        <Shield size={16} />
                      </div>
                      <h3 className="text-sm sm:text-lg font-black group-hover:text-[var(--accent)] transition-colors truncate">{role.name}</h3>
                    </div>
                    {!['ADMIN', 'ROLE_ADMINISTRATOR', 'BUILDER', 'USER'].includes(role.name) && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => setEditingRole(role)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50"
                          title="Edit Role"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRole(role.id, role.name)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                          title="Delete Role"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs mb-6 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {role.description || "No description provided."}
                  </p>
                  
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.map(p => (
                        <span 
                          key={p.id} 
                          className="px-2 py-0.5 rounded-md text-[9px] font-bold border whitespace-nowrap"
                          style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar / Info */}
          <div className="w-full lg:w-80 space-y-6 order-1 lg:order-2">
            <section className="p-5 sm:p-6 rounded-2xl border bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border)' }}>
               <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 mb-6 text-[var(--text-primary)]">
                <Info className="text-amber-500" size={18} />
                Access Level Summary
              </h2>
              <div className="space-y-5">
                {[
                  { id: 'READ', desc: 'Can view forms and browse data.' },
                  { id: 'WRITE', desc: 'Can create new forms and entries.' },
                  { id: 'EDIT', desc: 'Can modify existing form structures.' },
                  { id: 'DELETE', desc: 'Can archive or remove resources.' },
                  { id: 'MANAGE', desc: 'Full administrative access controls.' }
                ].map(p => (
                  <div key={p.id} className="flex gap-4">
                    <div className="mt-1 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 blur-[1px]"></div>
                    </div>
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-black text-amber-600 block mb-0.5 tracking-widest uppercase">{p.id}</span>
                      <p className="text-[10px] sm:text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-6 rounded-2xl border border-dashed text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
               <ShieldAlert className="mx-auto text-[var(--accent)] mb-3 opacity-30" size={32} />
               <h3 className="text-xs font-bold text-[var(--text-primary)] mb-1 uppercase tracking-widest">Global Security Policy</h3>
               <p className="text-[10px] text-[var(--text-faint)] font-medium leading-relaxed">
                 All role assignments are logged in the audit trail. Unauthorized elevation is strictly monitored.
               </p>
            </section>
          </div>
        </div>
      </main>

      {/* Assignment Modal */}
      {isAssigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] border shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
          >
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Assign Access</h2>
              <button 
                onClick={() => setIsAssigning(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-muted)] transition-colors"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-faint)' }}>Select User</label>
                <select 
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border bg-[var(--bg-muted)] transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none appearance-none"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <option value="">Choose a user...</option>
                  {users
                    .filter(u => !u.roles.some(r => ['ADMIN', 'ROLE_ADMINISTRATOR'].includes(r)) && u.username !== 'admin')
                    .map(u => <option key={u.id} value={u.id}>{u.username} (ID: #{u.id})</option>)
                  }
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-faint)' }}>Select Role</label>
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border bg-[var(--bg-muted)] transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none appearance-none"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <option value="">Choose a role...</option>
                  {roles.filter(r => !['ADMIN', 'ROLE_ADMINISTRATOR'].includes(r.name)).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-faint)' }}>Access Scope</label>
                <div className="flex p-1.5 rounded-2xl border bg-[var(--bg-muted)]" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedForm("global")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedForm === 'global' ? 'bg-white dark:bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Shield size={14} />
                    Global
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedForm(forms[0]?.id.toString() || "global")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedForm !== 'global' ? 'bg-white dark:bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  >
                    <FormInput size={14} />
                    Form-Scoped
                  </button>
                </div>
              </div>

              {selectedForm !== 'global' && forms.length > 0 && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-faint)' }}>Select Target Form</label>
                  <select 
                    value={selectedForm}
                    onChange={(e) => setSelectedForm(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border bg-[var(--bg-muted)] transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none appearance-none"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {forms.map(f => <option key={f.id} value={f.id}>{f.title} (ID: #{f.id})</option>)}
                  </select>
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-4 rounded-2xl text-sm font-bold text-white gradient-accent shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all mt-4"
              >
                Confirm Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {isAddingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-3xl sm:rounded-[3rem] border shadow-2xl bg-[var(--card-bg)] border-[var(--card-border)] animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center px-6 sm:px-10 pt-8 sm:pt-10 pb-6 shrink-0">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight uppercase tracking-widest leading-none">{editingRole ? 'Update' : 'Create New'} <span className="gradient-text">System Role</span></h2>
                <button 
                  onClick={handleModalClose}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-muted)] transition-colors group shrink-0 ml-2"
                >
                  <Plus className="rotate-45 text-[var(--text-muted)] group-hover:text-[var(--accent)]" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 sm:px-10 pb-10 custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                <form onSubmit={handleCreateRole} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-faint)' }}>Role Name</label>
                <input 
                  type="text"
                  placeholder="e.g. ContentEditor"
                  value={newRole.name}
                  onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl border bg-[var(--bg-muted)] transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-faint)' }}>Description</label>
                <textarea 
                  rows={2}
                  placeholder="Define what this role can do..."
                  value={newRole.description}
                  onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl border bg-[var(--bg-muted)] transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest ml-1 block mb-1" style={{ color: 'var(--text-faint)' }}>Select Permissions</label>
                  <p className="text-xs text-[var(--text-muted)] mb-4 ml-1">Grant granular access rights to this new role.</p>
                </div>

                {(() => {
                  const categories = Array.from(new Set(permissions.map(p => p.category || "General")));
                  return categories.map(cat => (
                    <div key={cat} className="space-y-3">
                      <div className="flex items-center gap-2 ml-1">
                        <div className="w-1.5 h-4 rounded-full gradient-accent"></div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
                          {cat === "ADMIN" ? "System Administration" : "Form Control & Data"}
                        </h4>
                        <span className="text-[10px] text-[var(--text-faint)] italic">
                          {cat === "ADMIN" ? "Powerful system-wide settings" : "Standard form interaction rights"}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {permissions
                          .filter(p => (p.category || "General") === cat)
                          .map(p => (
                            <label 
                              key={p.id}
                              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                                newRole.permissionIds.includes(p.id) 
                                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)]' 
                                  : 'border-[var(--border)] bg-[var(--bg-muted)] hover:border-[var(--text-faint)]'
                              }`}
                            >
                              <input 
                                type="checkbox"
                                className="hidden"
                                checked={newRole.permissionIds.includes(p.id)}
                                onChange={(e) => {
                                  const ids = e.target.checked 
                                    ? [...newRole.permissionIds, p.id]
                                    : newRole.permissionIds.filter(id => id !== p.id);
                                  setNewRole({...newRole, permissionIds: ids});
                                }}
                              />
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                newRole.permissionIds.includes(p.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)] bg-white'
                              }`}>
                                {newRole.permissionIds.includes(p.id) && <Check size={14} className="text-white" />}
                              </div>
                              <span className="text-xs font-bold">{p.name}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-5 rounded-2xl text-sm font-black text-white gradient-accent shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all mt-4 uppercase tracking-widest"
                >
                  {editingRole ? 'Update Role' : 'Deploy Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}