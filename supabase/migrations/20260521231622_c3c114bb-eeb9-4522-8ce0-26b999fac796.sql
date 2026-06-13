
-- Categories: optional image
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

-- Products: new fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shakkel_ref text,
  ADD COLUMN IF NOT EXISTS highlights text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Shakkel ref generator
CREATE OR REPLACE FUNCTION public.gen_shakkel_ref(_brand_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  abbr text;
  candidate text;
  attempts int := 0;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  rand text;
  i int;
BEGIN
  IF _brand_id IS NOT NULL THEN
    SELECT upper(substring(regexp_replace(slug, '[^a-zA-Z0-9]', '', 'g'), 1, 3))
      INTO abbr FROM public.brands WHERE id = _brand_id;
  END IF;
  IF abbr IS NULL OR length(abbr) = 0 THEN abbr := 'GEN'; END IF;

  LOOP
    rand := '';
    FOR i IN 1..6 LOOP
      rand := rand || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    candidate := 'SHK-' || abbr || '-' || rand;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.products WHERE shakkel_ref = candidate);
    attempts := attempts + 1;
    IF attempts > 20 THEN RAISE EXCEPTION 'Could not generate unique shakkel_ref'; END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Trigger to auto-fill shakkel_ref
CREATE OR REPLACE FUNCTION public.set_shakkel_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.shakkel_ref IS NULL OR length(trim(NEW.shakkel_ref)) = 0 THEN
    NEW.shakkel_ref := public.gen_shakkel_ref(NEW.brand_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_shakkel_ref ON public.products;
CREATE TRIGGER trg_products_shakkel_ref
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_shakkel_ref();

-- Backfill existing
UPDATE public.products
  SET shakkel_ref = public.gen_shakkel_ref(brand_id)
  WHERE shakkel_ref IS NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_shakkel_ref_key UNIQUE (shakkel_ref);

-- product_documents table
CREATE TABLE IF NOT EXISTS public.product_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_documents_product_id ON public.product_documents(product_id);

ALTER TABLE public.product_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view docs of active products"
  ON public.product_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_documents.product_id
        AND p.is_active = true
        AND p.status = 'active'
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage product documents"
  ON public.product_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for product documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-documents', 'product-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read product documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-documents');

CREATE POLICY "Admins upload product documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update product documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete product documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-documents' AND public.has_role(auth.uid(), 'admin'));
