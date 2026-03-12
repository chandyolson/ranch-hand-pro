-- Add calf_tag and calf_tag_color directly to calving_records
-- This stores the tag at entry time so it displays even without a calf animal record
-- (dead calves don't get an animal record, but the tag was still assigned)
ALTER TABLE calving_records ADD COLUMN IF NOT EXISTS calf_tag TEXT;
ALTER TABLE calving_records ADD COLUMN IF NOT EXISTS calf_tag_color TEXT;
