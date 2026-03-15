-- Add missing DELETE RLS policies for project cascade delete
-- cow_work
DROP POLICY IF EXISTS "dev_delete_cow_work" ON public.cow_work;
CREATE POLICY "dev_delete_cow_work" ON public.cow_work FOR DELETE USING (true);

-- project_work_types
DROP POLICY IF EXISTS "dev_delete_pwt" ON public.project_work_types;
CREATE POLICY "dev_delete_pwt" ON public.project_work_types FOR DELETE USING (true);

-- project_expected_animals
DROP POLICY IF EXISTS "dev_delete_pea" ON public.project_expected_animals;
CREATE POLICY "dev_delete_pea" ON public.project_expected_animals FOR DELETE USING (true);

-- projects
DROP POLICY IF EXISTS "dev_delete_projects" ON public.projects;
CREATE POLICY "dev_delete_projects" ON public.projects FOR DELETE USING (true);
