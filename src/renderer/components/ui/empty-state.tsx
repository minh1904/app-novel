import type * as React from 'react';

import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      {icon && <div className="text-muted-foreground opacity-40">{icon}</div>}
      <p className="font-medium text-foreground text-sm">{title}</p>
      {description && <p className="max-w-xs text-muted-foreground text-xs">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
