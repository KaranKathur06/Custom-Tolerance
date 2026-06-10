/**
 * Typesense search sync — gated off until configured.
 * Set TYPESENSE_* vars and NEXT_PUBLIC_ENABLE_TYPESENSE=true to enable indexing.
 */

export function isTypesenseEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_TYPESENSE === "true" &&
    Boolean(process.env.TYPESENSE_HOST?.trim() && process.env.TYPESENSE_API_KEY?.trim())
  );
}

function typesenseBaseUrl(): string {
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "https";
  const host = process.env.TYPESENSE_HOST!;
  const port = process.env.TYPESENSE_PORT ?? "443";
  return `${protocol}://${host}:${port}`;
}

export async function syncResourceToTypesense(
  resourceType: string,
  resourceId: string,
  eventType: string,
): Promise<void> {
  if (!isTypesenseEnabled()) {
    throw new Error(
      "Typesense is not configured. Set TYPESENSE_HOST, TYPESENSE_API_KEY, and NEXT_PUBLIC_ENABLE_TYPESENSE=true",
    );
  }

  const collection = collectionForResource(resourceType);
  if (!collection) return;

  if (eventType.endsWith(".deleted") || eventType.includes("cancel")) {
    await typesenseRequest("DELETE", `/collections/${collection}/documents/${resourceId}`);
    return;
  }

  // Upsert placeholder — full document hydration wired when search rebuild is confirmed.
  await typesenseRequest("PATCH", `/collections/${collection}/documents`, {
    id: resourceId,
    resource_type: resourceType,
    updated_at: Math.floor(Date.now() / 1000),
  });
}

export async function rebuildTypesenseCollection(collection: string): Promise<void> {
  if (!isTypesenseEnabled()) {
    throw new Error("Typesense is not configured");
  }

  await typesenseRequest("POST", `/collections/${collection}/documents/import?action=upsert`, []);
}

async function typesenseRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const response = await fetch(`${typesenseBaseUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": process.env.TYPESENSE_API_KEY!,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Typesense ${method} ${path} failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return response;
}

function collectionForResource(resourceType: string): string | null {
  const map: Record<string, string> = {
    supplier: "suppliers",
    listing: "listings",
    rfq: "rfqs",
    capability: "capabilities",
  };
  return map[resourceType] ?? null;
}
