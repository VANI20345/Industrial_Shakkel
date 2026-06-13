-- Run this in the Supabase SQL editor
-- Adds bilingual names to categories

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.categories SET name_en = COALESCE(name_en, name);
UPDATE public.categories SET name_ar = COALESCE(name_ar, name);
