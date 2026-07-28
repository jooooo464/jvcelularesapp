import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portalSolicitarCodigo, portalVerificarCodigo } from "@/lib/portal.functions";
import { dateBR } from "@/lib/format";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Portal do Cliente — Acompanhe seu reparo" },
      {
        name: "description",
        content: "Acompanhe em tempo real o andamento do conserto do seu aparelho: etapas, fotos e orçamento.",
      },
      { property: "og:title", content: "Portal do Cliente — Acompanhe seu reparo" },
      { property: "og:description", content: "Linha do tempo, fotos e aprovação de orçamento online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalLogin,
});

type Ordem = {
  id: string;
  numero_os: number;
  status: string;
  portal_token: string;
  data_entrada: string;
  aparelhos: { marca: string; modelo: string } | null;
};

function PortalLogin() {
  const [identificador, setIdentificador] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"identificar" | "codigo" | "lista">("identificar");
  const [ordens, setOrdens] = useState<Ordem[]>([]);

  const solicitar = useMutation({
    mutationFn: () => portalSolicitarCodigo({ data: { identificador } }),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.erro);
      setEtapa("codigo");
      toast.success(`Código gerado para ${r.nome}`, { description: `Código: ${r.codigo}` });
    },
    onError: (e: Error) => toast.error("Não foi possível gerar o código", { description: e.message }),
  });

  const verificar = useMutation({
    mutationFn: () => portalVerificarCodigo({ data: { identificador, codigo } }),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.erro);
      setOrdens(r.ordens as unknown as Ordem[]);
      setEtapa("lista");
    },
    onError: (e: Error) => toast.error("Falha na verificação", { description: e.message }),
  });

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <div className="brand-frame mx-auto mb-4 size-16 p-1.5">
          <BrandLogo className="size-full rounded-xl" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">JV Celulares</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Acompanhar meu reparo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre com seu CPF ou telefone para ver o andamento do seu aparelho.
        </p>
      </div>


      <div className="surface space-y-4 p-5">
        {etapa === "identificar" && (
          <>
            <Input
              autoFocus
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="CPF ou telefone"
              onKeyDown={(e) => e.key === "Enter" && solicitar.mutate()}
            />
            <Button className="w-full" disabled={solicitar.isPending} onClick={() => solicitar.mutate()}>
              Receber código de verificação
            </Button>
          </>
        )}

        {etapa === "codigo" && (
          <>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-success" /> Informe o código de 6 dígitos.
            </p>
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="numeric text-center text-lg tracking-[0.4em]"
              onKeyDown={(e) => e.key === "Enter" && verificar.mutate()}
            />
            <Button className="w-full" disabled={verificar.isPending} onClick={() => verificar.mutate()}>
              Entrar
            </Button>
            <button className="w-full text-xs text-muted-foreground underline" onClick={() => setEtapa("identificar")}>
              Usar outro CPF ou telefone
            </button>
          </>
        )}

        {etapa === "lista" && (
          <div className="space-y-2">
            {ordens.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ordem de serviço encontrada.</p>
            )}
            {ordens.map((o) => (
              <Link
                key={o.id}
                to="/portal/$token"
                params={{ token: o.portal_token }}
                className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-medium">
                    OS #{o.numero_os} · {[o.aparelhos?.marca, o.aparelhos?.modelo].filter(Boolean).join(" ") || "Aparelho"}
                  </p>
                  <p className="text-xs text-muted-foreground">Entrada em {dateBR(o.data_entrada)}</p>
                </div>
                <span className="text-xs font-medium text-primary">{o.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
