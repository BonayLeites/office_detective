'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const t = useTranslations('chat');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = message.length;
  const maxChars = 2000;
  const isOverLimit = charCount > maxChars;

  return (
    <div className="border-border border-t p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Textarea
            value={message}
            onChange={e => {
              setMessage(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('inputPlaceholder')}
            disabled={disabled}
            autoResize
            className="min-h-[44px] resize-none pr-12"
            rows={1}
          />
          <span
            className={`absolute bottom-2 right-2 text-xs ${
              isOverLimit ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {charCount}/{maxChars}
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={disabled || !message.trim() || isOverLimit}
          size="icon"
          className="h-11 w-11 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">{t('sendHint')}</p>
    </div>
  );
}
