'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { MENU } from '@/utils/apiConstants';
import { extractArray } from '@/utils/apiData';

interface MenuNode {
  id: number;
  name: string;
  url: string;
  children: MenuNode[];
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { assignments, isLoading: permsLoading } = usePermissions();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. Skip check for public pages and core system pages
      const allowedPaths = [
        '/login', '/register', '/f/', // Public
        '/', '/profile', '/builder', '/forms', // Global User & Core Functional Pages
        '/admin/approvals', '/admin/users', '/admin/roles', '/admin/audit', '/admin/modules', '/admin/role-modules' // Core Admin System
      ];
      
      if (allowedPaths.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))) {
        setIsAuthorized(true);
        return;
      }

      // 2. Fetch the allowed menu tree for the user
      try {
        const res = await fetch(MENU.LIST, { credentials: 'include' });
        if (res.ok) {
          const raw = await res.json();
          const menuTree = extractArray<MenuNode>(raw, ['menu', 'menuTree', 'items', 'content']);
          
          // Flatten the tree to get all allowed URLs
          const allowedUrls = new Set<string>();
          const flatten = (nodes: MenuNode[]) => {
            nodes.forEach(node => {
              if (node.url) allowedUrls.add(node.url);
              if (node.children) flatten(node.children);
            });
          };
          flatten(menuTree);

          // 3. Check if current pathname is allowed
          // We check if any allowed URL is a prefix or exact match
          const hasAccess = Array.from(allowedUrls).some(url => 
            pathname === url || (url !== '/' && pathname.startsWith(url))
          );

          if (!hasAccess && assignments.length > 0) {
             // If user is logged in but doesn't have access to this module
             setIsAuthorized(false);
          } else {
             setIsAuthorized(true);
          }
        } else {
           // If menu fetch fails, we might be unauthenticated
           setIsAuthorized(true); // Let the backend handle 401
        }
      } catch {
        setIsAuthorized(true);
      }
    };

    if (!permsLoading) {
      checkAccess();
    }
  }, [pathname, assignments, permsLoading]);

  useEffect(() => {
    if (isAuthorized === false) {
      import('sonner').then(({ toast }) => {
        toast.error("You are not authorized to access this page.");
      });
      router.push('/'); // Redirect to dashboard if unauthorized
    }
  }, [isAuthorized, router]);

  if (isAuthorized === null || permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
