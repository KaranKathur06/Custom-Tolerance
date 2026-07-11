"use client";

import React, { createContext, useContext, ReactNode } from "react";
import {
  COUNTRIES,
  CURRENCIES,
  PRICE_UNITS,
  UNITS,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  LEAD_TIMES,
  TOLERANCES,
  QUALITY_CERTIFICATES,
  BRAND_MARKING_OPTIONS,
  DIES_AND_TOOLS_COST,
  INCOTERMS,
  PAYMENT_TERMS,
  SHIPPING_TYPES,
  PRIMARY_PACKAGING,
  SECONDARY_PACKAGING,
  PACKAGING_OPTIONS,
  CAPABILITY_GROUPS,
  INDUSTRY_GROUPS,
  CapabilityGroup,
  IndustryGroup,
} from "@/lib/constants/product-options";

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  type?: string;
};

type MasterDataContextType = {
  capabilities: TaxonomyItem[];
  industries: TaxonomyItem[];
  countries: typeof COUNTRIES;
  currencies: typeof CURRENCIES;
  priceUnits: typeof PRICE_UNITS;
  units: typeof UNITS;
  weightUnits: typeof WEIGHT_UNITS;
  dimensionUnits: typeof DIMENSION_UNITS;
  leadTimes: typeof LEAD_TIMES;
  tolerances: typeof TOLERANCES;
  qualityCertificates: typeof QUALITY_CERTIFICATES;
  brandMarkingOptions: typeof BRAND_MARKING_OPTIONS;
  diesAndToolsCost: typeof DIES_AND_TOOLS_COST;
  incoterms: typeof INCOTERMS;
  paymentTerms: typeof PAYMENT_TERMS;
  shippingTypes: typeof SHIPPING_TYPES;
  primaryPackaging: typeof PRIMARY_PACKAGING;
  secondaryPackaging: typeof SECONDARY_PACKAGING;
  packagingOptions: typeof PACKAGING_OPTIONS;
  capabilityGroups: CapabilityGroup[];
  industryGroups: IndustryGroup[];
  loading: boolean;
};

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  // Since we are using static constants instead of fetching from the DB for 
  // Phase 1 capabilities/industries (to group them nicely per requirement),
  // we can skip the fetch and just use the static groups.
  // We'll provide empty arrays for the legacy `capabilities` and `industries` 
  // arrays if they are not used, or we could map them.

  const flatCapabilities = CAPABILITY_GROUPS.flatMap(g => g.items).map(i => ({ ...i, slug: i.id, type: "capability" }));
  const flatIndustries = INDUSTRY_GROUPS.flatMap(g => g.items).map(i => ({ ...i, slug: i.id, type: "industry" }));

  return (
    <MasterDataContext.Provider
      value={{
        capabilities: flatCapabilities,
        industries: flatIndustries,
        countries: COUNTRIES,
        currencies: CURRENCIES,
        priceUnits: PRICE_UNITS,
        units: UNITS,
        weightUnits: WEIGHT_UNITS,
        dimensionUnits: DIMENSION_UNITS,
        leadTimes: LEAD_TIMES,
        tolerances: TOLERANCES,
        qualityCertificates: QUALITY_CERTIFICATES,
        brandMarkingOptions: BRAND_MARKING_OPTIONS,
        diesAndToolsCost: DIES_AND_TOOLS_COST,
        incoterms: INCOTERMS,
        paymentTerms: PAYMENT_TERMS,
        shippingTypes: SHIPPING_TYPES,
        primaryPackaging: PRIMARY_PACKAGING,
        secondaryPackaging: SECONDARY_PACKAGING,
        packagingOptions: PACKAGING_OPTIONS,
        capabilityGroups: CAPABILITY_GROUPS,
        industryGroups: INDUSTRY_GROUPS,
        loading: false,
      }}
    >
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error("useMasterData must be used within a MasterDataProvider");
  }
  return context;
}
