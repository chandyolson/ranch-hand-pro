-- Create storage bucket for red book attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('red-book-attachments', 'red-book-attachments', true);

-- RLS policies for the bucket
CREATE POLICY "Anyone can upload red book attachments"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'red-book-attachments');

CREATE POLICY "Anyone can view red book attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'red-book-attachments');

CREATE POLICY "Anyone can delete red book attachments"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'red-book-attachments');

-- Create attachments tracking table
CREATE TABLE public.red_book_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.red_book_notes(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'document',
  file_path text NOT NULL,
  file_size bigint,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.red_book_attachments ENABLE ROW LEVEL SECURITY;

-- Dev policies (matching existing pattern)
CREATE POLICY "dev_select_rb_attachments" ON public.red_book_attachments
  FOR SELECT TO public USING (true);

CREATE POLICY "dev_insert_rb_attachments" ON public.red_book_attachments
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "dev_delete_rb_attachments" ON public.red_book_attachments
  FOR DELETE TO public USING (true);

-- Production policies
CREATE POLICY "rb_attachments_select" ON public.red_book_attachments
  FOR SELECT TO public
  USING (operation_id IN (SELECT auth_user_operation_ids()));

CREATE POLICY "rb_attachments_insert" ON public.red_book_attachments
  FOR INSERT TO public
  WITH CHECK (operation_id IN (SELECT auth_user_operation_ids()));

CREATE POLICY "rb_attachments_delete" ON public.red_book_attachments
  FOR DELETE TO public
  USING (operation_id IN (SELECT auth_user_operation_ids()));