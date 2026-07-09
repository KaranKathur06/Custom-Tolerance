/**
 * GET /api/admin/products/approvals
 * List pending product approvals for admin review
 *
 * PATCH /api/admin/products/approvals/[id]
 * Approve or reject a product
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
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
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
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

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update approval
    const { error: updateError } = await supabase
      .from("product_approvals")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === "reject" ? rejection_reason : null,
        notes,
      })
      .eq("id", approval_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // If approved, update seller_products
    if (action === "approve") {
      const { error: prodError } = await supabase
        .from("seller_products")
        .update({
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", approval.seller_product_id);

      if (prodError) {
        console.error("[admin/approvals] Product update failed:", prodError);
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
