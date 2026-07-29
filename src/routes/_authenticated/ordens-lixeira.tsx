import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "./clientes";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import { excluirDefinitivo, restaurarOs } from "@/lib/os-acoes";

export const Route = createFileRoute("/_authenticated/ordens-lixeira")({
  head: () => ({
    meta: [
      { title: "Ordens Excluídas — JV Celulares" },
      { name: "description", content: "Lixeira de ordens de serviço: restaure ou exclua definitivamente." },
      { property: "og:title", content: "Ordens Excluídas — JV Celulares" },
      { property: "og:description", content: "Auditoria e recuperação de ordens de serviço excluídas." },
    ],
  }),
  component: LixeiraPage,
});

function LixeiraPage() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [alvo, setAlvo] = useState<{ id: string; numero_os: number } | null>(null);
  const [confirma, setConfirma] = useState("");

  const { data: ordens = [] } = useQuery({
    queryKey: ["ordens-lixeira"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id,numero_os,status,valor_total,deleted_at,defeito,clientes(nome)")
        .eq("deleted", true)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: auditoria = [] } = useQuery({
    queryKey: ["auditoria-os"],
    enabled: isAdmin,
    queryFn: async () =>
      (
        await supabase
          .from("auditoria_os")
          .select("id,numero_os,acao,motivo,usuario_nome,ip,created_at")
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  const restaurar = useMutation({
    mutationFn: (os: { id: string; numero_os: number }) => restaurarOs(os, false),
    onSuccess: () => {
      toast.success("Ordem restaurada");
      qc.invalidateQueries({ queryKey: ["ordens-lixeira"] });
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["auditoria-os"] });
    },
    onError: (e: Error) => toast.error("Erro ao restaurar", { description: e.message }),
  });

  const apagar = useMutation({
    mutationFn: () => excluirDefinitivo(alvo!),
    onSuccess: () => {
      toast.success("Ordem excluída definitivamente");
      setAlvo(null);
      setConfirma("");
      qc.invalidateQueries({ queryKey: ["ordens-lixeira"] });
      qc.invalidateQueries({ queryKey: ["auditoria-os"] });
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  if (!isAdmin) {
    return (
      <div className="surface flex flex-col items-center gap-2 p-10 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Apenas administradores podem acessar a lixeira de ordens.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ordens de Serviço Excluídas" description="Restaure ou exclua definitivamente. Todas as ações ficam registradas." />

      <div className="surface overflow-x-auto">
        {ordens.length === 0 ? (
          <EmptyState message="Nenhuma ordem na lixeira." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Excluída em</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordens.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="numeric font-medium">#{o.numero_os}</TableCell>
                  <TableCell>{o.clientes?.nome ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{dateBR(o.deleted_at)}</TableCell>
                  <TableCell className="numeric text-right">{brl(Number(o.valor_total))}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Restaurar" onClick={() => restaurar.mutate(o)}>
                        <RotateCcw className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir definitivamente"
                        className="text-destructive"
                        onClick={() => setAlvo({ id: o.id, numero_os: o.numero_os })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="surface overflow-x-auto">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">Auditoria recente</div>
        {auditoria.length === 0 ? (
          <EmptyState message="Nenhuma ação registrada." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden md:table-cell">Motivo</TableHead>
                <TableHead className="hidden lg:table-cell">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditoria.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">{dateBR(a.created_at)}</TableCell>
                  <TableCell className="numeric">#{a.numero_os ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{a.acao}</Badge></TableCell>
                  <TableCell>{a.usuario_nome ?? "—"}</TableCell>
                  <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">{a.motivo ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{a.ip ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!alvo} onOpenChange={(v) => !v && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir definitivamente OS #{alvo?.numero_os}</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível e remove também as atualizações e lançamentos financeiros vinculados.
            </DialogDescription>
          </DialogHeader>
          <Field label="Digite EXCLUIR para confirmar">
            <Input value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="EXCLUIR" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={confirma.trim().toUpperCase() !== "EXCLUIR" || apagar.isPending}
              onClick={() => apagar.mutate()}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
