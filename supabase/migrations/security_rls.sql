-- PRAJCRAFT Security Remediation (RLS Policies)
-- Run this in Supabase SQL Editor

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _role VARCHAR;
BEGIN
  SELECT role INTO _role FROM public.users WHERE id = auth.uid();
  RETURN coalesce(_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can do everything on users" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can do everything on users" ON public.users FOR ALL USING (public.is_admin());

-- 2. ADDRESSES
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.addresses;

CREATE POLICY "Users can manage their own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all addresses" ON public.addresses FOR ALL USING (public.is_admin());

-- 3. CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Categories admin all" ON public.categories;

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (is_hidden = false OR public.is_admin());
CREATE POLICY "Categories admin all" ON public.categories FOR ALL USING (public.is_admin());

-- 4. PRODUCTS & VARIANTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products viewable by public" ON public.products;
DROP POLICY IF EXISTS "Products admin all" ON public.products;

CREATE POLICY "Products viewable by public" ON public.products FOR SELECT USING (status = 'Active' OR public.is_admin());
CREATE POLICY "Products admin all" ON public.products FOR ALL USING (public.is_admin());

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Variants viewable by public" ON public.product_variants;
DROP POLICY IF EXISTS "Variants admin all" ON public.product_variants;

CREATE POLICY "Variants viewable by public" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Variants admin all" ON public.product_variants FOR ALL USING (public.is_admin());

-- 5. COUPONS & BANNERS
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coupons viewable by public" ON public.coupons;
DROP POLICY IF EXISTS "Coupons admin all" ON public.coupons;

CREATE POLICY "Coupons viewable by public" ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Coupons admin all" ON public.coupons FOR ALL USING (public.is_admin());

ALTER TABLE public.marketing_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Banners viewable by public" ON public.marketing_banners;
DROP POLICY IF EXISTS "Banners admin all" ON public.marketing_banners;

CREATE POLICY "Banners viewable by public" ON public.marketing_banners FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Banners admin all" ON public.marketing_banners FOR ALL USING (public.is_admin());

-- 6. ORDERS & ITEMS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Notice: NO INSERT policy for public users. They must use the backend secure API (`api/checkout.js`)
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id); -- E.g. marking as cancelled
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.is_admin());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL USING (public.is_admin());

-- 7. REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews viewable by public" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;

CREATE POLICY "Reviews viewable by public" ON public.reviews FOR SELECT USING (status = 'Approved' OR auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL USING (public.is_admin());

-- 8. STORAGE BUCKETS
-- Assumes a bucket named "products" exists
-- Note: Replace "products" with actual bucket name if different
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;

CREATE POLICY "Public can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admins can manage product images" ON storage.objects FOR ALL USING (bucket_id = 'products' AND public.is_admin());
