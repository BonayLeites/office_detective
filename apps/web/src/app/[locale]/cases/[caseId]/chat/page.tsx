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
    <div className="bg-card/35 flex h-full">
      {/* Chat Panel */}
      <div
        className={cn(
          'animate-reveal-up flex-1 transition-all duration-300',
          selectedDocId ? 'hidden md:block md:w-1/2' : 'w-full',
        )}
      >
        <ChatContainer caseId={caseId} onCitationClick={handleCitationClick} />
      </div>

      {/* Document Viewer Panel */}
      {selectedDocId && (
        <div className="border-border/80 paper-panel animate-reveal-scale w-full border-l md:w-1/2">
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
