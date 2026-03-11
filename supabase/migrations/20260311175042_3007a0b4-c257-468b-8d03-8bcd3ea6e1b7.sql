
-- Create red_book_notes table
CREATE TABLE public.red_book_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'cattle-note',
  is_pinned boolean NOT NULL DEFAULT false,
  has_action boolean NOT NULL DEFAULT false,
  author_initials text,
  attachment_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.red_book_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "dev_select_red_book" ON public.red_book_notes FOR SELECT USING (true);
CREATE POLICY "dev_insert_red_book" ON public.red_book_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_update_red_book" ON public.red_book_notes FOR UPDATE USING (true);
CREATE POLICY "dev_delete_red_book" ON public.red_book_notes FOR DELETE USING (true);

CREATE POLICY "red_book_select" ON public.red_book_notes FOR SELECT
  USING (operation_id IN (SELECT auth_user_operation_ids()));
CREATE POLICY "red_book_insert" ON public.red_book_notes FOR INSERT
  WITH CHECK (operation_id IN (SELECT auth_user_operation_ids()));
CREATE POLICY "red_book_update" ON public.red_book_notes FOR UPDATE
  USING (operation_id IN (SELECT auth_user_operation_ids()));
CREATE POLICY "red_book_delete" ON public.red_book_notes FOR DELETE
  USING (operation_id IN (SELECT auth_user_operation_ids()));
