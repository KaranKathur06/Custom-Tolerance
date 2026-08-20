-- Prevent direct marketplace publication outside the admin approval workflow.
-- The historical function is SECURITY DEFINER, so authorization must be enforced
-- inside the function rather than relying only on the API route.

CREATE OR REPLACE FUNCTION public.publish_product_to_marketplace(
  p_seller_product_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_seller_product record;
  v_seller record;
  v_approval record;
  v_listing_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'superadmin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin approval is required'
    );
  END IF;

  SELECT id
  INTO v_approval
  FROM public.product_approvals
  WHERE seller_product_id = p_seller_product_id
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_approval IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A pending product approval is required'
    );
  END IF;

  SELECT sp.*, sp_prof.profile_id
  INTO v_seller_product
  FROM public.seller_products sp
  JOIN public.seller_profiles sp_prof ON sp.seller_profile_id = sp_prof.id
  WHERE sp.id = p_seller_product_id
    AND sp.approval_status = 'pending_review'
    AND COALESCE(sp.is_published, false) = false;

  IF v_seller_product IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product is not pending review'
    );
  END IF;

  SELECT u.* INTO v_seller
  FROM auth.users u
  WHERE u.id = v_seller_product.profile_id;

  INSERT INTO public.listings (
    seller_id, title, description, metal_type, listing_role, status,
    capabilities, industries, price, quantity, moq_quantity,
    is_active, created_at, updated_at
  ) VALUES (
    v_seller_product.profile_id,
    v_seller_product.product_name,
    COALESCE(v_seller_product.custom_tolerance, ''),
    'STEEL'::text,
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
  RETURNING id INTO v_listing_id;

  UPDATE public.seller_products
  SET
    listing_id = v_listing_id,
    is_published = true,
    published_at = now(),
    approval_status = 'approved',
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = p_seller_product_id;

  UPDATE public.product_approvals
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE seller_product_id = p_seller_product_id
    AND status = 'pending';

  INSERT INTO public.product_events (
    seller_product_id, listing_id, event_type, status
  ) VALUES (
    p_seller_product_id, v_listing_id, 'published', 'completed'
  );

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

REVOKE ALL ON FUNCTION public.publish_product_to_marketplace(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_product_to_marketplace(uuid) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT seller_product_id
    FROM public.product_approvals
    WHERE status = 'pending'
    GROUP BY seller_product_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate pending product approvals exist; clean them before applying this migration';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS product_approvals_one_pending_per_product
  ON public.product_approvals (seller_product_id)
  WHERE status = 'pending';
