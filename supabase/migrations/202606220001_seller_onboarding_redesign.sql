-- Seller Onboarding Redesign: Two-phase flow with products, R&D, structured addresses
-- Phase 1: Company Verification → Basic Information → Registration Complete
-- Phase 2: Business Details (mega step) → Bank Details

-- ============================================================
-- 1. NEW TABLE: seller_products (product-based capabilities)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  capability text,
  materials text[] DEFAULT '{}',
  tolerance_capability text,
  monthly_capacity text,
  moq text,
  lead_time text,
  custom_tolerance text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_products_profile ON public.seller_products(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_products_company ON public.seller_products(company_id);

ALTER TABLE public.seller_products ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. NEW TABLE: seller_rd_services (R&D services)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seller_rd_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_rd_services_profile ON public.seller_rd_services(seller_profile_id);

ALTER TABLE public.seller_rd_services ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. NEW COLUMNS on seller_profiles
-- ============================================================
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS seller_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_rd_team boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rd_team_size text,
  ADD COLUMN IF NOT EXISTS factory_area_value numeric,
  ADD COLUMN IF NOT EXISTS factory_area_unit text DEFAULT 'sq.m',
  ADD COLUMN IF NOT EXISTS total_employees text,
  ADD COLUMN IF NOT EXISTS innovation_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_line_1 text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS factory_address_line_1 text,
  ADD COLUMN IF NOT EXISTS factory_address_line_2 text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS factory_postal_code text,
  ADD COLUMN IF NOT EXISTS verification_type text,
  ADD COLUMN IF NOT EXISTS company_registration_number text,
  ADD COLUMN IF NOT EXISTS country_of_registration text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS linkedin_url text;

-- ============================================================
-- 4. UPDATE seller_export_experience
-- ============================================================
ALTER TABLE public.seller_export_experience
  ADD COLUMN IF NOT EXISTS customer_industry text,
  ADD COLUMN IF NOT EXISTS year_started text,
  ADD COLUMN IF NOT EXISTS annual_export_value text,
  ADD COLUMN IF NOT EXISTS po_document_url text,
  ADD COLUMN IF NOT EXISTS invoice_document_url text,
  ADD COLUMN IF NOT EXISTS shipping_bill_document_url text,
  ADD COLUMN IF NOT EXISTS certificate_document_url text;

-- ============================================================
-- 5. UPDATE seller_kyc_verifications
-- ============================================================
ALTER TABLE public.seller_kyc_verifications
  ADD COLUMN IF NOT EXISTS certificate_upload_url text,
  ADD COLUMN IF NOT EXISTS certificate_storage_path text,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS country_of_registration text;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- seller_products: users can manage their own
DROP POLICY IF EXISTS seller_products_select ON public.seller_products;
CREATE POLICY seller_products_select ON public.seller_products
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS seller_products_insert ON public.seller_products;
CREATE POLICY seller_products_insert ON public.seller_products
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS seller_products_update ON public.seller_products;
CREATE POLICY seller_products_update ON public.seller_products
  FOR UPDATE USING (profile_id = auth.uid());

DROP POLICY IF EXISTS seller_products_delete ON public.seller_products;
CREATE POLICY seller_products_delete ON public.seller_products
  FOR DELETE USING (profile_id = auth.uid());

-- seller_rd_services: users can manage their own
DROP POLICY IF EXISTS seller_rd_services_select ON public.seller_rd_services;
CREATE POLICY seller_rd_services_select ON public.seller_rd_services
  FOR SELECT USING (seller_profile_id IN (
    SELECT id FROM public.seller_profiles WHERE profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS seller_rd_services_insert ON public.seller_rd_services;
CREATE POLICY seller_rd_services_insert ON public.seller_rd_services
  FOR INSERT WITH CHECK (seller_profile_id IN (
    SELECT id FROM public.seller_profiles WHERE profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS seller_rd_services_update ON public.seller_rd_services;
CREATE POLICY seller_rd_services_update ON public.seller_rd_services
  FOR UPDATE USING (seller_profile_id IN (
    SELECT id FROM public.seller_profiles WHERE profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS seller_rd_services_delete ON public.seller_rd_services;
CREATE POLICY seller_rd_services_delete ON public.seller_rd_services
  FOR DELETE USING (seller_profile_id IN (
    SELECT id FROM public.seller_profiles WHERE profile_id = auth.uid()
  ));
