'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  LayoutGrid,
  FileEdit, 
  Users, 
  ShieldAlert, 
  Shield,
  SearchCode,
  TrendingUp, 
  ChevronLeft, 
  Settings,
  History,
  Menu,
  Bell,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { usePermissions } from '@/hooks/usePermissions';

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { assignments } = usePermissions();
  const [pendingCount, setPendingCount] = useState(0);
  const [levelUpCount, setLevelUpCount] = useState(0);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Workflow approvals
        const res = await fetch('http://localhost:8080/api/workflows/my-pending', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.length);
        }

        // Level Up requests
        const isAdminUser = assignments.some(a => a.role.name === 'ADMIN' || a.role.name === 'ROLE_ADMINISTRATOR');
        if (isAdminUser) {
          const levelUpRes = await fetch('http://localhost:8080/api/admin/level-up/pending', { credentials: 'include' });
          if (levelUpRes.ok) {
            const data = await levelUpRes.json();
            setLevelUpCount(data.length);
          }
        }
      } catch (err) {
        console.error("Failed to fetch pending counts", err);
      }
    };

    if (assignments.length > 0) {
      fetchCounts();
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [assignments]);

  const isAdmin = assignments.some(a => a.role.name === 'ADMIN' || a.role.name === 'ROLE_ADMINISTRATOR');
  const isOnlyUser = assignments.length === 1 && assignments[0].role.name === 'USER';
  const canSeeApprovals = assignments.length > 0;

  const menuItems = [
    {
      label: 'Dashboard',
      icon: LayoutGrid,
      href: '/',
      show: true
    },
    {
      label: isOnlyUser ? 'My Form Status' : 'Approvals',
      icon: ShieldAlert,
      href: isOnlyUser ? '/forms/status' : '/admin/approvals',
      show: canSeeApprovals,
      color: 'text-amber-500',
      badge: !isOnlyUser && pendingCount > 0 ? pendingCount : null
    },
    {
      label: 'Approval History',
      icon: History,
      href: '/admin/approvals/history',
      show: !isOnlyUser && canSeeApprovals,
      color: 'text-blue-500'
    },
    {
      label: 'Users',
      icon: Users,
      href: '/admin/users',
      show: isAdmin,
      badge: levelUpCount > 0 ? levelUpCount : null
    },
    {
      label: 'Roles',
      icon: Shield,
      href: '/admin/roles',
      show: isAdmin
    },
    {
      label: 'Audit Logs',
      icon: SearchCode,
      href: '/admin/audit',
      show: isAdmin,
      color: 'text-blue-500'
    }
  ];

  // Don't show sidebar on builder page
  if (pathname.includes('/builder')) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden transition-opacity animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={`fixed left-0 top-0 h-screen z-50 transition-all duration-300 border-r flex flex-col 
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          width: sidebarCollapsed ? '72px' : '260px',
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)'
        }}
      >
      {/* Sidebar Header / Logo area */}
      <div className="h-16 flex items-center px-4 border-b shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-full'}`}>
           <div className="w-8 h-8 rounded-lg gradient-accent shadow-sm flex items-center justify-center text-white shrink-0">
            <FileText size={18} className="stroke-[2.5]" />
          </div>
          <span className="text-lg font-black tracking-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            FormBuilder
          </span>
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors ml-auto hidden lg:flex"
          style={{ color: 'var(--text-muted)' }}
        >
          {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setMobileMenuOpen(false)}
          className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors ml-auto lg:hidden"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 scrollbar-hide">
        {menuItems.filter(item => item.show).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all group relative ${
                isActive 
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' 
                  : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <div className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[var(--accent)]' : (item.color || '')}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge && sidebarCollapsed && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border border-[var(--sidebar-bg)] animate-pulse" />
                )}
              </div>
              
              {!sidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className={`text-sm font-bold tracking-tight transition-opacity duration-300 whitespace-nowrap`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black min-w-[1.25rem] text-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--accent)] rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className={`text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-faint)] overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
          System Management
        </div>
      </div>
    </aside>
    </>
  );
}
