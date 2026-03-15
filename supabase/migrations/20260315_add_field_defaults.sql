-- Add field_defaults JSONB column to projects table
-- Stores per-field default values that auto-fill when adding animals
-- Example: {"preg_stage": "Confirmed", "breeding_type": "AI", "technician": "Dr. Smith"}
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS field_defaults JSONB DEFAULT '{}';

-- Add same column to project_templates for template-based defaults
ALTER TABLE public.project_templates ADD COLUMN IF NOT EXISTS field_defaults JSONB DEFAULT '{}';
