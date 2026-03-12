-- Seed the canonical 17 work types
-- Step 1: Delete old incorrect codes (only if they aren't linked to any projects)
DELETE FROM work_types 
WHERE code IN ('BV', 'PRE', 'WN', 'TX', 'PROCESS')
AND id NOT IN (SELECT work_type_id FROM project_work_types);

-- Step 2: Insert all 17, skip any that already exist by code
INSERT INTO work_types (code, name)
SELECT v.code, v.name FROM (VALUES
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
  ('BR', 'Branding'),
  ('FB', 'Freeze Branding'),
  ('WEAN', 'Weaning'),
  ('PR', 'Processing'),
  ('W', 'Weights'),
  ('TREAT', 'Mass Treatment')
) AS v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM work_types wt WHERE wt.code = v.code);
