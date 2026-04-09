'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Users, Shield, Search, Loader2, Trash2, ChevronDown, RotateCcw, ArrowUpCircle, Clock, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { AUTH, ADMIN_USERS, ADMIN_ROLES, LEVEL_UP } from '@/utils/apiConstants';
import { extractArray } from '@/utils/apiData';

interface UserSummary {
  id: number;
  username: string;
  roles: string[];
}

interface LevelUpRequest {
  id: number;
  user: { id: number; username: string };
  status: string;
  requestedAt: string;
}

interface RoleAuthority {
  authority: string;
}

interface CurrentUser {
  username: string;
  roles?: RoleAuthority[];
}

interface RoleSummary {
  id: number;
  name: string;
}

interface RolesResponse {
  content?: RoleSummary[];
}

function normalizeUsers(payload: unknown): UserSummary[] {
  return extractArray<UserSummary>(payload, ['users', 'content', 'items', 'data']);
}

function normalizeRoles(payload: unknown): RoleSummary[] {
  return extractArray<RoleSummary>(payload, ['roles', 'content', 'items', 'data']);
}

function normalizeLevelUpRequests(payload: unknown): LevelUpRequest[] {
  return extractArray<LevelUpRequest>(payload, ['requests', 'content', 'items', 'data']);
}

