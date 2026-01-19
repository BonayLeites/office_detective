'use client';

import { useEffect, useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, router]);

  // During SSR or before mount, render nothing
  if (!mounted) {
    return null;
  }

  // If not authenticated, render nothing (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
