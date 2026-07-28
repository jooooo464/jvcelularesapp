-- =====================================================================
-- Hardening de segurança (idempotente)
-- =====================================================================

-- 1) Função auxiliar is_admin -----------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'administrador'::public.app_role
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;

-- Funções de gatilho: nunca devem ser chamáveis diretamente por clientes
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registra_auditoria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.os_lanca_financeiro() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.venda_lanca_financeiro() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.item_venda_baixa_estoque() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.item_venda_devolve_estoque() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calc_total_os() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calc_lucro_produto() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 2) user_roles: políticas explícitas ---------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) Tabelas operacionais: políticas explícitas por comando -----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','aparelhos','produtos','categorias','fornecedores','vendas','itens_venda','ordens_servico','financeiro']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_all', t);
    EXECUTE format('DROP POLICY IF EXISTS os_all ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_user())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_active_user())', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user())', t || '_update', t);

    IF t IN ('vendas','itens_venda','financeiro','ordens_servico') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))', t || '_delete', t);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_active_user())', t || '_delete', t);
    END IF;
  END LOOP;
END $$;

-- 4) portal_codigos: acesso apenas administrativo/serviço -------------
ALTER TABLE public.portal_codigos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_codigos FROM anon;
GRANT SELECT ON public.portal_codigos TO authenticated;
GRANT ALL ON public.portal_codigos TO service_role;
DROP POLICY IF EXISTS portal_codigos_select ON public.portal_codigos;
CREATE POLICY portal_codigos_select ON public.portal_codigos FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5) logs_auditoria: somente leitura para admin -----------------------
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.logs_auditoria FROM anon;
GRANT SELECT ON public.logs_auditoria TO authenticated;
GRANT ALL ON public.logs_auditoria TO service_role;
DROP POLICY IF EXISTS logs_select_admin ON public.logs_auditoria;
CREATE POLICY logs_select_admin ON public.logs_auditoria FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6) Auditoria de operações críticas ----------------------------------
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();

DROP TRIGGER IF EXISTS audit_financeiro ON public.financeiro;
CREATE TRIGGER audit_financeiro
  AFTER INSERT OR UPDATE OR DELETE ON public.financeiro
  FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();