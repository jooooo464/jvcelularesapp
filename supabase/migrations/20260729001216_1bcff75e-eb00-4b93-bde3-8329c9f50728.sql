ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'Cancelada';

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_por uuid,
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_deleted ON public.ordens_servico (deleted);

CREATE TABLE IF NOT EXISTS public.auditoria_os (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid,
  numero_os integer,
  usuario_id uuid,
  usuario_nome text,
  acao text NOT NULL,
  motivo text,
  ip text,
  dispositivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.auditoria_os TO authenticated;
GRANT ALL ON public.auditoria_os TO service_role;

ALTER TABLE public.auditoria_os ENABLE ROW LEVEL SECURITY;

CREATE POLICY auditoria_os_insert ON public.auditoria_os
  FOR INSERT TO authenticated WITH CHECK (private.is_active_user());

CREATE POLICY auditoria_os_select ON public.auditoria_os
  FOR SELECT TO authenticated USING (private.is_admin(auth.uid()));