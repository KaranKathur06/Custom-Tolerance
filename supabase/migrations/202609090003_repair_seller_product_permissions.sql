  -- Repair seller product privileges and ownership policies for deployed environments.
  -- This migration is intentionally idempotent: it can be applied after any prior
  -- product schema migration without changing product data.

  grant select, insert, update, delete on table public.seller_products to authenticated;
  grant select, insert, update, delete on table public.product_images to authenticated;
  grant select, insert, update, delete on table public.product_capabilities to authenticated;
  grant select, insert, update, delete on table public.product_industries to authenticated;
  grant select, insert, update, delete on table public.product_materials to authenticated;
  grant select, insert, update, delete on table public.product_grades to authenticated;
  grant select, insert, update, delete on table public.product_payment_terms to authenticated;
  grant select, insert, update, delete on table public.product_incoterms to authenticated;
  grant select, insert, update, delete on table public.product_approvals to authenticated;
  grant select on table public.product_events to authenticated;

  drop policy if exists seller_products_select on public.seller_products;
  create policy seller_products_select on public.seller_products
    for select to authenticated
    using (profile_id = auth.uid());

  drop policy if exists seller_products_insert on public.seller_products;
  create policy seller_products_insert on public.seller_products
    for insert to authenticated
    with check (profile_id = auth.uid());

  drop policy if exists seller_products_update on public.seller_products;
  create policy seller_products_update on public.seller_products
    for update to authenticated
    using (profile_id = auth.uid())
    with check (profile_id = auth.uid());

  drop policy if exists seller_products_delete on public.seller_products;
  create policy seller_products_delete on public.seller_products
    for delete to authenticated
    using (profile_id = auth.uid());

  drop policy if exists seller_products_admin_select on public.seller_products;
  create policy seller_products_admin_select on public.seller_products
    for select to authenticated
    using (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    ));

  drop policy if exists seller_products_admin_update on public.seller_products;
  create policy seller_products_admin_update on public.seller_products
    for update to authenticated
    using (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    ));

  do $do$
  declare
    product_table text;
  begin
    foreach product_table in array array[
      'product_images',
      'product_capabilities',
      'product_industries',
      'product_materials',
      'product_grades',
      'product_payment_terms',
      'product_incoterms'
    ] loop
      execute format('drop policy if exists %I on public.%I', product_table || '_owner_all', product_table);
      execute format($policy$
        create policy %I on public.%I
          for all to authenticated
          using (exists (
            select 1
            from public.seller_products product
            where product.id = seller_product_id
              and product.profile_id = auth.uid()
          ))
          with check (exists (
            select 1
            from public.seller_products product
            where product.id = seller_product_id
              and product.profile_id = auth.uid()
          ))
      $policy$, product_table || '_owner_all', product_table);
    end loop;
  end
  $do$;

  -- Sellers may create and view approvals only for products they own.
  drop policy if exists product_approvals_select on public.product_approvals;
  create policy product_approvals_select on public.product_approvals
    for select to authenticated
    using (
      submitted_by = auth.uid()
      or exists (
        select 1
        from public.seller_products product
        where product.id = seller_product_id
          and product.profile_id = auth.uid()
      )
    );

  drop policy if exists product_approvals_insert on public.product_approvals;
  create policy product_approvals_insert on public.product_approvals
    for insert to authenticated
    with check (
      submitted_by = auth.uid()
      and exists (
        select 1
        from public.seller_products product
        where product.id = seller_product_id
          and product.profile_id = auth.uid()
      )
    );

  drop policy if exists product_approvals_admin_all on public.product_approvals;
  create policy product_approvals_admin_all on public.product_approvals
    for all to authenticated
    using (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    ))
    with check (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    ));

  -- Product events are seller-readable through the product ownership boundary.
  drop policy if exists product_events_select on public.product_events;
  create policy product_events_select on public.product_events
    for select to authenticated
    using (exists (
      select 1
      from public.seller_products product
      where product.id = seller_product_id
        and product.profile_id = auth.uid()
    ));

  drop policy if exists product_events_admin_select on public.product_events;
  create policy product_events_admin_select on public.product_events
    for select to authenticated
    using (exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    ));

  alter table public.seller_products enable row level security;
  alter table public.product_images enable row level security;
  alter table public.product_capabilities enable row level security;
  alter table public.product_industries enable row level security;
  alter table public.product_materials enable row level security;
  alter table public.product_grades enable row level security;
  alter table public.product_payment_terms enable row level security;
  alter table public.product_incoterms enable row level security;
  alter table public.product_approvals enable row level security;
  alter table public.product_events enable row level security;
