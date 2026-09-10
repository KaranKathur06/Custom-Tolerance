/**
 * GET /api/admin/products/approvals
 * List pending product approvals for admin review
 *
 * PATCH /api/admin/products/approvals/[id]
 * Approve or reject a product
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { createNotification } from "@/lib/marketplace/notifications";
import { sendEmail } from "@/lib/services/email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "super_admin", "superadmin"].includes(String(profile?.role))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") || "20");
  const status = request.nextUrl.searchParams.get("status") || "pending";
  const offset = (page - 1) * limit;

  try {
    const { data: approvals, count, error } = await supabase
      .from("product_approvals")
      .select(
        `
        id, status, created_at, rejection_reason, notes,
        seller_product_id,
        seller_products!inner(
          product_name, capability, materials, moq, lead_time,
          profile_id,
          profiles!inner(full_name, email)
        )
        `,
        { count: "exact" }
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[admin/approvals]", error.message);
      return NextResponse.json(
        { error: "Fetch failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      approvals: approvals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    console.error("[admin/approvals]", err);
    return NextResponse.json(
      { error: err?.message || "Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Server error" }, { status: 500 });
  const adminDatabase = createSupabaseServiceRoleClient() || supabase;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "super_admin", "superadmin"].includes(String(profile?.role))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const { approval_id, action, rejection_reason, notes } = body;

  if (!approval_id || !action) {
    return NextResponse.json(
      { error: "approval_id and action required" },
      { status: 400 }
    );
  }

  if (!["approve", "reject"].includes(String(action))) {
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  }

  try {
    // Get approval record
    let { data: approval } = await adminDatabase
      .from("product_approvals")
      .select("*")
      .eq("id", approval_id)
      .maybeSingle();

    // Older queue payloads used the product id in this field. Resolve that
    // safely while the queue is being migrated to approval ids.
    if (!approval) {
      const { data: pendingApproval } = await adminDatabase
        .from("product_approvals")
        .select("*")
        .eq("seller_product_id", approval_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      approval = pendingApproval;
    }

    if (!approval) {
      return NextResponse.json({ success: false, error: { code: "APPROVAL_NOT_FOUND", message: "This approval is no longer available. Refresh the moderation queue." } }, { status: 404 });
    }

    const canonicalApprovalId = String(approval.id);

    if (approval.status !== "pending") {
      return NextResponse.json({ success: false, error: { code: "APPROVAL_NOT_PENDING", message: "This approval has already been reviewed. Refresh the moderation queue." } }, { status: 409 });
    }

    const { data: product } = await adminDatabase
      .from("seller_products")
      .select("id, product_name, profile_id")
      .eq("id", approval.seller_product_id)
      .maybeSingle();

    const { data: sellerProfile } = product?.profile_id
      ? await adminDatabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", product.profile_id)
          .maybeSingle()
      : { data: null };

    const newStatus = action === "approve" ? "approved" : "rejected";
    // Prefer the actor-aware RPC. During rolling deployments the function may
    // not exist yet, so fall back to the authenticated legacy RPC, which still
    // preserves the database row locks and current-state check.
    const moderationArgs = {
      p_approval_id: canonicalApprovalId,
      p_action: String(action),
      p_reason: rejection_reason ? String(rejection_reason) : null,
      p_notes: notes ? String(notes) : null,
      p_actor_id: user.id,
    };
    let { error: moderationError } = await adminDatabase.rpc("review_seller_product_approval_as_admin", moderationArgs);
    const canUseLegacyRpc = moderationError && (
      /function .*review_seller_product_approval_as_admin.*does not exist/i.test(moderationError.message) ||
      /could not find the function/i.test(moderationError.message) ||
      /schema cache/i.test(moderationError.message)
    );
    if (canUseLegacyRpc) {
      const legacyResult = await supabase.rpc("review_seller_product_approval", {
        p_approval_id: canonicalApprovalId,
        p_action: String(action),
        p_reason: moderationArgs.p_reason,
        p_notes: moderationArgs.p_notes,
      });
      moderationError = legacyResult.error;
    }
    if (moderationError) {
      const code = moderationError.message.includes("REJECTION_REASON_REQUIRED")
        ? "REJECTION_REASON_REQUIRED"
        : moderationError.message.includes("APPROVAL_NOT_FOUND")
          ? "APPROVAL_NOT_FOUND"
          : moderationError.message.includes("APPROVAL_NOT_PENDING")
            ? "APPROVAL_NOT_PENDING"
              : moderationError.message.includes("ADMIN_ACCESS_REQUIRED")
                ? "ADMIN_ACCESS_REQUIRED"
                : moderationError.message.includes("PRODUCT_NOT_FOUND")
                  ? "PRODUCT_NOT_FOUND"
                  : moderationError.message.includes("INVALID_MODERATION_ACTION")
                    ? "INVALID_MODERATION_ACTION"
                    : canUseLegacyRpc
                      ? "MODERATION_RPC_UNAVAILABLE"
                      : "MODERATION_FAILED";
      const status = code === "REJECTION_REASON_REQUIRED" || code === "INVALID_MODERATION_ACTION"
        ? 422
        : code === "APPROVAL_NOT_FOUND" || code === "PRODUCT_NOT_FOUND"
          ? 404
          : code === "APPROVAL_NOT_PENDING"
            ? 409
              : code === "ADMIN_ACCESS_REQUIRED"
              ? 403
                : code === "MODERATION_RPC_UNAVAILABLE"
                  ? 503
              : 500;
      return NextResponse.json(
        { success: false, error: { code, message: code === "REJECTION_REASON_REQUIRED" ? "A rejection reason is required." : code === "APPROVAL_NOT_FOUND" ? "This approval is no longer available. Refresh the moderation queue." : code === "APPROVAL_NOT_PENDING" ? "This approval has already been reviewed. Refresh the moderation queue." : code === "ADMIN_ACCESS_REQUIRED" ? "Admin authorization was not accepted by the moderation database function." : code === "MODERATION_RPC_UNAVAILABLE" ? "The moderation database function is not deployed. Apply the latest Supabase migration." : "The moderation operation failed. No review decision was recorded." } },
        { status },
      );
    }

    if (product?.profile_id) {
      try {
        const isApproved = action === "approve";
        await adminDatabase.from("notifications").insert(
          createNotification({
            profileId: product.profile_id,
            title: isApproved ? "Product approved" : "Product requires revision",
            body: isApproved
              ? `${product.product_name} was approved by the admin. Publish it from your product dashboard when ready.`
              : `${product.product_name} was rejected${rejection_reason ? `: ${rejection_reason}` : "."}`,
            type: "system",
            href: `/dashboard/seller/products/${product.id}`,
            metadata: {
              seller_product_id: product.id,
              approval_id: canonicalApprovalId,
              action,
              notes: notes ? String(notes) : null,
            },
          }),
        );
      } catch (notificationError) {
        console.error("[admin/approvals] Seller notification failed:", notificationError);
      }
    }

    if (sellerProfile?.email) {
      const isApproved = action === "approve";
      const reason = rejection_reason?.toString().trim();
      const adminNotes = notes?.toString().trim();
      const subject = isApproved
        ? `Product approved: ${product?.product_name ?? "Your product"}`
        : `Product needs revision: ${product?.product_name ?? "Your product"}`;
      const text = isApproved
        ? `${product?.product_name ?? "Your product"} has been approved. Publish it from your product dashboard when you are ready.`
        : `${product?.product_name ?? "Your product"} needs revision.${reason ? ` Reason: ${reason}` : ""}`;

      try {
        const result = await sendEmail({
          to: sellerProfile.email,
          subject,
          text,
          html: `<p>Hello ${sellerProfile.full_name || "Seller"},</p><p>${text}</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}${adminNotes ? `<p><strong>Admin note:</strong> ${adminNotes}</p>` : ""}`,
        });
        if (!result.success) {
          console.error("[admin/approvals] Seller email failed:", result.error);
        }
      } catch (emailError) {
        console.error("[admin/approvals] Seller email failed:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Product ${newStatus}`,
      approval_id: canonicalApprovalId,
    });
  } catch (err: any) {
    console.error("[admin/approvals]", err);
    return NextResponse.json(
      { error: err?.message || "Error" },
      { status: 500 }
    );
  }
}
