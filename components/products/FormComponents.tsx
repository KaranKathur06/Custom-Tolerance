"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, X, UploadCloud, Image as ImageIcon } from "lucide-react";

export function FormField({
  label,
  required,
  error,
  children,
  description,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description && <p className="text-xs text-slate-500">{description}</p>}
      {children}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function FormInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-shadow",
        className
      )}
      {...props}
    />
  );
}

export function FormSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow"
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleOption = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const removeOption = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.id));

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm focus-within:ring-2 focus-within:ring-blue-600 transition-shadow"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
            >
              {opt.name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-blue-900"
                onClick={(e) => removeOption(e, opt.id)}
              />
            </span>
          ))
        )}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => {
            const isSelected = value.includes(opt.id);
            return (
              <div
                key={opt.id}
                className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => toggleOption(opt.id)}
              >
                <span className={isSelected ? "font-medium text-blue-700" : "text-slate-700"}>
                  {opt.name}
                </span>
                {isSelected && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            );
          })}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No options available</div>
          )}
        </div>
      )}
    </div>
  );
}

export function RadioGroup({
  value,
  onChange,
  options,
  name,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string; description?: string }[];
  name?: string;
}) {
  const generatedId = React.useId();
  const groupName = name || `radio-group-${generatedId}`;

  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
            value === opt.id
              ? "border-blue-600 bg-blue-50/50"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <div className="flex h-5 items-center">
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
            <span className="text-sm font-semibold text-slate-900">{opt.name}</span>
            {opt.description && <span className="text-xs text-slate-500 mt-1">{opt.description}</span>}
          </div>
        </label>
      ))}
    </div>
  );
}

export function ImageUploader({
  images,
  onChange,
  maxImages = 3,
}: {
  images: string[]; // URLs for now
  onChange: (images: string[]) => void;
  maxImages?: number;
}) {
  const handleSimulateUpload = () => {
    if (images.length >= maxImages) return;
    // In a real implementation, this would open a file dialog, upload to Supabase storage,
    // and return the URL. For this phase, we mock an uploaded URL.
    const mockUrl = `https://picsum.photos/seed/${Math.random()}/400/300`;
    onChange([...images, mockUrl]);
  };

  const handleRemove = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((url, i) => (
            <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Product" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-700 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {images.length < maxImages && (
        <button
          type="button"
          onClick={handleSimulateUpload}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-8 transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
          <UploadCloud className="h-8 w-8 text-slate-400" />
          <div className="text-sm font-medium text-slate-700">Click to upload images</div>
          <div className="text-xs text-slate-500">Max {maxImages} images. PNG, JPG up to 5MB.</div>
        </button>
      )}
    </div>
  );
}
