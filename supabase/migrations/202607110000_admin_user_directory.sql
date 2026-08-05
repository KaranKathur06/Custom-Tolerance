-- Create an admin user directory view to unify identity models
-- This resolves the complex foreign key join issues from auth.users -> profiles -> suppliers

CREATE OR REPLACE VIEW public.admin_user_directory AS
SELECT 
    COALESCE(au.id, p.id) AS id,
    COALESCE(p.full_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') AS full_name,
    COALESCE(au.email, p.email) AS email,
    p.phone,
    p.role,
    p.avatar_url,
    p.verification_status AS verification_status,
    COALESCE(au.created_at, p.created_at) AS created_at,
    au.last_sign_in_at AS last_login,
    COALESCE(s.company_name, c.name) AS company_name
FROM auth.users au
FULL OUTER JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.suppliers s ON s.owner_user_id = COALESCE(au.id, p.id)
LEFT JOIN public.companies c ON c.owner_id = COALESCE(au.id, p.id);

-- Grant access to authenticated users (RLS applies via API route protection anyway)
GRANT SELECT ON public.admin_user_directory TO authenticated;
GRANT SELECT ON public.admin_user_directory TO service_role;
