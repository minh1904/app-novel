import { createFileRoute } from '@tanstack/react-router';
import { NovelDetailPage } from '@/features/novel-detail/pages/NovelDetailPage';

export const Route = createFileRoute('/novel/$novelId')({
  component: NovelDetailPage,
});
