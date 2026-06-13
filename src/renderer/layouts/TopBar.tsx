import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function TopBar({ title, description, actions }: TopBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
      <div className="flex flex-col">
        <h1 className="font-heading text-sm font-semibold text-foreground leading-snug">{title}</h1>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
