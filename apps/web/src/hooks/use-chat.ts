'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import type { ChatMessage, ChatResponse, HintResponse, ProgressResponse } from '@/types';

import { api } from '@/lib/api';
import { useGameStore } from '@/stores/game-store';

interface UseChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: Error | null;
  canRetryLastMessage: boolean;
  hintsRemaining: number;
  suggestedActions: string[];
  sendMessage: (content: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  requestHint: (context?: string) => Promise<string | null>;
  dismissError: () => void;
  clearChat: () => void;
}

export function useChat(caseId: string): UseChatReturn {
  const locale = useLocale();
  const recordAriaQuestion = useGameStore(state => state.recordAriaQuestion);
  const recordHintUsage = useGameStore(state => state.useHint);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      try {
        const progress = await api.get<ProgressResponse>(`/api/cases/${caseId}/progress`);
        if (isMounted) {
          setHintsRemaining(progress.hints_remaining);
        }
      } catch {
        // Ignore progress errors and keep local default
      }
    }

    void loadProgress();
    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;
      const trimmedContent = content.trim();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedContent,
        citations: [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setLastFailedMessage(null);
      setSuggestedActions([]);
      recordAriaQuestion(caseId, trimmedContent);

      try {
        const body: Record<string, unknown> = {
          message: trimmedContent,
        };

        if (conversationId) {
          body['conversation_id'] = conversationId;
        }

        const response = await api.post<ChatResponse>(
          `/api/cases/${caseId}/chat?language=${encodeURIComponent(locale)}`,
          body,
        );

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.message,
          citations: response.citations,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(response.conversation_id);
        setSuggestedActions(response.suggested_actions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        setLastFailedMessage(trimmedContent);
        setSuggestedActions([]);
        // Remove the user message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [caseId, conversationId, isLoading, locale, recordAriaQuestion],
  );

  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!lastFailedMessage) return;
    await sendMessage(lastFailedMessage);
  }, [lastFailedMessage, sendMessage]);

  const requestHint = useCallback(
    async (context?: string): Promise<string | null> => {
      if (hintsRemaining <= 0) {
        setError(new Error('No hints remaining'));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const body: Record<string, unknown> = {};
        if (context) {
          body['context'] = context;
        }

        const response = await api.post<HintResponse>(`/api/cases/${caseId}/chat/hint`, body);

        setHintsRemaining(response.hints_remaining);
        recordHintUsage(caseId);

        // Add hint as a system-style message
        const hintMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `💡 **Hint:** ${response.hint}`,
          citations: [],
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, hintMessage]);

        return response.hint;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get hint'));
        const maybeApiError = err as { status?: number } | null;
        if (maybeApiError?.status === 400) {
          setHintsRemaining(0);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [caseId, hintsRemaining, recordHintUsage],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setLastFailedMessage(null);
    setSuggestedActions([]);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    error,
    canRetryLastMessage: Boolean(lastFailedMessage),
    hintsRemaining,
    suggestedActions,
    sendMessage,
    retryLastMessage,
    requestHint,
    dismissError,
    clearChat,
  };
}
