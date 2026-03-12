-- Add quick_notes text[] column to animals table
-- Matches the pattern used by cow_work table
ALTER TABLE animals ADD COLUMN IF NOT EXISTS quick_notes TEXT[] DEFAULT '{}';
