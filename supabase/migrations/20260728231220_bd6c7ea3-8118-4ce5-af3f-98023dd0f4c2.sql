-- Colunas do portal na ordem de serviço
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS portal_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ADD COLUMN IF NOT EXISTS orcamento_status TEXT NOT NULL DEFAULT 'Não enviado',
  ADD COLUMN IF NOT EXISTS orcamento_resposta_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS orcamento_ip TEXT,
  ADD COLUMN IF NOT EXISTS orcamento_dispositivo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ordens_servico_portal_token_key ON public.ordens_servico (portal_token);

-- Histórico de atualizações
CREATE TABLE IF NOT EXISTS public.atualizacoes_os (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS atualizacoes_os_ordem_idx ON public.atualizacoes_os (ordem_servico_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atualizacoes_os TO authenticated;
GRANT ALL ON public.atualizacoes_os TO service_role;

ALTER TABLE public.atualizacoes_os ENABLE ROW LEVEL SECURITY;

CREATE POLICY atualizacoes_os_select ON public.atualizacoes_os
  FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY atualizacoes_os_insert ON public.atualizacoes_os
  FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
CREATE POLICY atualizacoes_os_update ON public.atualizacoes_os
  FOR UPDATE TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());
CREATE POLICY atualizacoes_os_delete ON public.atualizacoes_os
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'::public.app_role));

-- Códigos de verificação do portal (somente servidor)
CREATE TABLE IF NOT EXISTS public.portal_codigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  identificador TEXT NOT NULL,
  codigo TEXT NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  usado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_codigos_ident_idx ON public.portal_codigos (identificador, created_at DESC);

GRANT ALL ON public.portal_codigos TO service_role;

ALTER TABLE public.portal_codigos ENABLE ROW LEVEL SECURITY;