export default function UserManagementPage() {
  const { hasPermission, isLoading: permsLoading } = usePermissions();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [defaultRole, setDefaultRole] = useState("USER");
  const [pendingRequests, setPendingRequests] = useState<LevelUpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!permsLoading && !hasPermission('MANAGE')) {
      toast.error("Access Denied");
      router.push('/');
    }
  }, [hasPermission, permsLoading, router]);

  const fetchData = async () => {
    try {
      const meRes = await fetch(AUTH.ME, { credentials: 'include' });
      let me: CurrentUser | null = null;
      if (meRes.ok) {
        me = await meRes.json();
        setCurrentUser(me);
      }

      const isAdmin = me?.roles?.some((r) => 
        r.authority === 'ROLE_ADMIN' || r.authority === 'ROLE_ADMINISTRATOR' || r.authority === 'ADMIN'
      );

      const fetchPromises: Promise<Response>[] = [
        fetch(`${ADMIN_USERS.BASE}/summary`, { credentials: 'include' }),
        fetch(ADMIN_ROLES.LIST, { credentials: 'include' }),
        fetch(`${ADMIN_USERS.BASE}/default-role`, { credentials: 'include' })
      ];

      if (isAdmin) {
        fetchPromises.push(fetch(LEVEL_UP.PENDING, { credentials: 'include' }));
      }

      const results = await Promise.all(fetchPromises);
      
      if (!results[0].ok) throw new Error("Failed to fetch user data");
      const usersData = await results[0].json();
      setUsers(normalizeUsers(usersData));

      if (results[1].ok) {
        const rolesData = (await results[1].json()) as RolesResponse | RoleSummary[];
        setRoles(normalizeRoles(rolesData));
      }

      if (results[2].ok) {
        const data = await results[2].json();
        setDefaultRole(data.roleName);
      }

      if (isAdmin && results[3] && results[3].ok) {
        const data = await results[3].json();
        setPendingRequests(normalizeLevelUpRequests(data));
      } else if (!isAdmin) {
        setPendingRequests([]);
      }
    } catch {
      toast.error("Failed to load users data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLevelUpAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(LEVEL_UP.DECIDE(String(id)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        toast.success(`User upgrade ${action.toLowerCase()}d`);
        fetchData();
      } else {
        toast.error("Failed to process request");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (username === 'admin') {
      toast.error("Cannot delete system admin");
      return;
    }

    toast("Are you sure you want to delete this user?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(ADMIN_USERS.DELETE(String(id)), {
              method: 'DELETE',
              credentials: 'include'
            });

            if (res.ok) {
              toast.success("User deleted successfully");
              fetchData();
            } else {
              const err = await res.json();
              toast.error(err.error || "Failed to delete user");
            }
          } catch {
            toast.error("An error occurred during deletion");
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {}
      }
    });
  };

  const handleUpdateDefaultRole = async (roleName: string) => {
    try {
      const res = await fetch(`${ADMIN_USERS.BASE}/default-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleName })
      });

      if (res.ok) {
        toast.success(`Default role updated to ${roleName}`);
        setDefaultRole(roleName);
      } else {
        toast.error("Failed to update default role");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.roles.some(role => role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-main)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
          <p className="text-sm font-medium text-[var(--text-muted)] tracking-widest uppercase">Initializing Security Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Header 
        username={currentUser?.username ?? null} 
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'User Management', href: '/admin/users' }
        ]}
        title="Identity Control"
        badge={{ label: 'Master View', color: '#3b82f6' }}
      />

      {/* ── Toolbar ── */}
      <div className="sticky top-16 z-20 py-3 px-4 sm:px-8 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" size={16} />
              <input
                type="text"
                placeholder="Find users or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-base)] border rounded-xl text-xs sm:text-sm font-bold transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <div className="hidden sm:block h-6 w-px bg-[var(--border)]" />
            <div className="flex items-center justify-between sm:justify-start gap-2">
               <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] whitespace-nowrap">Base Role:</span>
               <div className="relative flex-1 sm:flex-initial">
                <select 
                  value={defaultRole}
                  onChange={(e) => handleUpdateDefaultRole(e.target.value)}
                  className="w-full sm:w-auto pl-3 pr-8 py-1.5 rounded-lg border bg-[var(--bg-base)] text-[10px] sm:text-xs font-black appearance-none outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {roles.filter(r => !['ADMIN', 'ROLE_ADMINISTRATOR'].includes(r.name)).map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
               </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
             <button 
                onClick={fetchData}
                className="p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] hover:bg-[var(--bg-muted)] text-[var(--text-muted)] transition-all shadow-sm"
                title="Refresh Cache"
              >
                <RotateCcw size={16} />
              </button>
          </div>
        </div>

      {/* ── Content ── */}
      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* ── Level Up Section ── */}
          {currentUser?.roles?.some((r) => r.authority === 'ROLE_ADMIN' || r.authority === 'ROLE_ADMINISTRATOR' || r.authority === 'ADMIN') && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-2 mb-4 px-2">
                  <ArrowUpCircle className="text-amber-500" size={20} />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Level Up Promotion Queue</h2>
                  {pendingRequests.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">{pendingRequests.length}</span>
                  )}
               </div>
               
               {pendingRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="p-6 rounded-2xl border bg-gradient-to-br from-[var(--bg-muted)] to-transparent border-[var(--border)] shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shadow-md">
                                  {req.user.username.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{req.user.username}</h3>
                                  <p className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 font-bold italic">
                                     <Clock size={10} />
                                     {new Date(req.requestedAt).toLocaleDateString()}
                                  </p>
                               </div>
                            </div>
                         </div>
                         <p className="text-xs text-[var(--text-muted)] font-medium mb-6 leading-relaxed">
                            User is requesting <span className="text-[var(--text-primary)] font-black italic uppercase">Builder</span> access levels.
                         </p>
                         <div className="flex gap-2">
                            <button 
                              onClick={() => handleLevelUpAction(req.id, 'REJECT')}
                              className="flex-1 py-2 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                            >
                               Deny
                            </button>
                            <button 
                              onClick={() => handleLevelUpAction(req.id, 'APPROVE')}
                              className="flex-[2] py-2 rounded-xl gradient-accent text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-transform active:scale-95"
                            >
                               Approve Builder
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
               ) : (
                  <div className="p-10 rounded-[2.5rem] border border-dashed border-[var(--border)] flex flex-col items-center justify-center text-center bg-[var(--bg-muted)]/30">
                    <Shield size={32} className="text-[var(--text-faint)] mb-3" />
                    <p className="text-sm font-bold text-[var(--text-muted)]">No pending promoter requests at the moment.</p>
                    <p className="text-[10px] font-medium text-[var(--text-faint)] uppercase tracking-widest mt-1">Promotion queue is clear</p>
                  </div>
               )}
            </div>
          )}

          {/* ── User Table ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <Users className="text-[var(--accent)]" size={20} />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">System Registry</h2>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-24 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-muted)]">
                <Users className="mx-auto text-[var(--text-faint)] mb-4 opacity-20" size={64} />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">No users found</h3>
                <p className="text-sm text-[var(--text-muted)]">Try adjusting your search criteria or refresh the data.</p>
              </div>
            ) : (
              <>
                {/* Table View (Desktop) */}
                <div className="hidden lg:block rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)]">User Entity</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)]">Access Privileges</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right text-[var(--text-faint)]">Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="group hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white text-[10px] font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-[var(--text-primary)]">{user.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.roles.map((role, idx) => (
                              <span 
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  role.includes('ADMIN') 
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                    : 'bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border)]'
                                }`}
                              >
                                <Shield size={10} />
                                {role}
                              </span>
                            ))}
                            {user.roles.length === 0 && <span className="text-[10px] italic text-[var(--text-faint)]">None</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                              <Link 
                                href={`/admin/users/${user.id}`}
                                className="p-1.5 rounded-lg hover:bg-[var(--accent-subtle)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                                title="Edit Identity"
                              >
                                <Edit2 size={16} />
                              </Link>
                              <Link 
                                href="/admin/roles"
                                className="p-1.5 rounded-lg hover:bg-[var(--accent-subtle)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                                title="Edit Permissions"
                              >
                                <Shield size={16} />
                              </Link>
                            {user.username !== 'admin' && (
                              <button 
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-faint)] hover:text-red-500 transition-all"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-6 py-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                  <span className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-widest">
                    Operational Grid • Total Index: {filteredUsers.length}
                  </span>
                </div>
              </div>

              {/* Card View (Mobile) */}
              <div className="lg:hidden space-y-4 pb-12">
                {filteredUsers.map(user => (
                  <div key={user.id} className="p-5 rounded-2xl border bg-[var(--card-bg)] shadow-sm group" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[var(--text-primary)]">{user.username}</h3>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Link 
                          href="/admin/roles"
                          className="p-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                        >
                          <Shield size={16} />
                        </Link>
                        {user.username !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="p-2 rounded-xl bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-red-500 transition-all border border-transparent active:border-red-500/20"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.map((role, idx) => (
                          <span 
                            key={idx}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-tight flex items-center gap-1 ${
                              role.includes('ADMIN') 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border)]'
                            }`}
                          >
                            <Shield size={10} />
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
    </div>
  );
}
