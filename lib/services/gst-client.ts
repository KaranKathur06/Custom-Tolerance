/**
 * GST verification client — external API gated off until configured.
 * Set GST_API_KEY + NEXT_PUBLIC_ENABLE_GST_API=true to enable live lookups.
 */

export type GstLookupResult = {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  gstState: string | null;
  gstStateCode: string | null;
  registrationDate: string | null;
  status: "active" | "inactive" | "cancelled" | "suspended" | "unknown";
  constitutionOfBusiness: string | null;
  taxpayerType: string | null;
  raw: Record<string, unknown>;
};

export function isGstApiEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_GST_API === "true" &&
    Boolean(process.env.GST_API_KEY?.trim())
  );
}

export async function lookupGstin(gstin: string): Promise<GstLookupResult> {
  if (!isGstApiEnabled()) {
    throw new Error(
      "GST API is not configured. Set GST_API_KEY and NEXT_PUBLIC_ENABLE_GST_API=true in .env.local",
    );
  }

  const baseUrl = process.env.GST_API_BASE_URL?.trim();
  const provider = process.env.GST_API_PROVIDER ?? "masterindia";

  if (!baseUrl) {
    throw new Error("GST_API_BASE_URL is required when GST API is enabled");
  }

  const normalized = gstin.trim().toUpperCase();
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/verify/${normalized}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.GST_API_KEY}`,
      "X-GST-Provider": provider,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GST lookup failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const raw = (await response.json()) as Record<string, unknown>;

  return {
    gstin: normalized,
    legalName: (raw.legal_name as string) ?? (raw.lgnm as string) ?? null,
    tradeName: (raw.trade_name as string) ?? (raw.tradeName as string) ?? null,
    gstState: (raw.state as string) ?? null,
    gstStateCode: (raw.state_code as string) ?? null,
    registrationDate: (raw.registration_date as string) ?? null,
    status: mapGstStatus(raw.status),
    constitutionOfBusiness: (raw.constitution as string) ?? null,
    taxpayerType: (raw.taxpayer_type as string) ?? null,
    raw,
  };
}

function mapGstStatus(value: unknown): GstLookupResult["status"] {
  const s = String(value ?? "unknown").toLowerCase();
  if (s.includes("active")) return "active";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("suspend")) return "suspended";
  if (s.includes("inactive")) return "inactive";
  return "unknown";
}
