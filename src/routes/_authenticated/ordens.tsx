import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { Field } from "./clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import { OsAtualizacoesDialog, type OsPortal } from "@/components/OsAtualizacoesDialog";
import { brandLogoUrl } from "@/components/BrandLogo";
import { PortalShareDialog, type OsShare } from "@/components/PortalShareDialog";
import { OsAcoesMenu } from "@/components/OsAcoesMenu";
import { OsInspecaoDialog, type OsInspecao } from "@/components/OsInspecaoDialog";
import { useIsAdmin } from "@/lib/auth";
import { OsWhatsappDialog, type OsWhats } from "@/components/OsWhatsappDialog";
import { useServerFn } from "@tanstack/react-start";
import { waNotificarStatus } from "@/lib/whatsapp.functions";


export const Route = createFileRoute("/_authenticated/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de Serviço — JV Celulares" },
      { name: "description", content: "Abertura, acompanhamento e entrega de ordens de serviço." },
      { property: "og:title", content: "Ordens de Serviço — JV Celulares" },
      { property: "og:description", content: "Controle total do fluxo de reparos da sua assistência." },
    ],
  }),
  component: OrdensPage,
});

const STATUS = ["Recebido", "Em análise", "Aguardando peça", "Em manutenção", "Pronto", "Entregue"] as const;
type Status = (typeof STATUS)[number];

const vazio = {
  cliente_id: "",
  marca: "",
  modelo: "",
  imei: "",
  cor: "",
  senha: "",
  defeito: "",
  diagnostico: "",
  servico_realizado: "",
  valor_servico: "0",
  valor_pecas: "0",
  desconto: "0",
  status: "Recebido" as Status,
  previsao_entrega: "",
  tecnico_id: "",
};

function OrdensPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string>("todas");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...vazio });
  const [portalOs, setPortalOs] = useState<OsPortal | null>(null);
  const [shareOs, setShareOs] = useState<OsShare | null>(null);
  const [inspecaoOs, setInspecaoOs] = useState<OsInspecao | null>(null);
  const isAdmin = useIsAdmin();

  const { data: ordens = [] } = useQuery({
    queryKey: ["ordens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome,whatsapp), aparelhos(marca,modelo,imei,cor), profiles(nome)")
        .eq("deleted", false)
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => (await supabase.from("clientes").select("id,nome,whatsapp").order("nome")).data ?? [],
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos"],
    queryFn: async () => (await supabase.from("profiles").select("id,nome")).data ?? [],
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!f.cliente_id) throw new Error("Selecione o cliente");
      let aparelhoId: string | null = null;

      if (editId) {
        const atual = ordens.find((o) => o.id === editId);
        aparelhoId = atual?.aparelho_id ?? null;
        if (aparelhoId) {
          await supabase
            .from("aparelhos")
            .update({ marca: f.marca, modelo: f.modelo, imei: f.imei || null, cor: f.cor || null, senha: f.senha || null })
            .eq("id", aparelhoId);
        }
      }

      if (!aparelhoId && f.marca) {
        const { data, error } = await supabase
          .from("aparelhos")
          .insert({
            cliente_id: f.cliente_id,
            marca: f.marca,
            modelo: f.modelo || "—",
            imei: f.imei || null,
            cor: f.cor || null,
            senha: f.senha || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        aparelhoId = data.id;
      }

      const payload = {
        cliente_id: f.cliente_id,
        aparelho_id: aparelhoId,
        defeito: f.defeito,
        diagnostico: f.diagnostico || null,
        servico_realizado: f.servico_realizado || null,
        valor_servico: Number(f.valor_servico) || 0,
        valor_pecas: Number(f.valor_pecas) || 0,
        desconto: Number(f.desconto) || 0,
        status: f.status,
        previsao_entrega: f.previsao_entrega || null,
        tecnico_id: f.tecnico_id || null,
      };

      if (editId) {
        const { error } = await supabase.from("ordens_servico").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ordens_servico").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "OS atualizada" : "OS criada");
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setEditId(null);
      setF({ ...vazio });
    },
    onError: (e: Error) => toast.error("Erro ao salvar OS", { description: e.message }),
  });

  const notificar = useServerFn(waNotificarStatus);
  const [whatsOs, setWhatsOs] = useState<OsWhats | null>(null);
  const [entrega, setEntrega] = useState<{ id: string; numero_os: number; valor: number } | null>(null);
  const [pagamento, setPagamento] = useState({ forma: "PIX", valor: "0" });

  const mudarStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      extra,
    }: {
      id: string;
      status: Status;
      extra?: { status_pagamento: string; forma_pagamento: string; valor_recebido: number };
    }) => {
      const { error } = await supabase.from("ordens_servico").update({ status, ...(extra ?? {}) }).eq("id", id);
      if (error) throw error;
      // Notificação automática ao cliente (silenciosa quando o WhatsApp está desconectado).
      const aviso = await notificar({ data: { ordem_servico_id: id } }).catch(() => null);
      return aviso;
    },
    onSuccess: (aviso) => {
      toast.success("Status atualizado", {
        description: aviso?.ok ? "Cliente avisado no WhatsApp." : undefined,
      });
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["relatorios"] });
      qc.invalidateQueries({ queryKey: ["financeiro"] });
    },
  });

  function trocarStatus(o: { id: string; numero_os: number; valor_total: number | string }, status: Status) {
    if (status === "Entregue") {
      setPagamento({ forma: "PIX", valor: String(Number(o.valor_total)) });
      setEntrega({ id: o.id, numero_os: o.numero_os, valor: Number(o.valor_total) });
      return;
    }
    mudarStatus.mutate({
      id: o.id,
      status,
      extra: { status_pagamento: "Pendente", forma_pagamento: "", valor_recebido: 0 },
    });
  }

  const lista = ordens.filter((o) => {
    const okStatus = filtro === "todas" || o.status === filtro;
    const texto = `${o.numero_os} ${o.clientes?.nome ?? ""} ${o.aparelhos?.modelo ?? ""} ${o.defeito}`.toLowerCase();
    return okStatus && texto.includes(busca.toLowerCase());
  });


  function imprimir(os: (typeof ordens)[number]) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<html><head><title>OS ${os.numero_os}</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;color:#111}
      h1{font-size:20px;margin:0 0 4px} .muted{color:#666;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}
      td,th{border:1px solid #ddd;padding:8px;text-align:left}
      .tot{font-size:18px;font-weight:700;margin-top:16px;text-align:right}</style></head><body>
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid #1B3FE0;padding-bottom:12px;margin-bottom:16px">
        <img src="${window.location.origin}${brandLogoUrl}" alt="JV Celulares" style="width:56px;height:56px;object-fit:contain;border-radius:8px" />
        <div><div style="font-size:18px;font-weight:700;color:#1B3FE0">JV Celulares</div><div class="muted">Sistema de Gestão para Assistência Técnica</div></div>
      </div>
      <h1>Ordem de Serviço #${os.numero_os}</h1>
      <p class="muted">Entrada: ${dateBR(os.data_entrada)} · Previsão: ${dateBR(os.previsao_entrega)}</p>
      <table>
        <tr><th>Cliente</th><td>${os.clientes?.nome ?? "—"}</td></tr>
        <tr><th>Aparelho</th><td>${os.aparelhos?.marca ?? ""} ${os.aparelhos?.modelo ?? ""} ${os.aparelhos?.cor ?? ""}</td></tr>
        <tr><th>IMEI</th><td>${os.aparelhos?.imei ?? "—"}</td></tr>
        <tr><th>Defeito relatado</th><td>${os.defeito}</td></tr>
        <tr><th>Diagnóstico</th><td>${os.diagnostico ?? "—"}</td></tr>
        <tr><th>Serviço realizado</th><td>${os.servico_realizado ?? "—"}</td></tr>
        <tr><th>Técnico</th><td>${os.profiles?.nome ?? "—"}</td></tr>
        <tr><th>Status</th><td>${os.status}</td></tr>
        <tr><th>Serviço</th><td>${brl(Number(os.valor_servico))}</td></tr>
        <tr><th>Peças</th><td>${brl(Number(os.valor_pecas))}</td></tr>
        <tr><th>Desconto</th><td>${brl(Number(os.desconto))}</td></tr>
      </table>
      <p class="tot">Total: ${brl(Number(os.valor_total))}</p>
      <p class="muted" style="margin-top:48px">Assinatura do cliente: ____________________________________</p>
      <p class="muted" style="margin-top:24px;text-align:center">JV Celulares · Assistência Técnica</p>
      </body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div>
      <PageHeader title="Ordens de Serviço" description="Do recebimento à entrega, com cálculo automático de valores.">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar OS..." className="w-48 pl-9" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os status</SelectItem>
            {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            <SelectItem value="Cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditId(null); setF({ ...vazio }); setOpen(true); }}>
          <Plus className="size-4" /> Nova OS
        </Button>
      </PageHeader>

      <div className="surface overflow-x-auto">
        {lista.length === 0 ? (
          <EmptyState message="Nenhuma ordem de serviço encontrada." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Aparelho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Previsão</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="numeric font-medium">#{o.numero_os}</TableCell>
                  <TableCell>{o.clientes?.nome ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {[o.aparelhos?.marca, o.aparelhos?.modelo].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell>
                    {o.status === "Cancelada" ? (
                      <Badge variant="destructive" title={o.motivo_cancelamento ?? undefined}>CANCELADA</Badge>
                    ) : (
                      <Select value={o.status} onValueChange={(v) => trocarStatus(o, v as Status)}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{dateBR(o.previsao_entrega)}</TableCell>
                  <TableCell className="text-right">
                    <div className="numeric font-medium">{brl(Number(o.valor_total))}</div>
                    {o.status === "Entregue" && o.status_pagamento === "Pago" ? (
                      <span className="text-[11px] text-success">Recebido · {o.forma_pagamento || "—"}</span>
                    ) : o.orcamento_aprovado ? (
                      <span className="text-[11px] text-warning">Futuro faturamento</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Sem faturamento</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Enviar WhatsApp"
                        onClick={() =>
                          setWhatsOs({
                            id: o.id,
                            numero_os: o.numero_os,
                            cliente_nome: o.clientes?.nome ?? null,
                            telefone: o.clientes?.whatsapp ?? null,
                          })
                        }
                      >
                        <MessageCircle className="size-4" />
                      </Button>
                      <OsAcoesMenu
                        os={{ id: o.id, numero_os: o.numero_os, status: o.status, fotos: o.fotos }}
                        isAdmin={isAdmin}
                        onCompartilhar={() => setShareOs(o as unknown as OsShare)}
                        onAtualizacoes={() => setPortalOs(o as unknown as OsPortal)}
                        onInspecao={() => setInspecaoOs({ id: o.id, numero_os: o.numero_os, status: o.status })}
                        onImprimir={() => imprimir(o)}
                        onEditar={() => {
                          setEditId(o.id);
                          setF({
                            cliente_id: o.cliente_id,
                            marca: o.aparelhos?.marca ?? "",
                            modelo: o.aparelhos?.modelo ?? "",
                            imei: o.aparelhos?.imei ?? "",
                            cor: o.aparelhos?.cor ?? "",
                            senha: "",
                            defeito: o.defeito,
                            diagnostico: o.diagnostico ?? "",
                            servico_realizado: o.servico_realizado ?? "",
                            valor_servico: String(o.valor_servico),
                            valor_pecas: String(o.valor_pecas),
                            desconto: String(o.desconto),
                            status: o.status as Status,
                            previsao_entrega: o.previsao_entrega ?? "",
                            tecnico_id: o.tecnico_id ?? "",
                          });
                          setOpen(true);
                        }}
                      />

                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar ordem de serviço" : "Nova ordem de serviço"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente" className="sm:col-span-2">
              <Select value={f.cliente_id} onValueChange={(v) => setF({ ...f, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marca"><Input value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></Field>
            <Field label="Modelo"><Input value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} /></Field>
            <Field label="IMEI"><Input value={f.imei} onChange={(e) => setF({ ...f, imei: e.target.value })} /></Field>
            <Field label="Cor"><Input value={f.cor} onChange={(e) => setF({ ...f, cor: e.target.value })} /></Field>
            <Field label="Senha do aparelho"><Input value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} /></Field>
            <Field label="Técnico responsável">
              <Select value={f.tecnico_id} onValueChange={(v) => setF({ ...f, tecnico_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Defeito relatado" className="sm:col-span-2">
              <Textarea rows={2} value={f.defeito} onChange={(e) => setF({ ...f, defeito: e.target.value })} />
            </Field>
            <Field label="Diagnóstico" className="sm:col-span-2">
              <Textarea rows={2} value={f.diagnostico} onChange={(e) => setF({ ...f, diagnostico: e.target.value })} />
            </Field>
            <Field label="Serviço realizado" className="sm:col-span-2">
              <Textarea rows={2} value={f.servico_realizado} onChange={(e) => setF({ ...f, servico_realizado: e.target.value })} />
            </Field>
            <Field label="Valor do serviço">
              <Input type="number" step="0.01" value={f.valor_servico} onChange={(e) => setF({ ...f, valor_servico: e.target.value })} />
            </Field>
            <Field label="Valor das peças">
              <Input type="number" step="0.01" value={f.valor_pecas} onChange={(e) => setF({ ...f, valor_pecas: e.target.value })} />
            </Field>
            <Field label="Desconto">
              <Input type="number" step="0.01" value={f.desconto} onChange={(e) => setF({ ...f, desconto: e.target.value })} />
            </Field>
            <Field label="Previsão de entrega">
              <Input type="date" value={f.previsao_entrega} onChange={(e) => setF({ ...f, previsao_entrega: e.target.value })} />
            </Field>
            <Field label="Status" className="sm:col-span-2">
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <span className="text-sm text-muted-foreground">Total da OS</span>
              <Badge className="numeric text-sm">
                {brl(Math.max(Number(f.valor_servico) + Number(f.valor_pecas) - Number(f.desconto), 0))}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>Salvar OS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PortalShareDialog os={shareOs} open={!!shareOs} onOpenChange={(v) => !v && setShareOs(null)} />

      <Dialog open={!!entrega} onOpenChange={(v) => !v && setEntrega(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar entrega e pagamento — OS #{entrega?.numero_os}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O valor só entra no faturamento real após a confirmação do pagamento recebido.
            </p>
            <Field label="Forma de pagamento">
              <Select value={pagamento.forma} onValueChange={(v) => setPagamento({ ...pagamento, forma: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Valor recebido">
              <Input
                type="number"
                step="0.01"
                value={pagamento.valor}
                onChange={(e) => setPagamento({ ...pagamento, valor: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!entrega) return;
                mudarStatus.mutate({
                  id: entrega.id,
                  status: "Entregue",
                  extra: { status_pagamento: "Pendente", forma_pagamento: "", valor_recebido: 0 },
                });
                setEntrega(null);
              }}
            >
              Entregar sem pagamento
            </Button>
            <Button
              onClick={() => {
                if (!entrega) return;
                mudarStatus.mutate({
                  id: entrega.id,
                  status: "Entregue",
                  extra: {
                    status_pagamento: "Pago",
                    forma_pagamento: pagamento.forma,
                    valor_recebido: Number(pagamento.valor) || 0,
                  },
                });
                setEntrega(null);
              }}
            >
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OsInspecaoDialog os={inspecaoOs} open={!!inspecaoOs} onOpenChange={(v) => !v && setInspecaoOs(null)} />
      <OsWhatsappDialog os={whatsOs} open={!!whatsOs} onOpenChange={(v) => !v && setWhatsOs(null)} />
      <OsAtualizacoesDialog os={portalOs} open={!!portalOs} onOpenChange={(v) => !v && setPortalOs(null)} />
    </div>
  );
}
