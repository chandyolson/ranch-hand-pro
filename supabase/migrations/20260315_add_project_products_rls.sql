-- Add missing RLS policies for project_products (insert, update, delete)
-- The select policy already exists: dev_select_pp

CREATE POLICY "dev_insert_pp" ON public.project_products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_update_pp" ON public.project_products
  FOR UPDATE USING (true);

CREATE POLICY "dev_delete_pp" ON public.project_products
  FOR DELETE USING (true);
