
CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION private.is_staff() FROM PUBLIC;

DROP POLICY "modelos_insert" ON public.whatsapp_modelos;
DROP POLICY "modelos_update" ON public.whatsapp_modelos;
DROP POLICY "modelos_delete" ON public.whatsapp_modelos;
CREATE POLICY "modelos_insert" ON public.whatsapp_modelos FOR INSERT TO authenticated WITH CHECK (private.is_staff());
CREATE POLICY "modelos_update" ON public.whatsapp_modelos FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
CREATE POLICY "modelos_delete" ON public.whatsapp_modelos FOR DELETE TO authenticated USING (private.is_staff());

DROP POLICY "msg_insert" ON public.whatsapp_mensagens;
DROP POLICY "msg_update" ON public.whatsapp_mensagens;
CREATE POLICY "msg_insert" ON public.whatsapp_mensagens FOR INSERT TO authenticated WITH CHECK (private.is_staff());
CREATE POLICY "msg_update" ON public.whatsapp_mensagens FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());

DROP FUNCTION public.is_staff();
