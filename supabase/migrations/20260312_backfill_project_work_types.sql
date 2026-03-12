-- Backfill project_work_types for projects that have no work type linked
-- Matches the project name prefix to the correct work_type code
-- Only inserts if the project doesn't already have a primary work type

-- Map project name prefixes to work type codes
WITH name_to_code AS (
  SELECT p.id AS project_id,
    CASE
      WHEN p.name LIKE 'Ultrasound%'             THEN 'CU'
      WHEN p.name LIKE 'Breeding Soundess%'       THEN 'BSE'
      WHEN p.name LIKE 'Breeding Soundness%'       THEN 'BSE'
      WHEN p.name LIKE 'General Processing%'      THEN 'PRO'
      WHEN p.name LIKE 'Breeding -%'              THEN 'BREED'
      WHEN p.name LIKE 'Breeding-%'               THEN 'BREED'
      WHEN p.name LIKE 'Bangs Vaccination%'       THEN 'BV'
      WHEN p.name LIKE 'Bull Turn Out%'           THEN 'TO'
      WHEN p.name LIKE 'Artificial Insemination%' THEN 'AI'
      WHEN p.name LIKE 'Embryo Transfer%'         THEN 'ET'
      WHEN p.name LIKE 'Pregnancy Check%'         THEN 'PREG'
      WHEN p.name LIKE 'Weaning%'                 THEN 'WEAN'
      WHEN p.name LIKE 'Preconditioning%'         THEN 'PC'
      WHEN p.name LIKE 'Branding%'                THEN 'BRAND'
      WHEN p.name LIKE 'Freeze Branding%'         THEN 'FB'
      WHEN p.name LIKE 'Mass Treatment%'          THEN 'TREAT'
      WHEN p.name LIKE 'Weights%'                 THEN 'WEIGH'
      WHEN p.name LIKE 'Sale%'                    THEN 'SALE'
      WHEN p.name LIKE 'Movement%'                THEN 'MOVE'
      ELSE NULL
    END AS matched_code
  FROM projects p
  WHERE NOT EXISTS (
    SELECT 1 FROM project_work_types pwt WHERE pwt.project_id = p.id
  )
)
INSERT INTO project_work_types (project_id, work_type_id, is_primary)
SELECT 
  ntc.project_id,
  wt.id,
  true
FROM name_to_code ntc
JOIN work_types wt ON wt.code = ntc.matched_code
WHERE ntc.matched_code IS NOT NULL;
