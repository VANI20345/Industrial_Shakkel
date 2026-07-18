ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS highlights_ar text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS highlights_en text[] NOT NULL DEFAULT '{}';

UPDATE public.products
  SET highlights_ar = highlights, highlights_en = highlights
  WHERE (highlights IS NOT NULL AND array_length(highlights, 1) > 0)
    AND (array_length(highlights_ar, 1) IS NULL)
    AND (array_length(highlights_en, 1) IS NULL);