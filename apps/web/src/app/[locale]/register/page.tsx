'use client';

import { useEffect } from 'react';

import { RegisterForm } from '@/components/auth/register-form';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterPage() {
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
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="bg-accent/15 pointer-events-none absolute inset-x-10 top-10 h-48 rounded-full blur-3xl" />
      <div className="animate-reveal-up w-full max-w-md">
        <RegisterForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
