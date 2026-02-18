import { FileSearch, MessageSquareText, Network } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { StartButton } from '@/components/home/start-button';
import { Card } from '@/components/ui/card';

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
  const features = [
    { key: 'analyzeDocuments', icon: FileSearch },
    { key: 'aiAssistant', icon: MessageSquareText },
    { key: 'buildCase', icon: Network },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <section className="paper-panel animate-reveal-up border-border/80 rounded-3xl border px-6 py-10 shadow-[0_30px_50px_-40px_rgba(10,23,38,0.95)] md:px-12">
        <div className="mx-auto max-w-5xl">
          <span className="bg-secondary/70 text-secondary-foreground inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
            Corporate Intelligence Lab
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-3xl text-base md:text-lg">
            {t('subtitle')}
          </p>
          <div className="animate-reveal-up-delay mt-8 flex flex-wrap items-center gap-4">
            <StartButton />
            <div className="border-border/80 bg-card/70 text-muted-foreground rounded-lg border px-4 py-2 text-xs uppercase tracking-[0.12em]">
              Human-Led Investigation + AI Support
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {features.map(feature => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.key}
              className="animate-reveal-up border-border/75 rounded-2xl p-6 [animation-delay:120ms]"
            >
              <div className="bg-primary/12 text-primary mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold">
                {t(`features.${feature.key}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t(`features.${feature.key}.description`)}
              </p>
            </Card>
          );
        })}
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-border/75 rounded-2xl p-4 text-center">
          <p className="font-display text-3xl font-bold">5+</p>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Document types
          </p>
        </Card>
        <Card className="border-border/75 rounded-2xl p-4 text-center">
          <p className="font-display text-3xl font-bold">AI</p>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Assisted reasoning
          </p>
        </Card>
        <Card className="border-border/75 rounded-2xl p-4 text-center">
          <p className="font-display text-3xl font-bold">Graph</p>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
            Relationship mapping
          </p>
        </Card>
      </section>
    </div>
  );
}
