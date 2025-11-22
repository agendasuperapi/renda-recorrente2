-- Add subtitle column to landing_announcement_banner table
ALTER TABLE landing_announcement_banner 
ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '';
