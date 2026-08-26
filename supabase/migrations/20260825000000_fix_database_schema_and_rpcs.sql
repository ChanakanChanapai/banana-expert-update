-- ==============================================================================
-- Migration: Add missing tables, columns, RPC functions, and storage bucket
-- ==============================================================================

-- 1. Extend orders table with missing columns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS carrier TEXT;

-- 2. Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product images" 
ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Farm owners can insert product images" 
ON public.product_images FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id AND p.farm_id = auth.uid()
  )
);

CREATE POLICY "Farm owners can delete product images" 
ON public.product_images FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id AND p.farm_id = auth.uid()
  )
);

-- 3. Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  receiver_name TEXT,
  receiver_phone TEXT,
  delivery_address TEXT,
  expected_delivery_date DATE,
  note TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and farms can view relevant reservations" 
ON public.reservations FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = reservations.product_id AND p.farm_id = auth.uid()
  )
);

CREATE POLICY "Users can create reservations" 
ON public.reservations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and farms can update relevant reservations" 
ON public.reservations FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = reservations.product_id AND p.farm_id = auth.uid()
  )
);

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- 4. RPC Functions
-- ==============================================================================

-- 4.1 Upgrade user account to farm
CREATE OR REPLACE FUNCTION public.upgrade_to_farm()
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _user_name TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT full_name INTO _user_name FROM public.profiles WHERE id = _user_id;

  -- Upsert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'farm')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create farm profile if not exists
  INSERT INTO public.farm_profiles (user_id, farm_name, farm_location, verified)
  VALUES (_user_id, COALESCE(_user_name, 'My Farm') || ' Farm', 'ประเทศไทย', true)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- 4.2 Create product secure
