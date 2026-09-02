/**
 * GST verification client — external API gated off until configured.
 * Set GST_API_KEY + NEXT_PUBLIC_ENABLE_GST_API=true to enable live lookups.
 * For automated testing and temporary bypasses, disable the live GST auto-check.
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

const GST_LOOKUP_TIMEOUT_MS = 10_000;

export function isGstVerificationDisabled(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.NEXT_PUBLIC_DISABLE_GST_AUTO_CHECK === "true"
  );
}

export function isGstApiEnabled(): boolean {
  return !isGstVerificationDisabled() &&
    process.env.NEXT_PUBLIC_ENABLE_GST_API === "true" &&
    Boolean(process.env.GST_API_KEY?.trim());
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GST_LOOKUP_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/verify/${normalized}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.GST_API_KEY}`,
        "X-GST-Provider": provider,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("GST lookup timed out. Please try again.");
    }
    throw new Error("Unable to reach the GST verification provider.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GST lookup failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const details = isRecord(raw.data) ? raw.data : isRecord(raw.result) ? raw.result : raw;

  return {
    gstin: normalized,
    legalName: (details.legal_name as string) ?? (details.lgnm as string) ?? null,
    tradeName: (details.trade_name as string) ?? (details.tradeName as string) ?? null,
    gstState: (details.state as string) ?? null,
    gstStateCode: (details.state_code as string) ?? null,
    registrationDate: (details.registration_date as string) ?? null,
    status: mapGstStatus(details.status),
    constitutionOfBusiness: (details.constitution as string) ?? null,
    taxpayerType: (details.taxpayer_type as string) ?? null,
    raw,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapGstStatus(value: unknown): GstLookupResult["status"] {
  const s = String(value ?? "unknown").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("suspend")) return "suspended";
  if (s.includes("inactive")) return "inactive";
  if (s.includes("active")) return "active";
  return "unknown";
}
