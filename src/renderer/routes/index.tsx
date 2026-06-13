import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});

function LibraryPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Chọn một chương để bắt đầu đọc</p>
    </div>
  );
}
