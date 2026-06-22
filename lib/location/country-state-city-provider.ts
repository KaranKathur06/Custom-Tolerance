/**
 * Country/State/City provider wrapping `country-state-city` package.
 * Provides cascading dropdown data for onboarding address fields.
 */
import { Country, State, City } from "country-state-city";

export type CountryOption = {
  name: string;
  isoCode: string;
  phoneCode: string;
};

export type StateOption = {
  name: string;
  isoCode: string;
};

export type CityOption = {
  name: string;
};

/** Return all countries sorted alphabetically with isoCode + phoneCode */
export function getCountries(): CountryOption[] {
  return Country.getAllCountries()
    .map((c) => ({ name: c.name, isoCode: c.isoCode, phoneCode: c.phonecode }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Return states for a given country ISO code, sorted alphabetically */
export function getStates(countryCode: string): StateOption[] {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode)
    .map((s) => ({ name: s.name, isoCode: s.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Return cities for a given country + state code, sorted alphabetically */
export function getCities(countryCode: string, stateCode: string): CityOption[] {
  if (!countryCode || !stateCode) return [];
  return City.getCitiesOfState(countryCode, stateCode)
    .map((c) => ({ name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Look up a country by name, returning its ISO code (or null) */
export function getCountryIsoCodeByName(name: string): string | null {
  if (!name) return null;
  const found = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return found?.isoCode ?? null;
}

/** Get phone calling code (with + prefix) for a country name */
export function getCountryCallingCode(countryName: string): string {
  if (!countryName) return "";
  const found = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  );
  return found ? `+${found.phonecode}` : "";
}

/** Return country names list (for backwards compat with ALL_COUNTRIES) */
export function getCountryNames(): string[] {
  return getCountries().map((c) => c.name);
}
