import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Case } from '@/types';
import type { CSSProperties } from 'react';

import { QuickDemoButton } from '@/components/cases/quick-demo-button';
import { StreakHistoryPanel } from '@/components/game/streak-history-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

async function getCases(): Promise<Case[]> {
  try {
    const response = await api.get<{ cases: Case[]; total: number }>('/api/cases');
    return response.cases;
  } catch {
    // Return empty array if API is not available
    return [];
  }
}

interface CasesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CasesPage({ params }: CasesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('cases');
  const cases = await getCases();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="paper-panel animate-reveal-up border-border/80 mb-8 rounded-2xl border p-6 md:p-8">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Case Directory</p>
        <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{t('subtitle')}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/cases/create">
            <Button>{t('createCase')}</Button>
          </Link>
          <QuickDemoButton />
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{t('guidedDemoDescription')}</p>
      </div>

      <div className="mb-8">
        <StreakHistoryPanel cases={cases} />
      </div>

      {cases.length === 0 ? (
        <Card className="rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">{t('noCases')}</p>
          <div className="mx-auto mt-4 max-w-xs">
            <QuickDemoButton compact />
          </div>
        </Card>
      ) : (
        <div className="stagger-list grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c, index) => (
            <Link
              key={c.case_id}
              href={`/cases/${c.case_id}`}
              style={{ '--stagger-index': index } as CSSProperties}
            >
              <Card className="surface-lift border-border/80 group h-full rounded-2xl p-6">
                <h3 className="font-display mb-2 text-xl font-semibold">{c.title}</h3>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[11px] uppercase tracking-[0.08em]">
                    {c.scenario_type}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] uppercase tracking-[0.08em]">
                    {t('difficulty')}: {c.difficulty}/5
                  </Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  <p>{t('documents', { count: c.document_count })}</p>
                  <p>{t('entities', { count: c.entity_count })}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
