-- PRAJCRAFT SEED DATA
-- Note: Replace 'PASTE_YOUR_UUID_HERE' with your real auth.user UUID if testing customer features.

-- 1. Create a Category
INSERT INTO categories (name, slug) VALUES 
('Brass Idols', 'brass-idols'),
('Incense & Aromas', 'incense-aromas');

-- 2. Create Products
DO $$ 
DECLARE 
    brass_id UUID;
    incense_id UUID;
BEGIN
    SELECT id INTO brass_id FROM categories WHERE slug = 'brass-idols' LIMIT 1;
    SELECT id INTO incense_id FROM categories WHERE slug = 'incense-aromas' LIMIT 1;

    INSERT INTO products (name, slug, category_id, description, price, discount_price, stock, sku, status, is_featured, is_bestseller)
    VALUES 
    ('Sacred Emerald Ganesha', 'sacred-emerald-ganesha', brass_id, 'Limited Edition Sustainably Sourced Brass Idol.', 5999.00, 4999.00, 15, 'BRS-GAN-01', 'Active', true, true),
    
    ('Himalayan Cedarwood Incense', 'himalayan-cedarwood-incense', incense_id, '40 Sticks of natural resin for meditation.', 1200.00, 850.00, 50, 'INC-CED-40', 'Active', false, true);
END $$;

-- 3. Create Settings defaults
INSERT INTO settings (company_name, support_email, support_phone, whatsapp_number, address, shipping_charges, free_shipping_limit, tax_percentage, cod_enabled)
VALUES (
    'Prajcraft Divine Marketplace', 
    'support@prajcraft.com', 
    '+91-9876543210', 
    '+91-9876543210', 
    '123 Sacred Path, Vaikuntha', 
    100.00, 
    2000.00, 
    18.00, 
    true
);

-- 4. Create Banners
INSERT INTO banners (title, image_url, position, is_active, sort_order)
VALUES 
('Diwali Grand Sale', 'https://via.placeholder.com/1200x600?text=Diwali+Sale', 'Hero', true, 1),
('New Arrivals Collection', 'https://via.placeholder.com/800x400?text=New+Arrivals', 'Collection', true, 2);
