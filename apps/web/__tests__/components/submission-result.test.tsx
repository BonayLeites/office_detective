import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SubmissionResult } from '@/components/submit/submission-result';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: string;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SubmissionResult', () => {
  const baseProps = {
    score: 84,
    maxScore: 100,
    correctCulprits: ['entity-1'],
    playerCulprits: ['entity-1'],
    feedback: 'Strong analysis.',
    breakdown: {
      culprit_score: 34,
      evidence_score: 16,
      explanation_score: 24,
      efficiency_score: 8,
      board_reasoning_score: 2,
    },
    onRetry: vi.fn(),
  };

  it('renders challenge summary with adjusted score when present', () => {
    render(
      <SubmissionResult
        {...baseProps}
        challengeSummary={{
          twistId: 'timeline_gap',
          modifier: 12,
          speedModifier: 4,
          speedTier: 'rapid',
          challengeScore: 92,
          adjustedScore: 96,
          completed: true,
          tier: 'good',
        }}
        progressSummary={{
          streakCurrent: 2,
          streakBest: 4,
          completedMetaMissions: [{ id: 'daily_closer', rewardXp: 24 }],
          claimedNowXp: 24,
          shieldUsed: true,
        }}
        runSummary={{
          xpBefore: 210,
          xpAfter: 280,
          gainedXp: 70,
          rankBefore: 'investigator',
          rankAfter: 'analyst',
        }}
      />,
    );

    expect(screen.getByText('results.challenge.title')).toBeInTheDocument();
    expect(screen.getByText('investigation.twist.items.timeline_gap.label')).toBeInTheDocument();
    expect(screen.getByText('results.challenge.tiers.good')).toBeInTheDocument();
    expect(screen.getByText('results.progress.title')).toBeInTheDocument();
    expect(screen.getByText('cases.metaMissions.items.daily_closer.label')).toBeInTheDocument();
    expect(screen.getByText('results.progress.metaClaimedNow')).toBeInTheDocument();
    expect(screen.getByText('results.progress.rankUpBadge')).toBeInTheDocument();
    expect(screen.getByText('96/100')).toBeInTheDocument();
  });

  it('omits challenge summary block when not provided', () => {
    render(<SubmissionResult {...baseProps} />);

    expect(screen.queryByText('results.challenge.title')).not.toBeInTheDocument();
  });
});
