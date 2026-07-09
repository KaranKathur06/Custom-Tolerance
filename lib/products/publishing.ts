/**
 * Product Publishing Utilities
 * Handles seller product lifecycle: create → draft → publish → approved → marketplace
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type ProductPublishingStatus = "draft" | "pending_review" | "approved" | "rejected";
export type ProductEventType = "published" | "rejected" | "approved" | "updated" | "archived";

export interface SellerProduct {
  id: string;
  product_name: string;
  capability?: string;
  materials?: string[];
  moq?: string;
  lead_time?: string;
  is_published: boolean;
  approval_status: ProductPublishingStatus;
  approval_notes?: string;
  listing_id?: string;
  published_at?: string;
  approved_at?: string;
}

export interface ProductApproval {
  id: string;
  seller_product_id: string;
  submitted_by: string;
  reviewed_by?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  reviewed_at?: string;
}

/**
 * Publish a seller product to marketplace
 * Submits for admin approval and creates listing entry if approved
 */
export async function publishProductToMarketplace(
  supabase: SupabaseClient,
  productId: string
): Promise<{ success: boolean; message: string; approval_id?: string; error?: string }> {
  try {
    // Get the product
    const { data: product, error: fetchError } = await supabase
      .from("seller_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      return { success: false, message: "Product not found", error: "Product not found" };
    }

    if (product.is_published) {
      return { success: false, message: "Product already published", error: "Product already published" };
    }

    // Update approval status to pending
    const { error: updateError } = await supabase
      .from("seller_products")
      .update({
        approval_status: "pending_review",
      })
      .eq("id", productId);

    if (updateError) {
      return { success: false, message: updateError.message, error: updateError.message };
    }

    // Create approval record
    const { data: approval, error: approvalError } = await supabase
      .from("product_approvals")
      .insert({
        seller_product_id: productId,
        submitted_by: (await supabase.auth.getUser()).data.user?.id,
        status: "pending",
      })
      .select()
      .single();

    if (approvalError || !approval) {
      return { success: false, message: "Failed to create approval record", error: "Failed to create approval record" };
    }

    return {
      success: true,
      message: "Product submitted for marketplace approval",
      approval_id: approval.id,
    };
  } catch (err: any) {
    const errMsg = err?.message || "Publishing failed";
    return { success: false, message: errMsg, error: errMsg };
  }
}

/**
 * Approve a product for marketplace
 * Called by admin after review
 */
export async function approveProduct(
  supabase: SupabaseClient,
  productId: string,
  approvalId: string,
  adminNotes?: string
): Promise<{ success: boolean; listing_id?: string; error?: string }> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update approval
    const { error: approvalError } = await supabase
      .from("product_approvals")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: adminNotes,
      })
      .eq("id", approvalId);

    if (approvalError) {
      return { success: false, error: approvalError.message };
    }

    // Publish to marketplace
    const { data: result, error: pubError } = await supabase.rpc(
      "publish_product_to_marketplace",
      {
        p_seller_product_id: productId,
      }
    );

    if (pubError || !result?.success) {
      return { success: false, error: result?.error || pubError?.message };
    }

    return {
      success: true,
      listing_id: result.listing_id,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Reject a product submission
 * Called by admin during review
 */
export async function rejectProduct(
  supabase: SupabaseClient,
  productId: string,
  approvalId: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Update approval
    const { error: approvalError } = await supabase
      .from("product_approvals")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq("id", approvalId);

    if (approvalError) {
      return { success: false, error: approvalError.message };
    }

    // Update product status back to draft
    const { error: prodError } = await supabase
      .from("seller_products")
      .update({
        approval_status: "rejected",
        approval_notes: rejectionReason,
      })
      .eq("id", productId);

    if (prodError) {
      return { success: false, error: prodError.message };
    }

    // Create event
    await supabase.from("product_events").insert({
      seller_product_id: productId,
      event_type: "rejected",
      status: "completed",
      metadata: { rejection_reason: rejectionReason },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Archive a published product
 * Removes from marketplace but keeps history
 */
export async function archiveProduct(
  supabase: SupabaseClient,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update product
    const { error } = await supabase
      .from("seller_products")
      .update({
        is_published: false,
        is_visible: false,
      })
      .eq("id", productId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Create event
    await supabase.from("product_events").insert({
      seller_product_id: productId,
      event_type: "archived",
      status: "completed",
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Get product publishing history
 */
export async function getProductHistory(
  supabase: SupabaseClient,
  productId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("product_events")
    .select("*")
    .eq("seller_product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getProductHistory]", error);
    return [];
  }

  return data || [];
}
