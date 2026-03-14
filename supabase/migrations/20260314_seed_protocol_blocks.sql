-- ============================================================
-- Protocol Blocks Seed
-- Run AFTER the 20260314_protocol_blocks.sql migration.
-- Creates reusable blocks from the existing seeded templates
-- and backfills work_type_code on protocol_template_events.
-- ============================================================

DO $$
DECLARE
  v_catl_op_id UUID := 'fc598323-aba0-4bf3-b739-9912ca043284';
  v_block_id UUID;
  v_evt RECORD;
BEGIN

  -- ════════════════════════════════════════════════
  -- 1. Create blocks from existing template events
  -- ════════════════════════════════════════════════

  -- For each template event, build a block with its products snapshotted as JSONB
  FOR v_evt IN
    SELECT
      e.id AS event_id,
      e.event_name,
      e.clinical_notes,
      e.equipment_notes,
      e.timing_description,
      e.days_offset,
      t.animal_class,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'product_id', p.id,
              'product_name', p.name,
              'dosage', COALESCE(ep.dosage_override, p.dosage),
              'route', COALESCE(ep.route_override, p.route),
              'injection_site', COALESCE(ep.injection_site, p.injection_site),
              'notes', ep.notes
            ) ORDER BY ep.sort_order
          )
          FROM protocol_event_products ep
          JOIN products p ON ep.product_id = p.id
          WHERE ep.event_id = e.id
        ),
        '[]'::jsonb
      ) AS products_json
    FROM protocol_template_events e
    JOIN vaccination_protocol_templates t ON e.template_id = t.id
    WHERE t.operation_id = v_catl_op_id
    ORDER BY t.name, e.event_order
  LOOP

    -- Determine work_type_code from event name
    v_block_id := gen_random_uuid();

    INSERT INTO protocol_blocks (
      id, operation_id, name, work_type_code, animal_class,
      description, default_products, clinical_notes, equipment_notes, is_shared
    ) VALUES (
      v_block_id,
      v_catl_op_id,
      v_evt.event_name,
      CASE
        WHEN v_evt.event_name ILIKE '%branding%' THEN 'BRAND'
        WHEN v_evt.event_name ILIKE '%weaning%' OR v_evt.event_name ILIKE '%pre-weaning%' THEN 'WEAN'
        WHEN v_evt.event_name ILIKE '%preg check%' THEN 'PREG'
        WHEN v_evt.event_name ILIKE '%bangs%' THEN 'BV'
        WHEN v_evt.event_name ILIKE '%bse%' THEN 'BSE'
        WHEN v_evt.event_name ILIKE '%arrival%' THEN 'PRO'
        WHEN v_evt.event_name ILIKE '%pre-breeding%' OR v_evt.event_name ILIKE '%booster%' THEN 'PRO'
        WHEN v_evt.event_name ILIKE '%pre-calving%' THEN 'PRO'
        ELSE 'PRO'
      END,
      v_evt.animal_class,
      v_evt.timing_description,
      v_evt.products_json,
      v_evt.clinical_notes,
      v_evt.equipment_notes,
      true
    );

    -- Backfill the template event with source_block_id and work_type_code
    UPDATE protocol_template_events
    SET
      source_block_id = v_block_id,
      work_type_code = CASE
        WHEN v_evt.event_name ILIKE '%branding%' THEN 'BRAND'
        WHEN v_evt.event_name ILIKE '%weaning%' OR v_evt.event_name ILIKE '%pre-weaning%' THEN 'WEAN'
        WHEN v_evt.event_name ILIKE '%preg check%' THEN 'PREG'
        WHEN v_evt.event_name ILIKE '%bangs%' THEN 'BV'
        WHEN v_evt.event_name ILIKE '%bse%' THEN 'BSE'
        WHEN v_evt.event_name ILIKE '%arrival%' THEN 'PRO'
        WHEN v_evt.event_name ILIKE '%pre-breeding%' OR v_evt.event_name ILIKE '%booster%' THEN 'PRO'
        WHEN v_evt.event_name ILIKE '%pre-calving%' THEN 'PRO'
        ELSE 'PRO'
      END
    WHERE id = v_evt.event_id;

  END LOOP;

  RAISE NOTICE 'Protocol blocks seeded and template events backfilled.';
END $$;
