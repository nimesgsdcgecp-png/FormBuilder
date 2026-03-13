'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, User, Shield, Users, ShieldAlert, LogOut, LayoutGrid, Plus, Bell, SearchCode, Menu } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from './ThemeToggle';
import { usePermissions } from '@/hooks/usePermissions';
import { useUIStore } from '@/store/useUIStore';

interface HeaderProps {
  username: string | null;
}

export default function Header({ username }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { hasPermission, assignments, clearCache } = usePermissions();
  const { toggleMobileMenu } = useUIStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/workflows/my-pending', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.length);
        }
      } catch (err) {
        console.error("Failed to fetch pending approvals count", err);
      }
    };

    if (assignments.length > 0) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [assignments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/api/auth/logout', { method: 'POST', credentials: 'include' });
      clearCache();
      router.push('/login');
      toast.success('Logged out successfully');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const isAdmin = assignments.some(a => a.role.name === 'ADMIN' || a.role.name === 'ROLE_ADMINISTRATOR');
  const totalNotifications = pendingCount;

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: 'var(--bg-header)', borderColor: 'var(--border)' }}>
      <div className="w-full px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <Menu size={24} />
          </button>
          
          <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 md:hidden" title="Go to Dashboard">
            <div className="w-8 h-8 rounded-lg gradient-accent shadow-sm flex items-center justify-center text-white">
              <FileText size={18} className="stroke-[2.5]" />
            </div>
          </Link>
          <div className="hidden sm:block">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-faint)]">Management Console</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          {username && (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 relative"
                style={{ background: 'var(--accent)', outlineColor: 'var(--accent-subtle)' }}
              >
                {username.charAt(0).toUpperCase()}
                {totalNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[var(--bg-header)] animate-in zoom-in">
                    {totalNotifications}
                  </span>
                )}
              </button>

              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{username}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--text-faint)' }}>
                      {assignments.length > 0 ? assignments[0].role.name.replace('ROLE_', '') : 'Viewer'}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/profile"
                      className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors hover:bg-[var(--bg-muted)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <User size={16} />
                      Edit Profile
                    </Link>

                    
                    <div className="h-px my-1" style={{ background: 'var(--border)' }} />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
