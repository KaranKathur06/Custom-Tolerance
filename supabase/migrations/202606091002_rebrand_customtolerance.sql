-- Rebrand: MetalHub → CustomTolerance (live CMS / banner content)
-- Run after deploy so production DB hero copy matches new brand.

update public.banners
set subtitle = replace(subtitle, 'MetalHub', 'CustomTolerance')
where subtitle ilike '%metalhub%';

update public.banners
set subtitle = replace(subtitle, 'metalhub', 'CustomTolerance')
where subtitle ilike '%metalhub%';
