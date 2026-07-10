"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  COUNTRIES,
  UNITS,
  TOLERANCES,
  LEAD_TIMES,
  PACKAGING_OPTIONS,
  QUALITY_CERTIFICATES,
  DIES_AND_TOOLS_COST,
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
  units: typeof UNITS;
  tolerances: typeof TOLERANCES;
  leadTimes: typeof LEAD_TIMES;
  packagingOptions: typeof PACKAGING_OPTIONS;
  qualityCertificates: typeof QUALITY_CERTIFICATES;
  diesAndToolsCost: typeof DIES_AND_TOOLS_COST;
  loading: boolean;
};

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// Simple in-memory cache to prevent refetching during navigation
let cachedCapabilities: TaxonomyItem[] | null = null;
let cachedIndustries: TaxonomyItem[] | null = null;

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<TaxonomyItem[]>(cachedCapabilities || []);
  const [industries, setIndustries] = useState<TaxonomyItem[]>(cachedIndustries || []);
  const [loading, setLoading] = useState(!cachedCapabilities || !cachedIndustries);

  useEffect(() => {
    if (cachedCapabilities && cachedIndustries) {
      return;
    }

    let isMounted = true;

    async function loadMasterData() {
      try {
        const [capabilitiesRes, industriesRes] = await Promise.all([
          fetch("/api/capabilities?type=capability").then(res => res.json()),
          fetch("/api/capabilities?type=industry").then(res => res.json())
        ]);

        if (isMounted) {
          setCapabilities(capabilitiesRes);
          setIndustries(industriesRes);
          cachedCapabilities = capabilitiesRes;
          cachedIndustries = industriesRes;
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load master data", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <MasterDataContext.Provider
      value={{
        capabilities,
        industries,
        countries: COUNTRIES,
        units: UNITS,
        tolerances: TOLERANCES,
        leadTimes: LEAD_TIMES,
        packagingOptions: PACKAGING_OPTIONS,
        qualityCertificates: QUALITY_CERTIFICATES,
        diesAndToolsCost: DIES_AND_TOOLS_COST,
        loading,
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
