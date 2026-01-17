'use client';

import { Lightbulb } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HintButtonProps {
  hintsRemaining: number;
  onRequestHint: () => Promise<void>;
  disabled?: boolean;
}

export function HintButton({ hintsRemaining, onRequestHint, disabled = false }: HintButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isConfirming) {
      setIsLoading(true);
      try {
        await onRequestHint();
      } finally {
        setIsLoading(false);
        setIsConfirming(false);
      }
    } else {
      setIsConfirming(true);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => {
        setIsConfirming(false);
      }, 3000);
    }
  };

  const noHints = hintsRemaining <= 0;

  return (
    <Button
      variant={isConfirming ? 'destructive' : 'outline'}
      size="sm"
      onClick={handleClick}
      disabled={disabled || isLoading || noHints}
      className={cn('gap-2', isConfirming && 'animate-pulse')}
    >
      <Lightbulb className="h-4 w-4" />
      {isLoading ? (
        'Getting hint...'
      ) : isConfirming ? (
        'Click to confirm'
      ) : noHints ? (
        'No hints left'
      ) : (
        <>
          Hint <span className="text-muted-foreground">({hintsRemaining})</span>
        </>
      )}
    </Button>
  );
}
