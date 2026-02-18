'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
          {
            'bg-primary text-primary-foreground hover:bg-primary/95 shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.95)] hover:shadow-[0_16px_35px_-20px_hsl(var(--primary)/0.95)]':
              variant === 'default',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90':
              variant === 'destructive',
            'border-input bg-card/80 hover:border-primary/40 hover:bg-secondary/75 hover:text-foreground border backdrop-blur-sm':
              variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/95': variant === 'secondary',
            'text-muted-foreground hover:bg-accent/35 hover:text-foreground': variant === 'ghost',
            'text-primary hover:text-primary/80 underline-offset-4 hover:underline':
              variant === 'link',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-11 rounded-md px-8': size === 'lg',
            'h-10 w-10 rounded-full': size === 'icon',
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
