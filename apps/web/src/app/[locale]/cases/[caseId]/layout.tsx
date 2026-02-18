'use client';

import { usePathname } from 'next/navigation';
import { use } from 'react';

import { EvidenceSidebar } from '@/components/board/evidence-sidebar';
import { Sidebar } from '@/components/layout/sidebar';

export default function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const pathname = usePathname();
  const isBoardRoute = pathname.endsWith('/board');

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden md:h-[calc(100vh-4rem)] md:flex-row">
      <Sidebar caseId={caseId} />
      <main className="bg-card/35 relative min-h-0 flex-1 overflow-hidden pb-20 md:pb-0">
        <div className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent" />
        {children}
      </main>
      {isBoardRoute ? (
        <div className="hidden md:flex">
          <EvidenceSidebar caseId={caseId} />
        </div>
      ) : (
        <EvidenceSidebar caseId={caseId} />
      )}
    </div>
  );
}
