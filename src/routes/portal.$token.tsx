import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Hash, Wrench, User, FileText, Camera, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PortalTimeline } from "@/components/PortalTimeline";
import { portalOrdem, portalResponderOrcamento } from "@/lib/portal.functions";
import { brl, dateBR, dateTimeBR } from "@/lib/format";
import { mascararImei } from "@/lib/portal-etapas";

export const Route = createFileRoute("/portal/$token")({
  head: () => ({
    meta: [
      { title: "Acompanhar meu reparo — Portal do Cliente" },
      { name: "description", content: "Linha do tempo, histórico, fotos e orçamento da sua ordem de serviço." },
      { property: "og:title", content: "Acompanhar meu reparo — Portal do Cliente" },
      { property: "og:description", content: "Veja em tempo real cada etapa do conserto do seu aparelho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalOrdemPage,
});

function Info({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function PortalOrdemPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["portal-os", token],
    queryFn: () => portalOrdem({ data: { token } }),
    refetchInterval: 30_000,
  });

  const responder = useMutation({
    mutationFn: (aprovar: boolean) =>
      portalResponderOrcamento({
        data: { token, aprovar, dispositivo: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 280) : undefined },
      }),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.erro);
      toast.success(`Orçamento ${r.status.toLowerCase()} com sucesso`);
      qc.invalidateQueries({ queryKey: ["portal-os", token] });
    },
    onError: (e: Error) => toast.error("Não foi possível registrar sua resposta", { description: e.message }),
  });

  if (isLoading) return <LoadingScreen label="Carregando sua ordem de serviço..." />;
  if (!data?.ok)
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">{data?.erro ?? "Link inválido."}</p>
      </main>
    );

  const os = data.os as any;
  const atualizacoes = data.atualizacoes as any[];
  const total = Number(os.valor_servico) + Number(os.valor_pecas) - Number(os.desconto);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">JV Celulares · Assistência Técnica</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Acompanhar meu reparo · OS #{os.numero_os}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Olá {os.clientes?.nome ?? "cliente"}, aqui está o andamento do seu aparelho.
        </p>
      </header>

      <section className="surface grid gap-4 p-5 sm:grid-cols-2">
        <Info icon={Hash} label="Ordem de serviço" value={`#${os.numero_os}`} />
        <Info icon={CalendarClock} label="Data de entrada" value={dateBR(os.data_entrada)} />
        <Info icon={CalendarClock} label="Previsão de entrega" value={dateBR(os.previsao_entrega)} />
        <Info icon={User} label="Técnico responsável" value={os.profiles?.nome ?? "A definir"} />
        <Info icon={Wrench} label="Aparelho" value={[os.aparelhos?.marca, os.aparelhos?.modelo].filter(Boolean).join(" ") || "—"} />
        <Info icon={Wrench} label="IMEI" value={mascararImei(os.aparelhos?.imei) ?? "—"} />
        <Info icon={FileText} label="Defeito informado" value={os.defeito || "—"} />
        <Info icon={FileText} label="Diagnóstico" value={os.diagnostico || "Em análise"} />
        <Info icon={FileText} label="Valor estimado" value={brl(total)} />
        <Info
          icon={FileText}
          label="Valor final"
          value={os.status === "Entregue" || os.status === "Pronto" ? brl(Number(os.valor_total)) : "Aguardando conclusão"}
        />
      </section>

      {os.orcamento_status === "Pendente" && (
        <section className="surface space-y-3 border-warning/40 p-5">
          <h2 className="font-display text-lg font-semibold">Aprovação de orçamento</h2>
          <dl className="grid gap-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Mão de obra</dt><dd className="numeric">{brl(Number(os.valor_servico))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Peças</dt><dd className="numeric">{brl(Number(os.valor_pecas))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Descontos</dt><dd className="numeric">- {brl(Number(os.desconto))}</dd></div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold"><dt>Total</dt><dd className="numeric">{brl(total)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Prazo estimado</dt><dd>{dateBR(os.previsao_entrega)}</dd></div>
          </dl>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={responder.isPending} onClick={() => responder.mutate(true)}>
              <ThumbsUp className="size-4" /> Aprovar orçamento
            </Button>
            <Button variant="destructive" className="flex-1" disabled={responder.isPending} onClick={() => responder.mutate(false)}>
              <ThumbsDown className="size-4" /> Recusar
            </Button>
          </div>
        </section>
      )}

      {(os.orcamento_status === "Aprovado" || os.orcamento_status === "Recusado") && (
        <p className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
          Orçamento <strong>{os.orcamento_status.toLowerCase()}</strong> em {dateTimeBR(os.orcamento_resposta_em)}.
        </p>
      )}

      <section className="surface p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Etapas do reparo</h2>
        <PortalTimeline status={os.status} orcamento={os.orcamento_status} />
      </section>

      <section className="surface p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Histórico de atualizações</h2>
        {atualizacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há atualizações registradas.</p>
        ) : (
          <ol className="space-y-4">
            {[...atualizacoes].reverse().map((a) => (
              <li key={a.id} className="border-l-2 border-primary/30 pl-4">
                <p className="numeric text-xs text-muted-foreground">{dateTimeBR(a.created_at)}</p>
                <p className="text-sm font-medium">{a.titulo}</p>
                {a.descricao && <p className="text-sm text-muted-foreground">{a.descricao}</p>}
                {a.profiles?.nome && <p className="text-xs text-muted-foreground">Técnico: {a.profiles.nome}</p>}
                {a.foto_url && (
                  <img
                    src={a.foto_url}
                    alt={`Foto da etapa: ${a.titulo}`}
                    loading="lazy"
                    className="mt-2 max-h-56 rounded-lg border border-border object-cover"
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {os.fotos?.length > 0 && (
        <section className="surface p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Camera className="size-4" /> Fotos do processo
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {os.fotos.map((f: string) => (
              <img key={f} src={f} alt="Foto do aparelho durante o reparo" loading="lazy" className="aspect-square rounded-lg border border-border object-cover" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
