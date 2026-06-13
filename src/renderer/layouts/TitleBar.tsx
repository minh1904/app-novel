import { cn } from '@/lib/cn';

interface TitleBarProps {
  onToggleSidebar?: () => void;
}

export function TitleBar({ onToggleSidebar }: TitleBarProps) {
  return (
    <header className="app-drag flex h-(--titlebar-h) shrink-0 select-none items-center border-border border-b bg-titlebar">
      <div className="flex w-(--actbar-w) shrink-0 items-center justify-center" />

      <div className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-stretch self-stretch">
        <WinButton onClick={() => window.electronAPI.window.minimize()}>
          <svg width={13} height={13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true">
            <line x1={2} y1={6.5} x2={11} y2={6.5} />
          </svg>
        </WinButton>
        <WinButton onClick={() => window.electronAPI.window.maximize()}>
          <svg width={13} height={13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x={1.5} y={1.5} width={10} height={10} rx={2} />
          </svg>
        </WinButton>
        <WinButton
          onClick={() => window.electronAPI.window.close()}
          className="hover:bg-destructive hover:text-destructive-foreground"
        >
          <svg width={13} height={13} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true">
            <line x1={2.5} y1={2.5} x2={10.5} y2={10.5} />
            <line x1={10.5} y1={2.5} x2={2.5} y2={10.5} />
          </svg>
        </WinButton>
      </div>
    </header>
  );
}

function WinButton({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'app-no-drag flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}
