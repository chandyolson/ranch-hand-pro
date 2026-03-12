-- Add calf_tag and calf_tag_color to calving_records
-- These store the calf's tag directly on the calving record so it's 
-- available even for dead calves (which have no animal record / calf_id is null)
ALTER TABLE calving_records ADD COLUMN IF NOT EXISTS calf_tag TEXT;
ALTER TABLE calving_records ADD COLUMN IF NOT EXISTS calf_tag_color TEXT;
