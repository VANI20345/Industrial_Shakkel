-- Batch 1: Canned Responses table
-- Run this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_en text NOT NULL,
  body_ar text NOT NULL,
  body_en text NOT NULL,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.canned_responses TO authenticated;
GRANT ALL ON public.canned_responses TO service_role;

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read canned" ON public.canned_responses;
CREATE POLICY "admins read canned" ON public.canned_responses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins write canned" ON public.canned_responses;
CREATE POLICY "admins write canned" ON public.canned_responses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed a few common templates (idempotent on title_en)
INSERT INTO public.canned_responses (title_ar, title_en, body_ar, body_en, category, sort_order)
VALUES
  ('استلام الطلب', 'Quote received',
   'شكراً لتواصلك مع شَكَّل. استلمنا طلبك وسيتم الرد عليك خلال 24 ساعة عمل.',
   'Thank you for contacting Shakkel. We received your request and will reply within 24 business hours.',
   'general', 1),
  ('طلب توضيح', 'Request clarification',
   'نحتاج بعض التوضيحات الإضافية حول طلبك حتى نتمكن من تقديم أفضل عرض. هل يمكنك تزويدنا بـ:',
   'We need a few additional details about your request to provide the best quote. Could you please share:',
   'quotes', 2),
  ('عرض السعر جاهز', 'Quote ready',
   'يسعدنا إرفاق عرض الأسعار. العرض ساري لمدة 14 يوماً. للاستفسار لا تتردد بالتواصل.',
   'Please find the attached quotation. The quote is valid for 14 days. Reach out anytime for questions.',
   'quotes', 3)
ON CONFLICT DO NOTHING;
