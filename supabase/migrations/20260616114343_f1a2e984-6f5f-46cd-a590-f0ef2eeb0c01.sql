ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS long_description_ar text,
  ADD COLUMN IF NOT EXISTS long_description_en text,
  ADD COLUMN IF NOT EXISTS specs_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specs_en jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.products SET
  name_ar = COALESCE(name_ar, name),
  name_en = COALESCE(name_en, name),
  description_ar = COALESCE(description_ar, description),
  description_en = COALESCE(description_en, description),
  long_description_ar = COALESCE(long_description_ar, long_description),
  long_description_en = COALESCE(long_description_en, long_description),
  specs_ar = CASE WHEN specs_ar = '[]'::jsonb AND specs IS NOT NULL THEN specs ELSE specs_ar END,
  specs_en = CASE WHEN specs_en = '[]'::jsonb AND specs IS NOT NULL THEN specs ELSE specs_en END;