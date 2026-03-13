'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Shield, ArrowUpCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { usePermissions } from '@/hooks/usePermissions';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isRequesting, setIsRequesting] = useState(false);
  const { clearCache } = usePermissions();
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({ username: data.username, password: '' });
      }
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('http://localhost:8080/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
        if (formData.username !== user.username) {
          toast.info("Username changed. Logging out...");
          setTimeout(() => {
             fetch('http://localhost:8080/api/auth/logout', { method: 'POST', credentials: 'include' });
             clearCache();
             router.push('/login');
          }, 2000);
        } else {
            fetchProfile();
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Update failed");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLevelUpRequest = async () => {
    setIsRequesting(true);
    try {
      const res = await fetch('http://localhost:8080/api/profile/level-up', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        toast.success("Upgrade request submitted! An admin will review it soon.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Request failed");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const isAlreadyBuilderOrAdmin = user?.roles?.some((r: any) => 
    r.authority === 'ROLE_BUILDER' || r.authority === 'ROLE_ADMIN' || 
    r.authority === 'BUILDER' || r.authority === 'ADMIN' ||
    r.authority === 'ROLE_ADMINISTRATOR'
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Header username={user?.username} />
      
      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <header className="text-center space-y-2">
            <div className="w-20 h-20 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-3xl font-black mx-auto shadow-lg mb-4">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Account Settings</h1>
            <p className="text-[var(--text-muted)] font-medium">Manage your identity and access level</p>
          </header>

          <div className="grid gap-6">
            {/* ── Credentials Section ── */}
            <section className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border bg-[var(--card-bg)] border-[var(--card-border)] shadow-xl overflow-hidden relative">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center text-[var(--accent)] border border-[var(--border)] shrink-0">
                  <User size={20} />
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Personal Identity</h2>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-faint)]">Display Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-5 py-4 rounded-2xl border bg-[var(--bg-muted)] transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none font-bold"
                      style={{ borderColor: 'var(--border)' }}
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-faint)]">Update Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      className="w-full px-5 py-4 rounded-2xl border bg-[var(--bg-muted)] transition-all focus:ring-2 focus:ring-[var(--accent)] outline-none font-bold"
                      style={{ borderColor: 'var(--border)' }}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" size={18} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full py-4 rounded-2xl text-sm font-black text-white gradient-accent shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                  Save Changes
                </button>
              </form>
            </section>

            {/* ── Level Up Section ── */}
            {!isAlreadyBuilderOrAdmin && (
              <section className="p-8 rounded-[2.5rem] border border-dashed bg-gradient-to-br from-[var(--bg-muted)] to-transparent border-[var(--border)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Shield size={120} className="text-[var(--accent)]" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                      <ArrowUpCircle size={20} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">Request Builder Access</h2>
                  </div>
                  
                  <p className="text-sm text-[var(--text-muted)] font-medium mb-8 max-w-md leading-relaxed">
                    Ready to start creating your own forms? Request an upgrade to the <span className="text-[var(--text-primary)] font-bold italic">Builder</span> tier. An admin will review your account soon.
                  </p>

                  <button
                    onClick={handleLevelUpRequest}
                    disabled={isRequesting}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isRequesting ? <Loader2 className="animate-spin" size={16} /> : <Shield size={16} />}
                    Request Promotion
                  </button>
                </div>
              </section>
            )}

            {isAlreadyBuilderOrAdmin && (
              <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={24} className="text-emerald-500" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">You have elevated creator permissions.</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Verified Builder</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ShieldCheck({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
