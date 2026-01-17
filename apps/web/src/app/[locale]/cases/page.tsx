import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { Case } from '@/types';

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {cases.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">{t('noCases')}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map(c => (
            <Link key={c.case_id} href={`/cases/${c.case_id}`}>
              <Card className="p-6 transition-shadow hover:shadow-lg">
                <h3 className="mb-2 font-semibold">{c.title}</h3>
                <div className="mb-4 flex gap-2">
                  <span className="bg-secondary rounded px-2 py-1 text-xs">{c.scenario_type}</span>
                  <span className="bg-secondary rounded px-2 py-1 text-xs">
                    {t('difficulty')}: {c.difficulty}/5
                  </span>
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
