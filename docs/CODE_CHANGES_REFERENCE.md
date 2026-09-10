# Code Changes Reference

Quick reference for all code changes made to fix the admin listing detail issues.

## File 1: app/ops/admin/listings/[id]/page.tsx

### Change 1: Import canonical DTO

**Before**:
```typescript
import { StatusBadge } from '@/components/ops/shared/StatusBadge';

type DetailPayload = {
  product: Record<string, any> & { profiles?: { full_name?: string | null; email?: string | null } };
  approvals: Array<Record<string, any>>;
  images: Array<{ id: string; url: string; is_primary: boolean; display_order: number }>;
  relations: {
    capabilities: string[];
    industries: string[];
    materials: string[];
    grades: string[];
    paymentTerms: string[];
    incoterms: string[];
  };
};
```

**After**:
```typescript
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import type { AdminListingDetailPayload } from '@/types/admin-listing-detail';

type DetailPayload = AdminListingDetailPayload['data'];
```

**Benefit**: Type-safe, documented, reusable across components

---

### Change 2: Improved display() function

**Before**:
```typescript
function display(item: unknown) {
  if (item == null || item === '') return '-';
  if (Array.isArray(item)) return item.join(', ') || '-';
  return String(item);
}
```

**After**:
```typescript
function display(item: unknown) {
  if (item == null || item === '') return 'Not provided';
  if (Array.isArray(item)) {
    if (item.length === 0) return 'Not provided';
    // For admin review, show all items joined with comma and space
    return item.join(', ');
  }
  return String(item);
}
```

**Changes**:
- Returns "Not provided" instead of "-" for clarity
- Explicit empty array check
- Added comment explaining array behavior

---

### Change 3: Remove relation() calls on normalized arrays

**Before**:
```typescript
const { product, approvals, images, relations } = data;
const latestApproval = approvals[0];
const pending = approvals.some((approval) => approval.status === 'pending');
const capabilities = relation(relations.capabilities, 'capability_id');
const industries = relation(relations.industries, 'industry_id');
const materials = relation(relations.materials, 'material_name');
const grades = relation(relations.grades, 'grade_name');
const paymentTerms = relation(relations.paymentTerms, 'payment_term_id');
const incoterms = relation(relations.incoterms, 'incoterm_id');
```

**After**:
```typescript
const { product, approvals, images, relations } = data;
const latestApproval = approvals[0];
const pending = approvals.some((approval) => approval.status === 'pending');

// The relations are already normalized to string arrays by the admin API's relationValues() function
// No need to extract keys - they're already primitive values
const capabilities = relations.capabilities || [];
const industries = relations.industries || [];
const materials = relations.materials || [];
const grades = relations.grades || [];
const paymentTerms = relations.paymentTerms || [];
const incoterms = relations.incoterms || [];
```

**Benefit**: Direct use of API data, no type mismatches

---

### Change 4: Fix field rendering to use arrays directly

**Before**:
```typescript
<LongField label="Capabilities" item={capabilities.length ? capabilities : product.capabilities ?? product.capability} />
<LongField label="Industries served" item={industries.length ? industries : product.industries} />
<LongField label="Materials" item={materials.length ? materials : product.materials} />
<LongField label="Grades" item={grades.length ? grades : product.grades} />
<LongField label="Country of origin" item={product.country_of_origin ?? product.countryOfOrigin ?? product.origin_country} />
<LongField label="Description" item={product.description ?? product.product_description} />
```

**After**:
```typescript
<LongField label="Capabilities" item={capabilities.length > 0 ? capabilities : (product.capabilities ?? product.capability ?? '-')} />
<LongField label="Industries served" item={industries.length > 0 ? industries : (product.industries ?? '-')} />
<LongField label="Materials" item={materials.length > 0 ? materials : (product.materials ?? '-')} />
<LongField label="Grades" item={grades.length > 0 ? grades : (product.grades ?? '-')} />
<LongField label="Country of origin" item={product.country_of_origin ?? product.countryOfOrigin ?? product.origin_country ?? 'Not provided'} />
<LongField label="Description" item={product.description ?? product.product_description ?? 'Not provided'} />
```

**Changes**:
- Explicit length check `> 0` (more readable)
- Fallback to 'Not provided' instead of '-' for scalar fields
- Ensures fallback chain completes with meaningful value

---

### Change 5: Fix payment terms and incoterms

**Before**:
```typescript
<Field label="Payment terms" item={paymentTerms} />
<Field label="Incoterms" item={incoterms} />
```

**After**:
```typescript
<Field label="Payment terms" item={paymentTerms.length > 0 ? paymentTerms : (product.payment_terms ?? 'Not specified')} />
<Field label="Incoterms" item={incoterms.length > 0 ? incoterms : (product.incoterms ?? 'Not specified')} />
```

**Benefit**: Consistent fallback handling for all relation fields

---

### Change 6: Improved approval error handling

