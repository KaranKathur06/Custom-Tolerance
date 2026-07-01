"use client";

import { useMemo } from "react";
import { getCountryNames } from "@/lib/location/country-state-city-provider";
import { SearchableDropdown } from "./SearchableDropdown";

type CountrySelectorProps = {
  value: string;
  onChange: (country: string) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Shared searchable country selector used by both Buyer and Seller onboarding.
 * Consumes the country-state-city-provider to list every country in alphabetical order.
 */
export function CountrySelector({
  value,
  onChange,
  error,
  disabled,
  placeholder = "Search country...",
}: CountrySelectorProps) {
  const countries = useMemo(() => getCountryNames(), []);

  return (
    <SearchableDropdown
      value={value}
      options={countries}
      onSelect={onChange}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      emptyMessage="No countries found"
    />
  );
}
