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
      className="bg-background border-input text-foreground h-9 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
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
