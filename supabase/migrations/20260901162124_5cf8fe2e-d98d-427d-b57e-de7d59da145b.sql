CREATE TABLE public.diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('inicial', 'final', 'independente')),
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'conectado', 'em_andamento', 'concluido', 'cancelado', 'expirado')),
  resultado_geral TEXT CHECK (resultado_geral IN ('aprovado', 'problema', 'indisponivel')),
  session_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.diagnostic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id UUID NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aprovado', 'problema', 'indisponivel', 'em_teste')),
  observacao TEXT,
  resultado_tecnico JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(diagnostic_id, tipo)
);

CREATE INDEX diagnostic_sessions_os_idx ON public.diagnostic_sessions(os_id, created_at DESC);
CREATE INDEX diagnostic_sessions_token_idx ON public.diagnostic_sessions(session_token);
CREATE INDEX diagnostic_tests_diagnostic_idx ON public.diagnostic_tests(diagnostic_id);

CREATE TRIGGER trg_diagnostic_sessions_updated
BEFORE UPDATE ON public.diagnostic_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_tests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostic_sessions, public.diagnostic_tests TO authenticated;
GRANT ALL ON public.diagnostic_sessions, public.diagnostic_tests TO service_role;

CREATE POLICY diagnostic_sessions_staff ON public.diagnostic_sessions
FOR ALL TO authenticated
USING (private.is_active_user())
WITH CHECK (private.is_active_user());

CREATE POLICY diagnostic_tests_staff ON public.diagnostic_tests
FOR ALL TO authenticated
USING (private.is_active_user())
WITH CHECK (private.is_active_user());

CREATE OR REPLACE FUNCTION public.create_diagnostic_session(p_os_id UUID, p_tipo TEXT DEFAULT 'inicial')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session public.diagnostic_sessions; v_os public.ordens_servico;
BEGIN
  IF NOT private.is_active_user() THEN RAISE EXCEPTION 'Usuário sem acesso'; END IF;
  IF p_tipo NOT IN ('inicial', 'final', 'independente') THEN RAISE EXCEPTION 'Tipo de diagnóstico inválido'; END IF;
  SELECT * INTO v_os FROM public.ordens_servico WHERE id = p_os_id AND deleted = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ordem de serviço não encontrada'; END IF;
  INSERT INTO public.diagnostic_sessions (os_id, cliente_id, tecnico_id, tipo)
  VALUES (v_os.id, v_os.cliente_id, COALESCE(v_os.tecnico_id, auth.uid()), p_tipo)
  RETURNING * INTO v_session;
  RETURN jsonb_build_object('id', v_session.id, 'token', v_session.session_token, 'expires_at', v_session.expires_at, 'status', v_session.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_diagnostic_session(p_token UUID)
RETURNS TABLE (id UUID, numero_os INTEGER, tipo TEXT, status TEXT, expires_at TIMESTAMPTZ, device_info JSONB, tests JSONB)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, o.numero_os, s.tipo, s.status, s.expires_at, s.device_info,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('tipo', t.tipo, 'status', t.status, 'observacao', t.observacao, 'resultado_tecnico', t.resultado_tecnico) ORDER BY t.created_at) FROM public.diagnostic_tests t WHERE t.diagnostic_id = s.id), '[]'::jsonb)
  FROM public.diagnostic_sessions s LEFT JOIN public.ordens_servico o ON o.id = s.os_id
  WHERE s.session_token = p_token AND s.expires_at > now() AND s.status <> 'cancelado';
$$;

CREATE OR REPLACE FUNCTION public.connect_diagnostic_session(p_token UUID, p_device_info JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  UPDATE public.diagnostic_sessions
     SET status = CASE WHEN status = 'aguardando' THEN 'conectado' ELSE status END,
         device_info = COALESCE(p_device_info, '{}'::jsonb), started_at = COALESCE(started_at, now())
   WHERE session_token = p_token AND expires_at > now() AND status NOT IN ('cancelado', 'concluido')
   RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Sessão inválida ou expirada'; END IF;
  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_diagnostic_test(p_token UUID, p_tipo TEXT, p_status TEXT, p_observacao TEXT DEFAULT NULL, p_resultado_tecnico JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_diagnostic_id UUID;
BEGIN
  IF p_status NOT IN ('aprovado', 'problema', 'indisponivel', 'em_teste') THEN RAISE EXCEPTION 'Status de teste inválido'; END IF;
  SELECT id INTO v_diagnostic_id FROM public.diagnostic_sessions WHERE session_token = p_token AND expires_at > now() AND status NOT IN ('cancelado', 'concluido');
  IF v_diagnostic_id IS NULL THEN RAISE EXCEPTION 'Sessão inválida ou expirada'; END IF;
  INSERT INTO public.diagnostic_tests (diagnostic_id, tipo, status, observacao, resultado_tecnico, completed_at)
  VALUES (v_diagnostic_id, p_tipo, p_status, p_observacao, COALESCE(p_resultado_tecnico, '{}'::jsonb), CASE WHEN p_status = 'em_teste' THEN NULL ELSE now() END)
  ON CONFLICT (diagnostic_id, tipo) DO UPDATE SET status = EXCLUDED.status, observacao = EXCLUDED.observacao, resultado_tecnico = EXCLUDED.resultado_tecnico, completed_at = EXCLUDED.completed_at;
  UPDATE public.diagnostic_sessions SET status = 'em_andamento', started_at = COALESCE(started_at, now()) WHERE id = v_diagnostic_id AND status IN ('aguardando', 'conectado');
  RETURN jsonb_build_object('diagnostic_id', v_diagnostic_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_diagnostic_session(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_diagnostic_id UUID; v_result TEXT;
BEGIN
  SELECT id INTO v_diagnostic_id FROM public.diagnostic_sessions WHERE session_token = p_token AND expires_at > now() AND status NOT IN ('cancelado', 'concluido');
  IF v_diagnostic_id IS NULL THEN RAISE EXCEPTION 'Sessão inválida ou expirada'; END IF;
  SELECT CASE WHEN EXISTS (SELECT 1 FROM public.diagnostic_tests WHERE diagnostic_id = v_diagnostic_id AND status = 'problema') THEN 'problema' WHEN EXISTS (SELECT 1 FROM public.diagnostic_tests WHERE diagnostic_id = v_diagnostic_id AND status = 'aprovado') THEN 'aprovado' ELSE 'indisponivel' END INTO v_result;
  UPDATE public.diagnostic_sessions SET status = 'concluido', resultado_geral = v_result, completed_at = now() WHERE id = v_diagnostic_id;
  RETURN jsonb_build_object('id', v_diagnostic_id, 'resultado_geral', v_result);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_diagnostic_session(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_diagnostic_session(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.connect_diagnostic_session(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_diagnostic_test(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_diagnostic_session(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_diagnostic_session(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_diagnostic_session(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.connect_diagnostic_session(UUID, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_diagnostic_test(UUID, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_diagnostic_session(UUID) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.diagnostic_sessions, public.diagnostic_tests;