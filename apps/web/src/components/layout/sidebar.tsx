'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface SidebarProps {
  caseId: string;
}

type NavItemKey = 'overview' | 'inbox' | 'search' | 'chat' | 'board' | 'submit';

const navItems: { key: NavItemKey; href: string }[] = [
  { key: 'overview', href: '' },
  { key: 'inbox', href: '/inbox' },
  { key: 'search', href: '/search' },
  { key: 'chat', href: '/chat' },
  { key: 'board', href: '/board' },
  { key: 'submit', href: '/submit' },
];

export function Sidebar({ caseId }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const basePath = `/cases/${caseId}`;

  return (
    <aside className="bg-muted/40 w-64 border-r">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map(item => {
          const href = `${basePath}${item.href}`;
          // Check if active - pathname may include locale prefix
          const isActive = pathname.endsWith(href) || pathname.endsWith(`${href}/`);

          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
