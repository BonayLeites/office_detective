import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Case } from '@/types';

import { Card } from '@/components/ui/card';
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

  if (!caseData) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">{t('notFound')}</h2>
          <p className="text-muted-foreground">{t('notFoundDesc')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{caseData.title}</h1>
        <div className="mt-2 flex gap-2">
          <span className="bg-secondary rounded px-2 py-1 text-sm">{caseData.scenario_type}</span>
          <span className="bg-secondary rounded px-2 py-1 text-sm">
            {tCases('difficulty')}: {caseData.difficulty}/5
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('documentsLabel')}</h3>
          <p className="text-3xl font-bold">{caseData.document_count}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('entitiesLabel')}</h3>
          <p className="text-3xl font-bold">{caseData.entity_count}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('hintsUsed')}</h3>
          <p className="text-3xl font-bold">0</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('progress')}</h3>
          <p className="text-3xl font-bold">0%</p>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">{t('gettingStarted')}</h2>
          <ol className="text-muted-foreground list-inside list-decimal space-y-2">
            <li>{t('instructions.browse')}</li>
            <li>{t('instructions.askAria')}</li>
            <li>{t('instructions.buildBoard')}</li>
            <li>{t('instructions.submit')}</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
