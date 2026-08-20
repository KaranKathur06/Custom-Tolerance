"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared searchable dropdown used by CountrySelector, StateSelector, CitySelector,
 * and the structured address fields for both Buyer and Seller onboarding.
 */
export type SearchableDropdownProps = {
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
  emptyMessage?: string;
};

export function SearchableDropdown({
  value,
  options,
  onSelect,
  placeholder,
  disabled,
  error,
  emptyMessage,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, open]);

  const close = () => {
    setOpen(false);
    setSearch("");
    setHighlightedIndex(0);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={open ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((index) => filtered.length ? (index + 1) % filtered.length : 0);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((index) => filtered.length ? (index - 1 + filtered.length) % filtered.length : 0);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const normalizedSearch = search.trim().toLowerCase();
            const exactMatchIndex = filtered.findIndex(
              (option) => option.toLowerCase() === normalizedSearch,
            );
            const option = filtered[exactMatchIndex >= 0 ? exactMatchIndex : highlightedIndex];
            if (option) {
              onSelect(option);
              close();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        onBlur={() =>
          setTimeout(() => {
            close();
          }, 200)
        }
        placeholder={placeholder}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400",
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-300/20"
            : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20",
          disabled && "pointer-events-none opacity-60",
        )}
      />
      {open ? (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-slate-400">
              {emptyMessage ?? "No options"}
            </div>
          ) : (
            filtered.map((option, index) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  index === highlightedIndex
                    ? "bg-slate-100 text-slate-900"
                    : option === value
                    ? "bg-blue-50 font-semibold text-blue-800"
                    : "text-slate-700 hover:bg-slate-50",
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(option);
                  close();
                }}
              >
                {option}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
