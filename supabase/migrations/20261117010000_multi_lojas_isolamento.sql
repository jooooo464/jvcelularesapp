-- Multi-loja: isolamento por tenant, preservando todos os registros existentes.
-- Esta migration só será executada quando aplicada ao Supabase.

CREATE TABLE IF NOT EXISTS public.lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.loja_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'vendedor',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id, user_id)
);
CREATE INDEX IF NOT EXISTS loja_usuarios_user_idx ON public.loja_usuarios(user_id, ativo);
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loja_usuarios ENABLE ROW LEVEL SECURITY;

-- Conta que já administrava o sistema recebe a loja legada JV Celulares.
DO $$
DECLARE v_owner uuid; v_store uuid;
BEGIN
  SELECT p.id INTO v_owner
  FROM public.profiles p
  LEFT JOIN public.user_roles r ON r.user_id = p.id
  ORDER BY CASE WHEN r.role = 'administrador' THEN 0 ELSE 1 END, p.created_at
  LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Não foi possível identificar a conta antiga para preservar os dados.';
  END IF;
  SELECT id INTO v_store FROM public.lojas WHERE criado_por = v_owner ORDER BY created_at LIMIT 1;
  IF v_store IS NULL THEN
    INSERT INTO public.lojas(nome, criado_por) VALUES ('JV Celulares', v_owner) RETURNING id INTO v_store;
  END IF;
  INSERT INTO public.loja_usuarios(loja_id,user_id,role)
  VALUES (v_store,v_owner,'administrador')
  ON CONFLICT (loja_id,user_id) DO UPDATE SET role='administrador', ativo=true;
END $$;

-- Cada tabela de negócio recebe o identificador da loja legada antes de o campo
-- se tornar obrigatório. A verificação por to_regclass permite tabelas opcionais.
DO $$
DECLARE t text; v_store uuid;
BEGIN
  SELECT id INTO v_store FROM public.lojas ORDER BY created_at LIMIT 1;
  FOREACH t IN ARRAY ARRAY[
    'clientes','aparelhos','fornecedores','categorias','produtos','ordens_servico',
    'vendas','itens_venda','financeiro','logs_auditoria','portal_codigos',
    'atualizacoes_os','fotos_ordem_servico','checklist_aparelho','acessorios_entregues',
    'auditoria_os','compras_celulares','compras_fotos','compras_reparos','compras_testes',
    'diagnostic_sessions','diagnostic_tests','whatsapp_config','whatsapp_modelos','whatsapp_mensagens'
  ]
  LOOP
    IF to_regclass(format('public.%I',t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id)',t);
      EXECUTE format('UPDATE public.%I SET loja_id = $1 WHERE loja_id IS NULL',t) USING v_store;
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN loja_id SET NOT NULL',t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(loja_id)',t || '_loja_id_idx',t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES public.lojas(id);
UPDATE public.user_roles ur
SET loja_id = lu.loja_id
FROM public.loja_usuarios lu
WHERE lu.user_id = ur.user_id AND ur.loja_id IS NULL;
UPDATE public.user_roles
SET loja_id = (SELECT id FROM public.lojas ORDER BY created_at LIMIT 1)
WHERE loja_id IS NULL;
ALTER TABLE public.user_roles ALTER COLUMN loja_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS user_roles_loja_role_idx ON public.user_roles(loja_id, role);

-- Helpers consultam a associação real do usuário autenticado; nunca confiam
-- em loja_id enviado pelo navegador.
CREATE OR REPLACE FUNCTION public.is_loja_member(p_loja_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loja_usuarios lu
    WHERE lu.loja_id = p_loja_id AND lu.user_id = auth.uid() AND lu.ativo = true
  );
$$;
CREATE OR REPLACE FUNCTION public.is_loja_admin(p_loja_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loja_usuarios lu
    WHERE lu.loja_id = p_loja_id AND lu.user_id = auth.uid()
      AND lu.ativo = true AND lu.role = 'administrador'
  );
$$;
REVOKE ALL ON FUNCTION public.is_loja_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_loja_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_loja_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_loja_admin(uuid) TO authenticated, service_role;

-- Novos cadastros comuns sempre ganham uma loja própria e o papel de dono.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
DECLARE v_loja_id uuid; v_nome text; v_loja_nome text;
BEGIN
  v_nome := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome',''), split_part(COALESCE(NEW.email,''),'@',1));
  v_loja_nome := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'nome_loja',''),
    NULLIF(NEW.raw_user_meta_data->>'store_name',''),
    v_nome || ' - Minha loja'
  );
  INSERT INTO public.profiles(id,nome,email,telefone)
  VALUES (NEW.id,v_nome,COALESCE(NEW.email,''),NEW.raw_user_meta_data->>'telefone')
  ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome,email=EXCLUDED.email;
  INSERT INTO public.lojas(nome,criado_por) VALUES (v_loja_nome,NEW.id) RETURNING id INTO v_loja_id;
  INSERT INTO public.loja_usuarios(loja_id,user_id,role) VALUES (v_loja_id,NEW.id,'administrador');
  INSERT INTO public.user_roles(user_id,role,loja_id) VALUES (NEW.id,'administrador',v_loja_id)
  ON CONFLICT (user_id,role) DO UPDATE SET loja_id=EXCLUDED.loja_id;
  RETURN NEW;
END $$;

