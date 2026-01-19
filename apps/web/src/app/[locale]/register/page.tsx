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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <RegisterForm onSuccess={handleSuccess} />
    </div>
  );
}
