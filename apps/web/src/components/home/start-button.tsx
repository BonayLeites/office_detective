'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function StartButton() {
  const t = useTranslations('home');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <Link href={isAuthenticated ? '/cases' : '/login'}>
      <Button size="lg">{t('startInvestigation')}</Button>
    </Link>
  );
}
