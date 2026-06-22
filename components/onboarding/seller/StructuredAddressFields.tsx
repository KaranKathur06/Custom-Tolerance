"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Field, TextInput } from "@/components/onboarding/OnboardingV3Wizard";
import { cn } from "@/lib/utils";
import {
  getCountryIsoCodeByName,
  getStates,
  getCities,
  getCountryNames,
} from "@/lib/location/country-state-city-provider";

/** Backwards-compatible ALL_COUNTRIES array */
export const ALL_COUNTRIES = getCountryNames();

type StructuredAddressFieldsProps = {
  prefix: string; // e.g., "" for registered address, "factory" for factory address
  form: Record<string, unknown>;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: unknown) => void;
  locked?: boolean;
  country?: string;
  showCountry?: boolean;
};

function fieldKey(prefix: string, name: string): string {
  if (!prefix) return name;
  return `${prefix}${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** Searchable dropdown component used for State and City */
function SearchableDropdown({
  value,
  options,
  onSelect,
  placeholder,
  disabled,
  error,
  emptyMessage,
}: {
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

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
        onBlur={() => setTimeout(() => { setOpen(false); setSearch(""); }, 200)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400",
          error ? "border-red-300" : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20",
          disabled && "pointer-events-none opacity-60"
        )}
      />
      {open ? (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-slate-400">
              {emptyMessage || "No options"}
            </div>
          ) : (
            filtered.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  option === value ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-700 hover:bg-slate-50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(option);
                  setOpen(false);
                  setSearch("");
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

export function StructuredAddressFields({
  prefix,
  form,
  errors,
  onFieldChange,
  locked = false,
  country,
  showCountry = true,
}: StructuredAddressFieldsProps) {
  const addressLine1Key = fieldKey(prefix, "addressLine1");
  const addressLine2Key = fieldKey(prefix, "addressLine2");
  const cityKey = prefix ? fieldKey(prefix, "city") : "city";
  const stateKey = prefix ? fieldKey(prefix, "state") : "state";
  const postalCodeKey = prefix ? fieldKey(prefix, "postalCode") : "postalCode";

  const addressLine1 = String(form[addressLine1Key] ?? "");
  const addressLine2 = String(form[addressLine2Key] ?? "");
  const city = String(form[cityKey] ?? "");
  const state = String(form[stateKey] ?? "");
  const postalCode = String(form[postalCodeKey] ?? "");

  // Derive country ISO code for state/city lookups
  const countryIso = useMemo(() => getCountryIsoCodeByName(country || ""), [country]);

  // State options based on country
  const stateOptions = useMemo(() => {
    if (!countryIso) return [];
    return getStates(countryIso).map((s) => s.name);
  }, [countryIso]);

  // Get state ISO code for city lookup
  const stateIso = useMemo(() => {
    if (!countryIso || !state) return null;
    const states = getStates(countryIso);
    const found = states.find((s) => s.name === state);
    return found?.isoCode ?? null;
  }, [countryIso, state]);

  // City options based on country + state
  const cityOptions = useMemo(() => {
    if (!countryIso || !stateIso) return [];
    return getCities(countryIso, stateIso).map((c) => c.name);
  }, [countryIso, stateIso]);

  const handleStateSelect = useCallback(
    (newState: string) => {
      onFieldChange(stateKey, newState);
      // Clear city when state changes
      onFieldChange(cityKey, "");
    },
    [stateKey, cityKey, onFieldChange]
  );

  const handleCitySelect = useCallback(
    (newCity: string) => {
      onFieldChange(cityKey, newCity);
    },
    [cityKey, onFieldChange]
  );

  const disabled = locked ? "pointer-events-none opacity-60" : undefined;
  const hasStates = stateOptions.length > 0;
  const hasCities = cityOptions.length > 0;

  return (
    <div className={cn("space-y-3", disabled)}>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Address Line 1" required error={errors[addressLine1Key]}>
          <TextInput
            value={addressLine1}
            onChange={(e) => onFieldChange(addressLine1Key, e.target.value)}
            placeholder="Street address"
            error={Boolean(errors[addressLine1Key])}
            disabled={locked}
          />
        </Field>
        <Field label="Address Line 2" error={errors[addressLine2Key]}>
          <TextInput
            value={addressLine2}
            onChange={(e) => onFieldChange(addressLine2Key, e.target.value)}
            placeholder="Area / Building / Industrial Estate"
            disabled={locked}
          />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {hasStates ? (
          <Field label="State / Province" required error={errors[stateKey]}>
            <SearchableDropdown
              value={state}
              options={stateOptions}
              onSelect={handleStateSelect}
              placeholder="Search state..."
              disabled={locked}
              error={Boolean(errors[stateKey])}
              emptyMessage="No states found"
            />
          </Field>
        ) : (
          <Field label="State / Province" required error={errors[stateKey]}>
            <TextInput
              value={state}
              onChange={(e) => onFieldChange(stateKey, e.target.value)}
              placeholder="State / Province"
              error={Boolean(errors[stateKey])}
              disabled={locked}
            />
          </Field>
        )}
        {hasCities ? (
          <Field label="City" required error={errors[cityKey]}>
            <SearchableDropdown
              value={city}
              options={cityOptions}
              onSelect={handleCitySelect}
              placeholder={state ? "Search city..." : "Select state first"}
              disabled={locked || !state}
              error={Boolean(errors[cityKey])}
              emptyMessage="No cities found"
            />
          </Field>
        ) : (
          <Field label="City" required error={errors[cityKey]}>
            <TextInput
              value={city}
              onChange={(e) => onFieldChange(cityKey, e.target.value)}
              placeholder="City"
              error={Boolean(errors[cityKey])}
              disabled={locked}
            />
          </Field>
        )}
        <Field label="Postal Code" required error={errors[postalCodeKey]}>
          <TextInput
            value={postalCode}
            onChange={(e) => onFieldChange(postalCodeKey, e.target.value)}
            placeholder="Postal code"
            error={Boolean(errors[postalCodeKey])}
            disabled={locked}
          />
        </Field>
      </div>
      {showCountry && country ? (
        <Field label="Country">
          <TextInput value={country} disabled />
        </Field>
      ) : null}
    </div>
  );
}
