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
          <Button variant="ghost" size="sm">
            {t('login')}
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm">{t('register')}</Button>
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
        className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {isOpen && (
        <div className="bg-background absolute right-0 mt-2 w-56 rounded-md border shadow-lg">
          <div className="border-b p-3">
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
                'hover:bg-accent block w-full rounded-sm px-3 py-2 text-left text-sm transition-colors',
              )}
            >
              {t('myCases')}
            </Link>
            <button
              onClick={handleLogout}
              className="hover:bg-accent text-destructive block w-full rounded-sm px-3 py-2 text-left text-sm transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
