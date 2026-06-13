import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/search')({
  component: SearchPage,
});

function SearchPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground text-sm">Tìm kiếm sắp ra mắt</p>
    </div>
  );
}
