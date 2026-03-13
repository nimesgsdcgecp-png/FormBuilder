'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowLeft, Save, Loader2, User, Key, Shield, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function EditUserPage() {
  const params = useParams();
  const userId = params.id;
  const router = useRouter();
  const { hasPermission, isLoading: permsLoading } = usePermissions();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!permsLoading && !hasPermission('MANAGE')) {
      toast.error("Access Denied");
      router.push('/');
    }
  }, [hasPermission, permsLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, rolesRes] = await Promise.all([
          fetch(`http://localhost:8080/api/admin/users/summary`, { credentials: 'include' }),
          fetch(`http://localhost:8080/api/admin/roles`, { credentials: 'include' })
        ]);

        if (userRes.ok && rolesRes.ok) {
          const users = await userRes.json();
          const user = users.find((u: any) => u.id.toString() === userId);
          if (user) {
            setUsername(user.username);
            // user.roles might contain something like "USER (Global)" or just "USER"
            const currentRole = user.roles[0]?.split(' ')[0] || '';
            setSelectedRole(currentRole);
          } else {
            toast.error("User not found");
            router.push('/admin/users');
          }

          const rolesData = await rolesRes.json();
          setRoles(rolesData.content || rolesData);
        }
      } catch (err) {
        toast.error("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchData();
  }, [userId, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const selectedRoleObj = roles.find(r => r.name === selectedRole);
      
      const res = await fetch(`http://localhost:8080/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
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
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
        <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <header className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ background: 'var(--bg-header)', borderColor: 'var(--border)' }}>
        <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/users"
              className="p-2 rounded-xl bg-[var(--bg-muted)] hover:bg-[var(--border)] transition-all text-[var(--text-muted)]"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Edit User</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div 
            className="rounded-3xl border p-8 space-y-8"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <div className="flex justify-center mb-4">
               <div className="w-20 h-20 rounded-full gradient-accent flex items-center justify-center text-white shadow-xl">
                  <UserCircle size={40} />
               </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] flex items-center gap-2">
                  <User size={14} className="text-[var(--accent)]" />
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-4 bg-[var(--bg-base)] border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                  style={{ borderColor: 'var(--border)' }}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] flex items-center gap-2">
                  <Key size={14} className="text-[var(--accent)]" />
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-[var(--bg-base)] border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)] flex items-center gap-2">
                  <Shield size={14} className="text-[var(--accent)]" />
                  Primary System Role
                </label>
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-4 bg-[var(--bg-base)] border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all appearance-none"
                    style={{ borderColor: 'var(--border)' }}
                    required
                  >
                    <option value="" disabled>Select a role</option>
                    {roles.filter(r => !['ADMIN', 'ROLE_ADMINISTRATOR'].includes(r.name)).map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 rounded-2xl gradient-accent text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
