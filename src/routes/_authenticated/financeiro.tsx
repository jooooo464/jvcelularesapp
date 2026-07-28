import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, CheckCircle2, Trash2, Wallet, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState, StatCard } from "@/components/ui-kit";
import { Field } from "./clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, dateBR, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — CelTech ERP" },
      { name: "description", content: "Contas a pagar, a receber, fluxo de caixa e vencimentos." },
      { property: "og:title", content: "Financeiro — CelTech ERP" },
      { property: "og:description", content: "Acompanhe entradas, saídas e inadimplência em tempo real." },
    ],
  }),
  component: FinanceiroPage,
});

type Tipo = "Entrada" | "Saída";
const CATEGORIAS = ["Venda", "Serviço", "Peças", "Aluguel", "Salário", "Imposto", "Marketing", "Outros"];

const vazio = {
  tipo: "Entrada" as Tipo,
  descricao: "",
  categoria: "Outros",
  valor: "0",
  vencimento: todayISO(),
};

function FinanceiroPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("todos");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ ...vazio });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financeiro").select("*").order("vencimento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.descricao.trim()) throw new Error("Informe a descrição");
      const { error } = await supabase.from("financeiro").insert({
        tipo: f.tipo,
        descricao: f.descricao.trim(),
        categoria: f.categoria,
        valor: Number(f.valor) || 0,
        vencimento: f.vencimento,
        status: "Pendente" as const,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento criado");
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setF({ ...vazio });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const baixar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financeiro").update({ status: "Pago" as const }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Baixa realizada");
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error("Erro ao dar baixa", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financeiro").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      qc.invalidateQueries({ queryKey: ["financeiro"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  const hoje = todayISO();
  const pendente = (l: (typeof lancamentos)[number]) => l.status !== "Pago";
  const receber = lancamentos.filter((l) => l.tipo === "Entrada" && pendente(l));
  const pagar = lancamentos.filter((l) => l.tipo === "Saída" && pendente(l));
  const vencidos = lancamentos.filter((l) => pendente(l) && l.vencimento < hoje);
  const saldo = lancamentos
    .filter((l) => l.status === "Pago")
    .reduce((s, l) => s + (l.tipo === "Entrada" ? 1 : -1) * Number(l.valor), 0);

  const lista = lancamentos.filter((l) => {
    if (filtro === "entradas") return l.tipo === "Entrada";
    if (filtro === "saidas") return l.tipo === "Saída";
    if (filtro === "pendentes") return pendente(l);
    if (filtro === "vencidos") return pendente(l) && l.vencimento < hoje;
    return true;
  });

  return (
    <div>
      <PageHeader title="Financeiro" description="Contas a pagar e a receber, com baixa e fluxo de caixa.">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="entradas">Entradas</SelectItem>
            <SelectItem value="saidas">Saídas</SelectItem>
            <SelectItem value="pendentes">Pendentes</SelectItem>
            <SelectItem value="vencidos">Vencidos</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setF({ ...vazio }); setOpen(true); }}>
          <Plus className="size-4" /> Novo lançamento
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo realizado" value={brl(saldo)} icon={Wallet} tone={saldo >= 0 ? "success" : "danger"} />
        <StatCard label="A receber" value={brl(receber.reduce((s, l) => s + Number(l.valor), 0))} icon={ArrowDownCircle} tone="brand" />
        <StatCard label="A pagar" value={brl(pagar.reduce((s, l) => s + Number(l.valor), 0))} icon={ArrowUpCircle} />
        <StatCard
          label="Vencidos"
          value={brl(vencidos.reduce((s, l) => s + Number(l.valor), 0))}
          hint={`${vencidos.length} lançamento(s)`}
          icon={AlertTriangle}
          tone={vencidos.length ? "danger" : "default"}
        />
      </div>

      <div className="surface overflow-x-auto">
        {lista.length === 0 ? (
          <EmptyState message="Nenhum lançamento encontrado." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((l) => {
                const vencido = pendente(l) && l.vencimento < hoje;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.descricao}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{l.categoria ?? "—"}</TableCell>
                    <TableCell className={vencido ? "text-destructive" : "text-muted-foreground"}>
                      {dateBR(l.vencimento)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.status === "Pago" ? "secondary" : vencido ? "destructive" : "outline"}>
                        {vencido ? "Vencido" : l.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`numeric text-right font-medium ${l.tipo === "Entrada" ? "text-success" : "text-destructive"}`}
                    >
                      {l.tipo === "Entrada" ? "+" : "−"} {brl(Number(l.valor))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {l.status !== "Pago" && (
                          <Button variant="ghost" size="icon" aria-label="Dar baixa" onClick={() => baixar.mutate(l.id)}>
                            <CheckCircle2 className="size-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(l.id)}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Tipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Categoria">
              <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
            </Field>
            <Field label="Valor">
              <Input type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
            </Field>
            <Field label="Vencimento">
              <Input type="date" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} />
            </Field>
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
