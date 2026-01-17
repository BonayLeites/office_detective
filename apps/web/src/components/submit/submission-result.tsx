'use client';

import { Award, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface SubmissionResultProps {
  score: number;
  maxScore: number;
  correctCulprits: string[];
  playerCulprits: string[];
  feedback: string;
  onRetry: () => void;
}

export function SubmissionResult({
  score,
  maxScore,
  correctCulprits,
  playerCulprits,
  feedback,
  onRetry,
}: SubmissionResultProps) {
  const t = useTranslations('results');
  const percentage = Math.round((score / maxScore) * 100);
  const isPerfect = score === maxScore;
  const isPassing = percentage >= 70;

  const correctMatches = playerCulprits.filter(id => correctCulprits.includes(id));
  const incorrectGuesses = playerCulprits.filter(id => !correctCulprits.includes(id));
  const missedCulprits = correctCulprits.filter(id => !playerCulprits.includes(id));

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Score Display */}
      <div className="text-center">
        <div
          className={cn(
            'mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full',
            isPerfect
              ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
              : isPassing
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
          )}
        >
          {isPerfect ? (
            <Award className="h-12 w-12" />
          ) : isPassing ? (
            <CheckCircle2 className="h-12 w-12" />
          ) : (
            <XCircle className="h-12 w-12" />
          )}
        </div>

        <h1 className="mb-2 text-3xl font-bold">
          {isPerfect ? t('perfect') : isPassing ? t('solved') : t('notQuite')}
        </h1>

        <p className="text-muted-foreground text-lg">
          {t('score', { score, maxScore, percentage })}
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="font-semibold">{t('breakdown')}</h2>

        {/* Correct identifications */}
        {correctMatches.length > 0 && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-green-600">{t('correctlyIdentified')}</p>
              <p className="text-muted-foreground text-sm">
                {t('correctlyIdentifiedDesc', { count: correctMatches.length })}
              </p>
            </div>
          </div>
        )}

        {/* Incorrect guesses */}
        {incorrectGuesses.length > 0 && (
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-600">{t('incorrectAccusations')}</p>
              <p className="text-muted-foreground text-sm">
                {t('incorrectAccusationsDesc', { count: incorrectGuesses.length })}
              </p>
            </div>
          </div>
        )}

        {/* Missed culprits */}
        {missedCulprits.length > 0 && (
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-600">{t('missedCulprits')}</p>
              <p className="text-muted-foreground text-sm">
                {t('missedCulpritsDesc', { count: missedCulprits.length })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="bg-muted rounded-lg p-4">
        <h2 className="mb-2 font-semibold">{t('feedback')}</h2>
        <p className="text-muted-foreground text-sm">{feedback}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onRetry} className="flex-1 gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('tryAgain')}
        </Button>
        <Link
          href="/cases"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 flex-1 items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
        >
          {t('browseOther')}
        </Link>
      </div>
    </div>
  );
}
