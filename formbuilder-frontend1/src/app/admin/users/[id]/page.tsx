'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { Save, Loader2, User, Key, Shield, UserCircle, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { AUTH, ADMIN_USERS, ADMIN_ROLES, FORMS } from '@/utils/apiConstants';
import { extractArray } from '@/utils/apiData';

interface RoleSummary {
  id: number;
  name: string;
}

interface RolesResponse {
  content?: RoleSummary[];
}

interface UserSummaryItem {
  id: number;
  username: string;
  roles?: string[];
}

interface AssignmentRole {
  name: string;
}

interface Assignment {
  id: number;
  formId: number | null;
  role: AssignmentRole;
}

interface FormItem {
  id: number;
  title: string;
}

function normalizeUsers(payload: unknown): UserSummaryItem[] {
  return extractArray<UserSummaryItem>(payload, ['users', 'content', 'items', 'data']);
}

function normalizeRoles(payload: unknown): RoleSummary[] {
  return extractArray<RoleSummary>(payload, ['roles', 'content', 'items', 'data']);
}

function normalizeAssignments(payload: unknown): Assignment[] {
  return extractArray<Assignment>(payload, ['assignments', 'content', 'items', 'data']);
}

function normalizeForms(payload: unknown): FormItem[] {
  return extractArray<FormItem>(payload, ['forms', 'content', 'items', 'data']);
}

export default function EditUserPage() {
  const params = useParams();
  const userIdParam = params.id;
  const userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
  const router = useRouter();
  const { hasPermission, isLoading: permsLoading } = usePermissions();

  const [editUsername, setEditUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [forms, setForms] = useState<FormItem[]>([]);

  useEffect(() => {
    if (!permsLoading && !hasPermission('MANAGE')) {
      toast.error("Access Denied");
      router.push('/');
    }
  }, [hasPermission, permsLoading, router]);

  useEffect(() => {
    if (!userId) {
      toast.error("Invalid user id");
      router.push('/admin/users');
      return;
    }

    const fetchData = async () => {
      try {
        const [userRes, rolesRes, assignRes, formsRes] = await Promise.all([
          fetch(`${ADMIN_USERS.BASE}/summary`, { credentials: 'include' }),
          fetch(ADMIN_ROLES.LIST, { credentials: 'include' }),
          fetch(`${ADMIN_ROLES.BASE}/users/${userId}/assignments`, { credentials: 'include' }),
          fetch(FORMS.LIST, { credentials: 'include' })
        ]);

        if (userRes.ok) {
          const users = normalizeUsers(await userRes.json());
          const targetUser = users.find((u) => u.id.toString() === String(userId));
          if (targetUser) {
            setEditUsername(targetUser.username);
            const currentRole = targetUser.roles?.[0]?.split(' ')[0] || '';
            setSelectedRole(currentRole);
          } else {
            toast.error("User not found in summary");
          }
        } else {
          toast.error("Failed to load user summary");
        }

        if (rolesRes.ok) {
          const rolesData = (await rolesRes.json()) as RolesResponse | RoleSummary[];
          setRoles(normalizeRoles(rolesData));
        } else {
          toast.error("Failed to load roles list");
        }

        if (assignRes.ok) {
          const assignData = normalizeAssignments(await assignRes.json());
          setAssignments(assignData);
        } else {
          toast.error("Failed to load security assignments");
        }

        if (formsRes.ok) {
          const formsData = normalizeForms(await formsRes.json());
          setForms(formsData);
        }

        // Fetch current user info for header independently
        const meRes = await fetch(AUTH.ME, { credentials: 'include' });
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.username);
        }
      } catch (err) {
        console.error("Fetch data error:", err);
        toast.error("Network error while loading user data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, router]);

  const handleRemoveAssignment = async (assignId: number) => {
    try {
      const res = await fetch(`${ADMIN_ROLES.BASE}/assignments/${assignId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Assignment removed");
        // Update local state
        setAssignments(assignments.filter(a => a.id !== assignId));
      } else {
        toast.error("Failed to remove assignment");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Invalid user id");
      return;
    }
    setIsSaving(true);

    try {
      const selectedRoleObj = roles.find(r => r.name === selectedRole);

      const res = await fetch(ADMIN_USERS.UPDATE(userId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: editUsername,
          password: password || undefined,
          roleId: selectedRoleObj?.id
        })
      });

      if (res.ok) {
        toast.success("User updated successfully");
        router.push('/admin/users');
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update user");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg-base">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Header
        username={currentUser}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'User Management', href: '/admin/users' },
          { label: 'Edit Profile', href: `/admin/users/${userId}` }
        ]}
        title="Admin Configuration"
        badge={{ label: 'Security', color: '#3b82f6' }}
      />

      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div
            className="lg:col-span-2 rounded-3xl border p-8 space-y-8"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full gradient-accent flex items-center justify-center text-white shadow-xl">
                <UserCircle size={40} />
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-faint flex items-center gap-2">
                    <User size={14} className="text-accent" />
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full p-4 bg-bg-base border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-accent outline-none transition-all"
                    style={{ borderColor: 'var(--border)' }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-faint flex items-center gap-2">
                    <Key size={14} className="text-accent" />
                    Reset Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 bg-bg-base border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-accent outline-none transition-all"
                    style={{ borderColor: 'var(--border)' }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-faint flex items-center gap-2">
                  <Shield size={14} className="text-accent" />
                  Update Primary Role
                </label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-4 bg-bg-base border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-accent outline-none transition-all appearance-none"
                    style={{ borderColor: 'var(--border)' }}
                    required
                  >
                    <option value="" disabled>Select a role</option>
                    {roles.filter(r => !['ADMIN', 'ROLE_ADMINISTRATOR'].includes(r.name)).map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-text-faint italic">Note: Changing this will replace the user&apos;s primary global role but preserve specialized scoped assignments.</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 rounded-2xl gradient-accent text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-(--accent)/20 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Primary Profile
                </button>
              </div>
            </form>
          </div>
                  
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border bg-card-bg" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-6">
                <Shield className="text-accent" size={18} />
                <h2 className="text-xs font-black uppercase tracking-widest">Active Permissions</h2>
              </div>

              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <p className="text-center py-8 text-[10px] font-bold text-text-faint uppercase tracking-widest">No active assignments</p>
                ) : (
                  assignments.sort((a, b) => Number(a.formId !== null) - Number(b.formId !== null)).map((assign) => (
                    <div key={assign.id} className="p-4 rounded-2xl border bg-bg-muted group relative transition-all hover:border-accent" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${assign.formId === null ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {assign.formId === null ? 'Global' : 'Scoped'}
                        </span>
                        <button
                          onClick={() => handleRemoveAssignment(assign.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-all"
                          title="Revoke Assignment"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <h3 className="text-xs font-bold text-text-primary">{assign.role.name}</h3>
                      {assign.formId && (
                        <p className="text-[9px] font-medium text-text-muted mt-1 truncate">
                          Target: {forms.find(f => f.id === assign.formId)?.title}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            

            <div className="p-6 rounded-3xl border border-dashed bg-bg-muted/30 text-center" style={{ borderColor: 'var(--border)' }}>
              <ShieldAlert className="mx-auto text-amber-500 mb-2 opacity-50" size={24} />
              <p className="text-[9px] font-bold text-text-faint uppercase tracking-widest leading-relaxed">
                Security revocation is permanent. Removed assignments will immediately restrict user access.
              </p>
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
