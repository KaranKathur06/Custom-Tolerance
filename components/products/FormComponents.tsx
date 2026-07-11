"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  X,
  UploadCloud,
  Loader2,
  ZoomIn,
  Trash2,
  Star,
  GripVertical,
  AlertCircle,
  ImageIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// FormField
// ─────────────────────────────────────────────────────────────
export function FormField({
  label,
  required,
  error,
  children,
  description,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-semibold text-slate-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FormInput
// ─────────────────────────────────────────────────────────────
export function FormInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      {...props}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// FormTextarea
// ─────────────────────────────────────────────────────────────
export function FormTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y",
        className
      )}
      {...props}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// FormSelect
// ─────────────────────────────────────────────────────────────
export function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all",
          !value && "text-slate-400",
          className
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TagInput — free text tags (materials, grades, etc.)
// ─────────────────────────────────────────────────────────────
export function TagInput({
  value = [],
  onChange,
  placeholder = "Type and press Enter...",
  suggestions = [],
}: {
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [inputVal, setInputVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputVal("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filtered = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputVal.toLowerCase()) && !value.includes(s)
  );

  return (
    <div className="relative">
      <div
        className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-blue-900 ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={value.length === 0 ? placeholder : "Add more..."}
          className="flex-1 min-w-[120px] bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {showSuggestions && filtered.length > 0 && inputVal && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.slice(0, 8).map((s) => (
            <div
              key={s}
              onMouseDown={() => addTag(s)}
              className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {s}
            </div>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-slate-400">
        Press Enter or comma to add. Backspace to remove.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GroupedMultiSelect — searchable grouped checkbox multi-select
// ─────────────────────────────────────────────────────────────
export type GroupedOption = {
  group: string;
  items: { id: string; name: string }[];
};

export function GroupedMultiSelect({
  value = [],
  onChange,
  groups,
  placeholder = "Select options...",
}: {
  value: string[];
  onChange: (val: string[]) => void;
  groups: GroupedOption[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const allItems = groups.flatMap((g) => g.items);
  const selectedItems = allItems.filter((item) => value.includes(item.id));

  const filteredGroups = search
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter((i) =>
            i.name.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((g) => g.items.length > 0)
    : groups;

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm focus-within:ring-2 focus-within:ring-blue-600 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedItems.length === 0 ? (
          <span className="text-slate-400 text-sm">{placeholder}</span>
        ) : (
          selectedItems.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
            >
              {item.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(item.id);
                }}
                className="hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* Search */}
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {filteredGroups.map((group) => (
              <div key={group.group}>
                <div className="sticky top-0 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const selected = value.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                      onClick={() => toggle(item.id)}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          selected
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {selected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className={selected ? "font-medium text-blue-700" : "text-slate-700"}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="py-4 text-center text-sm text-slate-500">No results found</div>
            )}
          </div>

          {value.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-slate-500">{value.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MultiSelect — flat searchable multi-select (for certifications etc.)
// ─────────────────────────────────────────────────────────────
export function MultiSelect({
  value = [],
  onChange,
  options,
  placeholder = "Select options...",
}: {
  value: string[];
  onChange: (val: string[]) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const selectedOptions = options.filter((o) => value.includes(o.id));
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm focus-within:ring-2 focus-within:ring-blue-600 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
            >
              {opt.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(opt.id);
                }}
              >
                <X className="h-3 w-3 hover:text-blue-900" />
              </button>
            </span>
          ))
        )}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((opt) => {
              const selected = value.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-blue-50"
                  onClick={() => toggle(opt.id)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      selected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                    )}
                  >
                    {selected && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className={selected ? "font-medium text-blue-700" : "text-slate-700"}>
                    {opt.name}
                  </span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-4 text-center text-sm text-slate-500">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RadioGroup
// ─────────────────────────────────────────────────────────────
export function RadioGroup({
  value,
  onChange,
  options,
  name,
  columns = 1,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string; description?: string }[];
  name?: string;
  columns?: 1 | 2 | 3;
}) {
  const generatedId = React.useId();
  const groupName = name || `radio-group-${generatedId}`;

  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3"
      )}
    >
      {options.map((opt) => (
        <label
          key={opt.id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all",
            value === opt.id
              ? "border-blue-600 bg-blue-50 shadow-sm"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <div className="flex h-5 items-center pt-0.5">
            <input
              type="radio"
              name={groupName}
              value={opt.id}
              checked={value === opt.id}
              onChange={(e) => onChange(e.target.value)}
              className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600"
            />
          </div>
          <div className="flex flex-col">
            <span
              className={cn(
                "text-sm font-medium",
                value === opt.id ? "text-blue-900" : "text-slate-900"
              )}
            >
              {opt.name}
            </span>
            {opt.description && (
              <span className="text-xs text-slate-500 mt-0.5">{opt.description}</span>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ImageUploadItem — single image slot with state
// ─────────────────────────────────────────────────────────────
export type UploadedImage = {
  url: string;
  path: string;
  isPrimary: boolean;
  localId: string; // for stable React key
};

type UploadStatus = "idle" | "uploading" | "done" | "error";

export function ImageUploader({
  images,
  onChange,
  maxImages = 3,
  productId,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  productId?: string | null;
}) {
  const [uploading, setUploading] = useState<Record<string, number>>({}); // localId → progress 0-100
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<UploadedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (images.length >= maxImages) return;

      const localId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Validate client-side first
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          [localId]: `${file.name}: unsupported format (JPEG/PNG/WEBP only)`,
        }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          [localId]: `${file.name}: exceeds 5MB limit`,
        }));
        return;
      }

      // Check for duplicates by name+size
      const isDuplicate = images.some(
        (img) => img.url.includes(file.name.split(".")[0]) && img.path
      );
      if (isDuplicate) return;

      setUploading((prev) => ({ ...prev, [localId]: 0 }));

      const formData = new FormData();
      formData.append("file", file);
      if (productId) formData.append("productId", productId);

      try {
        // Simulate progress (XHR not available in fetch)
        const progressInterval = setInterval(() => {
          setUploading((prev) => ({
            ...prev,
            [localId]: Math.min((prev[localId] ?? 0) + 15, 85),
          }));
        }, 200);

        const res = await fetch("/api/products/images", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }

        const data = await res.json();

        setUploading((prev) => ({ ...prev, [localId]: 100 }));

        const newImage: UploadedImage = {
          url: data.url,
          path: data.path,
          isPrimary: images.length === 0, // first image is primary
          localId,
        };

        onChange([...images, newImage]);

        // Clear progress after a moment
        setTimeout(() => {
          setUploading((prev) => {
            const next = { ...prev };
            delete next[localId];
            return next;
          });
        }, 800);
      } catch (err: any) {
        setErrors((prev) => ({
          ...prev,
          [localId]: err.message || "Upload failed",
        }));
        setUploading((prev) => {
          const next = { ...prev };
          delete next[localId];
          return next;
        });
      }
    },
    [images, maxImages, productId, onChange]
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxImages - images.length;
    Array.from(files)
      .slice(0, remaining)
      .forEach((f) => uploadFile(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove("border-blue-400", "bg-blue-50");
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.add("border-blue-400", "bg-blue-50");
  };

  const handleDragLeave = () => {
    dropRef.current?.classList.remove("border-blue-400", "bg-blue-50");
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) uploadFile(file);
        }
      }
    },
    [uploadFile]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const removeImage = async (img: UploadedImage) => {
    const updated = images.filter((i) => i.localId !== img.localId);
    // If removed was primary, promote next
    if (img.isPrimary && updated.length > 0) {
      updated[0] = { ...updated[0], isPrimary: true };
    }
    onChange(updated);

    // Delete from storage
    if (img.path) {
      fetch("/api/products/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: img.path }),
      }).catch(console.error);
    }
  };

  const setPrimary = (localId: string) => {
    onChange(
      images.map((img) => ({
        ...img,
        isPrimary: img.localId === localId,
      }))
    );
  };

  const activeUploads = Object.keys(uploading);
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Existing Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.localId}
              className="group relative aspect-square overflow-hidden rounded-xl border-2 bg-slate-100 transition-all"
              style={{
                borderColor: img.isPrimary ? "#2563eb" : "#e2e8f0",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Product image ${idx + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                  <Star className="h-3 w-3 fill-white" />
                  Primary
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setLightbox(img)}
                  className="rounded-full bg-white/90 p-2 text-slate-800 hover:bg-white transition-colors"
                  title="Preview"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(img.localId)}
                    className="rounded-full bg-blue-600/90 p-2 text-white hover:bg-blue-700 transition-colors"
                    title="Set as primary"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="rounded-full bg-red-500/90 p-2 text-white hover:bg-red-600 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active upload progress */}
      {activeUploads.map((id) => (
        <div
          key={id}
          className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3"
        >
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-blue-200 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${uploading[id]}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-blue-700 font-medium">{uploading[id]}%</span>
        </div>
      ))}

      {/* Errors */}
      {hasErrors && (
        <div className="flex flex-col gap-1">
          {Object.entries(errors).map(([id, msg]) => (
            <div
              key={id}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{msg}</span>
              <button
                type="button"
                onClick={() => setErrors((prev) => { const next = {...prev}; delete next[id]; return next; })}
                className="ml-auto hover:text-red-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {images.length < maxImages && activeUploads.length === 0 && (
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 transition-all hover:border-blue-400 hover:bg-blue-50/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <UploadCloud className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800">
              Click to upload, drag & drop, or paste
            </p>
            <p className="mt-1 text-xs text-slate-500">
              PNG, JPG, WEBP · Max 5MB · Up to {maxImages} images
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {maxImages - images.length} slot{maxImages - images.length !== 1 ? "s" : ""} remaining
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {images.length === 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          At least 1 image is required. First image becomes the primary listing image.
        </p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt="Product preview"
              className="h-auto max-h-[85vh] w-auto max-w-[85vw] object-contain"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>
            {lightbox.isPrimary && (
              <div className="absolute left-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                Primary Image
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
