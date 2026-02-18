'use client';

import { useLocale } from 'next-intl';

import { locales, localeNames, type Locale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as Locale });
  };

  return (
    <select
      value={locale}
      onChange={e => {
        handleChange(e.target.value);
      }}
      className="border-input bg-card/80 text-foreground h-9 rounded-lg border px-3 text-sm shadow-[inset_0_1px_0_hsl(var(--background)/0.8)] focus:outline-none focus:ring-2 focus:ring-offset-1"
      aria-label="Select language"
    >
      {locales.map(l => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
