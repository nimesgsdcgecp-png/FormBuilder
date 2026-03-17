'use client';

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
  FileText,
  FormInput,
  Plus,
  List,
  MessageSquare,
  Users2,
  UserPlus,
  Send,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icon mapping helper
const IconMap: Record<string, any> = {
  LayoutDashboard,
  LayoutGrid,
  FileEdit,
  Users,
  ShieldAlert,
  Shield,
  SearchCode,
  TrendingUp,
  Settings,
  History,
  Bell,
  FileText,
  FormInput,
  Plus,
  List,
  MessageSquare,
  Users2,
  UserPlus,
  Send,
  ShieldCheck
};

interface MenuNode {
  id: number;
  name: string;
  url: string;
  icon: string;
  children: MenuNode[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { assignments } = usePermissions();
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/menu', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMenuTree(data);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic menu", err);
      }
    };

    fetchMenu();
  }, [assignments]);

  // Handle auto-expansion of active parents
  useEffect(() => {
    const getActiveParentIds = (nodes: MenuNode[]): number[] => {
      let ids: number[] = [];
      nodes.forEach(node => {
        const hasActiveChild = node.children?.some(child => {
          const isDirectChildActive = child.url && pathname.startsWith(child.url);
          const hasDescendantActive = child.children?.some(grandChild => grandChild.url && pathname.startsWith(grandChild.url));
          return isDirectChildActive || hasDescendantActive;
        });

        if (hasActiveChild) {
          ids.push(node.id);
          if (node.children) {
            ids = [...ids, ...getActiveParentIds(node.children)];
          }
        }
      });
      return ids;
    };

    if (menuTree.length > 0) {
      const activeIds = getActiveParentIds(menuTree);
      if (activeIds.length > 0) {
        setExpandedIds(prev => Array.from(new Set([...prev, ...activeIds])));
      }
    }
  }, [pathname, menuTree]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/workflows/my-pending', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.length);
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
  
  // Static Menu Items
  const staticItems = [
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
      show: assignments.length > 0,
      badge: !isOnlyUser && pendingCount > 0 ? pendingCount : null,
      color: 'text-amber-500'
    },
    {
      label: 'Users',
      icon: Users,
      href: '/admin/users',
      show: isAdmin
    },
    {
      label: 'Roles',
      icon: Shield,
      href: '/admin/roles',
      show: isAdmin
    },
    {
      label: 'Module Management',
      icon: LayoutGrid,
      href: '/admin/modules',
      show: isAdmin
    },
    {
      label: 'Role-Menu Mapping',
      icon: ShieldCheck,
      href: '/admin/role-modules',
      show: isAdmin
    },
    {
      label: 'Audit Logs',
      icon: SearchCode,
      href: '/admin/audit',
      show: isAdmin
    }
  ];

  if (pathname.includes('/builder')) return null;

  const renderMenuItem = (item: any, depth = 0, isDynamic = false) => {
    const label = isDynamic ? item.name : item.label;
    const url = isDynamic ? item.url : item.href;
    const Icon = isDynamic ? (IconMap[item.icon] || FileText) : item.icon;
    const isActive = url && url !== '#' ? (url === '/' ? pathname === '/' : pathname.startsWith(url)) : false;
    const hasChildren = isDynamic && item.children && item.children.length > 0;
    const isExpanded = expandedIds.includes(item.id);
    const badge = item.badge;

    const toggleExpand = (e: React.MouseEvent) => {
      if (hasChildren) {
        e.preventDefault();
        e.stopPropagation();
        setExpandedIds(prev => 
          isExpanded ? prev.filter(id => id !== item.id) : [...prev, item.id]
        );
      }
    };

    return (
      <div key={(url || '') + label} className="space-y-1">
        <Link
          href={(!hasChildren && url) ? url : '#'}
          className={`flex items-center gap-3 p-3 rounded-xl transition-all group relative ${
            isActive 
              ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' 
              : 'hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]'
          }`}
          style={{ marginLeft: `${depth * 12}px` }}
          title={sidebarCollapsed ? label : ''}
          onClick={(e) => {
            if (hasChildren) {
              toggleExpand(e);
            } else if (!url || url === '#') {
              e.preventDefault();
            }
          }}
        >
          <div className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[var(--accent)]' : (item.color || '')}`}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          </div>
          
          {!sidebarCollapsed && (
            <div className="flex-1 flex items-center justify-between overflow-hidden">
              <span className={`text-sm font-bold tracking-tight transition-opacity duration-300 whitespace-nowrap`}>
                {label}
              </span>
              <div className="flex items-center gap-2">
                {badge && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black min-w-[1.25rem] text-center">
                    {badge}
                  </span>
                )}
                {hasChildren && (
                  <ChevronDown 
                    size={16} 
                    className={`text-[var(--text-faint)] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                )}
              </div>
            </div>
          )}

          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--accent)] rounded-r-full" />
          )}
        </Link>
        
        {!sidebarCollapsed && hasChildren && isExpanded && (
          <div className="space-y-1 mt-1 transition-all">
            {item.children.map((child: any) => renderMenuItem(child, depth + 1, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
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
        <div className="h-16 flex items-center px-4 border-b shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-full'}`}>
             <div className="w-8 h-8 rounded-lg gradient-accent shadow-sm flex items-center justify-center text-white shrink-0">
              <FileText size={18} className="stroke-[2.5]" />
            </div>
            <span className="text-lg font-black tracking-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
              FormBuilder
            </span>
          </div>
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors ml-auto hidden lg:flex">
            {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors ml-auto lg:hidden">
            <ChevronLeft size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 scrollbar-hide">
          {/* Render Static Items */}
          {staticItems.filter(i => i.show).map(item => renderMenuItem(item))}
          
          {/* Divider if we have dynamic items */}
          {menuTree.length > 0 && !sidebarCollapsed && (
             <div className="py-4 px-2">
                <div className="h-px bg-[var(--border)] w-full opacity-50" />
             </div>
          )}

          {/* Render Dynamic Items */}
          {menuTree.map(item => renderMenuItem(item, 0, true))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className={`text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-faint)] overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 h-0' : 'opacity-100 h-auto'}`}>
            System Level Access
          </div>
        </div>
      </aside>
    </>
  );
}
