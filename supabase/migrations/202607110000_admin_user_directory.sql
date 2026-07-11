-- Create an admin user directory view to unify identity models
-- This resolves the complex foreign key join issues from auth.users -> profiles -> suppliers

CREATE OR REPLACE VIEW public.admin_user_directory AS
SELECT 
    au.id,
    p.full_name,
    au.email,
    p.phone,
    p.role,
    p.avatar_url,
    p.kyc_status as verification_status,
    au.created_at,
    au.last_sign_in_at as last_login,
    COALESCE(s.company_name, p.company_name) as company_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.suppliers s ON s.user_id = au.id;

-- Grant access to authenticated users (RLS applies via API route protection anyway)
GRANT SELECT ON public.admin_user_directory TO authenticated;
GRANT SELECT ON public.admin_user_directory TO service_role;
