import type { SupabaseClient } from "@supabase/supabase-js";

async function count(
  supabase: SupabaseClient,
  table: string,
  applyFilter?: (query: { eq: (c: string, v: string) => unknown; in: (c: string, v: string[]) => unknown; gte: (c: string, v: string) => unknown }) => unknown,
): Promise<number> {
  try {
    let query = supabase.from(table).select("id", { count: "exact", head: true }) as unknown;
    if (applyFilter) {
      query = applyFilter(query as Parameters<NonNullable<typeof applyFilter>>[0]);
    }
    const { count: total, error } = await (query as PromiseLike<{ count: number | null; error: { message: string } | null }>);
    if (error) return 0;
    return total ?? 0;
  } catch {
    return 0;
  }
}

export async function getOpsAdminDashboardMetrics(supabase: SupabaseClient) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsers,
    totalListings,
    pendingListings,
    approvedListings,
    totalSuppliers,
    pendingSuppliers,
    totalPayments,
    recentUsers,
  ] = await Promise.all([
    count(supabase, "profiles"),
    count(supabase, "listings"),
    count(supabase, "listings", (q) => q.eq("moderation_status", "pending")),
    count(supabase, "listings", (q) => q.eq("moderation_status", "approved")),
    count(supabase, "seller_profiles"),
    count(supabase, "seller_profiles", (q) =>
      q.in("onboarding_status", ["PROFILE_SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"]),
    ),
    count(supabase, "payments", (q) => q.eq("status", "SUCCESS")),
    count(supabase, "profiles", (q) => q.gte("created_at", thirtyDaysAgo)),
  ]);

  return {
    totalUsers,
    activeUsers: totalUsers,
    totalListings,
    pendingListings,
    approvedListings,
    totalSuppliers,
    pendingSuppliers,
    totalPayments,
    recentUsers,
    timestamp: new Date().toISOString(),
  };
}

export async function getOpsCrmDashboardMetrics(supabase: SupabaseClient) {
  const [
    totalInquiries,
    openInquiries,
    closedInquiries,
    totalSuppliers,
    verifiedSuppliers,
    totalOffers,
    acceptedOffers,
    totalPayments,
  ] = await Promise.all([
    count(supabase, "rfqs"),
    count(supabase, "rfqs", (q) => q.eq("status", "open")),
    count(supabase, "rfqs", (q) => q.in("status", ["closed", "cancelled"])),
    count(supabase, "seller_profiles"),
    count(supabase, "seller_profiles", (q) => q.eq("onboarding_status", "APPROVED")),
    count(supabase, "quotes"),
    count(supabase, "quotes", (q) => q.eq("status", "accepted")),
    count(supabase, "payments", (q) => q.eq("status", "SUCCESS")),
  ]);

  const conversionRate =
    totalInquiries > 0 ? Math.round((closedInquiries / totalInquiries) * 1000) / 10 : 0;

  return {
    pipelineValue: totalInquiries,
    openLeads: openInquiries,
    convertedLeads: closedInquiries,
    conversionRate,
    totalSuppliers,
    verifiedSuppliers,
    totalOffers,
    acceptedOffers,
    totalPayments,
    timestamp: new Date().toISOString(),
  };
}
