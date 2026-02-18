'use client';

import { useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import { DocumentList } from '@/components/documents/document-list';
import { DocumentViewer } from '@/components/documents/document-viewer';
import { useDocument } from '@/hooks/use-documents';
import { cn } from '@/lib/utils';

interface InboxPageProps {
  params: Promise<{ caseId: string }>;
}

export default function InboxPage({ params }: InboxPageProps) {
  const { caseId } = use(params);
  const searchParams = useSearchParams();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const { document, isLoading } = useDocument(caseId, selectedDocId);

  useEffect(() => {
    const docId = searchParams.get('doc');
    if (!docId) return;
    setSelectedDocId(docId);
  }, [searchParams]);

  return (
    <div className="bg-card/35 flex h-full">
      {/* Document List - Left Panel */}
      <div
        className={cn(
          'animate-reveal-up border-border/80 paper-panel flex-shrink-0 border-r',
          selectedDocId ? 'hidden md:block md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96',
        )}
      >
        <DocumentList
          caseId={caseId}
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
        />
      </div>

      {/* Document Viewer - Right Panel */}
      <div
        className={cn(
          'animate-reveal-up-delay bg-card/40',
          selectedDocId ? 'flex-1' : 'hidden md:block md:flex-1',
        )}
      >
        <DocumentViewer
          document={document}
          caseId={caseId}
          isLoading={isLoading}
          onClose={() => {
            setSelectedDocId(null);
          }}
        />
      </div>
    </div>
  );
}
