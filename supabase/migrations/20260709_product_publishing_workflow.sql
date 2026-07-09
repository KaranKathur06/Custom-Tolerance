-- Product Publishing Workflow: Seller products → Marketplace listings with approval
-- Features: Publishing, versioning, approval workflow, event tracking, search indexing

-- ============================================================
-- 1. NEW TABLE: product_events (Event-driven sync)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_product_id uuid REFERENCES public.seller_products(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'published', 'rejected', 'approved', 'updated', 'archived'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  metadata jsonb DEFAULT '{}', -- Additional context
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_product_events_seller_product ON public.product_events(seller_product_id);
CREATE INDEX IF NOT EXISTS idx_product_events_listing ON public.product_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_product_events_type ON public.product_events(event_type);
CREATE INDEX IF NOT EXISTS idx_product_events_status ON public.product_events(status);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. EXTEND: seller_products table with publishing fields
-- ============================================================
ALTER TABLE public.seller_products
  ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'rejected'
  ADD COLUMN IF NOT EXISTS approval_notes text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS production_capacity_unit text DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estimated_price_per_unit numeric(12, 2),
  ADD COLUMN IF NOT EXISTS quantity_available numeric(12, 2),
  ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_seller_products_published ON public.seller_products(is_published);
CREATE INDEX IF NOT EXISTS idx_seller_products_listing ON public.seller_products(listing_id);
CREATE INDEX IF NOT EXISTS idx_seller_products_approval ON public.seller_products(approval_status);

-- ============================================================
-- 3. NEW TABLE: product_search_index (Full-text search)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_product_id uuid REFERENCES public.seller_products(id) ON DELETE CASCADE,
  search_vector tsvector,
  keywords text[],
  indexed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_search_vector ON public.product_search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_product_search_keywords ON public.product_search_index USING gin(keywords);

ALTER TABLE public.product_search_index ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. NEW TABLE: product_approvals (Admin approval workflow)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_product_id uuid NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_product_approvals_product ON public.product_approvals(seller_product_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_status ON public.product_approvals(status);
CREATE INDEX IF NOT EXISTS idx_product_approvals_submitted_by ON public.product_approvals(submitted_by);

ALTER TABLE public.product_approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- product_events: Admins can view all, sellers can view own
DROP POLICY IF EXISTS product_events_select ON public.product_events;
CREATE POLICY product_events_select ON public.product_events
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' 
    OR seller_product_id IN (
      SELECT id FROM public.seller_products 
      WHERE profile_id = auth.uid()
    )
  );

-- product_approvals: Admins and sellers can view relevant ones
DROP POLICY IF EXISTS product_approvals_select ON public.product_approvals;
CREATE POLICY product_approvals_select ON public.product_approvals
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' 
    OR submitted_by = auth.uid()
  );

DROP POLICY IF EXISTS product_approvals_insert ON public.product_approvals;
CREATE POLICY product_approvals_insert ON public.product_approvals
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

-- ============================================================
-- 6. FUNCTION: publish_product_to_marketplace
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_product_to_marketplace(
  p_seller_product_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_seller_product record;
  v_seller record;
  v_listing_id uuid;
  v_result jsonb;
BEGIN
  -- Get seller product and validate
  SELECT sp.*, sp_prof.profile_id
  INTO v_seller_product
  FROM public.seller_products sp
  JOIN public.seller_profiles sp_prof ON sp.seller_profile_id = sp_prof.id
  WHERE sp.id = p_seller_product_id;

  IF v_seller_product IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seller product not found'
    );
  END IF;

  -- Get user info
  SELECT u.* INTO v_seller
  FROM auth.users u
  WHERE u.id = v_seller_product.profile_id;

  -- Create or update listing
  INSERT INTO public.listings (
    seller_id, title, description, metal_type, listing_role, status,
    capabilities, industries, price, quantity, moq_quantity,
    is_active, created_at, updated_at
  ) VALUES (
    v_seller_product.profile_id,
    v_seller_product.product_name,
    COALESCE(v_seller_product.custom_tolerance, ''),
    'STEEL'::text, -- Default metal type
    'SUPPLIER'::text,
    'APPROVED'::text,
    ARRAY[v_seller_product.capability]::text[],
    ARRAY[]::text[],
    COALESCE(v_seller_product.estimated_price_per_unit, 0),
    COALESCE(v_seller_product.quantity_available, 0),
    v_seller_product.moq,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_listing_id;

  -- Update seller_products with listing reference
  UPDATE public.seller_products
  SET 
    listing_id = v_listing_id,
    is_published = true,
    published_at = now(),
    approval_status = 'approved'
  WHERE id = p_seller_product_id;

  -- Create product event
  INSERT INTO public.product_events (
    seller_product_id, listing_id, event_type, status
  ) VALUES (
    p_seller_product_id, v_listing_id, 'published', 'completed'
  );

  -- Reindex search
  PERFORM public.reindex_product_search(p_seller_product_id);

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'message', 'Product published to marketplace'
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.product_events (
    seller_product_id, event_type, status, error_message
  ) VALUES (
    p_seller_product_id, 'published', 'failed', SQLERRM
  );
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. FUNCTION: reindex_product_search
-- ============================================================
CREATE OR REPLACE FUNCTION public.reindex_product_search(p_seller_product_id uuid)
RETURNS void AS $$
DECLARE
  v_product record;
  v_search_text text;
  v_keywords text[];
BEGIN
  SELECT sp.* INTO v_product
  FROM public.seller_products sp
  WHERE sp.id = p_seller_product_id;

  IF v_product IS NULL THEN
    RETURN;
  END IF;

  -- Build search text
  v_search_text := v_product.product_name || ' ' || 
                   COALESCE(v_product.capability, '') || ' ' ||
                   array_to_string(v_product.materials, ' ');

  -- Build keywords array
  v_keywords := array_cat(
    ARRAY[v_product.product_name, v_product.capability],
    v_product.materials
  );

  -- Upsert search index
  INSERT INTO public.product_search_index (
    seller_product_id, search_vector, keywords, indexed_at
  ) VALUES (
    p_seller_product_id,
    to_tsvector('english', v_search_text),
    v_keywords,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET search_vector = to_tsvector('english', v_search_text),
      keywords = v_keywords,
      indexed_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. TRIGGER: Auto-index on seller_products update
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_reindex_product_search()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.reindex_product_search(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seller_products_reindex ON public.seller_products;
CREATE TRIGGER trg_seller_products_reindex
  AFTER INSERT OR UPDATE ON public.seller_products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_reindex_product_search();

-- ============================================================
-- 9. GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.publish_product_to_marketplace TO authenticated;
GRANT EXECUTE ON FUNCTION public.reindex_product_search TO authenticated;
