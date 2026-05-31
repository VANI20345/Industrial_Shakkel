
-- Tighten contact_messages insert policy
DROP POLICY IF EXISTS "Anyone can submit contact" ON public.contact_messages;
CREATE POLICY "Anyone can submit valid contact" ON public.contact_messages FOR INSERT
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 100
  AND length(trim(email)) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(trim(message)) BETWEEN 1 AND 2000
);

-- Lock down SECURITY DEFINER admin RPCs to authenticated only
REVOKE EXECUTE ON FUNCTION public.add_stock(UUID, INT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.adjust_stock(UUID, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_stock(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, INT, TEXT) TO authenticated;

-- has_role: restrict to authenticated (used inside RLS evaluation context)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
