-- Shopify-Level Admin Dashboard Upgrade Migration
-- Execute this script in your Supabase SQL Editor.

-- 1. PRODUCTS EXTENSIONS
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS specifications JSONB,
ADD COLUMN IF NOT EXISTS material VARCHAR(255),
ADD COLUMN IF NOT EXISTS character_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS brand VARCHAR(255),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords VARCHAR(255),
ADD COLUMN IF NOT EXISTS seo_og_image TEXT,
ADD COLUMN IF NOT EXISTS seo_canonical_url TEXT,
ADD COLUMN IF NOT EXISTS manual_sold_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_limited_edition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_hot_selling BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_delivery_days INT DEFAULT 7,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_is_free BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS shipping_dispatch_time VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_ships_from VARCHAR(255),
ADD COLUMN IF NOT EXISTS shipping_packaging_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS reserved_stock INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS incoming_stock INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS out_of_stock_behavior VARCHAR(50) DEFAULT 'show_badge',
ADD COLUMN IF NOT EXISTS manual_rating DECIMAL(3, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_rating_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_5_star INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_4_star INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_3_star INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_2_star INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS manual_1_star INT DEFAULT 0;

-- 2. CATEGORIES EXTENSIONS
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 3. REVIEWS EXTENSIONS
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_photo_url TEXT,
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0;

-- 4. ORDERS EXTENSIONS
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;

-- 5. USERS EXTENSIONS
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 6. CREATE MARKETING TABLES
CREATE TABLE IF NOT EXISTS marketing_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position VARCHAR(100) NOT NULL,
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(50) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2),
    max_discount_value DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    usage_limit INT,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing orders to have a basic timeline if they are missing one
UPDATE orders SET timeline = jsonb_build_array(jsonb_build_object('status', 'Pending', 'date', created_at, 'note', 'Order placed successfully')) WHERE timeline IS NULL OR timeline = '[]'::jsonb;
