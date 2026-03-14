
CREATE POLICY "dev_insert_quick_notes" ON public.quick_notes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "dev_delete_quick_notes" ON public.quick_notes FOR DELETE TO public USING (true);
CREATE POLICY "dev_update_quick_notes" ON public.quick_notes FOR UPDATE TO public USING (true);
