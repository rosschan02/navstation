-- Add sort_order column to software table
ALTER TABLE software ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_software_sort_order ON software(sort_order);
