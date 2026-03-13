'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useUIStore } from '@/store/useUIStore';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();
  
  const isBuilder = pathname.includes('/builder');
  const isFormView = pathname.startsWith('/f/'); // Shared form view usually doesn't need sidebar
  const isLogin = pathname.includes('/login');
  const isRegister = pathname.includes('/register');

  const hideShell = isBuilder || isFormView || isLogin || isRegister;

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main 
        className={`flex-1 transition-all duration-300 min-w-0 
          ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}
        `}
      >
        {children}
      </main>
    </div>
  );
}
