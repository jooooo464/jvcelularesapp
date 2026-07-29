import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, Wrench, ShoppingBag, Percent } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — JV Celulares" },
      { name: "description", content: "Faturamento, lucratividade, produtos mais vendidos e desempenho de serviços." },
      { property: "og:title", content: "Relatórios — JV Celulares" },
      { property: "og:description", content: "Analise vendas, ordens de serviço e margens por período." },
    ],
  }),
  component: RelatoriosPage,
});

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function RelatoriosPage() {
  const [dias, setDias] = useState("30");
  const [fTecnico, setFTecnico] = useState("todos");
  const [fCliente, setFCliente] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");

  const desde = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(dias));
    return d.toISOString();
  }, [dias]);

  const { data } = useQuery({
    queryKey: ["relatorios", dias],
    queryFn: async () => {
      const [vendas, itens, ordens] = await Promise.all([
        supabase.from("vendas").select("id,valor_total,desconto,forma_pagamento,created_at").gte("created_at", desde),
        supabase
          .from("itens_venda")
          .select("quantidade,valor_unitario,custo_unitario,produtos(nome),vendas!inner(created_at)")
          .gte("vendas.created_at", desde),
        supabase
          .from("ordens_servico")
          .select(
            "id,numero_os,status,valor_total,valor_pecas,valor_recebido,status_pagamento,orcamento_aprovado,forma_pagamento,data_entrada,data_entrega,data_pagamento,tecnico_id,cliente_id,clientes(nome),profiles(nome)",
          )
          .eq("deleted", false)
          .gte("data_entrada", desde.slice(0, 10)),
      ]);
      return { vendas: vendas.data ?? [], itens: itens.data ?? [], ordens: ordens.data ?? [] };
    },
  });

  const vendas = data?.vendas ?? [];
  const itens = data?.itens ?? [];
  const todasOrdens = data?.ordens ?? [];

  const ordens = todasOrdens.filter(
    (o) =>
      (fTecnico === "todos" || o.tecnico_id === fTecnico) &&
      (fCliente === "todos" || o.cliente_id === fCliente) &&
      (fStatus === "todos" || o.status === fStatus),
  );

  const opcoesTecnicos = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of todasOrdens) if (o.tecnico_id) m.set(o.tecnico_id, o.profiles?.nome ?? "—");
    return [...m.entries()];
  }, [todasOrdens]);

  const opcoesClientes = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of todasOrdens) if (o.cliente_id) m.set(o.cliente_id, o.clientes?.nome ?? "—");
    return [...m.entries()];
  }, [todasOrdens]);

  const opcoesStatus = useMemo(() => [...new Set(todasOrdens.map((o) => o.status))], [todasOrdens]);

  const ordensReais = ordens.filter((o) => o.status === "Entregue" && o.status_pagamento === "Pago");
  const ordensFuturas = ordens.filter(
    (o) => o.orcamento_aprovado && o.status !== "Entregue" && o.status !== "Cancelada",
  );

  const faturamentoVendas = vendas.reduce((s, v) => s + Number(v.valor_total), 0);
  const faturamentoOS = ordensReais.reduce((s, o) => s + Number(o.valor_recebido || o.valor_total), 0);
  const futuroTotal = ordensFuturas.reduce((s, o) => s + Number(o.valor_total), 0);
  const ticketFuturo = ordensFuturas.length ? futuroTotal / ordensFuturas.length : 0;
  const custoVendas = itens.reduce((s, i) => s + Number(i.custo_unitario) * i.quantidade, 0);
  const custoOS = ordensReais.reduce((s, o) => s + Number(o.valor_pecas), 0);
  const faturamento = faturamentoVendas + faturamentoOS;
  const lucro = faturamento - custoVendas - custoOS;
  const margem = faturamento ? (lucro / faturamento) * 100 : 0;


  const topProdutos = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number; total: number }>();
    for (const i of itens) {
      const nome = i.produtos?.nome ?? "Produto removido";
      const atual = mapa.get(nome) ?? { nome, qtd: 0, total: 0 };
      atual.qtd += i.quantidade;
      atual.total += Number(i.valor_unitario) * i.quantidade;
      mapa.set(nome, atual);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }, [itens]);

  const pagamentos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const v of vendas) mapa.set(v.forma_pagamento, (mapa.get(v.forma_pagamento) ?? 0) + Number(v.valor_total));
    return [...mapa.entries()].map(([name, value]) => ({ name, value }));
  }, [vendas]);

  const statusOS = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const o of ordens) mapa.set(o.status, (mapa.get(o.status) ?? 0) + 1);
    return [...mapa.entries()].map(([status, total]) => ({ status, total }));
  }, [ordens]);

  function exportarCSV() {
    const linhas = [
      ["Indicador", "Valor"],
      ["Período (dias)", dias],
      ["Faturamento vendas", faturamentoVendas.toFixed(2)],
      ["Faturamento serviços", faturamentoOS.toFixed(2)],
      ["Custo total", (custoVendas + custoOS).toFixed(2)],
      ["Lucro bruto", lucro.toFixed(2)],
      ["Margem (%)", margem.toFixed(2)],
      [],
      ["Produto", "Quantidade", "Total"],
      ...topProdutos.map((p) => [p.nome, String(p.qtd), p.total.toFixed(2)]),
    ];
    const csv = linhas.map((l) => l.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${dias}dias.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Relatórios" description="Desempenho comercial e operacional por período.">
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportarCSV}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento total" value={brl(faturamento)} icon={TrendingUp} tone="brand" />
        <StatCard label="Vendas (PDV)" value={brl(faturamentoVendas)} icon={ShoppingBag} hint={`${vendas.length} venda(s)`} />
        <StatCard label="Serviços (OS)" value={brl(faturamentoOS)} icon={Wrench} hint={`${ordens.length} ordem(ns)`} />
        <StatCard
          label="Lucro bruto"
          value={brl(lucro)}
          icon={Percent}
          hint={`Margem de ${margem.toFixed(1)}%`}
          tone={lucro >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="mb-4 text-sm font-semibold">Ordens por status</h2>
          {statusOS.length === 0 ? (
            <EmptyState message="Sem ordens no período." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusOS}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} angle={-15} height={50} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface p-5">
          <h2 className="mb-4 text-sm font-semibold">Vendas por forma de pagamento</h2>
          {pagamentos.length === 0 ? (
            <EmptyState message="Sem vendas no período." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pagamentos} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {pagamentos.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="surface overflow-hidden lg:col-span-2">
          <div className="px-5 pt-5">
            <h2 className="text-sm font-semibold">Produtos mais vendidos</h2>
          </div>
          {topProdutos.length === 0 ? (
            <div className="p-5"><EmptyState message="Nenhuma venda registrada no período." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProdutos.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="numeric text-right">{p.qtd}</TableCell>
                    <TableCell className="numeric text-right">{brl(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="surface overflow-hidden lg:col-span-2">
          <div className="px-5 pt-5">
            <h2 className="text-sm font-semibold">Últimas vendas</h2>
          </div>
          {vendas.length === 0 ? (
            <div className="p-5"><EmptyState message="Sem vendas no período." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.slice(0, 10).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-muted-foreground">{dateBR(v.created_at)}</TableCell>
                    <TableCell>{v.forma_pagamento}</TableCell>
                    <TableCell className="numeric text-right">{brl(Number(v.desconto))}</TableCell>
                    <TableCell className="numeric text-right font-medium">{brl(Number(v.valor_total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
