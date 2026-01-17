'use client';

import { use, useState } from 'react';

import { DocumentList } from '@/components/documents/document-list';
import { DocumentViewer } from '@/components/documents/document-viewer';
import { useDocument } from '@/hooks/use-documents';

interface InboxPageProps {
  params: Promise<{ caseId: string }>;
}

export default function InboxPage({ params }: InboxPageProps) {
  const { caseId } = use(params);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const { document, isLoading } = useDocument(caseId, selectedDocId);

  return (
    <div className="flex h-full">
      {/* Document List - Left Panel */}
      <div className="border-border w-80 flex-shrink-0 border-r lg:w-96">
        <DocumentList
          caseId={caseId}
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
        />
      </div>

      {/* Document Viewer - Right Panel */}
      <div className="flex-1">
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
