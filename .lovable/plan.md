# Plan: Módulo Compra de Celulares - JV Celulares ERP

Implementar um sistema completo para compra e revenda de celulares, integrado ao financeiro e estoque.

## 1. Banco de Dados (PostgreSQL)

### 1.1 Tabelas e Enums
- `app_status_compra`: Enum ('Comprado', 'Em análise', 'Aguardando reparo', 'Em reparo', 'Pronto para venda', 'Anunciado', 'Vendido', 'Usado para peças', 'Devolvido').
- `compras_celulares`: Tabela principal.
- `compras_fotos`: Galeria de fotos vinculada à compra.
- `compras_reparos`: Registro de necessidades e custos de reparo.
- `compras_testes`: Checklist funcional (JSONB para flexibilidade).
- `auditoria_compras`: Logs de alterações.

### 1.2 Integrações
- Trigger para criar saída financeira automática ao registrar uma compra.
- Trigger para criar entrada financeira e calcular lucro ao marcar como "Vendido".
- Inserir categoria "Celulares para Revenda" em `categorias`.

### 1.3 Segurança (RLS)
- Políticas granulares para `administrador` e `vendedor`.
- Mascaramento de CPF em visualizações não-administrativas (via view ou lógica de frontend).

## 2. Interface (Frontend)

### 2.1 Navegação
- Adicionar "Compra de Celulares" ao `AppShell.tsx`.
- Criar rotas em `src/routes/_authenticated/compras`.

### 2.2 Componentes
- `CompraFormDialog`: Formulário multi-step (Dados -> Fotos -> Checklist -> Financeiro -> Vendedor).
- `CompraDashboard`: Cards com indicadores (Investido, Estoque, Lucro).
- `CompraList`: Tabela com filtros, status e ações rápidas.
- `CompraDetails`: Página de histórico completo, galeria e detalhamento de lucro.
- `CompraReparoDialog`: Adicionar custos de reparo.
- `CompraVendaDialog`: Finalizar venda, registrar cliente e calcular lucro real.

## 3. Lógica de Negócio
- Cálculo automático de lucro: `Lucro = Venda - (Custo + Reparos + Extras)`.
- Integração com `estoque`: Ao marcar "Pronto para venda", o item pode aparecer no PDV ou aba de vendas.

## Detalhes Técnicos

### Esquema SQL
```sql
CREATE TYPE public.status_compra AS ENUM ('Comprado', 'Em análise', 'Aguardando reparo', 'Em reparo', 'Pronto para venda', 'Anunciado', 'Vendido', 'Usado para peças', 'Devolvido');

CREATE TABLE public.compras_celulares (
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
    valor_compra DECIMAL(10,2) NOT NULL,
    data_compra DATE DEFAULT CURRENT_DATE,
    forma_pagamento TEXT,
    vendedor_nome TEXT NOT NULL,
    vendedor_cpf TEXT,
    vendedor_telefone TEXT,
    vendedor_whatsapp TEXT,
    vendedor_endereco TEXT,
    vendedor_cidade TEXT,
    vendedor_estado TEXT,
    status status_compra DEFAULT 'Comprado',
    valor_venda DECIMAL(10,2),
    data_venda TIMESTAMP WITH TIME ZONE,
    cliente_venda_id UUID REFERENCES public.clientes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.compras_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID REFERENCES public.compras_celulares(id) ON DELETE CASCADE,
    url_foto TEXT NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.compras_reparos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID REFERENCES public.compras_celulares(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor_estimado DECIMAL(10,2),
    valor_real DECIMAL(10,2),
    status TEXT DEFAULT 'Pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
