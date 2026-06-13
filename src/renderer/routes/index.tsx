import { Icon } from '@iconify/react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddNovelCard, NovelCard } from '@/features/library/NovelCard';
import { TopBar } from '@/layouts/TopBar';
import { useNovelStore } from '@/store/novel-store';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});

function LibraryPage() {
  const { novels, search, setSearch } = useNovelStore();

  const filtered = search.trim()
    ? novels.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.author.toLowerCase().includes(search.toLowerCase()),
      )
    : novels;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        title="Kho truyện"
        actions={
          <>
            <div className="relative">
              <Icon
                icon="solar:magnifer-linear"
                width={12}
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Tìm truyện..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-32 pl-7 text-xs"
              />
            </div>
            <Button size="sm">
              <Icon icon="solar:add-circle-linear" />
              Thêm
            </Button>
          </>
        }
      />

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 && search ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">Không tìm thấy truyện nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
            {filtered.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                onClick={() => {
                  /* navigate to translator */
                }}
              />
            ))}
            {/* eslint-disable-next-line @typescript-eslint/no-empty-function */}
            <AddNovelCard onClick={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}
