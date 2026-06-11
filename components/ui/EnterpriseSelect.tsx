'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EnterpriseSelectOption = {
  label: string;
  value: string;
  description?: string;
};

type EnterpriseSelectProps = {
  value: string;
  options: EnterpriseSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function EnterpriseSelect({
  value,
  options,
  onValueChange,
  placeholder = 'Select option',
  searchable = false,
  className,
  ariaLabel,
}: EnterpriseSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    `${option.label} ${option.description ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );

  React.useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className={cn('enterprise-select', className)}>
      <button
        type="button"
        className="enterprise-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? placeholder}
        onClick={() => setOpen((next) => !next)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="enterprise-select-menu">
          {searchable ? (
            <label className="enterprise-select-search">
              <Search className="h-4 w-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search options"
                autoFocus
              />
            </label>
          ) : null}
          <div className="enterprise-select-options" role="listbox">
            {filtered.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn('enterprise-select-option', isSelected && 'selected')}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span>
                    <strong>{option.label}</strong>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
            {filtered.length === 0 ? <div className="enterprise-select-empty">No options found</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
