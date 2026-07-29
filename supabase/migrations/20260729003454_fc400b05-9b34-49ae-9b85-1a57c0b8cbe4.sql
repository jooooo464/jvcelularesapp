
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

DROP POLICY "modelos_insert" ON public.whatsapp_modelos;
DROP POLICY "modelos_update" ON public.whatsapp_modelos;
DROP POLICY "modelos_delete" ON public.whatsapp_modelos;
CREATE POLICY "modelos_insert" ON public.whatsapp_modelos FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "modelos_update" ON public.whatsapp_modelos FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "modelos_delete" ON public.whatsapp_modelos FOR DELETE TO authenticated USING (public.is_staff());

DROP POLICY "msg_insert" ON public.whatsapp_mensagens;
DROP POLICY "msg_update" ON public.whatsapp_mensagens;
CREATE POLICY "msg_insert" ON public.whatsapp_mensagens FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "msg_update" ON public.whatsapp_mensagens FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY "whatsapp_config_service_only" ON public.whatsapp_config;
CREATE POLICY "whatsapp_config_service_only" ON public.whatsapp_config FOR ALL TO service_role USING (true) WITH CHECK (true);
