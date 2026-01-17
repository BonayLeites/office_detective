'use client';

import { type HTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          {
            'overflow-y-auto overflow-x-hidden': orientation === 'vertical',
            'overflow-x-auto overflow-y-hidden': orientation === 'horizontal',
            'overflow-auto': orientation === 'both',
          },
          // Custom scrollbar styles
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
