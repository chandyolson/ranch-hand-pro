
-- Temporary dev-mode permissive SELECT policies for all operation-scoped tables
-- These allow the anon role to read data without authentication
-- REMOVE these before going to production with auth

CREATE POLICY "dev_select_animals" ON public.animals FOR SELECT USING (true);
CREATE POLICY "dev_insert_animals" ON public.animals FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_update_animals" ON public.animals FOR UPDATE USING (true);
CREATE POLICY "dev_delete_animals" ON public.animals FOR DELETE USING (true);

CREATE POLICY "dev_select_calving" ON public.calving_records FOR SELECT USING (true);
CREATE POLICY "dev_insert_calving" ON public.calving_records FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_update_calving" ON public.calving_records FOR UPDATE USING (true);
CREATE POLICY "dev_delete_calving" ON public.calving_records FOR DELETE USING (true);

CREATE POLICY "dev_select_groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "dev_insert_groups" ON public.groups FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_select_locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "dev_insert_locations" ON public.locations FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_select_quick_notes" ON public.quick_notes FOR SELECT USING (true);

CREATE POLICY "dev_select_projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "dev_insert_projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_update_projects" ON public.projects FOR UPDATE USING (true);

CREATE POLICY "dev_select_cow_work" ON public.cow_work FOR SELECT USING (true);
CREATE POLICY "dev_insert_cow_work" ON public.cow_work FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_select_flags" ON public.animal_flags FOR SELECT USING (true);
CREATE POLICY "dev_insert_flags" ON public.animal_flags FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_select_treatments" ON public.treatments FOR SELECT USING (true);

CREATE POLICY "dev_select_preg_stages" ON public.preg_stages FOR SELECT USING (true);

CREATE POLICY "dev_select_technicians" ON public.technicians FOR SELECT USING (true);

CREATE POLICY "dev_select_op_teams" ON public.operation_teams FOR SELECT USING (true);

CREATE POLICY "dev_select_sire_details" ON public.sire_details FOR SELECT USING (true);

CREATE POLICY "dev_select_status_changes" ON public.status_changes FOR SELECT USING (true);
CREATE POLICY "dev_insert_status_changes" ON public.status_changes FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_select_id_history" ON public.id_history FOR SELECT USING (true);

CREATE POLICY "dev_select_animal_ids" ON public.animal_ids FOR SELECT USING (true);

CREATE POLICY "dev_select_pwt" ON public.project_work_types FOR SELECT USING (true);
CREATE POLICY "dev_insert_pwt" ON public.project_work_types FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_select_pp" ON public.project_products FOR SELECT USING (true);

CREATE POLICY "dev_select_op_products" ON public.operation_products FOR SELECT USING (true);

CREATE POLICY "dev_select_tp" ON public.treatment_products FOR SELECT USING (true);

CREATE POLICY "dev_select_templates" ON public.project_templates FOR SELECT USING (true);

CREATE POLICY "dev_select_invitations" ON public.pending_invitations FOR SELECT USING (true);

CREATE POLICY "dev_select_vet_clients" ON public.vet_practice_clients FOR SELECT USING (true);
