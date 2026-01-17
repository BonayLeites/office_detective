import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming locale is valid
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  // Dynamic import with type assertion for JSON messages
  const messagesModule = (await import(`../../messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };

  return {
    locale,
    messages: messagesModule.default,
  };
});
