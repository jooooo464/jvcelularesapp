import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/diagnosticos")({
  head: () => ({ meta: [{ title: "Diagnósticos — JV Celulares" }] }),
  component: DiagnosticosPage,
});

type Diagnostic = {
  id: string;
  tipo: string;
  status: string;
  resultado_geral: string | null;
  created_at: string;
  completed_at: string | null;
  ordens_servico?: { numero_os?: number; clientes?: { nome?: string | null } | null; aparelhos?: { marca?: string | null; modelo?: string | null } | null } | null;
  profiles?: { nome?: string | null } | null;
};

function DiagnosticosPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["diagnosticos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("diagnostic_sessions")
        .select("*, ordens_servico(numero_os, clientes(nome), aparelhos(marca,modelo)), profiles(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Diagnostic[];
    },
  });

  return (
    <div>
      <PageHeader title="Diagnósticos" description="Histórico de testes de aparelhos vinculados às Ordens de Serviço." />
      <div className="surface overflow-x-auto">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando diagnósticos…</p> : data.length === 0 ? (
          <EmptyState message="Nenhum diagnóstico realizado ainda." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>OS</TableHead><TableHead>Cliente</TableHead><TableHead>Aparelho</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead>Técnico</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader>
            <TableBody>{data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="numeric font-medium">#{item.ordens_servico?.numero_os ?? "—"}</TableCell>
                <TableCell>{item.ordens_servico?.clientes?.nome || "—"}</TableCell>
                <TableCell>{[item.ordens_servico?.aparelhos?.marca, item.ordens_servico?.aparelhos?.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                <TableCell><Badge variant="secondary">{item.tipo === "inicial" ? "Inicial" : item.tipo === "final" ? "Final" : "Independente"}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                <TableCell>{item.profiles?.nome || "—"}</TableCell>
                <TableCell><ResultBadge result={item.resultado_geral} status={item.status} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="size-4" />Os resultados são atualizados automaticamente enquanto o celular realiza os testes.</p>
    </div>
  );
}

function ResultBadge({ result, status }: { result: string | null; status: string }) {
  if (status !== "concluido") return <Badge variant="secondary">{status === "conectado" || status === "em_andamento" ? "Em andamento" : "Aguardando"}</Badge>;
  if (result === "problema") return <Badge variant="destructive">Possui problemas</Badge>;
  if (result === "aprovado") return <Badge className="bg-success text-success-foreground">Aprovado</Badge>;
  return <Badge className="bg-warning text-warning-foreground">Não disponível</Badge>;
}
