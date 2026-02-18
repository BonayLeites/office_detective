import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'bg-primary text-primary-foreground border-primary/20 hover:bg-primary/85':
            variant === 'default',
          'bg-secondary text-secondary-foreground border-secondary/10 hover:bg-secondary/90':
            variant === 'secondary',
          'border-border/90 text-foreground bg-card/65': variant === 'outline',
          'bg-destructive text-destructive-foreground border-destructive/20 hover:bg-destructive/90':
            variant === 'destructive',
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
