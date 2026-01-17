'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import to avoid SSR issues with React Flow
const EvidenceBoard = dynamic(
  () => import('@/components/board/evidence-board').then(mod => ({ default: mod.EvidenceBoard })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="flex-1" />
      </div>
    ),
  },
);

interface BoardPageProps {
  params: Promise<{ caseId: string }>;
}

export default function BoardPage({ params }: BoardPageProps) {
  const { caseId } = use(params);

  return (
    <div className="h-full w-full">
      <EvidenceBoard caseId={caseId} />
    </div>
  );
}
