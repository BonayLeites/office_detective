'use client';

import { AlertCircle, Loader2, MessageSquare, RefreshCcw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('chat');
  const tCommon = useTranslations('common');
  const {
    messages,
    isLoading,
    error,
    canRetryLastMessage,
    hintsRemaining,
    suggestedActions,
    sendMessage,
    retryLastMessage,
    requestHint,
    dismissError,
    clearChat,
  } = useChat(caseId);

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

  const handleQuickPrompt = (message: string) => {
    void sendMessage(message);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="ink-divider border-border/80 paper-panel flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary h-5 w-5" />
          <h2 className="font-display font-semibold">{t('title')}</h2>
        </div>
        <div className="flex items-center gap-2">
          <HintButton
            hintsRemaining={hintsRemaining}
            onRequestHint={handleRequestHint}
            disabled={isLoading}
          />
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              {tCommon('clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <EmptyState onQuickPrompt={handleQuickPrompt} disabled={isLoading} />
        ) : (
          <div className="space-y-4">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} onCitationClick={onCitationClick} />
            ))}
            {isLoading && (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t('thinking')}</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {suggestedActions.length > 0 && (
        <div className="ink-divider border-border/80 bg-muted/35 border-t px-4 py-3">
          <p className="text-muted-foreground mb-2 text-xs uppercase tracking-[0.12em]">
            {t('quickActionsTitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map(action => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="surface-lift h-auto whitespace-normal rounded-full px-3 py-1.5 text-left text-xs"
                onClick={() => {
                  handleQuickPrompt(action);
                }}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="border-destructive/30 bg-destructive/10 border-y px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-destructive mt-0.5 h-4 w-4" />
            <div className="flex-1">
              <p className="text-destructive text-sm font-semibold">{t('errorTitle')}</p>
              <p className="text-destructive/90 mt-0.5 text-sm">{error.message}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {canRetryLastMessage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8 gap-1.5"
                    onClick={() => {
                      void retryLastMessage();
                    }}
                    disabled={isLoading}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {t('retry')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={dismissError}
                  disabled={isLoading}
                >
                  <X className="h-3.5 w-3.5" />
                  {t('dismiss')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}

function EmptyState({
  onQuickPrompt,
  disabled,
}: {
  onQuickPrompt: (message: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations('chat');
  const examples = [t('examples.approvals'), t('examples.connections'), t('examples.payments')];

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <MessageSquare className="animate-float-slow text-primary/55 mb-4 h-12 w-12" />
      <h3 className="font-display mb-2 text-lg font-medium">{t('emptyTitle')}</h3>
      <p className="text-muted-foreground max-w-md text-sm">
        {t('emptyDescription')} {t('citationNote')}
      </p>
      <div className="mt-6 space-y-2 text-left">
        <p className="text-muted-foreground text-xs font-medium uppercase">
          {t('exampleQuestions')}
        </p>
        <div className="flex flex-col gap-2">
          {examples.map(example => (
            <button
              key={example}
              type="button"
              disabled={disabled}
              className="surface-lift hover:bg-muted/70 border-border/70 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                onQuickPrompt(example);
              }}
            >
              &quot;{example}&quot;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
