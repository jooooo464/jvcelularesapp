import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, PackageX, Trash2, Boxes, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, StatCard } from "@/components/ui-kit";
import { Field } from "./clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — CelTech ERP" },
      { name: "description", content: "Produtos, peças, custos, margens e alertas de estoque mínimo." },
      { property: "og:title", content: "Estoque — CelTech ERP" },
      { property: "og:description", content: "Controle de peças e acessórios com margem de lucro automática." },
    ],
  }),
  component: EstoquePage,
});

const vazio = {
  nome: "",
  sku: "",
  codigo_barras: "",
  marca: "",
  modelo_compativel: "",
  categoria_id: "",
  fornecedor_id: "",
  valor_compra: "0",
  valor_venda: "0",
  quantidade: "0",
  estoque_minimo: "1",
};

function EstoquePage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...vazio });
  const [soBaixo, setSoBaixo] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("*, categorias(nome), fornecedores(nome)")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await supabase.from("categorias").select("id,nome").order("nome")).data ?? [],
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => (await supabase.from("fornecedores").select("id,nome").order("nome")).data ?? [],
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.nome.trim()) throw new Error("Informe o nome do produto");
      const payload = {
        nome: f.nome.trim(),
        sku: f.sku || null,
        codigo_barras: f.codigo_barras || null,
        marca: f.marca || null,
        modelo_compativel: f.modelo_compativel || null,
        categoria_id: f.categoria_id || null,
        fornecedor_id: f.fornecedor_id || null,
        valor_compra: Number(f.valor_compra) || 0,
        valor_venda: Number(f.valor_venda) || 0,
        quantidade: Number(f.quantidade) || 0,
        estoque_minimo: Number(f.estoque_minimo) || 0,
      };
      const { error } = editId
        ? await supabase.from("produtos").update(payload).eq("id", editId)
        : await supabase.from("produtos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editId ? "Produto atualizado" : "Produto cadastrado");
      qc.invalidateQueries({ queryKey: ["produtos"] });
      setOpen(false);
      setEditId(null);
      setF({ ...vazio });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  const lista = produtos.filter((p) => {
    const baixo = p.quantidade <= p.estoque_minimo;
    const texto = `${p.nome} ${p.sku ?? ""} ${p.marca ?? ""} ${p.categorias?.nome ?? ""}`.toLowerCase();
    return (!soBaixo || baixo) && texto.includes(busca.toLowerCase());
  });

  const valorEstoque = produtos.reduce((s, p) => s + Number(p.valor_compra) * p.quantidade, 0);
  const potencial = produtos.reduce((s, p) => s + Number(p.valor_venda) * p.quantidade, 0);
  const baixos = produtos.filter((p) => p.quantidade <= p.estoque_minimo).length;

  const margem = (() => {
    const c = Number(f.valor_compra);
    const v = Number(f.valor_venda);
    if (!v) return 0;
    return ((v - c) / v) * 100;
  })();

  return (
    <div>
      <PageHeader title="Estoque" description="Peças, acessórios, custos e margens de lucro.">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-48 pl-9" />
        </div>
        <Button variant={soBaixo ? "default" : "outline"} onClick={() => setSoBaixo((v) => !v)}>
          <PackageX className="size-4" /> Estoque baixo
        </Button>
        <Button onClick={() => { setEditId(null); setF({ ...vazio }); setOpen(true); }}>
          <Plus className="size-4" /> Novo produto
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Valor em estoque (custo)" value={brl(valorEstoque)} icon={Boxes} />
        <StatCard label="Potencial de venda" value={brl(potencial)} icon={TrendingUp} tone="brand" />
        <StatCard
          label="Itens em nível crítico"
          value={String(baixos)}
          icon={AlertTriangle}
          tone={baixos ? "warning" : "default"}
        />
      </div>

      <div className="surface overflow-x-auto">
        {lista.length === 0 ? (
          <EmptyState message="Nenhum produto encontrado." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Margem</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => {
                const baixo = p.quantidade <= p.estoque_minimo;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.nome}
                      {p.sku && <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{p.categorias?.nome ?? "—"}</TableCell>
                    <TableCell className="numeric text-right">{brl(Number(p.valor_compra))}</TableCell>
                    <TableCell className="numeric text-right">{brl(Number(p.valor_venda))}</TableCell>
                    <TableCell className="numeric hidden text-right lg:table-cell">
                      {Number(p.lucro_percentual ?? 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={baixo ? "destructive" : "secondary"} className="numeric">
                        {p.quantidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                          onClick={() => {
                            setEditId(p.id);
                            setF({
                              nome: p.nome,
                              sku: p.sku ?? "",
                              codigo_barras: p.codigo_barras ?? "",
                              marca: p.marca ?? "",
                              modelo_compativel: p.modelo_compativel ?? "",
                              categoria_id: p.categoria_id ?? "",
                              fornecedor_id: p.fornecedor_id ?? "",
                              valor_compra: String(p.valor_compra),
                              valor_venda: String(p.valor_venda),
                              quantidade: String(p.quantidade),
                              estoque_minimo: String(p.estoque_minimo),
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(p.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2"><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
            <Field label="SKU / Código"><Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></Field>
            <Field label="Código de barras"><Input value={f.codigo_barras} onChange={(e) => setF({ ...f, codigo_barras: e.target.value })} /></Field>
            <Field label="Marca"><Input value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></Field>
            <Field label="Modelo compatível"><Input value={f.modelo_compativel} onChange={(e) => setF({ ...f, modelo_compativel: e.target.value })} /></Field>
            <Field label="Categoria">
              <Select value={f.categoria_id} onValueChange={(v) => setF({ ...f, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fornecedor">
              <Select value={f.fornecedor_id} onValueChange={(v) => setF({ ...f, fornecedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Valor de compra"><Input type="number" step="0.01" value={f.valor_compra} onChange={(e) => setF({ ...f, valor_compra: e.target.value })} /></Field>
            <Field label="Valor de venda"><Input type="number" step="0.01" value={f.valor_venda} onChange={(e) => setF({ ...f, valor_venda: e.target.value })} /></Field>
            <Field label="Quantidade"><Input type="number" value={f.quantidade} onChange={(e) => setF({ ...f, quantidade: e.target.value })} /></Field>
            <Field label="Estoque mínimo"><Input type="number" value={f.estoque_minimo} onChange={(e) => setF({ ...f, estoque_minimo: e.target.value })} /></Field>
            <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <span className="text-sm text-muted-foreground">Margem de lucro</span>
              <Badge className="numeric text-sm">{margem.toFixed(1)}%</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
