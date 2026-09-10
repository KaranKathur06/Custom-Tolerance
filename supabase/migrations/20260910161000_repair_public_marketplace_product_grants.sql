-- Repair deployments where the marketplace read policy exists but table grants
-- were not applied. Keep the public endpoint constrained by RLS.

grant usage on schema public to anon, authenticated;
grant select on table public.seller_products to anon, authenticated;
grant select on table public.product_images to anon, authenticated;
grant select on table public.product_capabilities to anon, authenticated;
grant select on table public.product_industries to anon, authenticated;
grant select on table public.product_materials to anon, authenticated;
grant select on table public.product_grades to anon, authenticated;
grant select on table public.product_payment_terms to anon, authenticated;
grant select on table public.product_incoterms to anon, authenticated;

-- Reassert the product policy so this migration is safe on databases where the
-- preceding policy migration was skipped or only partially applied.
drop policy if exists seller_products_public_marketplace_select on public.seller_products;
create policy seller_products_public_marketplace_select
  on public.seller_products for select to anon, authenticated
  using (
    approval_status = 'approved'
    and lifecycle_status = 'active'
    and coalesce(is_published, false) = true
    and coalesce(is_visible, false) = true
  );

drop policy if exists product_images_public_marketplace_select on public.product_images;
create policy product_images_public_marketplace_select
  on public.product_images for select to anon, authenticated
  using (
    exists (
      select 1
      from public.seller_products product
      where product.id = seller_product_id
        and product.approval_status = 'approved'
        and product.lifecycle_status = 'active'
        and coalesce(product.is_published, false) = true
        and coalesce(product.is_visible, false) = true
    )
  );
