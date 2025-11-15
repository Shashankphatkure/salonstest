-- Simple Migration: Add quantity to products table
-- Run this in your Supabase SQL Editor

-- Step 1: Add quantity column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0;

-- Step 2: Add low stock threshold column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);

-- Step 4: Update existing products to have initial stock
UPDATE products SET quantity = 100 WHERE quantity = 0;

-- Done! Your products table now has quantity tracking.