**Before**:
```typescript
const review = async (action: 'approve' | 'reject') => {
  const approvalId = data?.approvals.find((approval) => approval.status === 'pending')?.id;
  if (!approvalId) {
    setError('There is no pending approval for this product. Return to the queue and refresh it.');
    return;
  }
  if (action === 'reject' && !rejectionReason.trim()) {
    setError('Enter a rejection reason before rejecting this product.');
    return;
  }
  setActing(true);
  setError(null);
  try {
    const response = await fetch('/api/admin/products/approvals', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_id: approvalId, action, rejection_reason: rejectionReason.trim() || undefined }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? 'The moderation action could not be completed.');
    router.push('/ops/admin/listings');
    router.refresh();
  } catch (reviewError) {
    setError(reviewError instanceof Error ? reviewError.message : 'The moderation action could not be completed.');
  } finally {
    setActing(false);
  }
};
```

**After**:
```typescript
const review = async (action: 'approve' | 'reject') => {
  const approvalId = data?.approvals.find((approval) => approval.status === 'pending')?.id;
  if (!approvalId) {
    setError('There is no pending approval for this product. Return to the queue and refresh it.');
    return;
  }
  if (action === 'reject' && !rejectionReason.trim()) {
    setError('Enter a rejection reason before rejecting this product.');
    return;
  }
  setActing(true);
  setError(null);
  try {
    const response = await fetch('/api/admin/products/approvals', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_id: approvalId, action, rejection_reason: rejectionReason.trim() || undefined }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      // Handle specific error codes with better messages
      if (response.status === 409 || payload?.error?.code === 'APPROVAL_NOT_PENDING') {
        throw new Error('This product was already reviewed by another team member. Refresh the page to see the latest decision.');
      }
      if (response.status === 404 || payload?.error?.code === 'APPROVAL_NOT_FOUND') {
        throw new Error('This approval is no longer available. The moderation queue may have been updated.');
      }
      throw new Error(payload?.error?.message ?? 'The moderation action could not be completed.');
    }
    if (!payload?.success) {
      throw new Error(payload?.error?.message ?? 'The moderation action could not be completed.');
    }
    router.push('/ops/admin/listings');
    router.refresh();
  } catch (reviewError) {
    setError(reviewError instanceof Error ? reviewError.message : 'The moderation action could not be completed.');
  } finally {
    setActing(false);
  }
};
```

**Changes**:
- Added status code check for 409 (already reviewed) with clear message
- Added status code check for 404 (approval missing) with clear message
- Separated success check from error check
- Error messages are specific and actionable

**Benefit**: Users understand what went wrong and what to do next

---

## File 2: app/api/admin/listings/[id]/route.ts

### Change 1: Import canonical DTO

**Before**:
```typescript
import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';
```

**After**:
```typescript
import { NextResponse } from 'next/server';
import { protectApiRoute } from '@/lib/auth/protect-route';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role-client';
import type { AdminListingDetailPayload } from '@/types/admin-listing-detail';
```

**Benefit**: Type safety when returning response

---

## File 3: types/admin-listing-detail.ts (NEW FILE)

Complete new file containing:
- `ProductRelations` interface
- `SellerProfile` interface  
- `ProductApproval` interface
- `ProductImage` interface
- `AdminListingDetailProduct` interface (comprehensive product type)
- `AdminListingDetailPayload` interface (API response)
- `ApprovalActionRequest` interface
- `ApprovalActionResponse` interface

**Benefits**:
- Single source of truth for data types
- TypeScript compile-time checking
- Self-documenting code
- Prevents type regressions
- Reusable across components and APIs

---

## No Changes Needed - Verified Correct

### app/api/dashboard/seller/products/route.ts
✅ Already correctly implemented
- `handleRelation()` correctly deletes old and inserts new join table rows
- Payload mapping correctly sends arrays: `capabilities: [...], industries: [...], etc.`
- No changes needed

### components/products/ProductWorkspace.tsx
✅ Already correctly implemented
- Hydrates form from API response with all relations
- Autosave sends arrays correctly
- Phase transitions preserve data
- No changes needed

### components/products/Phase1Technical.tsx
✅ Already correctly implemented
- GroupedMultiSelect correctly collects capabilities/industries as arrays
- TagInput correctly collects materials/grades as arrays
- No changes needed

---

## Testing Checklist

See `docs/ADMIN_DETAIL_PAGE_TEST_CHECKLIST.md` for complete testing procedures.

Quick verification steps:
1. [ ] Create seller product with 5+ capabilities, industries, 4+ materials, 3+ grades
2. [ ] Navigate to admin listing detail page
3. [ ] Verify all relation fields display (not "-")
4. [ ] Verify long description displays fully
5. [ ] Have two admins test concurrent approval (one approves, other gets clear error)
6. [ ] Refresh and verify correct status shows
7. [ ] Test with 15+ items in relation arrays
8. [ ] Verify layout has no horizontal scrollbar

---

## Deployment Steps

1. Deploy changed files:
   - `app/ops/admin/listings/[id]/page.tsx`
   - `app/api/admin/listings/[id]/route.ts`
   - `types/admin-listing-detail.ts` (new)
   - Documentation files (optional)

2. No database migrations needed
3. No dependency updates needed
4. No environment variable changes needed
5. Backward compatible (old and new data works)

6. Post-deployment verification:
   - Admin loads existing product
   - Verify relations display
   - Create new product, submit, approve
   - Test concurrent review scenario
