CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'administrador'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION private.is_active_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ativo = true);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated, service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','aparelhos','produtos','categorias','fornecedores','vendas','itens_venda','ordens_servico','financeiro']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.is_active_user())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.is_active_user())', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user())', t || '_update', t);
    IF t IN ('vendas','itens_venda','financeiro','ordens_servico') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.is_admin(auth.uid()))', t || '_delete', t);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.is_active_user())', t || '_delete', t);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin(auth.uid()));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated
  USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS portal_codigos_select ON public.portal_codigos;
CREATE POLICY portal_codigos_select ON public.portal_codigos FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS logs_select_admin ON public.logs_auditoria;
CREATE POLICY logs_select_admin ON public.logs_auditoria FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_admin(auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR private.is_admin(auth.uid()));
CREATE POLICY profiles_delete_admin ON public.profiles FOR DELETE TO authenticated
  USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS atualizacoes_os_select ON public.atualizacoes_os;
DROP POLICY IF EXISTS atualizacoes_os_insert ON public.atualizacoes_os;
DROP POLICY IF EXISTS atualizacoes_os_update ON public.atualizacoes_os;
DROP POLICY IF EXISTS atualizacoes_os_delete ON public.atualizacoes_os;
CREATE POLICY atualizacoes_os_select ON public.atualizacoes_os FOR SELECT TO authenticated
  USING (private.is_active_user());
CREATE POLICY atualizacoes_os_insert ON public.atualizacoes_os FOR INSERT TO authenticated
  WITH CHECK (private.is_active_user());
CREATE POLICY atualizacoes_os_update ON public.atualizacoes_os FOR UPDATE TO authenticated
  USING (private.is_active_user()) WITH CHECK (private.is_active_user());
CREATE POLICY atualizacoes_os_delete ON public.atualizacoes_os FOR DELETE TO authenticated
  USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS os_fotos_select ON storage.objects;
DROP POLICY IF EXISTS os_fotos_insert ON storage.objects;
DROP POLICY IF EXISTS os_fotos_update ON storage.objects;
DROP POLICY IF EXISTS os_fotos_delete ON storage.objects;
CREATE POLICY os_fotos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'os-fotos' AND private.is_active_user());
CREATE POLICY os_fotos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'os-fotos' AND private.is_active_user());
CREATE POLICY os_fotos_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'os-fotos' AND private.is_active_user())
  WITH CHECK (bucket_id = 'os-fotos' AND private.is_active_user());
CREATE POLICY os_fotos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'os-fotos' AND private.is_active_user());

DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_active_user();