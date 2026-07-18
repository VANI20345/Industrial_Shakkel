-- Add admin_links column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_links JSONB DEFAULT '[]'::jsonb;
