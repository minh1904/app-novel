import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Cài đặt sắp ra mắt</p>
    </div>
  );
}
