"use client";

import { useMemo, useCallback } from "react";
import {
  getCountryIsoCodeByName,
  getStates,
  getCities,
  getCountryNames,
} from "@/lib/location/country-state-city-provider";
import { SearchableDropdown } from "./SearchableDropdown";
import { Field } from "@/components/onboarding/OnboardingV3Wizard";

type CountryStateCitySelectorProps = {
  country: string;
  state: string;
  city: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  errors?: { country?: string; state?: string; city?: string };
  disabled?: boolean;
};

/**
 * Cascading Country → State/Province → City selector.
 *
 * Shared between Buyer onboarding and any future onboarding flows that need
 * a standalone location triplet (without full address lines).
 * Seller onboarding uses StructuredAddressFields which includes address lines.
 *
 * Selecting Country resets State and City.
 * Selecting State resets City.
 * Falls back to free-text TextInput when no state/city data is available for a country.
 */
export function CountryStateCitySelector({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  errors = {},
  disabled,
}: CountryStateCitySelectorProps) {
  const countries = useMemo(() => getCountryNames(), []);

  const countryIso = useMemo(() => getCountryIsoCodeByName(country), [country]);

  const stateOptions = useMemo(() => {
    if (!countryIso) return [];
    return getStates(countryIso).map((s) => s.name);
  }, [countryIso]);

  const stateIso = useMemo(() => {
    if (!countryIso || !state) return null;
    const states = getStates(countryIso);
    return states.find((s) => s.name === state)?.isoCode ?? null;
  }, [countryIso, state]);

  const cityOptions = useMemo(() => {
    if (!countryIso || !stateIso) return [];
    return getCities(countryIso, stateIso).map((c) => c.name);
  }, [countryIso, stateIso]);

  const handleCountrySelect = useCallback(
    (newCountry: string) => {
      onCountryChange(newCountry);
      onStateChange("");
      onCityChange("");
    },
    [onCountryChange, onStateChange, onCityChange],
  );

  const handleStateSelect = useCallback(
    (newState: string) => {
      onStateChange(newState);
      onCityChange("");
    },
    [onStateChange, onCityChange],
  );

  const hasStates = stateOptions.length > 0;
  const hasCities = cityOptions.length > 0;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {/* Country */}
      <Field label="Country" required error={errors.country}>
        <SearchableDropdown
          value={country}
          options={countries}
          onSelect={handleCountrySelect}
          placeholder="Search country..."
          disabled={disabled}
          error={Boolean(errors.country)}
          emptyMessage="No countries found"
        />
      </Field>

      {/* State / Province */}
      <Field label="State / Province" required error={errors.state}>
        {hasStates ? (
          <SearchableDropdown
            value={state}
            options={stateOptions}
            onSelect={handleStateSelect}
            placeholder={country ? "Search state..." : "Select country first"}
            disabled={disabled || !country}
            error={Boolean(errors.state)}
            emptyMessage="No states found"
          />
        ) : (
          <input
            type="text"
            value={state}
            onChange={(e) => handleStateSelect(e.target.value)}
            placeholder="State / Province"
            disabled={disabled || !country}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${
              errors.state
                ? "border-red-300"
                : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
            } ${disabled || !country ? "pointer-events-none opacity-60" : ""}`}
          />
        )}
      </Field>

      {/* City */}
      <Field label="City" required error={errors.city}>
        {hasCities ? (
          <SearchableDropdown
            value={city}
            options={cityOptions}
            onSelect={onCityChange}
            placeholder={state ? "Search city..." : "Select state first"}
            disabled={disabled || !state}
            error={Boolean(errors.city)}
            emptyMessage="No cities found"
          />
        ) : (
          <input
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="City"
            disabled={disabled || !country}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${
              errors.city
                ? "border-red-300"
                : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/20"
            } ${disabled || !country ? "pointer-events-none opacity-60" : ""}`}
          />
        )}
      </Field>
    </div>
  );
}
