'use client';

import { format } from 'date-fns';
import { Bot, User } from 'lucide-react';

import { CitationBadge } from './citation-badge';

import type { ChatMessage as ChatMessageType, Citation } from '@/types';

import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const formattedTime = format(new Date(message.timestamp), 'HH:mm');

  return (
    <div
      className={cn('animate-reveal-scale flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ring-1',
          isUser
            ? 'bg-primary text-primary-foreground ring-primary/40'
            : 'bg-muted text-muted-foreground ring-border/70',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={cn('max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'surface-lift rounded-2xl px-4 py-2 shadow-[0_12px_24px_-20px_rgba(10,23,38,0.8)]',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-foreground border-border/80 border',
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>

        {/* Citations */}
        {message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.citations.map((citation, index) => (
              <CitationBadge
                key={`${citation.doc_id}-${String(index)}`}
                citation={citation}
                index={index}
                onClick={onCitationClick}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-muted-foreground text-xs">{formattedTime}</span>
      </div>
    </div>
  );
}
