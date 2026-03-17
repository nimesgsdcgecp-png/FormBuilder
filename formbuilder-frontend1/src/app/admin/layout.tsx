'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, assignments } = usePermissions();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/auth/me', {
          credentials: 'include'
        });
        if (!response.ok) {
          router.push('/login');
          return;
        }
        setIsAuthChecking(false);
      } catch (err) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  if (isAuthChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
          <p className="text-sm font-bold animate-pulse text-[var(--text-muted)] uppercase tracking-widest">
            Authorizing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
