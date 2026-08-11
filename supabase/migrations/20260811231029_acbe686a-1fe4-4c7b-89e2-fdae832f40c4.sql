-- 1. Enums e Tipos
DO $$ BEGIN
    CREATE TYPE public.status_compra AS ENUM (
        'Comprado', 
        'Em análise', 
        'Aguardando reparo', 
        'Em reparo', 
        'Pronto para venda', 
        'Anunciado', 
        'Vendido', 
        'Usado para peças', 
        'Devolvido'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabelas Principais
CREATE TABLE IF NOT EXISTS public.compras_celulares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    cor TEXT,
    armazenamento TEXT,
    imei1 TEXT,
    imei2 TEXT,
    serial_number TEXT,
    estado_geral TEXT,
    observacoes TEXT,
    valor_compra DECIMAL(10,2) NOT NULL DEFAULT 0,
    data_compra DATE DEFAULT CURRENT_DATE,
    forma_pagamento TEXT,
    vendedor_nome TEXT NOT NULL,
    vendedor_cpf TEXT,
    vendedor_telefone TEXT,
    vendedor_whatsapp TEXT,
    vendedor_endereco TEXT,
    vendedor_numero TEXT,
    vendedor_complemento TEXT,
    vendedor_bairro TEXT,
    vendedor_cidade TEXT,
    vendedor_estado TEXT,
    vendedor_cep TEXT,
    status status_compra DEFAULT 'Comprado',
    valor_venda DECIMAL(10,2),
    data_venda TIMESTAMP WITH TIME ZONE,
    cliente_venda_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.compras_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID REFERENCES public.compras_celulares(id) ON DELETE CASCADE,
    url_foto TEXT NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compras_reparos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID REFERENCES public.compras_celulares(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor_estimado DECIMAL(10,2) DEFAULT 0,
    valor_real DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Pendente',
    tecnico_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compras_testes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID REFERENCES public.compras_celulares(id) ON DELETE CASCADE,
    itens_teste JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auditoria_compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID REFERENCES public.compras_celulares(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_celulares TO authenticated;
GRANT ALL ON public.compras_celulares TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_fotos TO authenticated;
GRANT ALL ON public.compras_fotos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_reparos TO authenticated;
GRANT ALL ON public.compras_reparos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_testes TO authenticated;
GRANT ALL ON public.compras_testes TO service_role;

GRANT SELECT, INSERT ON public.auditoria_compras TO authenticated;
GRANT ALL ON public.auditoria_compras TO service_role;

-- 4. RLS
ALTER TABLE public.compras_celulares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_reparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_testes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_compras ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "authenticated_select_compras" ON public.compras_celulares FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_compras" ON public.compras_celulares FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_compras" ON public.compras_celulares FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin_delete_compras" ON public.compras_celulares FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'administrador'::public.app_role));

CREATE POLICY "authenticated_manage_fotos" ON public.compras_fotos FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_manage_reparos" ON public.compras_reparos FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_manage_testes" ON public.compras_testes FOR ALL TO authenticated USING (true);
CREATE POLICY "authenticated_select_auditoria" ON public.auditoria_compras FOR SELECT TO authenticated USING (true);

-- 5. Categoria Inicial
INSERT INTO public.categorias (nome, tipo) 
SELECT 'Aparelho para Revenda', 'Peças'::public.categoria_tipo
WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE nome = 'Aparelho para Revenda');

-- 6. Trigger de Saída Financeira
CREATE OR REPLACE FUNCTION public.fn_compra_celular_financeiro()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.financeiro (
            descricao,
            valor,
            tipo,
            status,
            vencimento,
            categoria
        ) VALUES (
            'Compra de Aparelho: ' || NEW.marca || ' ' || NEW.modelo || ' (Vendedor: ' || NEW.vendedor_nome || ')',
            NEW.valor_compra,
            'Saída',
            'Pago',
            NEW.data_compra,
            'Aparelho para Revenda'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_compra_celular_financeiro
AFTER INSERT ON public.compras_celulares
FOR EACH ROW EXECUTE FUNCTION public.fn_compra_celular_financeiro();
