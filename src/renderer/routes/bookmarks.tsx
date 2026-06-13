import { createFileRoute } from '@tanstack/react-router';
import { BookmarksPage } from '@/features/bookmarks/pages/BookmarksPage';

export const Route = createFileRoute('/bookmarks')({
  component: BookmarksPage,
});