CREATE OR REPLACE FUNCTION public.create_product_secure(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_product_type product_type DEFAULT 'fruit',
  p_price NUMERIC DEFAULT 0,
  p_quantity INTEGER DEFAULT 0,
  p_unit TEXT DEFAULT 'kg',
  p_harvest_date DATE DEFAULT CURRENT_DATE,
  p_expiry_date DATE DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _product_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.products (
    farm_id,
    name,
    description,
    product_type,
    price_per_unit,
    available_quantity,
    unit,
    harvest_date,
    expiry_date,
    image_url,
    is_active
  )
  VALUES (
    _user_id,
    p_name,
    p_description,
    p_product_type,
    p_price,
    p_quantity,
    p_unit,
    p_harvest_date,
    p_expiry_date,
    p_image_url,
    true
  )
  RETURNING id INTO _product_id;

  RETURN _product_id;
END;
$$;

-- 4.3 Update product secure
CREATE OR REPLACE FUNCTION public.update_product_secure(
  p_product_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_product_type product_type DEFAULT 'fruit',
  p_price NUMERIC DEFAULT 0,
  p_quantity INTEGER DEFAULT 0,
  p_unit TEXT DEFAULT 'kg',
  p_harvest_date DATE DEFAULT CURRENT_DATE,
  p_expiry_date DATE DEFAULT NULL,
  p_image_path TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.products
  SET
    name = p_name,
    description = p_description,
    product_type = p_product_type,
    price_per_unit = p_price,
    available_quantity = p_quantity,
    unit = p_unit,
    harvest_date = p_harvest_date,
    expiry_date = p_expiry_date,
    image_url = COALESCE(p_image_path, image_url),
    updated_at = NOW()
  WHERE id = p_product_id AND farm_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or permission denied';
  END IF;
END;
$$;

-- 4.4 Toggle product active
CREATE OR REPLACE FUNCTION public.toggle_product_active(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _current_status BOOLEAN;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_active INTO _current_status 
  FROM public.products 
  WHERE id = p_product_id AND farm_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or permission denied';
  END IF;

  UPDATE public.products
  SET is_active = NOT _current_status,
      updated_at = NOW()
  WHERE id = p_product_id AND farm_id = _user_id;

  RETURN NOT _current_status;
END;
$$;

-- 4.5 Delete product owned
CREATE OR REPLACE FUNCTION public.delete_product_owned(p_product_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.products
  WHERE id = p_product_id AND farm_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or permission denied';
  END IF;
END;
$$;

-- 4.6 Reserve product (reserve_v5)
CREATE OR REPLACE FUNCTION public.reserve_v5(
  p_product_id UUID,
  p_quantity INTEGER,
  p_note TEXT DEFAULT NULL,
  p_use_profile BOOLEAN DEFAULT FALSE,
  p_receiver_name TEXT DEFAULT NULL,
  p_receiver_phone TEXT DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _prod public.products%ROWTYPE;
  _prof public.profiles%ROWTYPE;
  _reservation_id UUID;
  _receiver_name TEXT := p_receiver_name;
  _receiver_phone TEXT := p_receiver_phone;
  _delivery_address TEXT := p_delivery_address;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _prod FROM public.products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF _prod.available_quantity < p_quantity THEN
    RAISE EXCEPTION 'สินค้าในสต็อกไม่เพียงพอ';
  END IF;

  IF p_use_profile THEN
    SELECT * INTO _prof FROM public.profiles WHERE id = _user_id;
    _receiver_name := COALESCE(_receiver_name, _prof.full_name);
    _receiver_phone := COALESCE(_receiver_phone, _prof.phone);
    _delivery_address := COALESCE(_delivery_address, _prof.address);
  END IF;

  -- Deduct quantity from product stock
  UPDATE public.products
  SET available_quantity = available_quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id;

  -- Create reservation
  INSERT INTO public.reservations (
    user_id,
    product_id,
    quantity,
    total_price,
    status,
    receiver_name,
    receiver_phone,
    delivery_address,
    note
  )
  VALUES (
    _user_id,
    p_product_id,
    p_quantity,
    (_prod.price_per_unit * p_quantity),
    'pending',
    _receiver_name,
    _receiver_phone,
    _delivery_address,
    p_note
  )
  RETURNING id INTO _reservation_id;

  RETURN _reservation_id;
END;
$$;

-- 4.7 Confirm reservation
CREATE OR REPLACE FUNCTION public.confirm_reservation(p_reservation_id UUID)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _res public.reservations%ROWTYPE;
  _prod public.products%ROWTYPE;
  _order_id UUID;
  _order_num TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _res FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  SELECT * INTO _prod FROM public.products WHERE id = _res.product_id;

  IF _prod.farm_id != _user_id THEN
    RAISE EXCEPTION 'Only the farm owner can confirm this reservation';
  END IF;

  _order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(_res.id::TEXT FROM 1 FOR 6);

  -- Create order
  INSERT INTO public.orders (
    user_id,
    farm_id,
    product_id,
    quantity,
    total_price,
    status,
    delivery_address,
    order_number,
    confirmed_at
  )
  VALUES (
    _res.user_id,
    _prod.farm_id,
    _res.product_id,
    _res.quantity,
    COALESCE(_res.total_price, _prod.price_per_unit * _res.quantity),
    'confirmed',
    COALESCE(_res.delivery_address, 'ไม่มีที่อยู่จัดส่ง'),
    _order_num,
    NOW()
  )
  RETURNING id INTO _order_id;

  -- Update reservation status
  UPDATE public.reservations
  SET status = 'confirmed',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  RETURN _order_id;
END;
$$;

-- 4.8 Cancel reservation
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _res public.reservations%ROWTYPE;
  _prod public.products%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _res FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  SELECT * INTO _prod FROM public.products WHERE id = _res.product_id;

  IF _res.user_id != _user_id AND _prod.farm_id != _user_id THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Return stock if pending
  IF _res.status = 'pending' THEN
    UPDATE public.products
    SET available_quantity = available_quantity + _res.quantity,
        updated_at = NOW()
    WHERE id = _res.product_id;
  END IF;

  -- Update reservation
  UPDATE public.reservations
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = _user_id,
      cancel_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_reservation_id;
END;
$$;

-- 4.9 Insert review
CREATE OR REPLACE FUNCTION public.insert_review(
  p_order_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _ord public.orders%ROWTYPE;
  _avg_rating NUMERIC;
  _count_reviews INTEGER;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _ord FROM public.orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _ord.user_id != _user_id THEN
    RAISE EXCEPTION 'Permission denied: Not your order';
  END IF;

  -- Insert review
  INSERT INTO public.reviews (order_id, user_id, farm_id, rating, comment)
  VALUES (p_order_id, _user_id, _ord.farm_id, p_rating, p_comment);

  -- Update order status
  UPDATE public.orders
  SET status = 'reviewed',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Recalculate farm rating
  SELECT AVG(rating)::NUMERIC(2,1), COUNT(*)
  INTO _avg_rating, _count_reviews
  FROM public.reviews
  WHERE farm_id = _ord.farm_id;

  UPDATE public.farm_profiles
  SET rating = _avg_rating,
      total_reviews = _count_reviews,
      updated_at = NOW()
  WHERE user_id = _ord.farm_id;
END;
$$;

-- 4.10 Get farm dashboard stats
CREATE OR REPLACE FUNCTION public.get_farm_dashboard_stats()
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _active_products INTEGER := 0;
  _total_orders INTEGER := 0;
  _pending_orders INTEGER := 0;
  _total_sales NUMERIC := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*) INTO _active_products
  FROM public.products
  WHERE farm_id = _user_id AND is_active = true;

  SELECT COUNT(*) INTO _total_orders
  FROM public.orders
  WHERE farm_id = _user_id;

  SELECT COUNT(*) INTO _pending_orders
  FROM public.orders
  WHERE farm_id = _user_id AND status = 'pending';

  SELECT COALESCE(SUM(total_price), 0) INTO _total_sales
  FROM public.orders
  WHERE farm_id = _user_id AND status IN ('confirmed', 'shipped', 'delivered', 'reviewed');

  RETURN json_build_object(
    'activeProducts', _active_products,
    'totalOrders', _total_orders,
    'pendingOrders', _pending_orders,
    'totalSales', _total_sales
  );
END;
$$;

-- ==============================================================================
-- 5. Storage Buckets & Policies
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read
CREATE POLICY "Public read for product-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Policy to allow authenticated uploads
CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Policy to allow owners to delete
CREATE POLICY "Users can update or delete own product images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
