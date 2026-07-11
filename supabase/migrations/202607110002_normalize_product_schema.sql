-- 202607110002_normalize_product_schema.sql
-- Normalize product schema for Enterprise PIM
-- As requested: No giant JSON blobs. Every UI field must have backend mapping.

-- 1. Extend seller_products with core properties (if not exist)
ALTER TABLE seller_products
ADD COLUMN IF NOT EXISTS price_type text DEFAULT 'ask_for_price',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'per_piece',
ADD COLUMN IF NOT EXISTS min_price numeric,
ADD COLUMN IF NOT EXISTS max_price numeric,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS country_of_origin text,
ADD COLUMN IF NOT EXISTS third_party_inspection boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS free_sample boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sample_shipping_cost text,
ADD COLUMN IF NOT EXISTS delivery_terms text,
ADD COLUMN IF NOT EXISTS weight_value numeric,
ADD COLUMN IF NOT EXISTS weight_unit text,
ADD COLUMN IF NOT EXISTS dim_length numeric,
ADD COLUMN IF NOT EXISTS dim_width numeric,
ADD COLUMN IF NOT EXISTS dim_height numeric,
ADD COLUMN IF NOT EXISTS dim_unit text,
ADD COLUMN IF NOT EXISTS shipping_type text DEFAULT 'packed',
ADD COLUMN IF NOT EXISTS primary_packaging text,
ADD COLUMN IF NOT EXISTS secondary_packaging text,
ADD COLUMN IF NOT EXISTS packaging_notes text,
ADD COLUMN IF NOT EXISTS quality_certificate text,
ADD COLUMN IF NOT EXISTS brand_marking text,
ADD COLUMN IF NOT EXISTS brand_marking_other text,
ADD COLUMN IF NOT EXISTS dies_and_tools text,
ADD COLUMN IF NOT EXISTS estimated_tool_cost numeric,
ADD COLUMN IF NOT EXISTS tool_ownership text,
ADD COLUMN IF NOT EXISTS tool_lead_time text,
ADD COLUMN IF NOT EXISTS specification text;

-- 2. Create proper normalized tables for many-to-many relationships

CREATE TABLE IF NOT EXISTS product_images (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_product_id uuid REFERENCES seller_products(id) ON DELETE CASCADE,
    url text NOT NULL,
    storage_path text NOT NULL,
    is_primary boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_capabilities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_product_id uuid REFERENCES seller_products(id) ON DELETE CASCADE,
    capability_id text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(seller_product_id, capability_id)
);

CREATE TABLE IF NOT EXISTS product_industries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_product_id uuid REFERENCES seller_products(id) ON DELETE CASCADE,
    industry_id text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(seller_product_id, industry_id)
);

CREATE TABLE IF NOT EXISTS product_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_product_id uuid REFERENCES seller_products(id) ON DELETE CASCADE,
    material_name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(seller_product_id, material_name)
);

CREATE TABLE IF NOT EXISTS product_grades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_product_id uuid REFERENCES seller_products(id) ON DELETE CASCADE,
    grade_name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(seller_product_id, grade_name)
);

CREATE TABLE IF NOT EXISTS product_payment_terms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_product_id uuid REFERENCES seller_products(id) ON DELETE CASCADE,
    payment_term_id text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(seller_product_id, payment_term_id)
);

CREATE TABLE IF NOT EXISTS product_incoterms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_product_id uuid REFERENCES seller_products(id) ON DELETE CASCADE,
    incoterm_id text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(seller_product_id, incoterm_id)
);

-- RLS Policies for new tables
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_incoterms ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone, write for authenticated owner via seller_products
-- (Skipping detailed RLS here for brevity, usually done via joining seller_products profile_id)
CREATE OR REPLACE FUNCTION check_product_owner(product_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM seller_products
    WHERE id = product_id AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply basic RLS
CREATE POLICY "Public Read" ON product_images FOR SELECT USING (true);
CREATE POLICY "Owner Write" ON product_images FOR ALL USING (check_product_owner(seller_product_id));

CREATE POLICY "Public Read" ON product_capabilities FOR SELECT USING (true);
CREATE POLICY "Owner Write" ON product_capabilities FOR ALL USING (check_product_owner(seller_product_id));

CREATE POLICY "Public Read" ON product_industries FOR SELECT USING (true);
CREATE POLICY "Owner Write" ON product_industries FOR ALL USING (check_product_owner(seller_product_id));

CREATE POLICY "Public Read" ON product_materials FOR SELECT USING (true);
CREATE POLICY "Owner Write" ON product_materials FOR ALL USING (check_product_owner(seller_product_id));

CREATE POLICY "Public Read" ON product_grades FOR SELECT USING (true);
CREATE POLICY "Owner Write" ON product_grades FOR ALL USING (check_product_owner(seller_product_id));

CREATE POLICY "Public Read" ON product_payment_terms FOR SELECT USING (true);
CREATE POLICY "Owner Write" ON product_payment_terms FOR ALL USING (check_product_owner(seller_product_id));

CREATE POLICY "Public Read" ON product_incoterms FOR SELECT USING (true);
CREATE POLICY "Owner Write" ON product_incoterms FOR ALL USING (check_product_owner(seller_product_id));


-- 3. Create Atomic RPC for Draft Initialization
CREATE OR REPLACE FUNCTION initialize_product_draft(
    p_product_name text DEFAULT 'Draft Product',
    p_is_visible boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_seller_profile_id uuid;
    v_product_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 1. Get company ID
    SELECT id INTO v_company_id
    FROM companies
    WHERE owner_id = v_user_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'SELLER_PROFILE_INCOMPLETE';
    END IF;

    -- 2. Ensure seller profile exists atomically
    INSERT INTO seller_profiles (profile_id, company_id)
    VALUES (v_user_id, v_company_id)
    ON CONFLICT (profile_id) DO NOTHING;

    SELECT id INTO v_seller_profile_id
    FROM seller_profiles
    WHERE profile_id = v_user_id;

    -- 3. Create product draft
    INSERT INTO seller_products (
        seller_profile_id,
        company_id,
        profile_id,
        product_name,
        approval_status,
        is_published,
        is_visible,
        created_by
    ) VALUES (
        v_seller_profile_id,
        v_company_id,
        v_user_id,
        p_product_name,
        'draft',
        false,
        p_is_visible,
        v_user_id
    ) RETURNING id INTO v_product_id;

    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
