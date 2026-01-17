import createMiddleware from 'next-intl/middleware';

import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Only show prefix for non-default locale
});

export const config = {
  // Match all pathnames except for API routes, static files, etc.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
