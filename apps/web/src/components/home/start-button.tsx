'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function StartButton() {
  const t = useTranslations('home');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <Link href={isAuthenticated ? '/cases' : '/login'}>
      <Button size="lg" className="group rounded-lg px-8">
        {t('startInvestigation')}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Button>
    </Link>
  );
}
