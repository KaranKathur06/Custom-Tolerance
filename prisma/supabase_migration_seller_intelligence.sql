-- ============================================================
-- Seller Intelligence Fields Migration (v2 — IDEMPOTENT)
-- CustomTolerance — 2026-07-01
-- Safe to run on existing production DB multiple times.
-- Uses ADD COLUMN IF NOT EXISTS throughout.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. New columns on public.suppliers
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS business_nature          TEXT,
  ADD COLUMN IF NOT EXISTS seller_type_other        TEXT,
  ADD COLUMN IF NOT EXISTS years_in_business        TEXT,
  ADD COLUMN IF NOT EXISTS industries_served        TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS capabilities             TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS buyer_services           TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supplier_interests       TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_urls               TEXT[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS production_capacity_unit TEXT,
  ADD COLUMN IF NOT EXISTS factory_license_optional BOOLEAN   NOT NULL DEFAULT true;


-- ────────────────────────────────────────────────────────────
-- 2. GIN indexes on suppliers
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS suppliers_business_nature_idx
  ON public.suppliers (business_nature);

CREATE INDEX IF NOT EXISTS suppliers_industries_served_idx
  ON public.suppliers USING GIN (industries_served);

CREATE INDEX IF NOT EXISTS suppliers_capabilities_idx
  ON public.suppliers USING GIN (capabilities);

CREATE INDEX IF NOT EXISTS suppliers_buyer_services_idx
  ON public.suppliers USING GIN (buyer_services);

CREATE INDEX IF NOT EXISTS suppliers_supplier_interests_idx
  ON public.suppliers USING GIN (supplier_interests);


-- ────────────────────────────────────────────────────────────
-- 3. seller_buyer_services junction table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_buyer_services (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id TEXT        NOT NULL,
  service_name      TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seller_profile_id, service_name)
);

CREATE INDEX IF NOT EXISTS seller_buyer_services_profile_idx
  ON public.seller_buyer_services (seller_profile_id);


-- ────────────────────────────────────────────────────────────
-- 4. seller_interests junction table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_interests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id TEXT        NOT NULL,
  interest_name     TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seller_profile_id, interest_name)
);

CREATE INDEX IF NOT EXISTS seller_interests_profile_idx
  ON public.seller_interests (seller_profile_id);


-- ────────────────────────────────────────────────────────────
-- 5. seller_products — create table if not exists,
--    then ADD COLUMN IF NOT EXISTS for every column
--    (handles the case where the table exists but is missing columns)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_products (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id        TEXT        NOT NULL,
  company_id               TEXT,
  profile_id               TEXT        NOT NULL,
  product_name             TEXT        NOT NULL DEFAULT '',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add all columns individually — safe if they already exist
ALTER TABLE public.seller_products
  ADD COLUMN IF NOT EXISTS seller_profile_id        TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_id               TEXT,
  ADD COLUMN IF NOT EXISTS profile_id               TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS product_name             TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS capability               TEXT,
  ADD COLUMN IF NOT EXISTS materials                TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tolerance_capability     TEXT,
  ADD COLUMN IF NOT EXISTS monthly_capacity         TEXT,
  ADD COLUMN IF NOT EXISTS production_capacity_unit TEXT        NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS moq                      TEXT,
  ADD COLUMN IF NOT EXISTS lead_time                TEXT,
  ADD COLUMN IF NOT EXISTS custom_tolerance         TEXT,
  ADD COLUMN IF NOT EXISTS is_featured              BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_visible               BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by               TEXT,
  ADD COLUMN IF NOT EXISTS updated_at               TIMESTAMPTZ NOT NULL DEFAULT now();

-- Indexes on seller_products
CREATE INDEX IF NOT EXISTS seller_products_profile_idx
  ON public.seller_products (seller_profile_id);

CREATE INDEX IF NOT EXISTS seller_products_profile_id_idx
  ON public.seller_products (profile_id);

CREATE INDEX IF NOT EXISTS seller_products_is_featured_idx
  ON public.seller_products (is_featured);

CREATE INDEX IF NOT EXISTS seller_products_materials_idx
  ON public.seller_products USING GIN (materials);


-- ────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.seller_buyer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_interests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_products       ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- Done. All statements are idempotent — safe to re-run.
-- ============================================================
