import type { ReactNode } from 'react';

// Root layout - passes through to [locale] layout
// html and body tags are in [locale]/layout.tsx

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return children;
}
