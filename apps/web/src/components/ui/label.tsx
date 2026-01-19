'use client';

import { type LabelHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, error, ...props }, ref) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- association via htmlFor at usage
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      error && 'text-destructive',
      className,
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
