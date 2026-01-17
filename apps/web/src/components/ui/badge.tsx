import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'bg-primary text-primary-foreground hover:bg-primary/80 border-transparent':
            variant === 'default',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent':
            variant === 'secondary',
          'text-foreground': variant === 'outline',
          'bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent':
            variant === 'destructive',
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
