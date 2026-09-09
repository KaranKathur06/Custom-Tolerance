-- 202609090004_fix_product_search_index_permissions.sql
-- Fixes the root cause of "permission denied for table product_search_index"
-- which blocks ALL product draft saves via the trg_seller_products_reindex trigger.
--
-- Issues resolved:
--   1. Missing GRANT on product_search_index for authenticated role
--   2. Missing RLS policies on product_search_index
--   3. reindex_product_search() not SECURITY DEFINER (trigger runs as caller)
--   4. Broken ON CONFLICT (id) — UUID PK never conflicts, creates infinite duplicates
--   5. Trigger fires on draft saves (unnecessary, only needed on publish)
--   6. Cleanup of duplicate rows from the broken ON CONFLICT

-- ============================================================
-- Step 1: Grant table-level permissions
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_search_index TO authenticated;

-- ============================================================
-- Step 2: Create RLS policies for product_search_index
-- ============================================================
-- Drop any stale policies first
DROP POLICY IF EXISTS product_search_index_owner_all ON public.product_search_index;
DROP POLICY IF EXISTS product_search_index_public_read ON public.product_search_index;

-- Owners can manage their own search index entries
CREATE POLICY product_search_index_owner_all ON public.product_search_index
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seller_products p
    WHERE p.id = seller_product_id
      AND p.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seller_products p
    WHERE p.id = seller_product_id
      AND p.profile_id = auth.uid()
  ));

-- Published products are searchable by everyone
CREATE POLICY product_search_index_public_read ON public.product_search_index
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.seller_products p
    WHERE p.id = seller_product_id
      AND p.is_published = true
  ));

-- ============================================================
-- Step 3: Fix ON CONFLICT bug — add unique constraint on seller_product_id
-- ============================================================
-- First, clean up duplicate rows (keep the most recent one per seller_product_id)
DELETE FROM public.product_search_index a
  USING public.product_search_index b
  WHERE a.seller_product_id = b.seller_product_id
    AND a.indexed_at < b.indexed_at;

-- Now add unique constraint so ON CONFLICT works correctly
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_search_index_product_unique
  ON public.product_search_index (seller_product_id);

-- ============================================================
-- Step 4: Fix reindex_product_search — SECURITY DEFINER + correct ON CONFLICT
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
  v_search_text := COALESCE(v_product.product_name, '') || ' ' ||
                   COALESCE(v_product.capability, '') || ' ' ||
                   COALESCE(v_product.description, '') || ' ' ||
                   COALESCE(array_to_string(v_product.materials, ' '), '');

  -- Build keywords array (filter nulls)
  v_keywords := ARRAY(
    SELECT unnest FROM unnest(
      ARRAY[v_product.product_name, v_product.capability]
    ) WHERE unnest IS NOT NULL
  );
  IF v_product.materials IS NOT NULL THEN
    v_keywords := array_cat(v_keywords, v_product.materials);
  END IF;

  -- Upsert search index — ON CONFLICT on seller_product_id (not id!)
  INSERT INTO public.product_search_index (
    seller_product_id, search_vector, keywords, indexed_at
  ) VALUES (
    p_seller_product_id,
    to_tsvector('english', v_search_text),
    v_keywords,
    now()
  )
  ON CONFLICT (seller_product_id) DO UPDATE
  SET search_vector = to_tsvector('english', v_search_text),
      keywords = v_keywords,
      indexed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Step 5: Fix trigger — SECURITY DEFINER + conditional (skip drafts)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_reindex_product_search()
RETURNS TRIGGER AS $$
BEGIN
  -- Only reindex when the product is published.
  -- Draft saves should NOT trigger search indexing.
  IF COALESCE(NEW.is_published, false) = true THEN
    PERFORM public.reindex_product_search(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_seller_products_reindex ON public.seller_products;
CREATE TRIGGER trg_seller_products_reindex
  AFTER INSERT OR UPDATE ON public.seller_products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_reindex_product_search();

-- ============================================================
-- Step 6: Ensure function execute grants are in place
-- ============================================================
GRANT EXECUTE ON FUNCTION public.reindex_product_search(uuid) TO authenticated;
