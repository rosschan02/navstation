-- Migration: Add icon fields to categories table
-- Run this if your database already exists

-- Add new columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(100) DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_bg VARCHAR(100) DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_color VARCHAR(100) DEFAULT '';

-- Update existing categories with default icons
UPDATE categories SET icon = 'search', icon_bg = 'bg-blue-100', icon_color = 'text-blue-600' WHERE name = 'Search Engines' AND (icon IS NULL OR icon = '');
UPDATE categories SET icon = 'terminal', icon_bg = 'bg-purple-100', icon_color = 'text-purple-600' WHERE name = 'Developer Tools' AND (icon IS NULL OR icon = '');
UPDATE categories SET icon = 'palette', icon_bg = 'bg-pink-100', icon_color = 'text-pink-600' WHERE name = 'Design Resources' AND (icon IS NULL OR icon = '');
UPDATE categories SET icon = 'forum', icon_bg = 'bg-indigo-100', icon_color = 'text-indigo-600' WHERE name = 'Social Media' AND (icon IS NULL OR icon = '');
UPDATE categories SET icon = 'shopping_bag', icon_bg = 'bg-orange-100', icon_color = 'text-orange-600' WHERE name = 'Shopping' AND (icon IS NULL OR icon = '');
UPDATE categories SET icon = 'sports_esports', icon_bg = 'bg-red-100', icon_color = 'text-red-600' WHERE name = 'Entertainment' AND (icon IS NULL OR icon = '');
UPDATE categories SET icon = 'folder', icon_bg = 'bg-slate-100', icon_color = 'text-slate-600' WHERE name = 'Other' AND (icon IS NULL OR icon = '');
