-- Add calf_tag and calf_tag_color to calving_records
-- These store the calf's tag info directly on the calving record
-- Needed for dead calves (no animal record / calf_id is NULL)
-- Also used as a convenience field for alive calves
ALTER TABLE calving_records ADD COLUMN IF NOT EXISTS calf_tag TEXT;
ALTER TABLE calving_records ADD COLUMN IF NOT EXISTS calf_tag_color TEXT;
