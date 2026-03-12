-- Canonical 18 work types — matches Supabase as of March 12, 2026
-- This migration is documentation only — these rows already exist.
-- Run this only if seeding a fresh database.

INSERT INTO work_types (code, name) VALUES
  ('PREG', 'Pregnancy Check'),
  ('AI', 'Artificial Insemination'),
  ('ET', 'Embryo Transfer'),
  ('BREED', 'Breeding'),
  ('TO', 'Turn Out'),
  ('BSE', 'Breeding Soundness Exam'),
  ('RTS', 'Reproductive Track Score'),
  ('SALE', 'Sale'),
  ('MOVE', 'Movement'),
  ('CU', 'Carcass Ultrasound'),
  ('PC', 'Preconditioning'),
  ('BRAND', 'Branding'),
  ('FB', 'Freeze Branding'),
  ('WEAN', 'Weaning'),
  ('PRO', 'Processing'),
  ('WEIGH', 'Weights'),
  ('TREAT', 'Mass Treatment'),
  ('BV', 'Brucellosis Vaccination')
ON CONFLICT DO NOTHING;
