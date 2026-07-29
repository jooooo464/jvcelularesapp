import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  QrCode,
  Plug,
  PlugZap,
  RefreshCw,
  Power,
  Save,
  Loader2,
  Send,
  Search,
  MessageSquare,
  Clock,
  Trash2,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { onlyDigits } from "@/lib/format";
import { Bolha, useMensagens, type WaMensagem } from "@/components/OsWhatsappDialog";
import {
  waStatus,
  waSalvarConfig,
  waTestarConexao,
  waQrCode,
  waDesconectar,
  waReiniciar,
  waEnviar,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp — JV Celulares" },
      { name: "description", content: "Conecte o WhatsApp da loja via Evolution API e atenda seus clientes pelo ERP." },
      { property: "og:title", content: "WhatsApp — JV Celulares" },
      { property: "og:description", content: "Conexão por QR Code, mensagens automáticas e histórico de conversas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhatsappPage,
});

const VARIAVEIS = ["nome_cliente", "numero_os", "modelo", "status", "valor", "defeito", "portal_link"];

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cor: string; label: string }> = {
    conectado: { cor: "bg-emerald-500", label: "Conectado" },
    conectando: { cor: "bg-amber-500", label: "Conectando" },
    desconectado: { cor: "bg-destructive", label: "Desconectado" },
  };
  const it = map[status] ?? map.desconectado;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
      <span className={cn("size-2 rounded-full", it.cor)} /> {it.label}
    </span>
  );
}

