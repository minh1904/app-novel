import { Link, useRouterState } from '@tanstack/react-router';
import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function ActivityBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex w-(--actbar-w) shrink-0 flex-col items-center border-border border-r bg-actbar py-1">
      <div className="flex flex-1 flex-col items-center gap-0.5">
        <ActivityIcon
          to="/"
          icon={<Icon icon="solar:book-2-linear" width={17} />}
          active={pathname === '/'}
          label="Thư viện"
        />
        <ActivityIcon
          to="/search"
          icon={<Icon icon="solar:magnifer-linear" width={17} />}
          active={pathname === '/search'}
          label="Tìm kiếm"
        />
        <ActivityIcon
          to="/bookmarks"
          icon={<Icon icon="solar:bookmark-linear" width={17} />}
          active={pathname === '/bookmarks'}
          label="Đánh dấu"
        />
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <ActivityIcon
          to="/settings"
          icon={<Icon icon="solar:settings-linear" width={17} />}
          active={pathname === '/settings'}
          label="Cài đặt"
        />
      </div>
    </nav>
  );
}

function ActivityIcon({
  to,
  icon,
  active,
  label,
}: {
  to: string;
  icon: ReactNode;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded transition-colors',
        active
          ? 'bg-sidebar-accent text-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
      )}
    >
      {icon}
    </Link>
  );
}
