"use client";

import { useEffect, useState } from "react";
import type { IrfqSubscriptionPlan } from "@/lib/marketplace/irfq/types";
import type { IrfqPlanLimits } from "@/lib/marketplace/irfq/subscription-gates";

export type IrfqSubscriptionState = {
  plan: IrfqSubscriptionPlan;
  limits: IrfqPlanLimits;
  usage: {
    rfqsCreated: number;
    aiAssistantUses: number;
    bomParses: number;
    apiImports: number;
    drawingAiParses: number;
    matchReruns: number;
  };
  loading: boolean;
};

const DEFAULT_STATE: IrfqSubscriptionState = {
  plan: "free",
  limits: {
    rfqsPerMonth: 3,
    maxSupplierMatches: 5,
    advancedFilters: false,
    aiAssistant: false,
    apiImport: false,
    erpIntegration: false,
    bomParser: false,
  },
  usage: {
    rfqsCreated: 0,
    aiAssistantUses: 0,
    bomParses: 0,
    apiImports: 0,
    drawingAiParses: 0,
    matchReruns: 0,
  },
  loading: true,
};

export function useIrfqSubscription(isAuthenticated: boolean) {
  const [state, setState] = useState<IrfqSubscriptionState>(DEFAULT_STATE);

  useEffect(() => {
    if (!isAuthenticated) {
      setState((prev) => ({ ...prev, loading: false, plan: "free" }));
      return;
    }

    fetch("/api/v2/rfqs/subscription/plan")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        setState({
          plan: json.data.plan,
          limits: json.data.limits,
          usage: json.data.usage,
          loading: false,
        });
      })
      .catch(() => setState((prev) => ({ ...prev, loading: false })));
  }, [isAuthenticated]);

  return state;
}