function WhatsappPage() {
  const [aba, setAba] = useState<"conexao" | "conversas" | "modelos">("conexao");

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Integração com a Evolution API: conexão por QR Code, mensagens automáticas e atendimento."
      />
      <div className="mb-6 flex w-full max-w-md gap-1 rounded-lg bg-muted p-1 text-sm">
        {(
          [
            ["conexao", "Conexão"],
            ["conversas", "Conversas"],
            ["modelos", "Modelos"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setAba(v)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 font-medium transition",
              aba === v ? "bg-background shadow-soft" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {aba === "conexao" && <Conexao />}
      {aba === "conversas" && <Conversas />}
      {aba === "modelos" && <Modelos />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Conexao() {
  const qc = useQueryClient();
  const status = useServerFn(waStatus);
  const salvar = useServerFn(waSalvarConfig);
  const testar = useServerFn(waTestarConexao);
  const qr = useServerFn(waQrCode);
  const desconectar = useServerFn(waDesconectar);
  const reiniciar = useServerFn(waReiniciar);

  const [form, setForm] = useState({ api_url: "", api_key: "", instance_name: "" });
  const [qrOpen, setQrOpen] = useState(false);
  const [qrImg, setQrImg] = useState<string | null>(null);

  const info = useQuery({
    queryKey: ["wa-status"],
    queryFn: () => status({ data: undefined }),
    refetchInterval: qrOpen ? 4000 : 30000,
  });

  useEffect(() => {
    const c = info.data?.config;
    if (c) setForm((f) => (f.api_url || f.instance_name ? f : { api_url: c.api_url, api_key: "", instance_name: c.instance_name }));
  }, [info.data]);

  const conectado = info.data?.status === "conectado";

  // Fecha o modal automaticamente assim que a conexão é concluída.
  useEffect(() => {
    if (qrOpen && conectado) {
      setQrOpen(false);
      toast.success("WhatsApp conectado com sucesso! 🎉");
    }
  }, [conectado, qrOpen]);

  const mSalvar = useMutation({
    mutationFn: async () => {
      const res = await salvar({ data: form });
      if (!res.ok) throw new Error("Falha ao salvar");
    },
    onSuccess: () => {
      toast.success("Configuração salva.");
      qc.invalidateQueries({ queryKey: ["wa-status"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const mQr = useMutation({
    mutationFn: () => qr({ data: undefined }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error("Não foi possível gerar o QR Code", { description: res.erro });
      setQrImg(res.base64 ?? null);
      setQrOpen(true);
    },
  });

  // Renova o QR Code periodicamente enquanto o modal estiver aberto.
  useEffect(() => {
    if (!qrOpen) return;
    const t = setInterval(() => mQr.mutate(), 45000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen]);

  const acao = (fn: () => Promise<{ ok: boolean; erro?: string | null }>, msg: string) => async () => {
    const res = await fn();
    if (res.ok) toast.success(msg);
    else toast.error("Falha na operação", { description: res.erro ?? undefined });
    qc.invalidateQueries({ queryKey: ["wa-status"] });
  };

  const cfg = info.data?.config;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="surface space-y-4 p-5">
        <h2 className="font-display text-sm font-semibold">Configuração da Evolution API</h2>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">URL da Evolution API</span>
            <Input
              value={form.api_url}
              onChange={(e) => setForm({ ...form, api_url: e.target.value })}
              placeholder="https://sua-evolution.com"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              API Key {cfg?.api_key_definida && <Badge variant="secondary" className="ml-1">salva</Badge>}
            </span>
            <Input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder={cfg?.api_key_definida ? "••••••••  (deixe vazio para manter)" : "sua-api-key"}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Nome da instância</span>
            <Input
              value={form.instance_name}
              onChange={(e) => setForm({ ...form, instance_name: e.target.value })}
              placeholder="jvcelulares"
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          A chave nunca sai do servidor: toda comunicação com a Evolution API acontece no backend do sistema.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => mSalvar.mutate()} disabled={mSalvar.isPending}>
            {mSalvar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
          </Button>
          <Button variant="outline" onClick={acao(() => testar({ data: undefined }), "Conexão com a API funcionando.")}>
            <Plug className="size-4" /> Testar conexão
          </Button>
          <Button variant="outline" onClick={() => mQr.mutate()} disabled={mQr.isPending}>
            {mQr.isPending ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />} Gerar QR Code
          </Button>
          <Button variant="outline" onClick={() => mQr.mutate()}>
            <PlugZap className="size-4" /> Reconectar
          </Button>
          <Button variant="outline" onClick={acao(() => reiniciar({ data: undefined }), "Instância reiniciada.")}>
            <RefreshCw className="size-4" /> Reiniciar
          </Button>
          <Button variant="destructive" onClick={acao(() => desconectar({ data: undefined }), "WhatsApp desconectado.")}>
            <Power className="size-4" /> Desconectar
          </Button>
        </div>
      </div>

      <div className="surface space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold">Status da conexão</h2>
          <StatusPill status={info.data?.status ?? "desconectado"} />
        </div>
        <div className="flex items-center gap-3">
          {cfg?.profile_picture ? (
            <img src={cfg.profile_picture} alt="Foto do perfil do WhatsApp conectado" className="size-14 rounded-full object-cover" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessageSquare className="size-6" />
            </div>
          )}
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{cfg?.profile_name ?? "—"}</p>
            <p className="numeric truncate text-muted-foreground">{cfg?.phone_number ?? "Nenhum número conectado"}</p>
          </div>
        </div>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Instância</dt>
            <dd className="font-medium">{cfg?.instance_name || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Última sincronização</dt>
            <dd className="font-medium">{cfg?.last_sync ? new Date(cfg.last_sync).toLocaleString("pt-BR") : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Envio automático</dt>
            <dd className="font-medium">{cfg?.auto_enviar === false ? "Desativado" : "Ativado"}</dd>
          </div>
        </dl>
        <Button variant="outline" className="w-full" onClick={() => info.refetch()}>
          <RefreshCw className="size-4" /> Atualizar status
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho e aponte para o código.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrImg ? (
              <img src={qrImg} alt="QR Code para conectar o WhatsApp" className="size-64 rounded-lg bg-white p-2" />
            ) : (
              <div className="flex size-64 items-center justify-center rounded-lg bg-muted">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">
              O código é renovado automaticamente. Assim que a conexão for concluída, esta janela fecha sozinha.
            </p>
            <Button variant="outline" size="sm" onClick={() => mQr.mutate()} disabled={mQr.isPending}>
              <RefreshCw className="size-4" /> Gerar novo código
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Conversa = { telefone: string; nome: string; ultima: WaMensagem; naoLidas: number };

function Conversas() {
  const qc = useQueryClient();
  const enviar = useServerFn(waEnviar);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");

  const inbox = useQuery({
    queryKey: ["wa-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_mensagens")
        .select("*, clientes(nome)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const mapa = new Map<string, Conversa>();
      for (const m of (data ?? []) as Array<WaMensagem & { telefone: string; clientes?: { nome?: string } | null; lida: boolean }>) {
        const atual = mapa.get(m.telefone);
        if (!atual) mapa.set(m.telefone, { telefone: m.telefone, nome: m.clientes?.nome ?? m.telefone, ultima: m, naoLidas: 0 });
        if (m.direcao === "recebida" && !m.lida) {
          const c = mapa.get(m.telefone)!;
          c.naoLidas += 1;
        }
      }
      return [...mapa.values()];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("wa-inbox-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_mensagens" }, () => {
        qc.invalidateQueries({ queryKey: ["wa-inbox"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const mensagens = useMensagens({ telefone: ativo });

  const lista = useMemo(
    () => (inbox.data ?? []).filter((c) => `${c.nome} ${c.telefone}`.toLowerCase().includes(busca.toLowerCase())),
    [inbox.data, busca],
  );

  async function marcarLidas(tel: string) {
    await supabase.from("whatsapp_mensagens").update({ lida: true }).eq("telefone", tel).eq("direcao", "recebida").eq("lida", false);
    qc.invalidateQueries({ queryKey: ["wa-inbox"] });
  }

  const envio = useMutation({
    mutationFn: async () => {
      const res = await enviar({ data: { telefone: ativo!, texto, tipo: "texto" } });
      if (!res.ok) throw new Error(res.erro ?? "Falha no envio");
    },
    onSuccess: () => {
      setTexto("");
      mensagens.refetch();
    },
    onError: (e: Error) => toast.error("Não foi possível enviar", { description: e.message }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="surface flex max-h-[70vh] flex-col p-3">
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar conversa..." className="pl-9" />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {lista.length === 0 ? (
            <EmptyState message="Nenhuma conversa ainda." />
          ) : (
            lista.map((c) => (
              <button
                key={c.telefone}
                onClick={() => {
                  setAtivo(c.telefone);
                  marcarLidas(c.telefone);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition",
                  ativo === c.telefone ? "bg-accent" : "hover:bg-muted",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nome}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.ultima.conteudo}</p>
                </div>
                {c.naoLidas > 0 && <Badge className="rounded-full px-1.5 text-[10px]">{c.naoLidas}</Badge>}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="surface flex max-h-[70vh] flex-col">
        {!ativo ? (
          <EmptyState message="Selecione uma conversa para começar o atendimento." />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <p className="numeric text-sm font-medium">{ativo}</p>
              <Button variant="ghost" size="sm" className="ml-auto" asChild>
                <a href={`https://wa.me/${onlyDigits(ativo)}`} target="_blank" rel="noreferrer">
                  Abrir no WhatsApp Web
                </a>
              </Button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
              {(mensagens.data ?? []).map((m) => (
                <Bolha key={m.id} m={m} />
              ))}
            </div>
            <div className="flex items-end gap-2 border-t border-border p-3">
              <Textarea
                rows={2}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="resize-none"
              />
              <Button onClick={() => envio.mutate()} disabled={!texto.trim() || envio.isPending}>
                {envio.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Modelo = { id: string; chave: string; nome: string; evento: string | null; conteudo: string; ativo: boolean };

function Modelos() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Modelo> | null>(null);

  const { data } = useQuery({
    queryKey: ["wa-modelos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_modelos").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Modelo[];
    },
  });

  const salvar = useMutation({
    mutationFn: async (m: Partial<Modelo>) => {
      if (m.id) {
        const { error } = await supabase
          .from("whatsapp_modelos")
          .update({ nome: m.nome, evento: m.evento || null, conteudo: m.conteudo, ativo: m.ativo })
          .eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_modelos").insert({
          chave: (m.chave || m.nome || "").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          nome: m.nome ?? "",
          evento: m.evento || null,
          conteudo: m.conteudo ?? "",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Modelo salvo.");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["wa-modelos"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar modelo", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_modelos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo excluído.");
      qc.invalidateQueries({ queryKey: ["wa-modelos"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Variáveis disponíveis: {VARIAVEIS.map((v) => `{{${v}}}`).join(" · ")}
        </p>
        <Button size="sm" onClick={() => setEdit({ nome: "", conteudo: "", evento: "" })}>
          <Plus className="size-4" /> Novo modelo
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(data ?? []).map((m) => (
          <div key={m.id} className="surface space-y-2 p-4">
            <div className="flex items-center gap-2">
              <p className="font-display text-sm font-semibold">{m.nome}</p>
              {m.evento && <Badge variant="secondary">{m.evento}</Badge>}
              {!m.ativo && <Badge variant="outline">inativo</Badge>}
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEdit(m)}>
                  Editar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => excluir.mutate(m.id)} aria-label="Excluir modelo">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">{m.conteudo}</p>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(edit)} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Editar modelo" : "Novo modelo"}</DialogTitle>
            <DialogDescription>Use as variáveis para personalizar automaticamente cada mensagem.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do modelo" value={edit?.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
            <Input
              placeholder="Status da OS que dispara o envio (opcional)"
              value={edit?.evento ?? ""}
              onChange={(e) => setEdit({ ...edit, evento: e.target.value })}
            />
            <Textarea rows={8} value={edit?.conteudo ?? ""} onChange={(e) => setEdit({ ...edit, conteudo: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdit(null)}>
                Cancelar
              </Button>
              <Button onClick={() => edit && salvar.mutate(edit)} disabled={salvar.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Painel resumido usado no Dashboard. */
export function WhatsappResumo() {
  const status = useServerFn(waStatus);
  const info = useQuery({ queryKey: ["wa-status"], queryFn: () => status({ data: undefined }), refetchInterval: 60000 });

  const stats = useQuery({
    queryKey: ["wa-stats"],
    queryFn: async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("whatsapp_mensagens")
        .select("direcao, telefone, created_at")
        .gte("created_at", hoje.toISOString());
      if (error) throw error;
      const rows = data ?? [];
      return {
        enviadas: rows.filter((r) => r.direcao === "enviada").length,
        recebidas: rows.filter((r) => r.direcao === "recebida").length,
        conversas: new Set(rows.map((r) => r.telefone)).size,
      };
    },
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Enviadas hoje" value={String(stats.data?.enviadas ?? 0)} icon={Send} />
      <StatCard title="Recebidas hoje" value={String(stats.data?.recebidas ?? 0)} icon={MessageSquare} />
      <StatCard title="Conversas ativas" value={String(stats.data?.conversas ?? 0)} icon={Clock} />
      <StatCard
        title="WhatsApp"
        value={info.data?.status === "conectado" ? "Conectado" : info.data?.status === "conectando" ? "Conectando" : "Desconectado"}
        icon={QrCode}
      />
    </div>
  );
}
