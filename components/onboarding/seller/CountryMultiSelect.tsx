"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_COUNTRIES } from "./StructuredAddressFields";

type CountryMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  placeholder?: string;
  maxVisibleChips?: number;
};

export function CountryMultiSelect({
  value,
  onChange,
  error,
  placeholder = "Search country...",
  maxVisibleChips = 4,
}: CountryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [...ALL_COUNTRIES];
    return ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Compute position when opening
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  // Close on scroll/resize
  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setSearch(""); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = (country: string) => {
    if (value.includes(country)) {
      onChange(value.filter((c) => c !== country));
    } else {
      onChange([...value, country]);
    }
  };

  const remove = (country: string) => {
    onChange(value.filter((c) => c !== country));
  };

  const visibleChips = value.slice(0, maxVisibleChips);
  const hiddenCount = Math.max(0, value.length - maxVisibleChips);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border bg-white px-3 py-2 transition-colors cursor-text",
          error ? "border-red-300" : open ? "border-blue-500 ring-2 ring-blue-600/20" : "border-slate-200 hover:border-slate-300"
        )}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {visibleChips.map((country) => (
          <span
            key={country}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800"
          >
            {country}
            <button
              type="button"
              className="rounded-sm p-0.5 text-blue-500 hover:text-blue-800"
              onClick={(e) => {
                e.stopPropagation();
                remove(country);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            +{hiddenCount} more
          </span>
        ) : null}
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 9999,
              }}
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-slate-500">No countries found</div>
              ) : (
                filtered.map((country) => {
                  const selected = value.includes(country);
                  return (
                    <button
                      key={country}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                        selected ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => toggle(country)}
                    >
                      <span className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                      )}>
                        {selected ? (
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : null}
                      </span>
                      {country}
                    </button>
                  );
                })
              )}
            </div>,
            document.body
          )
        : null}

      {error ? (
        <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