-- Preenche automaticamente loja_id no INSERT autenticado e bloqueia tentativas
-- de gravar registros em outra loja.
CREATE OR REPLACE FUNCTION public.enforce_current_loja()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_loja_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.loja_id IS NULL THEN
      RAISE EXCEPTION 'loja_id obrigatório para operações de serviço';
    END IF;
    RETURN NEW;
  END IF;
  SELECT lu.loja_id INTO v_loja_id
  FROM public.loja_usuarios lu
  WHERE lu.user_id=auth.uid() AND lu.ativo=true
  ORDER BY lu.created_at LIMIT 1;
  IF v_loja_id IS NULL THEN RAISE EXCEPTION 'Usuário não pertence a uma loja ativa'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.loja_id IS NOT NULL AND NEW.loja_id <> v_loja_id THEN
      RAISE EXCEPTION 'Não é permitido inserir dados em outra loja';
    END IF;
    NEW.loja_id := v_loja_id;
  ELSE
    IF NEW.loja_id IS DISTINCT FROM OLD.loja_id OR OLD.loja_id <> v_loja_id THEN
      RAISE EXCEPTION 'Não é permitido mover registros entre lojas';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Policies específicas de associação, perfil e funções.
DROP POLICY IF EXISTS loja_select ON public.lojas;
DROP POLICY IF EXISTS loja_update ON public.lojas;
CREATE POLICY loja_select ON public.lojas FOR SELECT TO authenticated
  USING (public.is_loja_member(id));
CREATE POLICY loja_update ON public.lojas FOR UPDATE TO authenticated
  USING (public.is_loja_admin(id)) WITH CHECK (public.is_loja_admin(id));
DROP POLICY IF EXISTS loja_usuarios_select ON public.loja_usuarios;
DROP POLICY IF EXISTS loja_usuarios_manage ON public.loja_usuarios;
CREATE POLICY loja_usuarios_select ON public.loja_usuarios FOR SELECT TO authenticated
  USING (public.is_loja_member(loja_id));
CREATE POLICY loja_usuarios_manage ON public.loja_usuarios FOR ALL TO authenticated
  USING (public.is_loja_admin(loja_id)) WITH CHECK (public.is_loja_admin(loja_id));

-- Recria as políticas das tabelas operacionais com escopo de loja e instala
-- o trigger que define loja_id em cada gravação.
DO $$
DECLARE t text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clientes','aparelhos','fornecedores','categorias','produtos','ordens_servico',
    'vendas','itens_venda','financeiro','logs_auditoria','portal_codigos',
    'atualizacoes_os','fotos_ordem_servico','checklist_aparelho','acessorios_entregues',
    'auditoria_os','compras_celulares','compras_fotos','compras_reparos','compras_testes',
    'diagnostic_sessions','diagnostic_tests','whatsapp_config','whatsapp_modelos','whatsapp_mensagens'
  ]
  LOOP
    IF to_regclass(format('public.%I',t)) IS NOT NULL THEN
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I',p,t);
      END LOOP;
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_loja_member(loja_id))',t||'_tenant_select',t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_loja_member(loja_id))',t||'_tenant_insert',t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_loja_member(loja_id)) WITH CHECK (public.is_loja_member(loja_id))',t||'_tenant_update',t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_loja_admin(loja_id))',t||'_tenant_delete',t);
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',t||'_enforce_loja',t);
      EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_current_loja()',t||'_enforce_loja',t);
    END IF;
  END LOOP;
END $$;

-- Perfil e roles ficam visíveis somente dentro da própria loja.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id=auth.uid() OR EXISTS (SELECT 1 FROM public.loja_usuarios lu WHERE lu.user_id=profiles.id AND public.is_loja_member(lu.loja_id)));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id=auth.uid()) WITH CHECK (id=auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id=auth.uid());

DROP POLICY IF EXISTS roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_loja_member(loja_id));
CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_loja_admin(loja_id));
CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_loja_admin(loja_id)) WITH CHECK (public.is_loja_admin(loja_id));
CREATE POLICY user_roles_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_loja_admin(loja_id));

-- Storage: os arquivos são vinculados à OS pelo primeiro segmento do caminho.
DROP POLICY IF EXISTS os_fotos_select ON storage.objects;
DROP POLICY IF EXISTS os_fotos_insert ON storage.objects;
DROP POLICY IF EXISTS os_fotos_update ON storage.objects;
DROP POLICY IF EXISTS os_fotos_delete ON storage.objects;
CREATE POLICY os_fotos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='os-fotos' AND EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id::text = split_part(name,'/',1) AND public.is_loja_member(os.loja_id)
  ));
CREATE POLICY os_fotos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='os-fotos' AND EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id::text = split_part(name,'/',1) AND public.is_loja_member(os.loja_id)
  ));
CREATE POLICY os_fotos_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='os-fotos' AND EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id::text = split_part(name,'/',1) AND public.is_loja_member(os.loja_id)
  ))
  WITH CHECK (bucket_id='os-fotos' AND EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id::text = split_part(name,'/',1) AND public.is_loja_member(os.loja_id)
  ));
CREATE POLICY os_fotos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='os-fotos' AND EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id::text = split_part(name,'/',1) AND public.is_loja_admin(os.loja_id)
  ));

-- Unicidade deve valer dentro de cada loja, não globalmente.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='categorias_nome_tipo_key' AND conrelid='public.categorias'::regclass) THEN
    ALTER TABLE public.categorias DROP CONSTRAINT categorias_nome_tipo_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='whatsapp_modelos_chave_key' AND conrelid='public.whatsapp_modelos'::regclass) THEN
    ALTER TABLE public.whatsapp_modelos DROP CONSTRAINT whatsapp_modelos_chave_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS categorias_loja_nome_tipo_uidx ON public.categorias(loja_id,nome,tipo);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_modelos_loja_chave_uidx ON public.whatsapp_modelos(loja_id,chave);

