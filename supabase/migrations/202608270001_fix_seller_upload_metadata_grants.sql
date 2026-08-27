-- Allow authenticated seller API requests to use upload metadata tables.
-- Row-level security continues to restrict rows to the owning seller profile.
grant select, insert, update, delete on public.supplier_documents to authenticated;
grant select, insert, update, delete on public.supplier_media to authenticated;