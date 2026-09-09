-- Repair product image storage for environments where the original bucket migration was skipped.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  '{image/jpeg,image/png,image/webp,image/avif}'
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove the original permissive policy names before installing owner-scoped policies.
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Auth Insert" on storage.objects;
drop policy if exists "Auth Update" on storage.objects;
drop policy if exists "Auth Delete" on storage.objects;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_public_read'
  ) then
    create policy product_images_public_read
      on storage.objects for select
      using (bucket_id = 'product-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_authenticated_insert'
  ) then
    create policy product_images_authenticated_insert
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'product-images'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_owner_update'
  ) then
    create policy product_images_owner_update
      on storage.objects for update to authenticated
      using (bucket_id = 'product-images' and owner = auth.uid())
      with check (bucket_id = 'product-images' and owner = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_owner_delete'
  ) then
    create policy product_images_owner_delete
      on storage.objects for delete to authenticated
      using (bucket_id = 'product-images' and owner = auth.uid());
  end if;
end $$;
