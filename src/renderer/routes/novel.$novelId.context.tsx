import { createFileRoute } from '@tanstack/react-router';
import { ContextPage } from '@/features/context/pages/ContextPage';

export const Route = createFileRoute('/novel/$novelId/context')({
  component: ContextPage,
});
