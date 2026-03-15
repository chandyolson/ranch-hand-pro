-- Add Purchase work type for new animals added to the herd
INSERT INTO public.work_types (code, name)
VALUES ('PURCH', 'Purchase')
ON CONFLICT (code) DO NOTHING;
