'use client';

import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from './language-switcher';
import { UserMenu } from './user-menu';

import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function Header() {
  const t = useTranslations('nav');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Office Detective</span>
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          {isAuthenticated && (
            <Link
              href="/cases"
              className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              {t('cases')}
            </Link>
          )}
          <LanguageSwitcher />
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
