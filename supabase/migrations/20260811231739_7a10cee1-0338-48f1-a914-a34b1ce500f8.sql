
DROP POLICY IF EXISTS authenticated_select_compras ON public.compras_celulares;
DROP POLICY IF EXISTS authenticated_insert_compras ON public.compras_celulares;
DROP POLICY IF EXISTS authenticated_update_compras ON public.compras_celulares;
CREATE POLICY authenticated_select_compras ON public.compras_celulares FOR SELECT TO authenticated USING (private.is_active_user());
CREATE POLICY authenticated_insert_compras ON public.compras_celulares FOR INSERT TO authenticated WITH CHECK (private.is_active_user());
CREATE POLICY authenticated_update_compras ON public.compras_celulares FOR UPDATE TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user());

DROP POLICY IF EXISTS authenticated_select_auditoria ON public.auditoria_compras;
CREATE POLICY authenticated_select_auditoria ON public.auditoria_compras FOR SELECT TO authenticated USING (private.is_active_user());

DROP POLICY IF EXISTS authenticated_manage_fotos ON public.compras_fotos;
CREATE POLICY authenticated_manage_fotos ON public.compras_fotos FOR ALL TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user());

DROP POLICY IF EXISTS authenticated_manage_reparos ON public.compras_reparos;
CREATE POLICY authenticated_manage_reparos ON public.compras_reparos FOR ALL TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user());

DROP POLICY IF EXISTS authenticated_manage_testes ON public.compras_testes;
CREATE POLICY authenticated_manage_testes ON public.compras_testes FOR ALL TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user());

DROP POLICY IF EXISTS modelos_select ON public.whatsapp_modelos;
CREATE POLICY modelos_select ON public.whatsapp_modelos FOR SELECT TO authenticated USING (private.is_staff());

DROP POLICY IF EXISTS msg_select ON public.whatsapp_mensagens;
CREATE POLICY msg_select ON public.whatsapp_mensagens FOR SELECT TO authenticated USING (private.is_staff());
