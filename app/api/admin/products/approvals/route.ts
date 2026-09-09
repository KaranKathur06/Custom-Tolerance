/**
 * GET /api/admin/products/approvals
 * List pending product approvals for admin review
 *
 * PATCH /api/admin/products/approvals/[id]
 * Approve or reject a product
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const { data: approval } = await supabase
      .from("product_approvals")
      .select("*")
      .eq("id", approval_id)
      .single();

    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    if (approval.status !== "pending") {
      return NextResponse.json({ error: "Approval has already been reviewed" }, { status: 400 });
    }

    const { data: product } = await supabase
      .from("seller_products")
      .select("id, product_name, profile_id")
      .eq("id", approval.seller_product_id)
      .maybeSingle();

    const { data: sellerProfile } = product?.profile_id
      ? await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", product.profile_id)
          .maybeSingle()
      : { data: null };

    const newStatus = action === "approve" ? "approved" : "rejected";
    const { error: moderationError } = await supabase.rpc("review_seller_product_approval", {
      p_approval_id: String(approval_id),
      p_action: String(action),
      p_reason: rejection_reason ? String(rejection_reason) : null,
      p_notes: notes ? String(notes) : null,
    });
    if (moderationError) {
      const code = moderationError.message.includes("REJECTION_REASON_REQUIRED") ? "REJECTION_REASON_REQUIRED" : moderationError.message.includes("APPROVAL_NOT_PENDING") ? "APPROVAL_NOT_PENDING" : "MODERATION_FAILED";
      return NextResponse.json(
        { success: false, error: { code, message: code === "REJECTION_REASON_REQUIRED" ? "A rejection reason is required." : "The approval could not be reviewed in its current state." } },
        { status: code === "REJECTION_REASON_REQUIRED" ? 422 : 409 },
      );
    }

    if (product?.profile_id) {
      try {
        const isApproved = action === "approve";
        await supabase.from("notifications").insert(
          createNotification({
            profileId: product.profile_id,
            title: isApproved ? "Product approved" : "Product requires revision",
            body: isApproved
              ? `${product.product_name} is now live in the marketplace.`
              : `${product.product_name} was rejected${rejection_reason ? `: ${rejection_reason}` : "."}`,
            type: "system",
            href: `/dashboard/seller/products/${product.id}`,
            metadata: {
              seller_product_id: product.id,
              approval_id,
              action,
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
      const subject = isApproved
        ? `Product approved: ${product?.product_name ?? "Your product"}`
        : `Product needs revision: ${product?.product_name ?? "Your product"}`;
      const text = isApproved
        ? `${product?.product_name ?? "Your product"} has been approved and is now live in the marketplace.`
        : `${product?.product_name ?? "Your product"} needs revision.${reason ? ` Reason: ${reason}` : ""}`;

      try {
        const result = await sendEmail({
          to: sellerProfile.email,
          subject,
          text,
          html: `<p>Hello ${sellerProfile.full_name || "Seller"},</p><p>${text}</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`,
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
      approval_id,
    });
  } catch (err: any) {
    console.error("[admin/approvals]", err);
    return NextResponse.json(
      { error: err?.message || "Error" },
      { status: 500 }
    );
  }
}
