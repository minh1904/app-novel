import { useEffect } from 'react';

interface TranslatorKeyboardOptions {
  onTranslateToggle: () => void;
  onDone: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onToggleContext: () => void;
  onFocusFilter: () => void;
}

export function useTranslatorKeyboard({
  onTranslateToggle,
  onDone,
  onPrevChapter,
  onNextChapter,
  onToggleContext,
  onFocusFilter,
}: TranslatorKeyboardOptions) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'd') {
        e.preventDefault();
        onTranslateToggle();
        return;
      }
      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        onDone();
        return;
      }
      if (ctrl && e.key === 'g') {
        e.preventDefault();
        onFocusFilter();
        return;
      }
      if (ctrl && e.key === '.') {
        e.preventDefault();
        onToggleContext();
        return;
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevChapter();
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        onNextChapter();
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTranslateToggle, onDone, onPrevChapter, onNextChapter, onToggleContext, onFocusFilter]);
}
