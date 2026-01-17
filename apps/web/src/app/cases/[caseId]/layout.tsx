import { use } from 'react';

import { Sidebar } from '@/components/layout/sidebar';

export default function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <Sidebar caseId={caseId} />
      <main className="relative flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
