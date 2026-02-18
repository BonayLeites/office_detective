'use client';

import {
  CheckSquare,
  Files,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Search,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { ComponentType } from 'react';

import { InvestigationHud } from '@/components/game/investigation-hud';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
  caseId: string;
}

type NavItemKey = 'overview' | 'inbox' | 'search' | 'chat' | 'board' | 'submit';

const navItems: { key: NavItemKey; href: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: 'overview', href: '', icon: LayoutDashboard },
  { key: 'inbox', href: '/inbox', icon: Files },
  { key: 'search', href: '/search', icon: Search },
  { key: 'chat', href: '/chat', icon: MessageSquareText },
  { key: 'board', href: '/board', icon: Network },
  { key: 'submit', href: '/submit', icon: CheckSquare },
];

function getCaseLabel(caseId: string): string {
  return caseId.length > 10 ? `${caseId.slice(0, 8)}...` : caseId;
}

export function Sidebar({ caseId }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const basePath = `/cases/${caseId}`;

  return (
    <>
      <section className="paper-panel border-border/80 border-b md:hidden">
        <div className="ink-divider flex items-center justify-between px-3 py-3">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-[0.16em]">
              Workspace
            </p>
            <p className="font-display text-sm font-semibold">Case {getCaseLabel(caseId)}</p>
          </div>
          <Link
            href={`${basePath}/submit`}
            className="bg-primary/10 text-primary border-primary/30 rounded-full border px-3 py-1 text-xs font-semibold"
          >
            {t('submit')}
          </Link>
        </div>

        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const href = `${basePath}${item.href}`;
            const isActive = pathname.endsWith(href) || pathname.endsWith(`${href}/`);

            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  'surface-lift flex min-w-[5.2rem] flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary/30'
                    : 'bg-card/70 text-muted-foreground border-border/70',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <details className="px-3 pb-3">
          <summary className="text-muted-foreground cursor-pointer list-none text-xs font-medium">
            Investigation Pulse
          </summary>
          <div className="pt-2">
            <InvestigationHud caseId={caseId} compact />
          </div>
        </details>
      </section>

      <aside className="paper-panel border-border/80 hidden w-[17rem] border-r md:block">
        <div className="ink-divider px-4 py-4">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Workspace</p>
          <p className="font-display text-base font-semibold">Case {getCaseLabel(caseId)}</p>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const href = `${basePath}${item.href}`;
            const isActive = pathname.endsWith(href) || pathname.endsWith(`${href}/`);

            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary/30 shadow-[0_12px_25px_-18px_hsl(var(--primary)/0.95)]'
                    : 'text-muted-foreground hover:bg-card/75 hover:text-foreground hover:border-border/70',
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 pt-0">
          <InvestigationHud caseId={caseId} compact />
        </div>
      </aside>
    </>
  );
}
