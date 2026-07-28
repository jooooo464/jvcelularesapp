import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-kit";
import { Field } from "./clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({
    meta: [
      { title: "PDV — CelTech ERP" },
      { name: "description", content: "Ponto de venda rápido com baixa automática de estoque." },
      { property: "og:title", content: "PDV — CelTech ERP" },
      { property: "og:description", content: "Venda acessórios e peças em poucos cliques." },
    ],
  }),
  component: PdvPage,
});

type Item = { id: string; nome: string; preco: number; custo: number; qtd: number; estoque: number };

const PAGAMENTOS = ["Dinheiro", "PIX", "Débito", "Crédito", "Crediário"];

function PdvPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<Item[]>([]);
  const [desconto, setDesconto] = useState("0");
  const [pagamento, setPagamento] = useState("PIX");
  const [clienteId, setClienteId] = useState("");

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-pdv"],
    queryFn: async () =>
      (await supabase
        .from("produtos")
        .select("id,nome,valor_venda,valor_compra,quantidade,sku")
        .gt("quantidade", 0)
        .order("nome")).data ?? [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => (await supabase.from("clientes").select("id,nome").order("nome")).data ?? [],
  });

  const filtrados = useMemo(
    () =>
      produtos.filter((p) =>
        `${p.nome} ${p.sku ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
      ),
    [produtos, busca],
  );

  const subtotal = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  const total = Math.max(subtotal - (Number(desconto) || 0), 0);

  function addItem(p: { id: string; nome: string; valor_venda: number; valor_compra: number; quantidade: number }) {
    setCarrinho((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) {
        if (ex.qtd >= ex.estoque) {
          toast.warning("Estoque insuficiente");
          return c;
        }
        return c.map((i) => (i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
      }
      return [
        ...c,
        { id: p.id, nome: p.nome, preco: Number(p.valor_venda), custo: Number(p.valor_compra), qtd: 1, estoque: p.quantidade },
      ];
    });
  }

  const finalizar = useMutation({
    mutationFn: async () => {
      if (carrinho.length === 0) throw new Error("Carrinho vazio");
      const { data: venda, error } = await supabase
        .from("vendas")
        .insert({
          cliente_id: clienteId || null,
          desconto: Number(desconto) || 0,
          valor_total: total,
          forma_pagamento: pagamento,
        })
        .select("id")
        .single();
      if (error) throw error;

      const itens = carrinho.map((i) => ({
        venda_id: venda.id,
        produto_id: i.id,
        quantidade: i.qtd,
        valor_unitario: i.preco,
        custo_unitario: i.custo,
      }));
      const { error: e2 } = await supabase.from("itens_venda").insert(itens);
      if (e2) throw e2;
      return venda;
    },
    onSuccess: () => {
      toast.success("Venda concluída", { description: brl(total) });
      setCarrinho([]);
      setDesconto("0");
      setClienteId("");
      qc.invalidateQueries({ queryKey: ["produtos-pdv"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error("Erro ao finalizar venda", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="PDV" description="Venda balcão com baixa automática de estoque e lançamento financeiro." />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto por nome ou código..."
              className="pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="surface group p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
              >
                <p className="line-clamp-2 text-sm font-medium">{p.nome}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="numeric text-base font-semibold">{brl(Number(p.valor_venda))}</span>
                  <Badge variant="secondary" className="numeric text-[11px]">{p.quantidade} un</Badge>
                </div>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                Nenhum produto disponível em estoque.
              </p>
            )}
          </div>
        </div>

        <aside className="surface flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            <h2 className="text-sm font-semibold">Carrinho</h2>
            <Badge variant="secondary" className="ml-auto numeric">{carrinho.length}</Badge>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {carrinho.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item.</p>}
            {carrinho.map((i) => (
              <div key={i.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.nome}</p>
                  <p className="numeric text-xs text-muted-foreground">{brl(i.preco)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Diminuir"
                  onClick={() =>
                    setCarrinho((c) =>
                      c.flatMap((x) => (x.id === i.id ? (x.qtd > 1 ? [{ ...x, qtd: x.qtd - 1 }] : []) : [x])),
                    )
                  }
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="numeric w-6 text-center text-sm">{i.qtd}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Aumentar"
                  onClick={() =>
                    setCarrinho((c) =>
                      c.map((x) => (x.id === i.id ? { ...x, qtd: Math.min(x.qtd + 1, x.estoque) } : x)),
                    )
                  }
                >
                  <Plus className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Remover"
                  onClick={() => setCarrinho((c) => c.filter((x) => x.id !== i.id))}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Field label="Cliente (opcional)">
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Consumidor final" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Forma de pagamento">
            <Select value={pagamento} onValueChange={setPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGAMENTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Desconto (R$)">
            <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </Field>

          <div className="space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span className="numeric">{brl(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Desconto</span><span className="numeric">- {brl(Number(desconto) || 0)}</span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <span className="font-semibold">Total</span>
              <span className="numeric text-2xl font-bold">{brl(total)}</span>
            </div>
          </div>

          <Button size="lg" className="w-full" disabled={!carrinho.length || finalizar.isPending} onClick={() => finalizar.mutate()}>
            Finalizar venda
          </Button>
        </aside>
      </div>
    </div>
  );
}
