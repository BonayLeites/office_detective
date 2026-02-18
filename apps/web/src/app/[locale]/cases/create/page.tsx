'use client';

import { ArrowLeft, ArrowRight, Building2, Loader2, Sparkles, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { CustomCaseCreateRequest, CustomCaseCreateResponse, ScenarioType } from '@/types';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';

const SCENARIOS: ScenarioType[] = [
  'vendor_fraud',
  'data_leak',
  'inventory_manipulation',
  'internal_sabotage',
  'expense_fraud',
];

const STEP_COUNT = 4;

export default function CreateCasePage() {
  const t = useTranslations('caseCreator');
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [scenarioType, setScenarioType] = useState<ScenarioType>('vendor_fraud');
  const [difficulty, setDifficulty] = useState(2);
  const [culpritName, setCulpritName] = useState('');
  const [peopleText, setPeopleText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peopleNames = useMemo(() => {
    return peopleText
      .split(/[,\n]/)
      .map(name => name.trim())
      .filter(Boolean);
  }, [peopleText]);

  const canContinue = useMemo(() => {
    if (step === 0) return idea.trim().length >= 12;
    if (step === 1) return companyName.trim().length >= 2;
    if (step === 2) return culpritName.trim().length >= 2 && peopleNames.length >= 2;
    return true;
  }, [companyName, culpritName, idea, peopleNames.length, step]);

  const handleNext = () => {
    if (!canContinue) return;
    setStep(current => Math.min(current + 1, STEP_COUNT - 1));
  };

  const handleBack = () => {
    setStep(current => Math.max(current - 1, 0));
  };

  const handleCreate = async () => {
    setError(null);
    setIsCreating(true);
    try {
      const payload: CustomCaseCreateRequest = {
        idea: idea.trim(),
        scenario_type: scenarioType,
        difficulty,
        language: locale === 'es' ? 'es' : 'en',
        company_name: companyName.trim(),
        culprit_name: culpritName.trim(),
        people_names: peopleNames,
        generate_embeddings: true,
        sync_graph: true,
      };
      const response = await api.post<CustomCaseCreateResponse>('/api/cases/custom', payload);
      router.push(`/cases/${response.case.case_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.generic');
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 md:py-12">
      <div className="paper-panel border-border/80 rounded-2xl border p-6 md:p-8">
        <Link
          href="/cases"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToCases')}
        </Link>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">{t('eyebrow')}</p>
        <h1 className="font-display mt-2 text-3xl font-bold md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-border/80 rounded-2xl p-5 md:p-6">
          <div className="mb-5 flex gap-2">
            {Array.from({ length: STEP_COUNT }).map((_, index) => (
              <div
                key={index}
                className={[
                  'h-2 flex-1 rounded-full',
                  index <= step ? 'bg-primary' : 'bg-muted',
                ].join(' ')}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                <Sparkles className="text-primary h-3.5 w-3.5" />
                {t('steps.idea')}
              </div>
              <h2 className="font-display text-2xl font-semibold">{t('questions.ideaTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('questions.ideaDescription')}</p>
              <Textarea
                value={idea}
                onChange={event => {
                  setIdea(event.target.value);
                }}
                autoResize
                placeholder={t('fields.ideaPlaceholder')}
                className="min-h-[180px]"
              />
              <p className="text-muted-foreground text-xs">{t('helpers.ideaMin')}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                <Building2 className="text-primary h-3.5 w-3.5" />
                {t('steps.setup')}
              </div>
              <h2 className="font-display text-2xl font-semibold">{t('questions.setupTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('questions.setupDescription')}</p>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.company')}</label>
                <Input
                  value={companyName}
                  onChange={event => {
                    setCompanyName(event.target.value);
                  }}
                  placeholder={t('fields.companyPlaceholder')}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('fields.scenario')}</label>
                  <select
                    value={scenarioType}
                    onChange={event => {
                      setScenarioType(event.target.value as ScenarioType);
                    }}
                    className="bg-card/70 border-input h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    {SCENARIOS.map(type => (
                      <option key={type} value={type}>
                        {t(`scenarios.${type}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('fields.difficulty')}</label>
                  <div className="border-border/80 bg-card/60 rounded-lg border px-3 py-3">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={difficulty}
                      onChange={event => {
                        setDifficulty(Number(event.target.value));
                      }}
                      className="w-full"
                    />
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t('fields.difficultyValue', { value: difficulty })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                <UserRound className="text-primary h-3.5 w-3.5" />
                {t('steps.people')}
              </div>
              <h2 className="font-display text-2xl font-semibold">{t('questions.peopleTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('questions.peopleDescription')}</p>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.culprit')}</label>
                <Input
                  value={culpritName}
                  onChange={event => {
                    setCulpritName(event.target.value);
                  }}
                  placeholder={t('fields.culpritPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('fields.people')}</label>
                <Textarea
                  value={peopleText}
                  onChange={event => {
                    setPeopleText(event.target.value);
                  }}
                  placeholder={t('fields.peoplePlaceholder')}
                  autoResize
                  className="min-h-[120px]"
                />
                <p className="text-muted-foreground text-xs">{t('helpers.peopleFormat')}</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                <Sparkles className="text-primary h-3.5 w-3.5" />
                {t('steps.review')}
              </div>
              <h2 className="font-display text-2xl font-semibold">{t('questions.reviewTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('questions.reviewDescription')}</p>

              <div className="border-border/80 bg-card/45 grid gap-3 rounded-xl border p-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">{t('summary.company')}</p>
                  <p className="font-medium">{companyName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t('summary.scenario')}</p>
                  <p className="font-medium">{t(`scenarios.${scenarioType}`)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t('summary.difficulty')}</p>
                  <p className="font-medium">{difficulty}/5</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t('summary.culprit')}</p>
                  <p className="font-medium">{culpritName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t('summary.peopleCount')}</p>
                  <p className="font-medium">{peopleNames.length}</p>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-destructive mt-4 text-sm">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleBack} disabled={step === 0 || isCreating}>
              <ArrowLeft className="h-4 w-4" />
              {t('actions.back')}
            </Button>
            {step < STEP_COUNT - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canContinue || isCreating}
                className="ml-auto"
              >
                {t('actions.next')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={isCreating} className="ml-auto">
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('actions.creating')}
                  </>
                ) : (
                  <>
                    {t('actions.create')}
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        <Card className="border-border/80 rounded-2xl p-5 md:p-6">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
            {t('hitl.title')}
          </p>
          <h3 className="font-display mt-2 text-xl font-semibold">{t('hitl.subtitle')}</h3>
          <div className="mt-4 space-y-3">
            <div className="border-border/80 bg-card/55 rounded-lg border p-3">
              <p className="text-xs font-semibold uppercase">{t('hitl.prompts.ideaLabel')}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t('hitl.prompts.ideaText')}</p>
            </div>
            <div className="border-border/80 bg-card/55 rounded-lg border p-3">
              <p className="text-xs font-semibold uppercase">{t('hitl.prompts.peopleLabel')}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t('hitl.prompts.peopleText')}</p>
            </div>
            <div className="border-border/80 bg-card/55 rounded-lg border p-3">
              <p className="text-xs font-semibold uppercase">{t('hitl.prompts.evidenceLabel')}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t('hitl.prompts.evidenceText')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
