import { createFileRoute } from '@tanstack/react-router';
import { TranslatorPage } from '@/features/translator/pages/TranslatorPage';

export const Route = createFileRoute('/novel/$novelId/translate')({
  component: TranslatorPage,
});
