import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ActivitySection = 'library' | 'search' | 'bookmarks';

interface ActivityBarProps {
  active: ActivitySection;
  onChange: (section: ActivitySection) => void;
}

export function ActivityBar({ active, onChange }: ActivityBarProps) {
  return (
    <nav className="flex w-(--actbar-w) shrink-0 flex-col items-center border-border border-r bg-actbar py-1">
      <div className="flex flex-1 flex-col items-center gap-0.5">
        <ActivityIcon
          icon={<Icon icon="solar:book-2-linear" width={17} />}
          active={active === 'library'}
          onClick={() => onChange('library')}
          label="Thư viện"
        />
        <ActivityIcon
          icon={<Icon icon="solar:magnifer-linear" width={17} />}
          active={active === 'search'}
          onClick={() => onChange('search')}
          label="Tìm kiếm"
        />
        <ActivityIcon
          icon={<Icon icon="solar:bookmark-linear" width={17} />}
          active={active === 'bookmarks'}
          onClick={() => onChange('bookmarks')}
          label="Đánh dấu"
        />
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <ActivityIcon
          icon={<Icon icon="solar:settings-linear" width={17} />}
          active={false}
          onClick={() => {
            console.log('settings');
          }}
          label="Cài đặt"
        />
      </div>
    </nav>
  );
}

function ActivityIcon({
  icon,
  active,
  onClick,
  label,
}: {
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors',
        active
          ? 'bg-sidebar-accent text-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
      )}
    >
      {icon}
    </button>
  );
}
