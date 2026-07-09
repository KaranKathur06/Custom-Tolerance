import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProductApprovalEvent {
  id: string;
  seller_product_id: string;
  status: "approved" | "rejected";
  rejection_reason?: string;
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: "noreply@customtolerance.com",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    console.error("Failed to send email:", await response.text());
  }

  return response.ok;
}

function generateApprovalEmail(
  sellerName: string,
  productName: string,
  notes?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .button { background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Product Approved</h1>
          </div>
          <div class="content">
            <p>Hi ${sellerName},</p>
            <p>Great news! Your product <strong>"${productName}"</strong> has been approved and is now live on the Custom Tolerance marketplace.</p>
            ${notes ? `<div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;"><strong>Admin Notes:</strong><br>${notes}</div>` : ""}
            <p>Your product is now visible to buyers searching the marketplace.</p>
            <a href="https://customtolerance.com/dashboard/seller/products" class="button">View Product</a>
          </div>
          <div class="footer">
            <p>Custom Tolerance – B2B Industrial Marketplace</p>
            <p>Questions? Contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateRejectionEmail(
  sellerName: string,
  productName: string,
  rejectionReason: string,
  notes?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .reason-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .button { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Product Review Update</h1>
          </div>
          <div class="content">
            <p>Hi ${sellerName},</p>
            <p>We've reviewed your product <strong>"${productName}"</strong> and have some feedback for you.</p>
            <div class="reason-box">
              <strong>Reason for Review:</strong>
              <p>${rejectionReason}</p>
            </div>
            ${notes ? `<div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px;"><strong>Additional Notes:</strong><br>${notes}</div>` : ""}
            <p>Please review the feedback above and make the necessary changes. Once updated, you can resubmit the product for approval.</p>
            <a href="https://customtolerance.com/dashboard/seller/products" class="button">Edit & Resubmit</a>
          </div>
          <div class="footer">
            <p>Custom Tolerance – B2B Industrial Marketplace</p>
            <p>Questions? Contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function handleProductApprovalNotification(event: ProductApprovalEvent) {
  try {
    // Get seller product details
    const { data: product } = await supabase
      .from("seller_products")
      .select(
        `
        id, product_name, seller_profiles(
          profiles(email, full_name)
        )
      `
      )
      .eq("id", event.seller_product_id)
      .single();

    if (!product || !product.seller_profiles?.profiles?.email) {
      console.error("Product or seller email not found");
      return;
    }

    const sellerEmail = product.seller_profiles.profiles.email;
    const sellerName = product.seller_profiles.profiles.full_name || "Seller";
    const productName = product.product_name;

    if (event.status === "approved") {
      const html = generateApprovalEmail(sellerName, productName, event.notes);
      await sendEmail(
        sellerEmail,
        `✓ Your product "${productName}" is now live!`,
        html
      );
      console.log(`Sent approval email to ${sellerEmail}`);
    } else if (event.status === "rejected") {
      const html = generateRejectionEmail(
        sellerName,
        productName,
        event.rejection_reason || "Please review the marketplace guidelines",
        event.notes
      );
      await sendEmail(
        sellerEmail,
        `Product Review: "${productName}" Needs Revision`,
        html
      );
      console.log(`Sent rejection email to ${sellerEmail}`);
    }
  } catch (error) {
    console.error("Error processing notification:", error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const body = await req.json();
    const event: ProductApprovalEvent = body.record;

    if (!event || !event.id) {
      return new Response(
        JSON.stringify({ error: "Invalid event data" }),
        { status: 400 }
      );
    }

    // Only process approved or rejected status
    if (event.status === "approved" || event.status === "rejected") {
      await handleProductApprovalNotification(event);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
