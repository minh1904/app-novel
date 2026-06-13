import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  actions?: ReactNode;
}

export function TopBar({ title, actions }: TopBarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
      <h1 className="font-heading text-sm font-semibold text-foreground">{title}</h1>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
