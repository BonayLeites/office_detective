'use client';

import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

export function UserMenu() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use individual selectors to avoid SSR hydration issues
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logout = useAuthStore(state => state.logout);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.replace('/');
  };

  // Not authenticated - show login/register buttons
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="rounded-lg">
            {t('login')}
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm" className="rounded-lg">
            {t('register')}
          </Button>
        </Link>
      </div>
    );
  }

  // Authenticated - show user menu
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="bg-primary text-primary-foreground ring-primary/25 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shadow-[0_12px_25px_-20px_hsl(var(--primary)/0.95)] ring-1 transition-transform duration-200 hover:-translate-y-0.5"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {isOpen && (
        <div className="bg-card/95 border-border/80 absolute right-0 mt-2 w-60 rounded-xl border shadow-[0_20px_40px_-28px_rgba(10,23,38,0.95)] backdrop-blur">
          <div className="border-border/70 border-b p-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          </div>
          <div className="p-1">
            <Link
              href="/cases"
              onClick={() => {
                setIsOpen(false);
              }}
              className={cn(
                'hover:bg-accent/35 block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              )}
            >
              {t('myCases')}
            </Link>
            <button
              onClick={handleLogout}
              className="hover:bg-accent/35 text-destructive block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
