# RepairFlow Pro

PROMPT PROFISSIONAL PARA LOVABLE

ERP Completo para Assistência Técnica de Celulares

Crie um sistema ERP moderno, escalável e pronto para produção, voltado para assistências técnicas de celulares e lojas de acessórios.

O sistema deverá funcionar em computadores, tablets e celulares, possuir alta performance, design premium e arquitetura preparada para crescimento.

Tecnologias:

Frontend: React + TypeScript

Estilização: Tailwind CSS + Shadcn UI

Backend: Supabase

Banco de dados: PostgreSQL

Autenticação: Supabase Auth

Gráficos: Recharts

Formulários: React Hook Form + Zod

Geração de PDF: React PDF

Upload de imagens: Supabase Storage

Notificações: Toast + Push Notifications

PWA para instalação no celular

ESTRUTURA DO BANCO DE DADOS

Tabela: usuarios

id UUID PRIMARY KEY
nome TEXT
email TEXT UNIQUE
telefone TEXT
cargo TEXT
nivel_acesso TEXT
ativo BOOLEAN
created_at TIMESTAMP


Níveis:

Administrador

Técnico

Vendedor

Financeiro

Tabela: clientes

id UUID PRIMARY KEY
nome TEXT
cpf TEXT
telefone TEXT
whatsapp TEXT
email TEXT
endereco TEXT
cidade TEXT
estado TEXT
observacoes TEXT
created_at TIMESTAMP


Tabela: aparelhos

id UUID PRIMARY KEY
cliente_id UUID
marca TEXT
modelo TEXT
imei TEXT
cor TEXT
senha TEXT
observacoes TEXT
created_at TIMESTAMP


Tabela: ordens_servico

id UUID PRIMARY KEY
numero_os INTEGER
cliente_id UUID
aparelho_id UUID
defeito TEXT
diagnostico TEXT
servico_realizado TEXT
valor_servico DECIMAL
valor_pecas DECIMAL
desconto DECIMAL
valor_total DECIMAL
status TEXT
data_entrada TIMESTAMP
previsao_entrega DATE
data_entrega DATE
tecnico_id UUID
created_at TIMESTAMP


Status:

Recebido

Em análise

Aguardando peça

Em manutenção

Pronto

Entregue

Tabela: categorias

id UUID PRIMARY KEY
nome TEXT
tipo TEXT


Tipos:

Acessórios

Peças

Tabela: produtos

id UUID PRIMARY KEY
nome TEXT
categoria_id UUID
codigo_barras TEXT
sku TEXT
marca TEXT
modelo_compativel TEXT
quantidade INTEGER
estoque_minimo INTEGER
valor_compra DECIMAL
valor_venda DECIMAL
lucro_reais DECIMAL
lucro_percentual DECIMAL
fornecedor_id UUID
created_at TIMESTAMP


Cálculo automático:

Lucro = Valor Venda - Valor Compra

Margem % = ((Venda - Compra) ÷ Compra) × 100


Tabela: fornecedores

id UUID PRIMARY KEY
nome TEXT
telefone TEXT
email TEXT
cidade TEXT


Tabela: vendas

id UUID PRIMARY KEY
cliente_id UUID
usuario_id UUID
valor_total DECIMAL
forma_pagamento TEXT
desconto DECIMAL
created_at TIMESTAMP


Tabela: itens_venda

id UUID PRIMARY KEY
venda_id UUID
produto_id UUID
quantidade INTEGER
valor_unitario DECIMAL


Tabela: financeiro

id UUID PRIMARY KEY
tipo TEXT
descricao TEXT
categoria TEXT
valor DECIMAL
vencimento DATE
status TEXT
created_at TIMESTAMP


Tipos:

Entrada

Saída

Status:

Pago

Pendente

Vencido

DASHBOARD PRINCIPAL

Ao abrir o sistema mostrar:

Cartões:

✅ Faturamento Hoje

✅ Faturamento Mês

✅ Lucro Mês

✅ Ordens em andamento

✅ Produtos com estoque baixo

✅ Contas vencidas

✅ Quantidade de clientes

✅ Serviços concluídos

Se houver contas vencidas:

Exibir cartão vermelho:

🔴 Atenção: Existem R$ X,XX em contas vencidas.

TELAS DO SISTEMA

1. Login

E-mail

Senha

Recuperar senha

2. Dashboard

Indicadores

Gráficos

Alertas

Resumo financeiro

3. Clientes

Listagem

Pesquisa

Cadastro

Histórico

4. Ordens de Serviço

Criar OS

Editar

Fotos

PDF

Impressão

5. Estoque

Abas:

Acessórios

Capinhas

Películas

Cabos

Fones

Peças

Tela

Bateria

Câmeras

Conectores

6. PDV

Busca rápida

Código de barras

Carrinho

PIX

Cartão

Dinheiro

7. Financeiro

Fluxo de caixa

Entradas

Saídas

Gráficos

8. Relatórios

Vendas

Lucro

Estoque

Técnicos

Clientes

FLUXOS AUTOMÁTICOS

Venda

Venda realizada:

↓

Baixar estoque

↓

Atualizar faturamento

↓

Atualizar lucro

↓

Registrar caixa

Ordem de Serviço

Criar OS

↓

Adicionar peças

↓

Retirar estoque

↓

Atualizar lucro

↓

Enviar WhatsApp ao cliente

INTEGRAÇÕES FUTURAS

WhatsApp API

Nota Fiscal

Impressora térmica

Leitor de código de barras

Aplicativo Android

Aplicativo iPhone

SEGURANÇA

Implementar:

Row Level Security (RLS)

Permissões por usuário

Logs de alterações

Backup automático

Auditoria

DESIGN

Inspirado em:

Apple

Stripe

Notion

Características:

Visual premium

Modo claro e escuro

Interface limpa

Animações suaves

Gráficos modernos

Responsivo

COMANDO FINAL PARA LOVABLE

Crie este sistema completo, funcional e pronto para produção, utilizando componentes reutilizáveis, banco de dados otimizado, autenticação segura, responsividade total e arquitetura escalável. Gere todas as telas, tabelas do banco, relacionamentos, regras automáticas, permissões de usuários, cálculos financeiros, dashboard e fluxos operacionais sem utilizar dados fictícios fixos.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://jvcelularesapp.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0f7f4b76-5c03-4153-898b-44b623bb3b8f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
