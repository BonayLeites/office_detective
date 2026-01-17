'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface SidebarProps {
  caseId: string;
}

const navItems = [
  { label: 'Overview', href: '' },
  { label: 'Inbox', href: '/inbox' },
  { label: 'Search', href: '/search' },
  { label: 'Chat', href: '/chat' },
  { label: 'Board', href: '/board' },
  { label: 'Submit', href: '/submit' },
];

export function Sidebar({ caseId }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/cases/${caseId}`;

  return (
    <aside className="bg-muted/40 w-64 border-r">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map(item => {
          const href = `${basePath}${item.href}`;
          const isActive = pathname === href;

          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
