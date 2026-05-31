-- =========================================================
-- شَكَّل / SHAKKEL — Security & Replies migration
-- (Apply AFTER SETUP.sql)
-- =========================================================

-- 1) Contact messages: link to user, status, read flag
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','in_review','replied','closed')),
  ADD COLUMN IF NOT EXISTS is_read_by_user BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_contact_messages_user ON public.contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);

DROP TRIGGER IF EXISTS trg_contact_messages_updated ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_updated
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Owners can view their messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Owners can update read flag" ON public.contact_messages;

CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can view their messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Owners can update read flag"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contact messages"
  ON public.contact_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Contact message replies (thread)
CREATE TABLE IF NOT EXISTS public.contact_message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_message_id UUID NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin','customer')),
  sender_name TEXT,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmr_message ON public.contact_message_replies(contact_message_id);
ALTER TABLE public.contact_message_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner or admin can view replies" ON public.contact_message_replies;
DROP POLICY IF EXISTS "Admins can insert replies" ON public.contact_message_replies;

CREATE POLICY "Owner or admin can view replies"
  ON public.contact_message_replies FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.contact_messages m
      WHERE m.id = contact_message_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert replies"
  ON public.contact_message_replies FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND sender_id = auth.uid()
    AND sender_role = 'admin'
  );

CREATE OR REPLACE FUNCTION public.handle_new_message_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender_role = 'admin' THEN
    UPDATE public.contact_messages
       SET is_read_by_user = false,
           status = CASE WHEN status IN ('closed') THEN status ELSE 'replied' END,
           updated_at = now()
     WHERE id = NEW.contact_message_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_new_message_reply ON public.contact_message_replies;
CREATE TRIGGER trg_new_message_reply
  AFTER INSERT ON public.contact_message_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_reply();

-- 3) product_images: only readable for active products (anti-leak)
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Public can view active product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins manage product images" ON public.product_images;

CREATE POLICY "Public can view active product images"
  ON public.product_images FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.is_active = true AND p.status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage product images"
  ON public.product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Atomic create_quote_with_items RPC (prevents orphans)
CREATE OR REPLACE FUNCTION public.create_quote_with_items(
  _quote JSONB,
  _items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;

  INSERT INTO public.quote_requests (
    customer_id, customer_name, company_name, email, phone,
    preferred_contact_method, notes
  )
  VALUES (
    auth.uid(),
    _quote->>'customer_name',
    NULLIF(_quote->>'company_name',''),
    _quote->>'email',
    NULLIF(_quote->>'phone',''),
    COALESCE((_quote->>'preferred_contact_method')::contact_method, 'email'),
    NULLIF(_quote->>'notes','')
  )
  RETURNING id INTO v_id;

  INSERT INTO public.quote_request_items
    (quote_request_id, product_id, product_code, product_name, requested_quantity, unit)
  SELECT
    v_id,
    NULLIF(item->>'product_id','')::uuid,
    item->>'product_code',
    item->>'product_name',
    (item->>'requested_quantity')::int,
    COALESCE(item->>'unit','pcs')
  FROM jsonb_array_elements(_items) AS item;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'no items inserted';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quote_with_items(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_quote_with_items(JSONB, JSONB) TO authenticated;
