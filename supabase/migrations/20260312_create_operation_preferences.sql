-- ══════════════════════════════════════════════════════════════
-- Migration: Create operation_preferences table
-- One row per operation. Stores all configurable settings.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS operation_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,

  -- ── Tag System ──
  use_year_tag_system BOOLEAN DEFAULT false,

  -- ── Calf Tagging ──
  -- 'same_as_dam' = calf gets dam's tag number
  -- 'year_prefix_seq' = last digit of birth year + sequential (e.g., 5001, 5002 for 2025)
  -- 'year_letter_seq' = sequential + year letter (e.g., 105M for 2026)
  -- 'manual' = no auto-fill, user enters manually (default)
  calf_tag_system TEXT NOT NULL DEFAULT 'manual',
  calf_tag_pattern TEXT,                     -- for year_letter_seq: e.g., '{seq}{yearletter}'
  calf_tag_next_seq INTEGER DEFAULT 1,       -- next sequence number
  calf_tag_seq_year INTEGER,                 -- year the sequence is tracking (resets on year change)
  calf_tag_default_color TEXT,               -- default tag color for new calves
  calf_tag_seq_padding INTEGER DEFAULT 0,    -- zero-pad width: 0=none, 3='001', 4='0001'

  -- ── Year Letter Map ──
  -- Maps birth year to letter code. BIF standard or custom.
  -- Example: {"2024":"L","2025":"M","2026":"N","2027":"P"}
  year_letter_map JSONB DEFAULT '{
    "2019":"H","2020":"J","2021":"K","2022":"L","2023":"M",
    "2024":"N","2025":"P","2026":"R","2027":"S","2028":"T",
    "2029":"U","2030":"W","2031":"X","2032":"Y","2033":"Z",
    "2034":"A","2035":"B","2036":"C","2037":"D","2038":"E"
  }'::jsonb,

  -- ── Lifetime ID ──
  lifetime_id_prefix TEXT,                   -- e.g., 'SR'
  lifetime_id_pattern TEXT,                  -- e.g., '{prefix}{yearletter}{seq}'
  lifetime_id_next_seq INTEGER DEFAULT 1,

  -- ── Dropdown Favorites ──
  preferred_preg_stages TEXT[],
  preferred_breeds TEXT[],
  preferred_diseases TEXT[],

  -- ── Timestamps ──
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One row per operation
  CONSTRAINT unique_operation_prefs UNIQUE (operation_id)
);

-- ── RLS ──
ALTER TABLE operation_preferences ENABLE ROW LEVEL SECURITY;

-- Everyone on the operation can read preferences
CREATE POLICY "select_operation_preferences" ON operation_preferences
  FOR SELECT USING (true);

-- Admin only for insert/update
CREATE POLICY "insert_operation_preferences" ON operation_preferences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_operation_preferences" ON operation_preferences
  FOR UPDATE USING (true);

-- ── Index ──
CREATE INDEX idx_operation_preferences_operation_id ON operation_preferences (operation_id);

-- ── Auto-update timestamp ──
CREATE TRIGGER update_operation_preferences_updated_at
  BEFORE UPDATE ON operation_preferences
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
