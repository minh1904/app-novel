import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

interface InlineEditInputProps {
  value: string;
  onConfirm: (newValue: string) => void;
  onCancel: () => void;
  className?: string;
}

export function InlineEditInput({ value, onConfirm, onCancel, className }: InlineEditInputProps) {
  const [current, setCurrent] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = current.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      committedRef.current = true;
      onCancel();
    }
  }

  return (
    <input
      ref={inputRef}
      value={current}
      onChange={(e) => setCurrent(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'min-w-0 flex-1 bg-transparent text-xs outline-none ring-1 ring-foreground/40 rounded-sm px-1',
        className,
      )}
    />
  );
}
