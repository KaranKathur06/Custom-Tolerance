# Product Publishing Implementation Guide

## Overview

Complete product publishing workflow with admin approval, seller UI, and email notifications.

## Tasks Completed

### 1. ✅ Admin Approval Queue UI
**Location**: `components/admin/ProductApprovalQueue.tsx`

**Features**:
- List pending/approved/rejected approvals
- Filter by status
- Inline approve/reject with modal for reason
- Shows product details (MOQ, lead time, price)
- Displays rejection reasons and admin notes
- Real-time updates after actions

**Usage in Admin Dashboard**:
```tsx
import { AdminProductApprovalQueue } from '@/components/admin/ProductApprovalQueue';

export default function AdminPage() {
  return <AdminProductApprovalQueue />;
}
```

### 2. ✅ Seller Publishing UI
**Location**: `components/dashboard/seller/ProductPublishingUI.tsx`

**Features**:
- Display all seller products with status badges
- Show draft/pending/approved/rejected states
- "Publish" button for draft products
- "Republish" button for rejected products
- Show approval dates and rejection reasons
- Real-time product list updates
- Product details grid (MOQ, lead time, price, quantity)
- Edit button for product details

**Usage in Seller Dashboard**:
```tsx
import { ProductPublishingUI } from '@/components/dashboard/seller/ProductPublishingUI';

export default function SellerProductsPage() {
  return <ProductPublishingUI />;
}
```

### 3. ✅ Email Notifications (Supabase Edge Function)
**Location**: `supabase/functions/product-approval-notification/index.ts`

**Triggers**: Runs when product_approvals status changes (approved/rejected)

**Functionality**:
- Sends approval email when product approved
- Sends rejection email with reason when rejected
- Includes admin notes in email
- Professional HTML templates
- Uses Resend API for email delivery

**Setup Requirements**:
1. Deploy Edge Function: `supabase functions deploy product-approval-notification`
2. Add Resend API key to Supabase secrets: `supabase secrets set RESEND_API_KEY=your_key`
3. Create database trigger on `product_approvals` table:
```sql
CREATE TRIGGER product_approval_notify
AFTER UPDATE ON product_approvals
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION send_approval_notification(NEW.*);
```

## API Integration

### Admin Endpoints Used

**GET /api/admin/products/approvals**
```bash
# Get pending approvals
curl "http://localhost:3000/api/admin/products/approvals?status=pending"

# Response
{
  "success": true,
  "approvals": [
    {
      "id": "...",
      "seller_product_id": "...",
      "seller_product": {
        "product_name": "Steel Beam",
        "capability": "Metal Fabrication",
        "moq": "10 units",
        "lead_time": "2 weeks"
      },
      "status": "pending",
      "created_at": "2026-07-09T10:00:00Z"
    }
  ]
}
```

**PATCH /api/admin/products/approvals**
```bash
# Approve product
curl -X PATCH "http://localhost:3000/api/admin/products/approvals" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "123",
    "action": "approve",
    "notes": "Looks great!"
  }'

# Reject product
curl -X PATCH "http://localhost:3000/api/admin/products/approvals" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "123",
    "action": "reject",
    "rejection_reason": "MOQ too low for our marketplace",
    "notes": "Please revise and resubmit"
  }'
```

### Seller Endpoints Used

**GET /api/dashboard/seller/products**
```bash
curl "http://localhost:3000/api/dashboard/seller/products"

# Response
{
  "success": true,
  "products": [
    {
      "id": "...",
      "product_name": "Steel Beam",
      "approval_status": "draft",
      "is_published": false,
      "moq": "10 units"
    }
  ]
}
```

**POST /api/dashboard/seller/products/{id}/publish**
```bash
curl -X POST "http://localhost:3000/api/dashboard/seller/products/123/publish"

# Response
{
  "success": true,
  "approval_id": "...",
  "approval_status": "pending_review"
}
```

## React Hooks Available

### Admin Hooks
```tsx
import { useProductApprovals } from '@/lib/products/hooks';

// In your component
const { approvals, loading, error, refetch } = useProductApprovals('pending');

// Hook automatically fetches pending approvals
// Call refetch() to reload data
```

### Seller Hooks
```tsx
import { 
  useSellerProducts, 
  usePublishProduct 
} from '@/lib/products/hooks';

// Get all seller products
const { products, loading, error, refetch } = useSellerProducts();

// Publish a product
const { publish, loading: publishing, error: publishError } = usePublishProduct();
const result = await publish(productId);
```

## Database Schema

