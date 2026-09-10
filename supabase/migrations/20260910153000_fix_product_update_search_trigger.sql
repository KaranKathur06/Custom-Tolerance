-- Prevent moderation/product updates from failing because of search-index permissions.
-- seller_products updates must remain independent of optional search indexing.

create or replace function public.reindex_product_search(p_seller_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
  v_search_text text;
  v_keywords text[];
begin
  select sp.* into v_product
  from public.seller_products sp
  where sp.id = p_seller_product_id;

  if v_product is null then return; end if;

  v_search_text := coalesce(v_product.product_name, '') || ' ' ||
                   coalesce(v_product.capability, '') || ' ' ||
                   coalesce(v_product.description, '') || ' ' ||
                   coalesce(array_to_string(v_product.materials, ' '), '');

  v_keywords := array(
    select value
    from jsonb_array_elements_text(
      to_jsonb(array[v_product.product_name, v_product.capability])
    ) as values(value)
    where value is not null and value <> ''
  );

  if v_product.materials is not null then
    v_keywords := coalesce(v_keywords, '{}') || v_product.materials;
  end if;

  insert into public.product_search_index (seller_product_id, search_vector, keywords, indexed_at)
  values (p_seller_product_id, to_tsvector('english', v_search_text), v_keywords, now())
  on conflict (seller_product_id) do update
  set search_vector = excluded.search_vector,
      keywords = excluded.keywords,
      indexed_at = excluded.indexed_at;
end;
$$;

create or replace function public.trigger_reindex_product_search()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Moderation and draft updates must not depend on search-index permissions.
  if coalesce(new.is_published, false) then
    perform public.reindex_product_search(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_seller_products_reindex on public.seller_products;
create trigger trg_seller_products_reindex
after insert or update on public.seller_products
for each row execute function public.trigger_reindex_product_search();

grant execute on function public.reindex_product_search(uuid) to authenticated, service_role;
grant execute on function public.trigger_reindex_product_search() to authenticated, service_role;
