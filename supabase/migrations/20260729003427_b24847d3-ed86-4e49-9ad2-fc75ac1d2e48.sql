
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  instance_name text NOT NULL DEFAULT '',
  phone_number text,
  profile_name text,
  profile_picture text,
  connection_status text NOT NULL DEFAULT 'desconectado',
  last_sync timestamptz,
  auto_enviar boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_config TO service_role;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_config_service_only" ON public.whatsapp_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.whatsapp_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  evento text,
  conteudo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_modelos TO authenticated;
GRANT ALL ON public.whatsapp_modelos TO service_role;
ALTER TABLE public.whatsapp_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modelos_select" ON public.whatsapp_modelos FOR SELECT TO authenticated USING (true);
CREATE POLICY "modelos_insert" ON public.whatsapp_modelos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "modelos_update" ON public.whatsapp_modelos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "modelos_delete" ON public.whatsapp_modelos FOR DELETE TO authenticated USING (true);
CREATE TRIGGER whatsapp_modelos_updated_at BEFORE UPDATE ON public.whatsapp_modelos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.whatsapp_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone text NOT NULL,
  direcao text NOT NULL DEFAULT 'enviada',
  tipo text NOT NULL DEFAULT 'texto',
  conteudo text NOT NULL DEFAULT '',
  media_url text,
  media_nome text,
  status text NOT NULL DEFAULT 'enviada',
  erro text,
  evolution_id text,
  usuario_id uuid,
  usuario_nome text,
  lida boolean NOT NULL DEFAULT false,
  agendada_para timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_mensagens_os_idx ON public.whatsapp_mensagens (ordem_servico_id, created_at DESC);
CREATE INDEX whatsapp_mensagens_tel_idx ON public.whatsapp_mensagens (telefone, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_mensagens TO authenticated;
GRANT ALL ON public.whatsapp_mensagens TO service_role;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_select" ON public.whatsapp_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_insert" ON public.whatsapp_mensagens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "msg_update" ON public.whatsapp_mensagens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER whatsapp_mensagens_updated_at BEFORE UPDATE ON public.whatsapp_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_mensagens;

INSERT INTO public.whatsapp_modelos (chave, nome, evento, conteudo) VALUES
('boas_vindas','Boas-vindas',NULL,'Olá, {{nome_cliente}}! 👋\n\nSeja bem-vindo(a) à *JV Celulares*. Estamos à disposição para cuidar do seu aparelho.'),
('os_criada','Ordem criada','Recebido',E'Olá, {{nome_cliente}}.\n\nSua Ordem de Serviço *{{numero_os}}* foi criada.\n\n📱 Aparelho: {{modelo}}\n📌 Status: {{status}}\n\nAcompanhe o reparo em tempo real:\n{{portal_link}}\n\nEquipe JV Celulares.'),
('em_analise','Em análise','Em análise',E'Olá, {{nome_cliente}}.\n\nSeu aparelho *{{modelo}}* (OS {{numero_os}}) está *em análise* pela nossa equipe técnica.\n\nAcompanhe: {{portal_link}}\n\nEquipe JV Celulares.'),
('orcamento','Orçamento disponível',NULL,E'Olá, {{nome_cliente}}.\n\nO orçamento da OS *{{numero_os}}* está disponível.\n\n📱 Aparelho: {{modelo}}\n💰 Valor: {{valor}}\n\nAprove ou recuse pelo portal:\n{{portal_link}}\n\nEquipe JV Celulares.'),
('orcamento_aprovado','Orçamento aprovado',NULL,E'Obrigado, {{nome_cliente}}! ✅\n\nRecebemos a aprovação do orçamento da OS *{{numero_os}}*. Já iniciamos os procedimentos.\n\n{{portal_link}}'),
('orcamento_recusado','Orçamento recusado',NULL,E'Olá, {{nome_cliente}}.\n\nRegistramos a recusa do orçamento da OS *{{numero_os}}*. Seu aparelho estará disponível para retirada.\n\n{{portal_link}}'),
('aguardando_peca','Peça solicitada','Aguardando peça',E'Olá, {{nome_cliente}}.\n\nSolicitamos a peça necessária para o reparo do seu *{{modelo}}* (OS {{numero_os}}). Avisaremos assim que chegar.\n\n{{portal_link}}'),
('peca_recebida','Peça recebida',NULL,E'Boa notícia, {{nome_cliente}}! 📦\n\nA peça da OS *{{numero_os}}* chegou e o reparo será retomado.\n\n{{portal_link}}'),
('em_manutencao','Reparo iniciado','Em manutenção',E'Olá, {{nome_cliente}}.\n\nO reparo do seu *{{modelo}}* (OS {{numero_os}}) foi *iniciado*. 🔧\n\nAcompanhe: {{portal_link}}'),
('pronto','Pronto para retirada','Pronto',E'Olá, {{nome_cliente}}. 🎉\n\nSeu *{{modelo}}* está *pronto para retirada*!\n\n🧾 OS: {{numero_os}}\n💰 Valor: {{valor}}\n\nDetalhes: {{portal_link}}\n\nEquipe JV Celulares.'),
('entregue','Ordem entregue','Entregue',E'Olá, {{nome_cliente}}.\n\nA OS *{{numero_os}}* foi finalizada e entregue. Obrigado pela confiança! 💙\n\nQualquer dúvida, estamos à disposição.\n{{portal_link}}'),
('cancelada','Ordem cancelada','Cancelada',E'Olá, {{nome_cliente}}.\n\nA OS *{{numero_os}}* foi *cancelada*. Em caso de dúvidas, fale conosco.\n\n{{portal_link}}'),
('agradecimento','Agradecimento',NULL,E'Obrigado pela preferência, {{nome_cliente}}! 💙\n\nSe puder, avalie nosso atendimento. Equipe JV Celulares.');
