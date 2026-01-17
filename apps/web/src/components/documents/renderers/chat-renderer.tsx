import { format } from 'date-fns';

import type { DocumentWithChunks } from '@/types';

import { cn } from '@/lib/utils';

interface ChatRendererProps {
  document: DocumentWithChunks;
}

interface ChatMessageData {
  sender: string;
  timestamp?: string;
  content: string;
}

export function ChatRenderer({ document }: ChatRendererProps) {
  // Try to parse chat messages from metadata or body
  const messages = parseMessages(document);

  if (messages.length === 0) {
    // Fallback to plain text display
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm">{document.body}</pre>
      </div>
    );
  }

  // Get unique participants for color assignment
  const participants = [...new Set(messages.map(m => m.sender))];

  return (
    <div className="space-y-3">
      {/* Chat header */}
      <div className="border-border border-b pb-2">
        <p className="text-muted-foreground text-sm">Participants: {participants.join(', ')}</p>
        <p className="text-muted-foreground text-xs">
          {format(new Date(document.ts), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        {messages.map((message, index) => {
          const participantIndex = participants.indexOf(message.sender);
          const isEven = participantIndex % 2 === 0;

          return (
            <div key={index} className={cn('flex', isEven ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2',
                  isEven ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
                )}
              >
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-xs font-semibold">{message.sender}</span>
                  {message.timestamp && (
                    <span className="text-xs opacity-70">{message.timestamp}</span>
                  )}
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseMessages(document: DocumentWithChunks): ChatMessageData[] {
  // Try to get messages from metadata
  const metadata = document.metadata_json as { messages?: ChatMessageData[] };
  if (metadata.messages && Array.isArray(metadata.messages)) {
    return metadata.messages;
  }

  const lines = document.body.split('\n');
  const messages: ChatMessageData[] = [];

  // Try box-drawing format first (│ Name ... HH:MM AM │)
  if (document.body.includes('│')) {
    let currentMessage: ChatMessageData | null = null;

    for (const line of lines) {
      // Skip separator lines
      if (/^[┌├└─┐┤┘]+$/.test(line.trim())) continue;

      // Check for content line starting with │
      const boxMatch = /^│\s*(.+?)\s*│$/.exec(line);
      if (!boxMatch?.[1]) continue;

      const content = boxMatch[1].trim();
      if (!content) continue;

      // Check if this is a header line (Name + timestamp at the end)
      const headerMatch = /^(.+?)\s+(\d{1,2}:\d{2}\s*(?:AM|PM))$/i.exec(content);
      if (headerMatch?.[1] && headerMatch[2]) {
        // Save previous message if exists
        if (currentMessage?.content) {
          messages.push(currentMessage);
        }
        // Start new message
        currentMessage = {
          sender: headerMatch[1].trim(),
          timestamp: headerMatch[2].trim(),
          content: '',
        };
      } else if (currentMessage) {
        // This is a content line, append to current message
        currentMessage.content += (currentMessage.content ? ' ' : '') + content;
      }
    }

    // Don't forget the last message
    if (currentMessage?.content) {
      messages.push(currentMessage);
    }

    if (messages.length > 0) {
      return messages;
    }
  }

  // Fallback: Try simple formats
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try format: [timestamp] Name: message
    const timestampMatch = /^\[([^\]]+)\]\s*([^:]+):\s*(.+)$/.exec(trimmed);
    if (timestampMatch?.[1] && timestampMatch[2] && timestampMatch[3]) {
      messages.push({
        timestamp: timestampMatch[1],
        sender: timestampMatch[2].trim(),
        content: timestampMatch[3].trim(),
      });
      continue;
    }

    // Try format: Name: message
    const simpleMatch = /^([^:]+):\s*(.+)$/.exec(trimmed);
    if (simpleMatch?.[1] && simpleMatch[2]) {
      messages.push({
        sender: simpleMatch[1].trim(),
        content: simpleMatch[2].trim(),
      });
    }
  }

  return messages;
}
