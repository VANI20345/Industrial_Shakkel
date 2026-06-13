
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.quote_status AS ENUM ('new','under_review','quotation_sent','waiting_customer_approval','deal_completed','cancelled','rejected');
CREATE TYPE public.stock_movement_type AS ENUM ('in','out','adjustment');
CREATE TYPE public.contact_method AS ENUM ('whatsapp','email','website');
CREATE TYPE public.product_status AS ENUM ('active','inactive');

-- =========================================
-- UTIL: updated_at trigger fn
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- =========================================
-- AUTO PROFILE + ROLE on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name, email, phone, city)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'company_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- BRANDS
-- =========================================
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- PRODUCTS
-- =========================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  datasheet_url TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  min_order_qty INT NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  status product_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- PRODUCT IMAGES
-- =========================================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- =========================================
-- QUOTE REQUESTS
-- =========================================
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact_method contact_method NOT NULL DEFAULT 'email',
  status quote_status NOT NULL DEFAULT 'new',
  notes TEXT,
  stock_deducted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quote_requests_customer ON public.quote_requests(customer_id);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
CREATE TRIGGER trg_quote_requests_updated BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- QUOTE REQUEST ITEMS
-- =========================================
CREATE TABLE public.quote_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  requested_quantity INT NOT NULL CHECK (requested_quantity > 0),
  unit TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quote_items_request ON public.quote_request_items(quote_request_id);
CREATE INDEX idx_quote_items_product ON public.quote_request_items(product_id);

-- =========================================
-- STOCK MOVEMENTS
-- =========================================
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  movement_type stock_movement_type NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  old_quantity INT NOT NULL,
  new_quantity INT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);

-- =========================================
-- CONTACT MESSAGES
-- =========================================
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES
-- =========================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- brands
CREATE POLICY "Public read active brands" ON public.brands FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- categories
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- products
CREATE POLICY "Public read active products" ON public.products FOR SELECT
  USING ((is_active = true AND status = 'active') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- product_images
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- quote_requests
CREATE POLICY "Customers view own quotes" ON public.quote_requests FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated create own quotes" ON public.quote_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins update quotes" ON public.quote_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete quotes" ON public.quote_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- quote_request_items
CREATE POLICY "View own quote items" ON public.quote_request_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_request_id
      AND (q.customer_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Insert items into own quotes" ON public.quote_request_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_request_id AND q.customer_id = auth.uid())
  );
CREATE POLICY "Admins manage quote items" ON public.quote_request_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- stock_movements (admin only)
CREATE POLICY "Admins view stock movements" ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert stock movements" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- contact_messages
CREATE POLICY "Anyone can submit contact" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read contact" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================
-- AUTO STOCK DEDUCTION ON deal_completed
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_quote_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item RECORD;
  current_stock INT;
  uid UUID := auth.uid();
BEGIN
  IF NEW.status = 'deal_completed' AND (OLD.status IS DISTINCT FROM 'deal_completed') AND NEW.stock_deducted = false THEN
    -- Validate stock
    FOR item IN SELECT product_id, requested_quantity, product_name FROM public.quote_request_items WHERE quote_request_id = NEW.id LOOP
      IF item.product_id IS NULL THEN CONTINUE; END IF;
      SELECT stock_qty INTO current_stock FROM public.products WHERE id = item.product_id FOR UPDATE;
      IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product % no longer exists', item.product_name;
      END IF;
      IF current_stock < item.requested_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
          item.product_name, current_stock, item.requested_quantity;
      END IF;
    END LOOP;

    -- Deduct
    FOR item IN SELECT product_id, requested_quantity FROM public.quote_request_items WHERE quote_request_id = NEW.id LOOP
      IF item.product_id IS NULL THEN CONTINUE; END IF;
      SELECT stock_qty INTO current_stock FROM public.products WHERE id = item.product_id FOR UPDATE;
      UPDATE public.products SET stock_qty = current_stock - item.requested_quantity WHERE id = item.product_id;
      INSERT INTO public.stock_movements (product_id, quote_request_id, movement_type, quantity, old_quantity, new_quantity, reason, created_by)
      VALUES (item.product_id, NEW.id, 'out', item.requested_quantity, current_stock, current_stock - item.requested_quantity,
              'Deal completed for quote ' || NEW.id::text, uid);
    END LOOP;

    NEW.stock_deducted := true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_quote_status_change BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_quote_status_change();

-- =========================================
-- ADMIN STOCK RPCs
-- =========================================
CREATE OR REPLACE FUNCTION public.add_stock(_product_id UUID, _qty INT, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_q INT; uid UUID := auth.uid();
BEGIN
  IF NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'Only admins can modify stock'; END IF;
  IF _qty <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  SELECT stock_qty INTO old_q FROM public.products WHERE id = _product_id FOR UPDATE;
  IF old_q IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  UPDATE public.products SET stock_qty = old_q + _qty WHERE id = _product_id;
  INSERT INTO public.stock_movements (product_id, movement_type, quantity, old_quantity, new_quantity, reason, created_by)
  VALUES (_product_id, 'in', _qty, old_q, old_q + _qty, COALESCE(_reason,'Stock added'), uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id UUID, _new_qty INT, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_q INT; uid UUID := auth.uid(); diff INT;
BEGIN
  IF NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'Only admins can modify stock'; END IF;
  IF _new_qty < 0 THEN RAISE EXCEPTION 'Stock cannot be negative'; END IF;
  SELECT stock_qty INTO old_q FROM public.products WHERE id = _product_id FOR UPDATE;
  IF old_q IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  diff := abs(_new_qty - old_q);
  IF diff = 0 THEN RETURN; END IF;
  UPDATE public.products SET stock_qty = _new_qty WHERE id = _product_id;
  INSERT INTO public.stock_movements (product_id, movement_type, quantity, old_quantity, new_quantity, reason, created_by)
  VALUES (_product_id, 'adjustment', diff, old_q, _new_qty, COALESCE(_reason,'Manual adjustment'), uid);
END;
$$;

-- =========================================
-- STORAGE BUCKETS
-- =========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos','brand-logos',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images','product-images',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('datasheets','datasheets',true) ON CONFLICT DO NOTHING;

-- Public read for these buckets
CREATE POLICY "Public read brand logos" ON storage.objects FOR SELECT USING (bucket_id = 'brand-logos');
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Public read datasheets" ON storage.objects FOR SELECT USING (bucket_id = 'datasheets');

-- Admin write to all 3 buckets
CREATE POLICY "Admins upload brand logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update brand logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete brand logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins upload datasheets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'datasheets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update datasheets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'datasheets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete datasheets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'datasheets' AND public.has_role(auth.uid(),'admin'));
