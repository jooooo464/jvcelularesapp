import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  TrendingUp,
  Wrench,
  PackageX,
  AlertTriangle,
  Users,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { StatCard, PageHeader } from "@/components/ui-kit";
import { brl, num, dateBR, todayISO, startOfMonthISO } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { WhatsappResumo } from "./whatsapp";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — JV Celulares" },
      { name: "description", content: "Indicadores de faturamento, lucro, ordens e estoque." },
      { property: "og:title", content: "Dashboard — JV Celulares" },
      { property: "og:description", content: "Visão geral da sua assistência técnica." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const hoje = todayISO();
      const inicioMes = startOfMonthISO();

      const [fin, os, produtos, clientes, itens] = await Promise.all([
        supabase.from("financeiro").select("tipo,valor,vencimento,status,created_at"),
        supabase.from("ordens_servico").select("status,valor_total,valor_pecas,data_entrada,numero_os,previsao_entrega,clientes(nome)").eq("deleted", false).order("data_entrada", { ascending: false }),
        supabase.from("produtos").select("nome,quantidade,estoque_minimo"),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("itens_venda").select("quantidade,valor_unitario,custo_unitario,vendas(created_at)"),
      ]);

      const finRows = fin.data ?? [];
      const osRows = os.data ?? [];

      const entradasHoje = finRows
        .filter((f) => f.tipo === "Entrada" && f.created_at.slice(0, 10) === hoje)
        .reduce((s, f) => s + Number(f.valor), 0);
      const entradasMes = finRows
        .filter((f) => f.tipo === "Entrada" && f.created_at.slice(0, 10) >= inicioMes)
        .reduce((s, f) => s + Number(f.valor), 0);
      const saidasMes = finRows
        .filter((f) => f.tipo === "Saída" && f.created_at.slice(0, 10) >= inicioMes)
        .reduce((s, f) => s + Number(f.valor), 0);

      const lucroProdutos = (itens.data ?? [])
        .filter((i) => (i.vendas?.created_at ?? "").slice(0, 10) >= inicioMes)
        .reduce((s, i) => s + (Number(i.valor_unitario) - Number(i.custo_unitario)) * i.quantidade, 0);
      const lucroServicos = osRows
        .filter((o) => o.status === "Entregue" && o.data_entrada.slice(0, 10) >= inicioMes)
        .reduce((s, o) => s + (Number(o.valor_total) - Number(o.valor_pecas)), 0);

      const vencidas = finRows.filter(
        (f) => f.tipo === "Saída" && f.status !== "Pago" && f.vencimento < hoje,
      );

      const emAndamento = osRows.filter((o) => o.status !== "Entregue");
      const concluidas = osRows.filter((o) => o.status === "Entregue").length;
      const estoqueBaixo = (produtos.data ?? []).filter((p) => p.quantidade <= p.estoque_minimo);

      // série de 14 dias
      const serie = Array.from({ length: 14 }, (_, idx) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - idx));
        const key = d.toISOString().slice(0, 10);
        const entrada = finRows
          .filter((f) => f.tipo === "Entrada" && f.created_at.slice(0, 10) === key)
          .reduce((s, f) => s + Number(f.valor), 0);
        const saida = finRows
          .filter((f) => f.tipo === "Saída" && f.created_at.slice(0, 10) === key)
          .reduce((s, f) => s + Number(f.valor), 0);
        return { dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), entrada, saida };
      });

      const statusCount = ["Recebido", "Em análise", "Aguardando peça", "Em manutenção", "Pronto", "Entregue"].map(
        (s) => ({ status: s, total: osRows.filter((o) => o.status === s).length }),
      );

      return {
        entradasHoje,
        entradasMes,
        lucroMes: lucroProdutos + lucroServicos - saidasMes,
        emAndamento,
        concluidas,
        estoqueBaixo,
        vencidas,
        totalVencidas: vencidas.reduce((s, f) => s + Number(f.valor), 0),
        clientes: clientes.count ?? 0,
        serie,
        statusCount,
      };
    },
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Resumo operacional e financeiro em tempo real." />

      {data && data.vencidas.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              Atenção: existem {brl(data.totalVencidas)} em contas vencidas.
            </p>
            <p className="text-sm text-muted-foreground">
              {data.vencidas.length} lançamento(s) aguardando pagamento.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento hoje" value={brl(data?.entradasHoje)} icon={Banknote} tone="brand" />
        <StatCard label="Faturamento do mês" value={brl(data?.entradasMes)} icon={TrendingUp} tone="success" />
        <StatCard label="Lucro do mês" value={brl(data?.lucroMes)} hint="Receitas − custos − despesas" icon={TrendingUp} tone="success" />
        <StatCard label="Ordens em andamento" value={num(data?.emAndamento.length)} icon={Wrench} tone="warning" />
        <StatCard label="Estoque baixo" value={num(data?.estoqueBaixo.length)} hint="Produtos no mínimo" icon={PackageX} tone="warning" />
        <StatCard label="Contas vencidas" value={brl(data?.totalVencidas)} icon={AlertTriangle} tone="danger" />
        <StatCard label="Clientes cadastrados" value={num(data?.clientes)} icon={Users} />
        <StatCard label="Serviços concluídos" value={num(data?.concluidas)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="font-display text-sm font-semibold">Fluxo de caixa — 14 dias</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.serie ?? []}>
                <defs>
                  <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={54} />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="entrada" name="Entradas" stroke="var(--color-chart-1)" fill="url(#gEnt)" strokeWidth={2} />
                <Area type="monotone" dataKey="saida" name="Saídas" stroke="var(--color-chart-4)" fill="url(#gSai)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="font-display text-sm font-semibold">Ordens por status</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.statusCount ?? []} layout="vertical" margin={{ left: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={96} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" name="Ordens" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="mb-3 font-display text-sm font-semibold">Ordens em andamento</h2>
          <div className="space-y-2">
            {(data?.emAndamento ?? []).slice(0, 6).map((o) => (
              <div key={o.numero_os} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="numeric text-xs font-semibold text-muted-foreground">#{o.numero_os}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{o.clientes?.nome ?? "—"}</span>
                <Badge variant="secondary" className="text-[11px]">{o.status}</Badge>
                <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <CalendarDays className="size-3" /> {dateBR(o.previsao_entrega)}
                </span>
              </div>
            ))}
            {data?.emAndamento.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ordem em aberto.</p>
            )}
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="mb-3 font-display text-sm font-semibold">Estoque crítico</h2>
          <div className="space-y-2">
            {(data?.estoqueBaixo ?? []).slice(0, 6).map((p) => (
              <div key={p.nome} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm">{p.nome}</span>
                <Badge variant="destructive" className="numeric text-[11px]">
                  {p.quantidade} / mín. {p.estoque_minimo}
                </Badge>
              </div>
            ))}
            {data?.estoqueBaixo.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Estoque saudável.</p>
            )}
          </div>
        </div>
      </div>
      <section className="mt-6 space-y-3">
        <h2 className="font-display text-sm font-semibold">WhatsApp</h2>
        <WhatsappResumo />
      </section>
    </div>
  );
}
