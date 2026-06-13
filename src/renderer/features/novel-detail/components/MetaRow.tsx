import { Icon } from '@iconify/react';

interface MetaRowProps {
  icon: string;
  label: string;
  children: React.ReactNode;
}

export function MetaRow({ icon, label, children }: MetaRowProps) {
  return (
    <div className="flex gap-3 border-border/50 border-b py-2.5 last:border-0">
      <Icon icon={icon} width={14} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  );
}
