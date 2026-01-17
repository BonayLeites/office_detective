import { describe, expect, it } from 'vitest';

import { locales, defaultLocale, localeNames, type Locale } from '@/i18n/config';

describe('i18n config', () => {
  it('exports supported locales', () => {
    expect(locales).toContain('en');
    expect(locales).toContain('es');
    expect(locales).toHaveLength(2);
  });

  it('has English as the default locale', () => {
    expect(defaultLocale).toBe('en');
  });

  it('has human-readable names for all locales', () => {
    // Every locale should have a name
    for (const locale of locales) {
      expect(localeNames[locale]).toBeDefined();
      expect(typeof localeNames[locale]).toBe('string');
      expect(localeNames[locale].length).toBeGreaterThan(0);
    }
  });

  it('has correct locale names', () => {
    expect(localeNames.en).toBe('English');
    expect(localeNames.es).toBe('Español');
  });

  it('Locale type matches the locales array', () => {
    // This is a type-level test - if it compiles, it passes
    const validLocale: Locale = 'en';
    const anotherValidLocale: Locale = 'es';
    expect(locales).toContain(validLocale);
    expect(locales).toContain(anotherValidLocale);
  });
});
