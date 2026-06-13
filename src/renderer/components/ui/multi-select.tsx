import { Popover } from '@base-ui/react/popover';
import { Icon } from '@iconify/react';
import type * as React from 'react';
import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { Badge } from './badge';

export interface MultiSelectOption {
  label: string;
  value: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  maxCount?: number;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = 'Select options',
  maxCount = 3,
  searchable = true,
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const enabledOptions = options.filter((o) => !o.disabled);
  const allSelected = enabledOptions.length > 0 && value.length === enabledOptions.length;

  const toggle = (optValue: string) => {
    onValueChange(
      value.includes(optValue) ? value.filter((v) => v !== optValue) : [...value, optValue],
    );
  };

  const toggleAll = () => {
    onValueChange(allSelected ? [] : enabledOptions.map((o) => o.value));
  };

  const removeValue = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== optValue));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange([]);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        className={cn(
          'flex min-h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-2 py-1.5 text-sm transition-colors',
          'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {value.length === 0 ? (
            <span className="px-1 text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {(expanded ? value : value.slice(0, maxCount)).map((v) => {
                const opt = options.find((o) => o.value === v);
                if (!opt) return null;
                return (
                  <Badge key={v} variant="secondary" className="gap-1 pr-1 font-normal">
                    {opt.icon && <opt.icon className="size-3" />}
                    {opt.label}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeValue(v, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                          removeValue(v, e as unknown as React.MouseEvent);
                      }}
                      className="ml-0.5 rounded-sm hover:bg-foreground/10"
                    >
                      <Icon icon="solar:close-circle-linear" className="size-3" />
                    </span>
                  </Badge>
                );
              })}
              {!expanded && value.length > maxCount && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer font-normal hover:bg-secondary/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                  }}
                >
                  +{value.length - maxCount} more
                </Badge>
              )}
              {expanded && value.length > maxCount && (
                <Badge
                  variant="outline"
                  className="cursor-pointer font-normal hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(false);
                  }}
                >
                  Thu gọn
                </Badge>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 pl-1">
          {value.length > 0 && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={clearAll}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    clearAll(e as unknown as React.MouseEvent);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear all"
              >
                <Icon icon="solar:close-circle-linear" className="size-3.5" />
              </span>
              <div className="h-4 w-px bg-border" />
            </>
          )}
          <Icon
            icon="solar:alt-arrow-down-linear"
            className={cn(
              'size-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="isolate z-50">
          <Popover.Popup className="data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 flex w-(--anchor-width) min-w-[200px] flex-col rounded-md border border-border bg-popover shadow-md outline-none data-closed:animate-out data-open:animate-in">
            {searchable && (
              <div className="shrink-0 border-border border-b px-3 py-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}

            <div className="max-h-[220px] overflow-y-auto p-1">
              <button
                type="button"
                onClick={toggleAll}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <CheckboxBox checked={allSelected} />
                <span className="text-muted-foreground">(Select All)</span>
              </button>

              <div className="my-1 h-px bg-border" />

              {filtered.length === 0 && (
                <p className="py-4 text-center text-muted-foreground text-sm">No results found.</p>
              )}

              {filtered.map((opt) => {
                const selected = value.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                      'hover:bg-accent',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    <CheckboxBox checked={selected} />
                    {opt.icon && <opt.icon className="size-4 text-muted-foreground" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-border border-t">
              <div className="flex items-center text-sm">
                {value.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onValueChange([])}
                      className="flex-1 py-1.5 text-center text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      Clear
                    </button>
                    <div className="h-5 w-px bg-border" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-1.5 text-center text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CheckboxBox({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary transition-colors',
        checked ? 'bg-primary text-primary-foreground' : 'opacity-40',
      )}
    >
      {checked && <Icon icon="solar:check-circle-linear" className="size-3" />}
    </div>
  );
}
