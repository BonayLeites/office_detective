import { format } from 'date-fns';

import type { DocumentWithChunks, Entity } from '@/types';

interface EmailRendererProps {
  document: DocumentWithChunks;
  author?: Entity | null;
}

export function EmailRenderer({ document, author }: EmailRendererProps) {
  const formattedDate = format(new Date(document.ts), "EEEE, MMMM d, yyyy 'at' h:mm a");

  // Try to extract email metadata from metadata_json
  const metadata = document.metadata_json as {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
  };

  const fromEmail =
    metadata.from ?? (author?.attrs_json['email'] as string | undefined) ?? 'Unknown';
  const toEmails = Array.isArray(metadata.to) ? metadata.to.join(', ') : (metadata.to ?? 'Unknown');
  const ccEmails = metadata.cc
    ? Array.isArray(metadata.cc)
      ? metadata.cc.join(', ')
      : metadata.cc
    : null;

  return (
    <div className="space-y-4">
      {/* Email Header */}
      <div className="border-border space-y-2 border-b pb-4">
        <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground font-medium">From:</span>
          <span>{fromEmail}</span>
        </div>
        <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground font-medium">To:</span>
          <span>{toEmails}</span>
        </div>
        {ccEmails && (
          <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Cc:</span>
            <span>{ccEmails}</span>
          </div>
        )}
        <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Date:</span>
          <span>{formattedDate}</span>
        </div>
        {document.subject && (
          <div className="grid grid-cols-[60px_1fr] gap-2 text-sm">
            <span className="text-muted-foreground font-medium">Subject:</span>
            <span className="font-semibold">{document.subject}</span>
          </div>
        )}
      </div>

      {/* Email Body */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{document.body}</pre>
      </div>
    </div>
  );
}
