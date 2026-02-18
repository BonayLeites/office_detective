'use client';

import { Loader2, PlayCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import type { CustomCaseCreateRequest, CustomCaseCreateResponse } from '@/types';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';

interface QuickDemoButtonProps {
  compact?: boolean;
}

export function QuickDemoButton({ compact = false }: QuickDemoButtonProps) {
  const t = useTranslations('cases');
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartDemo = async () => {
    setError(null);
    setIsLoading(true);

    const isSpanish = locale === 'es';
    const payload: CustomCaseCreateRequest = {
      idea: isSpanish
        ? 'Un proveedor nuevo recibió pagos antes de completar controles internos y alguien en operaciones ocultó señales clave.'
        : 'A new supplier received payments before internal checks were complete, and someone in operations hid key warning signs.',
      scenario_type: 'vendor_fraud',
      difficulty: 2,
      language: isSpanish ? 'es' : 'en',
      company_name: isSpanish ? 'Oficina Central Atlas' : 'Atlas Office Group',
      culprit_name: isSpanish ? 'Marta Ruiz' : 'Maya Reed',
      people_names: isSpanish
        ? ['Diego Soto', 'Lucia Mendez', 'Carlos Vera']
        : ['Ethan Cole', 'Sofia Turner', 'Liam Brooks'],
      generate_embeddings: true,
      sync_graph: true,
    };

    try {
      const response = await api.post<CustomCaseCreateResponse>('/api/cases/custom', payload);
      router.push(`/cases/${response.case.case_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guidedDemoError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={compact ? 'w-full' : ''}>
      <Button
        variant={compact ? 'outline' : 'secondary'}
        onClick={handleStartDemo}
        disabled={isLoading}
        className={compact ? 'w-full' : ''}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('launchingDemo')}
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4" />
            {t('guidedDemo')}
          </>
        )}
      </Button>
      {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
    </div>
  );
}
