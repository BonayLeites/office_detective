'use client';

import { Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import { HintButton } from './hint-button';

import type { Citation } from '@/types';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/use-chat';

interface ChatContainerProps {
  caseId: string;
  onCitationClick: (citation: Citation) => void;
}

export function ChatContainer({ caseId, onCitationClick }: ChatContainerProps) {
  const { messages, isLoading, error, hintsRemaining, sendMessage, requestHint, clearChat } =
    useChat(caseId);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleRequestHint = async () => {
    await requestHint();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">ARIA Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <HintButton
            hintsRemaining={hintsRemaining}
            onRequestHint={handleRequestHint}
            disabled={isLoading}
          />
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} onCitationClick={onCitationClick} />
            ))}
            {isLoading && (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">ARIA is thinking...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm">{error.message}</div>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <MessageSquare className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
      <h3 className="mb-2 text-lg font-medium">Start a conversation</h3>
      <p className="text-muted-foreground max-w-md text-sm">
        Ask ARIA about the case. You can inquire about documents, entities, relationships, or
        request help finding evidence. ARIA will cite relevant documents in responses.
      </p>
      <div className="mt-6 space-y-2 text-left">
        <p className="text-muted-foreground text-xs font-medium uppercase">Example questions:</p>
        <ul className="text-muted-foreground space-y-1 text-sm">
          <li>&quot;Who approved the suspicious invoices?&quot;</li>
          <li>&quot;What connections exist between the vendor and employees?&quot;</li>
          <li>&quot;Find emails mentioning payment discrepancies&quot;</li>
        </ul>
      </div>
    </div>
  );
}
