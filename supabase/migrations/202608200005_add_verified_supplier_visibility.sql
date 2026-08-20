-- Keep the database enum aligned with lib/marketplace/profile-visibility.ts.
alter type public.profile_visibility_level
  add value if not exists 'VERIFIED_SUPPLIERS';