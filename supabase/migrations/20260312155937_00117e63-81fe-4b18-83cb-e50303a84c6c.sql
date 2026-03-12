CREATE TABLE public.operation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE UNIQUE,
  use_year_tag_system boolean NOT NULL DEFAULT false,
  calf_tag_system text NOT NULL DEFAULT 'manual',
  calf_tag_pattern text,
  calf_tag_next_seq integer NOT NULL DEFAULT 1,
  calf_tag_seq_year integer,
  calf_tag_default_color text,
  calf_tag_seq_padding integer NOT NULL DEFAULT 0,
  year_letter_map jsonb NOT NULL DEFAULT '{"2019":"H","2020":"J","2021":"K","2022":"L","2023":"M","2024":"N","2025":"P","2026":"R","2027":"S","2028":"T","2029":"U","2030":"W","2031":"X","2032":"Y","2033":"Z","2034":"A","2035":"B","2036":"C","2037":"D","2038":"E"}'::jsonb,
  lifetime_id_prefix text,
  lifetime_id_pattern text,
  lifetime_id_next_seq integer NOT NULL DEFAULT 1,
  preferred_preg_stages text[],
  preferred_breeds text[],
  preferred_diseases text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.operation_preferences ENABLE ROW LEVEL SECURITY;

-- Dev policy
CREATE POLICY "dev_all_op_prefs" ON public.operation_preferences FOR ALL USING (true) WITH CHECK (true);

-- Production policies
CREATE POLICY "op_prefs_select" ON public.operation_preferences FOR SELECT USING (operation_id IN (SELECT auth_user_operation_ids()));
CREATE POLICY "op_prefs_insert" ON public.operation_preferences FOR INSERT WITH CHECK (operation_id IN (SELECT auth_user_operation_ids()));
CREATE POLICY "op_prefs_update" ON public.operation_preferences FOR UPDATE USING (operation_id IN (SELECT auth_user_operation_ids()));
CREATE POLICY "op_prefs_delete" ON public.operation_preferences FOR DELETE USING (operation_id IN (SELECT auth_user_operation_ids()));