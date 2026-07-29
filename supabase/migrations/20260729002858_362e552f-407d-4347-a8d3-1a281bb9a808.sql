
CREATE TABLE public.fotos_ordem_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  etapa text NOT NULL DEFAULT 'Inspeção inicial',
  url_foto text NOT NULL,
  descricao text,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fotos_ordem_servico TO authenticated;
GRANT ALL ON public.fotos_ordem_servico TO service_role;
ALTER TABLE public.fotos_ordem_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY fotos_os_select ON public.fotos_ordem_servico FOR SELECT TO authenticated USING (private.is_active_user());
CREATE POLICY fotos_os_insert ON public.fotos_ordem_servico FOR INSERT TO authenticated WITH CHECK (private.is_active_user());
CREATE POLICY fotos_os_update ON public.fotos_ordem_servico FOR UPDATE TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user());
CREATE POLICY fotos_os_delete ON public.fotos_ordem_servico FOR DELETE TO authenticated USING (private.is_active_user());
CREATE INDEX idx_fotos_os_ordem ON public.fotos_ordem_servico(ordem_servico_id);

CREATE TABLE public.checklist_aparelho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL UNIQUE REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tela_quebrada boolean NOT NULL DEFAULT false,
  tampa_quebrada boolean NOT NULL DEFAULT false,
  carcaca_amassada boolean NOT NULL DEFAULT false,
  arranhoes boolean NOT NULL DEFAULT false,
  oxidacao boolean NOT NULL DEFAULT false,
  marcas_queda boolean NOT NULL DEFAULT false,
  aparelho_molhado boolean NOT NULL DEFAULT false,
  botoes_danificados boolean NOT NULL DEFAULT false,
  conector_defeito boolean NOT NULL DEFAULT false,
  alto_falante_defeito boolean NOT NULL DEFAULT false,
  microfone_defeito boolean NOT NULL DEFAULT false,
  camera_danificada boolean NOT NULL DEFAULT false,
  biometria_funcionando boolean NOT NULL DEFAULT false,
  faceid_funcionando boolean NOT NULL DEFAULT false,
  touch_funcionando boolean NOT NULL DEFAULT false,
  lcd_funcionando boolean NOT NULL DEFAULT false,
  liga_normalmente boolean NOT NULL DEFAULT false,
  nao_liga boolean NOT NULL DEFAULT false,
  reiniciando boolean NOT NULL DEFAULT false,
  outro text,
  observacoes text,
  tecnico_id uuid,
  inspecionado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_aparelho TO authenticated;
GRANT ALL ON public.checklist_aparelho TO service_role;
ALTER TABLE public.checklist_aparelho ENABLE ROW LEVEL SECURITY;
CREATE POLICY checklist_select ON public.checklist_aparelho FOR SELECT TO authenticated USING (private.is_active_user());
CREATE POLICY checklist_insert ON public.checklist_aparelho FOR INSERT TO authenticated WITH CHECK (private.is_active_user());
CREATE POLICY checklist_update ON public.checklist_aparelho FOR UPDATE TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user());
CREATE POLICY checklist_delete ON public.checklist_aparelho FOR DELETE TO authenticated USING (private.is_admin(auth.uid()));
CREATE TRIGGER trg_checklist_updated BEFORE UPDATE ON public.checklist_aparelho FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.acessorios_entregues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  nome_acessorio text NOT NULL,
  entregue boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessorios_entregues TO authenticated;
GRANT ALL ON public.acessorios_entregues TO service_role;
ALTER TABLE public.acessorios_entregues ENABLE ROW LEVEL SECURITY;
CREATE POLICY acessorios_select ON public.acessorios_entregues FOR SELECT TO authenticated USING (private.is_active_user());
CREATE POLICY acessorios_insert ON public.acessorios_entregues FOR INSERT TO authenticated WITH CHECK (private.is_active_user());
CREATE POLICY acessorios_update ON public.acessorios_entregues FOR UPDATE TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user());
CREATE POLICY acessorios_delete ON public.acessorios_entregues FOR DELETE TO authenticated USING (private.is_active_user());
CREATE INDEX idx_acessorios_ordem ON public.acessorios_entregues(ordem_servico_id);
