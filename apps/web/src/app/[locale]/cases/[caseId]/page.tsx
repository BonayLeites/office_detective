import { Files, MessageSquareText, Network, Send } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Case } from '@/types';
import type { ComponentType } from 'react';

import { CaseProgressCards } from '@/components/game/case-progress-cards';
import { InvestigationHud } from '@/components/game/investigation-hud';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

async function getCase(caseId: string): Promise<Case | null> {
  try {
    return await api.get<Case>(`/api/cases/${caseId}`);
  } catch {
    return null;
  }
}

interface CaseDetailPageProps {
  params: Promise<{ locale: string; caseId: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { locale, caseId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('caseDetail');
  const tCases = await getTranslations('cases');
  const caseData = await getCase(caseId);
  const tutorialSteps: {
    key: 'inbox' | 'chat' | 'board' | 'submit';
    href: string;
    icon: ComponentType<{ className?: string }>;
  }[] = [
    { key: 'inbox', href: `/cases/${caseId}/inbox`, icon: Files },
    { key: 'chat', href: `/cases/${caseId}/chat`, icon: MessageSquareText },
    { key: 'board', href: `/cases/${caseId}/board`, icon: Network },
    { key: 'submit', href: `/cases/${caseId}/submit`, icon: Send },
  ];

  if (!caseData) {
    return (
      <div className="p-8">
        <Card className="rounded-2xl p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">{t('notFound')}</h2>
          <p className="text-muted-foreground">{t('notFoundDesc')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="paper-panel border-border/80 rounded-2xl border p-6 md:p-8">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Case briefing</p>
        <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">{caseData.title}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="uppercase tracking-[0.1em]">
            {caseData.scenario_type}
          </Badge>
          <Badge variant="outline" className="uppercase tracking-[0.1em]">
            {tCases('difficulty')}: {caseData.difficulty}/5
          </Badge>
        </div>
      </div>

      <CaseProgressCards
        caseId={caseId}
        documentCount={caseData.document_count}
        entityCount={caseData.entity_count}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="rounded-2xl p-6">
          <h2 className="font-display mb-4 text-xl font-semibold">{t('gettingStarted')}</h2>
          <ol className="text-muted-foreground list-inside list-decimal space-y-2">
            <li>{t('instructions.browse')}</li>
            <li>{t('instructions.askAria')}</li>
            <li>{t('instructions.buildBoard')}</li>
            <li>{t('instructions.submit')}</li>
          </ol>
          <div className="mt-6">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
              {t('tutorial.title')}
            </p>
            <p className="mt-1 text-sm">{t('tutorial.subtitle')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {tutorialSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={step.key} className="border-border/80 rounded-xl p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-primary/12 text-primary inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
                        {index + 1}
                      </span>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-display text-base font-semibold">
                      {t(`tutorial.steps.${step.key}.title`)}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {t(`tutorial.steps.${step.key}.description`)}
                    </p>
                    <Link href={step.href} className="mt-3 inline-flex">
                      <Button size="sm" variant="outline">
                        {t(`tutorial.steps.${step.key}.cta`)}
                      </Button>
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        </Card>
        <InvestigationHud caseId={caseId} />
      </div>
    </div>
  );
}
