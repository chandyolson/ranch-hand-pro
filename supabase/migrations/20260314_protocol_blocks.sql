-- Migration: Protocol Blocks
-- Adds reusable working event blocks for the protocol builder.
-- Blocks are copy-on-use: when dragged into a template, they snapshot into protocol_template_events.

-- ════════════════════════════════════════════════
-- 1. Create protocol_blocks table
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS protocol_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  work_type_code TEXT NOT NULL,
  animal_class TEXT NOT NULL,
  description TEXT,
  default_products JSONB DEFAULT '[]'::jsonb,
  clinical_notes TEXT,
  equipment_notes TEXT,
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_blocks_operation ON protocol_blocks(operation_id);
CREATE INDEX IF NOT EXISTS idx_protocol_blocks_animal_class ON protocol_blocks(animal_class);
CREATE INDEX IF NOT EXISTS idx_protocol_blocks_work_type ON protocol_blocks(work_type_code);

-- ════════════════════════════════════════════════
-- 2. Add columns to protocol_template_events
-- ════════════════════════════════════════════════
ALTER TABLE protocol_template_events
  ADD COLUMN IF NOT EXISTS work_type_code TEXT,
  ADD COLUMN IF NOT EXISTS source_block_id UUID REFERENCES protocol_blocks(id) ON DELETE SET NULL;
