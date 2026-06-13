import { Icon } from '@iconify/react';
import { useRouter } from '@tanstack/react-router';
import { cn } from '@/lib/cn';

interface TitleBarProps {
  onToggleSidebar?: () => void;
}

export function TitleBar({ onToggleSidebar }: TitleBarProps) {
  const router = useRouter();

  return (
    <header className="app-drag flex h-(--titlebar-h) shrink-0 select-none items-center border-border border-b bg-titlebar">
      <div className="flex items-center gap-0.5 pl-1.5">
        {onToggleSidebar && (
          <button
            type="button"
            className="app-no-drag flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            onClick={onToggleSidebar}
          >
            <Icon icon="solar:sidebar-minimalistic-linear" width={17} />
          </button>
        )}

        <button
          type="button"
          className="app-no-drag flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          onClick={() => router.history.back()}
        >
          <Icon icon="solar:alt-arrow-left-linear" width={17} />
        </button>
        <button
          type="button"
          className="app-no-drag flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          onClick={() => router.history.forward()}
        >
          <Icon icon="solar:alt-arrow-right-linear" width={17} />
        </button>
      </div>

      <div className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-stretch self-stretch">
        <WinButton onClick={() => window.electronAPI.window.minimize()}>
          <svg
            width={13}
            height={13}
            viewBox="0 0 13 13"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1={2} y1={6.5} x2={11} y2={6.5} />
          </svg>
        </WinButton>
        <WinButton onClick={() => window.electronAPI.window.maximize()}>
          <svg
            width={13}
            height={13}
            viewBox="0 0 13 13"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x={1.5} y={1.5} width={10} height={10} rx={2} />
          </svg>
        </WinButton>
        <WinButton
          onClick={() => window.electronAPI.window.close()}
          className="hover:bg-destructive hover:text-destructive-foreground"
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 13 13"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            aria-hidden="true"
          >
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
