'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import type { ChatMessage, ChatResponse, HintResponse, ProgressResponse } from '@/types';

import { api } from '@/lib/api';

interface UseChatReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: Error | null;
  hintsRemaining: number;
  sendMessage: (content: string) => Promise<void>;
  requestHint: (context?: string) => Promise<string | null>;
  clearChat: () => void;
}

export function useChat(caseId: string): UseChatReturn {
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hintsRemaining, setHintsRemaining] = useState(3);

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

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        citations: [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const body: Record<string, unknown> = {
          message: content.trim(),
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
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        // Remove the user message on error
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [caseId, conversationId, isLoading, locale],
  );

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
    [caseId, hintsRemaining],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    error,
    hintsRemaining,
    sendMessage,
    requestHint,
    clearChat,
  };
}
