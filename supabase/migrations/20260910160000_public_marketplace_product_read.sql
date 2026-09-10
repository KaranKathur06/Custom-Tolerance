-- Public marketplace reads are allowed only for products that have completed
-- the canonical lifecycle. Ownership policies remain responsible for writes.

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