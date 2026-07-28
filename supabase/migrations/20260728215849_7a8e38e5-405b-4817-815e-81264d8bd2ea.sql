-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('administrador','tecnico','vendedor','financeiro');
CREATE TYPE public.os_status AS ENUM ('Recebido','Em análise','Aguardando peça','Em manutenção','Pronto','Entregue');
CREATE TYPE public.categoria_tipo AS ENUM ('Acessórios','Peças');
CREATE TYPE public.financeiro_tipo AS ENUM ('Entrada','Saída');
CREATE TYPE public.financeiro_status AS ENUM ('Pago','Pendente','Vencido');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  cargo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ativo = true);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'administrador'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'administrador'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'administrador'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'administrador'));

-- auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first;
  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''), NEW.raw_user_meta_data->>'telefone');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'administrador'::public.app_role ELSE 'vendedor'::public.app_role END);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT, telefone TEXT, whatsapp TEXT, email TEXT,
  endereco TEXT, cidade TEXT, estado TEXT, observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_all" ON public.clientes FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

-- ============ APARELHOS ============
CREATE TABLE public.aparelhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  marca TEXT NOT NULL, modelo TEXT NOT NULL,
  imei TEXT, cor TEXT, senha TEXT, observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aparelhos TO authenticated;
GRANT ALL ON public.aparelhos TO service_role;
ALTER TABLE public.aparelhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aparelhos_all" ON public.aparelhos FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

-- ============ FORNECEDORES / CATEGORIAS ============
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL, telefone TEXT, email TEXT, cidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedores_all" ON public.fornecedores FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo public.categoria_tipo NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nome, tipo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_all" ON public.categorias FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

INSERT INTO public.categorias (nome, tipo) VALUES
 ('Capinhas','Acessórios'),('Películas','Acessórios'),('Cabos','Acessórios'),('Fones','Acessórios'),('Carregadores','Acessórios'),
 ('Tela','Peças'),('Bateria','Peças'),('Câmeras','Peças'),('Conectores','Peças');

-- ============ PRODUTOS ============
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  codigo_barras TEXT, sku TEXT, marca TEXT, modelo_compativel TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  valor_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_reais NUMERIC(12,2) NOT NULL DEFAULT 0,
  lucro_percentual NUMERIC(12,2) NOT NULL DEFAULT 0,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos_all" ON public.produtos FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

CREATE OR REPLACE FUNCTION public.calc_lucro_produto()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.lucro_reais := NEW.valor_venda - NEW.valor_compra;
  NEW.lucro_percentual := CASE WHEN NEW.valor_compra > 0
    THEN ROUND(((NEW.valor_venda - NEW.valor_compra) / NEW.valor_compra) * 100, 2) ELSE 0 END;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_produtos_lucro BEFORE INSERT OR UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.calc_lucro_produto();

-- ============ ORDENS DE SERVIÇO ============
CREATE SEQUENCE public.os_numero_seq START 1000;
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os INTEGER NOT NULL UNIQUE DEFAULT nextval('public.os_numero_seq'),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  aparelho_id UUID REFERENCES public.aparelhos(id) ON DELETE SET NULL,
  defeito TEXT NOT NULL DEFAULT '',
  diagnostico TEXT, servico_realizado TEXT,
  valor_servico NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pecas NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.os_status NOT NULL DEFAULT 'Recebido',
  data_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  previsao_entrega DATE, data_entrega DATE,
  tecnico_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  fotos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
GRANT USAGE ON SEQUENCE public.os_numero_seq TO authenticated, service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "os_all" ON public.ordens_servico FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

CREATE OR REPLACE FUNCTION public.calc_total_os()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.valor_total := GREATEST(COALESCE(NEW.valor_servico,0) + COALESCE(NEW.valor_pecas,0) - COALESCE(NEW.desconto,0), 0);
  IF NEW.status = 'Entregue' AND NEW.data_entrega IS NULL THEN NEW.data_entrega := CURRENT_DATE; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_os_total BEFORE INSERT OR UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.calc_total_os();

