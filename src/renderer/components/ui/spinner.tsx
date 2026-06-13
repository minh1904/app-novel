import { Icon } from '@iconify/react';

import { cn } from '@/lib/cn';

function Spinner({ className }: { className?: string }) {
  return (
    <Icon
      icon="solar:restart-linear"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
    />
  );
}

export { Spinner };
