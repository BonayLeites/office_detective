'use client';

import { Building2, FolderKanban } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from './language-switcher';
import { UserMenu } from './user-menu';

import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function Header() {
  const t = useTranslations('nav');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <header className="border-border/70 bg-background/85 sticky top-0 z-50 w-full border-b backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-3">
        <Link href="/" className="group flex items-center gap-3">
          <span className="bg-primary/12 text-primary ring-primary/20 flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-transform duration-300 group-hover:-translate-y-0.5">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight">
              Office Detective
            </span>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.18em]">
              Intelligence Desk
            </p>
          </div>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          {isAuthenticated && (
            <Link
              href="/cases"
              className="text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/80 inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors"
            >
              <FolderKanban className="h-4 w-4" />
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
