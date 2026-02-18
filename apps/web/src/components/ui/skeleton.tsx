import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'from-muted via-muted/70 to-muted animate-pulse rounded-md bg-gradient-to-r bg-[length:240%_100%]',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
