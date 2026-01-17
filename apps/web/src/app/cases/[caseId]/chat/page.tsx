'use client';

import { use, useState } from 'react';

import type { Citation } from '@/types';

import { ChatContainer } from '@/components/chat/chat-container';
import { DocumentViewer } from '@/components/documents/document-viewer';
import { useDocument } from '@/hooks/use-documents';
import { cn } from '@/lib/utils';

interface ChatPageProps {
  params: Promise<{ caseId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { caseId } = use(params);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const { document, isLoading } = useDocument(caseId, selectedDocId);

  const handleCitationClick = (citation: Citation) => {
    setSelectedDocId(citation.doc_id);
  };

  return (
    <div className="flex h-full">
      {/* Chat Panel */}
      <div className={cn('flex-1 transition-all duration-300', selectedDocId ? 'w-1/2' : 'w-full')}>
        <ChatContainer caseId={caseId} onCitationClick={handleCitationClick} />
      </div>

      {/* Document Viewer Panel */}
      {selectedDocId && (
        <div className="border-border w-1/2 border-l">
          <DocumentViewer
            document={document}
            caseId={caseId}
            isLoading={isLoading}
            onClose={() => {
              setSelectedDocId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