### product_approvals Table
```sql
id                    UUID PRIMARY KEY
seller_product_id     UUID REFERENCES seller_products(id)
submitted_by          UUID REFERENCES auth.users(id)
reviewed_by           UUID REFERENCES auth.users(id)
status                'pending' | 'approved' | 'rejected'
rejection_reason      TEXT
notes                 TEXT
created_at            TIMESTAMP
reviewed_at           TIMESTAMP
expires_at            TIMESTAMP (30 days from creation)
```

### product_events Table
```sql
id                    UUID PRIMARY KEY
seller_product_id     UUID REFERENCES seller_products(id)
listing_id            UUID REFERENCES listings(id)
event_type            'published' | 'rejected' | 'approved' | 'updated' | 'archived'
status                'pending' | 'processing' | 'completed' | 'failed'
metadata              JSONB
created_at            TIMESTAMP
processed_at          TIMESTAMP
error_message         TEXT
```

## Workflow Examples

### Complete Approval Workflow

1. **Seller Creates Product**
   ```
   POST /api/dashboard/seller/products
   → Creates product with approval_status = 'draft'
   ```

2. **Seller Publishes to Marketplace**
   ```
   POST /api/dashboard/seller/products/{id}/publish
   → Creates product_approvals record with status = 'pending'
   → Updates approval_status = 'pending_review'
   → Seller sees "Under Review" badge
   ```

3. **Admin Reviews in Queue**
   ```
   GET /api/admin/products/approvals?status=pending
   → Admin sees product in queue
   → Views product details, specs, company info
   ```

4. **Admin Approves Product**
   ```
   PATCH /api/admin/products/approvals
   { action: 'approve', notes: 'Great product!' }
   → Calls publish_product_to_marketplace() RPC
   → Sets is_published = true, approval_status = 'approved'
   → Creates listing entry
   → Sends approval email to seller
   → Product appears in /marketplace/products
   ```

5. **Product Lives in Marketplace**
   ```
   GET /api/marketplace?type=products
   → Product visible to buyers with is_published=true
   ```

## Testing Checklist

- [ ] Create seller product in dashboard
- [ ] Click "Publish to Marketplace" button
- [ ] Verify product appears in admin approval queue
- [ ] Admin approves product
- [ ] Verify seller receives approval email
- [ ] Product appears in marketplace search
- [ ] Seller can view product in dashboard
- [ ] Admin rejects product with reason
- [ ] Seller receives rejection email
- [ ] Seller can edit and republish
- [ ] Archived products removed from marketplace
- [ ] Product history shows all events

## Email Templates

### Approval Email
- Subject: ✓ Your product "{productName}" is now live!
- Includes: Product name, admin notes, link to marketplace
- Button: "View Product"

### Rejection Email
- Subject: Product Review: "{productName}" Needs Revision
- Includes: Product name, rejection reason, admin notes
- Button: "Edit & Resubmit"

## Next Steps

1. **Apply SQL Migration**
   - Run in Supabase dashboard or CLI
   - Creates all tables, functions, triggers

2. **Deploy Edge Function**
   - `supabase functions deploy product-approval-notification`
   - Set RESEND_API_KEY secret

3. **Set up Email Provider**
   - Sign up at Resend.com
   - Get API key
   - Add to Supabase secrets

4. **Create Admin Dashboard Page**
   ```tsx
   // app/admin/products/approvals/page.tsx
   import { ProductApprovalQueue } from '@/components/admin/ProductApprovalQueue';
   
   export default function AdminApprovalsPage() {
     return (
       <div className="container py-10">
         <ProductApprovalQueue />
       </div>
     );
   }
   ```

5. **Create Seller Dashboard Page**
   ```tsx
   // app/dashboard/seller/products/page.tsx
   import { ProductPublishingUI } from '@/components/dashboard/seller/ProductPublishingUI';
   
   export default function SellerProductsPage() {
     return (
       <div className="container py-10">
         <ProductPublishingUI />
       </div>
     );
   }
   ```

## Troubleshooting

### Products not appearing in approval queue
- Check seller_products.approval_status = 'pending_review'
- Verify product_approvals record created
- Check admin user role/permissions

### Emails not sending
- Verify RESEND_API_KEY in Supabase secrets
- Check Resend.com account is active
- Verify seller email in seller_profiles.profiles.email

### Products not appearing in marketplace
- Check is_published = true
- Check approval_status = 'approved'
- Verify publish_product_to_marketplace() RPC executed
- Check product_search_index has entry

## Support

For issues or questions, check:
1. `/api/products/events` - Product event history
2. Supabase logs - Edge function execution
3. Database - Direct query of product_approvals table
