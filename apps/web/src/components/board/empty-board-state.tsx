'use client';

import { FileText, MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface EmptyBoardStateProps {
  caseId: string;
  onSuggestionClick: (query: string) => void;
}

const SUGGESTIONS = ['Marcus', 'Sunshine', 'invoice', 'approval', 'vendor'];

export function EmptyBoardState({ caseId, onSuggestionClick }: EmptyBoardStateProps) {
  const t = useTranslations('board');
  const tCommon = useTranslations('common');

  return (
    <div className="bg-muted/30 flex h-full items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="border-border/80 bg-card/80 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border">
          <Search className="text-primary h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">{t('emptyTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('emptyDescription')}</p>

        <div className="mb-6">
          <p className="mb-2 text-sm font-medium">{t('trySearching')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map(s => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => {
                  onSuggestionClick(s);
                }}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Link href={`/cases/${caseId}/inbox`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('viewInbox')}
            </Button>
          </Link>
          <Link href={`/cases/${caseId}/chat`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('askAria')}
            </Button>
          </Link>
          <Link href={`/cases/${caseId}/search`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              {tCommon('search')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
