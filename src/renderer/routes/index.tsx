import { createFileRoute } from '@tanstack/react-router';
import { LibraryPage } from '@/features/library/pages/LibraryPage';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});
