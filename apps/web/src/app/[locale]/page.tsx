import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomePageContent />;
}

function HomePageContent() {
  const t = useTranslations('home');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mb-8 text-lg">{t('subtitle')}</p>

        <div className="mb-12">
          <Link href="/cases">
            <Button size="lg">{t('startInvestigation')}</Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <h3 className="mb-2 font-semibold">{t('features.analyzeDocuments.title')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('features.analyzeDocuments.description')}
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-semibold">{t('features.aiAssistant.title')}</h3>
            <p className="text-muted-foreground text-sm">{t('features.aiAssistant.description')}</p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-semibold">{t('features.buildCase.title')}</h3>
            <p className="text-muted-foreground text-sm">{t('features.buildCase.description')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
