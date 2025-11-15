-- Migration: Add quantity and low_stock_threshold to products table
-- Date: 2025-11-14
-- Description: Add stock management fields to products for inventory tracking

-- Add quantity column to products table for stock management
ALTER TABLE products
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0;

-- Add comment to quantity column
COMMENT ON COLUMN products.quantity IS 'Stock quantity available for this product';

-- Create index on quantity for efficient low stock queries
CREATE INDEX idx_products_quantity ON products(quantity);

-- Add low_stock_threshold column for alerting when stock is low
ALTER TABLE products
ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;

COMMENT ON COLUMN products.low_stock_threshold IS 'Alert threshold for low stock notifications';

-- Update existing products to have a default quantity
-- You can adjust these values as needed for your existing products
UPDATE products SET quantity = 100 WHERE quantity = 0;

-- Create trigger function to ensure quantity never goes below 0
CREATE OR REPLACE FUNCTION check_product_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Product quantity cannot be negative. Current: %, Attempted: %', OLD.quantity, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce positive quantity
CREATE TRIGGER ensure_positive_quantity
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION check_product_quantity();

-- Optional: Create a view to show low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT
  id,
  title,
  price,
  quantity,
  low_stock_threshold,
  (quantity <= low_stock_threshold) as is_low_stock,
  created_at,
  updated_at
FROM products
WHERE quantity <= low_stock_threshold
ORDER BY quantity ASC;

COMMENT ON VIEW low_stock_products IS 'Products that are at or below their low stock threshold';

-- Optional: Function to decrease product quantity (for order processing)
CREATE OR REPLACE FUNCTION decrease_product_quantity(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  new_quantity INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Get current quantity
  SELECT products.quantity INTO v_current_quantity
  FROM products
  WHERE id = p_product_id;

  -- Check if product exists
  IF v_current_quantity IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Product not found'::TEXT;
    RETURN;
  END IF;

  -- Check if sufficient quantity
  IF v_current_quantity < p_quantity THEN
    RETURN QUERY SELECT FALSE, v_current_quantity,
      format('Insufficient stock. Available: %s, Requested: %s', v_current_quantity, p_quantity)::TEXT;
    RETURN;
  END IF;

  -- Update quantity
  UPDATE products
  SET quantity = quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id
  RETURNING quantity INTO v_new_quantity;

  RETURN QUERY SELECT TRUE, v_new_quantity, 'Quantity updated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION decrease_product_quantity IS 'Safely decrease product quantity with validation';

-- Optional: Function to increase product quantity (for restocking)
CREATE OR REPLACE FUNCTION increase_product_quantity(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  new_quantity INTEGER,
  message TEXT
) AS $$
DECLARE
  v_new_quantity INTEGER;
BEGIN
  -- Update quantity
  UPDATE products
  SET quantity = quantity + p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id
  RETURNING quantity INTO v_new_quantity;

  -- Check if product was updated
  IF v_new_quantity IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Product not found'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_new_quantity, 'Quantity updated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increase_product_quantity IS 'Safely increase product quantity for restocking';
