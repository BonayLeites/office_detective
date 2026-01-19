'use client';

import { useEffect } from 'react';

import { LoginForm } from '@/components/auth/login-form';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/cases');
    }
  }, [isAuthenticated, router]);

  const handleSuccess = () => {
    router.replace('/cases');
  };

  // Don't render form if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <LoginForm onSuccess={handleSuccess} />
    </div>
  );
}