-- ============ VENDAS ============
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT NOT NULL DEFAULT 'Dinheiro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendas_all" ON public.vendas FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

CREATE TABLE public.itens_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_venda TO authenticated;
GRANT ALL ON public.itens_venda TO service_role;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_venda_all" ON public.itens_venda FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

-- ============ FINANCEIRO ============
CREATE TABLE public.financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.financeiro_tipo NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.financeiro_status NOT NULL DEFAULT 'Pendente',
  venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro TO authenticated;
GRANT ALL ON public.financeiro TO service_role;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financeiro_all" ON public.financeiro FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

-- baixa de estoque + custo automático
CREATE OR REPLACE FUNCTION public.item_venda_baixa_estoque()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.produto_id IS NOT NULL THEN
    SELECT valor_compra INTO NEW.custo_unitario FROM public.produtos WHERE id = NEW.produto_id;
    UPDATE public.produtos SET quantidade = quantidade - NEW.quantidade WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_item_venda_estoque BEFORE INSERT ON public.itens_venda
  FOR EACH ROW EXECUTE FUNCTION public.item_venda_baixa_estoque();

CREATE OR REPLACE FUNCTION public.item_venda_devolve_estoque()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.produto_id IS NOT NULL THEN
    UPDATE public.produtos SET quantidade = quantidade + OLD.quantidade WHERE id = OLD.produto_id;
  END IF;
  RETURN OLD;
END; $$;
CREATE TRIGGER trg_item_venda_devolve AFTER DELETE ON public.itens_venda
  FOR EACH ROW EXECUTE FUNCTION public.item_venda_devolve_estoque();

-- lançamento automático no caixa
CREATE OR REPLACE FUNCTION public.venda_lanca_financeiro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.financeiro (tipo, descricao, categoria, valor, vencimento, status, venda_id)
  VALUES ('Entrada', 'Venda PDV - ' || NEW.forma_pagamento, 'Vendas', NEW.valor_total, CURRENT_DATE, 'Pago', NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_venda_financeiro AFTER INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.venda_lanca_financeiro();

CREATE OR REPLACE FUNCTION public.os_lanca_financeiro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Entregue' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Entregue') THEN
    INSERT INTO public.financeiro (tipo, descricao, categoria, valor, vencimento, status, os_id)
    VALUES ('Entrada', 'OS #' || NEW.numero_os, 'Serviços', NEW.valor_total, CURRENT_DATE, 'Pago', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_os_financeiro AFTER INSERT OR UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.os_lanca_financeiro();

-- ============ AUDITORIA ============
CREATE TABLE public.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL,
  registro_id UUID,
  dados JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.logs_auditoria TO authenticated;
GRANT ALL ON public.logs_auditoria TO service_role;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_select_admin" ON public.logs_auditoria FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

CREATE OR REPLACE FUNCTION public.registra_auditoria()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.logs_auditoria (user_id, tabela, operacao, registro_id, dados)
  VALUES (auth.uid(), TG_TABLE_NAME, TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;
CREATE TRIGGER trg_aud_os AFTER INSERT OR UPDATE OR DELETE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_aud_produtos AFTER INSERT OR UPDATE OR DELETE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();
CREATE TRIGGER trg_aud_financeiro AFTER INSERT OR UPDATE OR DELETE ON public.financeiro FOR EACH ROW EXECUTE FUNCTION public.registra_auditoria();

CREATE INDEX idx_aparelhos_cliente ON public.aparelhos(cliente_id);
CREATE INDEX idx_os_cliente ON public.ordens_servico(cliente_id);
CREATE INDEX idx_os_status ON public.ordens_servico(status);
CREATE INDEX idx_itens_venda ON public.itens_venda(venda_id);
CREATE INDEX idx_financeiro_venc ON public.financeiro(vencimento);