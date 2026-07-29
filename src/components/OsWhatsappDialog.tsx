import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Paperclip, Check, CheckCheck, AlertTriangle, Loader2, ExternalLink, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { onlyDigits } from "@/lib/format";
import { waEnviar, waMontarMensagem } from "@/lib/whatsapp.functions";

export type OsWhats = {
  id: string;
  numero_os: number;
  telefone?: string | null;
  cliente_nome?: string | null;
};

export type WaMensagem = {
  id: string;
  direcao: string;
  conteudo: string;
  tipo: string;
  media_url: string | null;
  media_nome: string | null;
  status: string;
  erro: string | null;
  usuario_nome: string | null;
  created_at: string;
};

const RESPOSTAS_RAPIDAS = [
  "Bom dia! Tudo bem? 😊",
  "Seu aparelho já está em análise, em breve enviaremos o orçamento.",
  "Seu aparelho está pronto para retirada! 🎉",
  "Obrigado pelo contato, qualquer dúvida estamos à disposição. 💙",
];

const EMOJIS = ["😊", "👍", "🙏", "📱", "🔧", "✅", "🎉", "💙", "⏰", "📦"];

export function StatusIcon({ status }: { status: string }) {
  if (status === "lida") return <CheckCheck className="size-3.5 text-primary" />;
  if (status === "entregue") return <CheckCheck className="size-3.5 opacity-70" />;
  if (status === "falha") return <AlertTriangle className="size-3.5 text-destructive" />;
  return <Check className="size-3.5 opacity-70" />;
}

export function Bolha({ m }: { m: WaMensagem }) {
  const enviada = m.direcao === "enviada";
  return (
    <div className={cn("flex", enviada ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-soft",
          enviada ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {m.media_url && (
          <a
            href={m.media_url}
            target="_blank"
            rel="noreferrer"
            className="mb-1 flex items-center gap-1.5 text-xs underline opacity-90"
          >
            <Paperclip className="size-3" /> {m.media_nome ?? "Arquivo"}
          </a>
        )}
        <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
          {m.usuario_nome && enviada && <span>{m.usuario_nome} ·</span>}
          <span>
            {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
          {enviada && <StatusIcon status={m.status} />}
        </div>
        {m.erro && <p className="mt-1 text-[10px] text-destructive-foreground/90">Falha: {m.erro}</p>}
      </div>
    </div>
  );
}

/** Hook de mensagens em tempo real por OS (ou por telefone). */
export function useMensagens(filtro: { osId?: string | null; telefone?: string | null }) {
  const qc = useQueryClient();
  const key = ["wa-mensagens", filtro.osId ?? "", filtro.telefone ?? ""];

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(filtro.osId || filtro.telefone),
    queryFn: async () => {
      let q = supabase.from("whatsapp_mensagens").select("*").order("created_at", { ascending: true }).limit(300);
      if (filtro.osId) q = q.eq("ordem_servico_id", filtro.osId);
      else if (filtro.telefone) q = q.eq("telefone", filtro.telefone);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WaMensagem[];
    },
  });

  useEffect(() => {
    if (!filtro.osId && !filtro.telefone) return;
    const channel = supabase
      .channel(`wa-${filtro.osId ?? filtro.telefone}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_mensagens" }, () => {
        qc.invalidateQueries({ queryKey: key });
        qc.invalidateQueries({ queryKey: ["wa-inbox"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro.osId, filtro.telefone]);

  return query;
}

export function OsWhatsappDialog({
  os,
  open,
  onOpenChange,
}: {
  os: OsWhats | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [aba, setAba] = useState<"enviar" | "conversas">("enviar");
  const [texto, setTexto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [anexo, setAnexo] = useState<{ url: string; nome: string; tipo: string } | null>(null);
  const [subindo, setSubindo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const montar = useServerFn(waMontarMensagem);
  const enviar = useServerFn(waEnviar);
  const mensagens = useMensagens({ osId: os?.id });

  const preview = useQuery({
    queryKey: ["wa-preview", os?.id],
    enabled: open && Boolean(os?.id),
    queryFn: () => montar({ data: { ordem_servico_id: os!.id } }),
  });

  useEffect(() => {
    if (preview.data?.ok) {
      setTexto(preview.data.texto);
      setTelefone(preview.data.telefone || os?.telefone || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.data]);

  useEffect(() => {
    if (!open) {
      setAnexo(null);
      setAba("enviar");
    }
  }, [open]);

  const ultima = useMemo(
    () => [...(mensagens.data ?? [])].reverse().find((m) => m.direcao === "enviada"),
    [mensagens.data],
  );

  const envio = useMutation({
    mutationFn: async (conteudo: string) => {
      const res = await enviar({
        data: {
          telefone,
          texto: conteudo,
          ordem_servico_id: os?.id ?? null,
          tipo: (anexo?.tipo ?? "texto") as "texto" | "image" | "video" | "audio" | "document",
          media_url: anexo?.url ?? null,
          media_nome: anexo?.nome ?? null,
        },
      });
      if (!res.ok) throw new Error(res.erro ?? "Falha no envio");
    },
    onSuccess: () => {
      toast.success("Mensagem enviada pelo WhatsApp.");
      setAnexo(null);
      mensagens.refetch();
      setAba("conversas");
    },
    onError: (e: Error) => toast.error("Não foi possível enviar", { description: e.message }),
  });

  async function anexarArquivo(file: File) {
    setSubindo(true);
    try {
      const path = `whatsapp/${os?.id ?? "geral"}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("os-fotos").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("os-fotos").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!data?.signedUrl) throw new Error("Não foi possível gerar o link do arquivo.");
      const tipo = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : "document";
      setAnexo({ url: data.signedUrl, nome: file.name, tipo });
      toast.success("Arquivo anexado.");
    } catch (e) {
      toast.error("Falha ao anexar", { description: (e as Error).message });
    } finally {
      setSubindo(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            WhatsApp — OS #{os?.numero_os} · {os?.cliente_nome ?? "Cliente"}
          </DialogTitle>
          <DialogDescription>Envie atualizações e acompanhe a conversa com o cliente.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {(["enviar", "conversas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAba(t)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 font-medium capitalize transition",
                aba === t ? "bg-background shadow-soft" : "text-muted-foreground",
              )}
            >
              {t === "enviar" ? "Enviar mensagem" : `Conversas (${mensagens.data?.length ?? 0})`}
            </button>
          ))}
        </div>

        {aba === "enviar" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {RESPOSTAS_RAPIDAS.map((r) => (
                <button
                  key={r}
                  onClick={() => setTexto((t) => `${t ? `${t}\n\n` : ""}${r}`)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                >
                  {r.slice(0, 32)}…
                </button>
              ))}
            </div>
            <Textarea rows={9} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <div className="flex flex-wrap items-center gap-1">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setTexto((t) => t + e)} className="rounded p-1 text-lg hover:bg-muted">
                  {e}
                </button>
              ))}
            </div>
            {anexo && (
              <Badge variant="secondary" className="gap-1">
                <Paperclip className="size-3" /> {anexo.nome}
              </Badge>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && anexarArquivo(e.target.files[0])}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={subindo}>
                {subindo ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />} Anexar
              </Button>
              <Button
                variant="outline"
                disabled={!ultima}
                onClick={() => ultima && envio.mutate(ultima.conteudo)}
                title="Reenviar a última mensagem enviada"
              >
                <RotateCw className="size-4" /> Reenviar última
              </Button>
              {telefone && (
                <Button variant="outline" asChild>
                  <a href={`https://wa.me/55${onlyDigits(telefone)}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" /> WhatsApp Web
                  </a>
                </Button>
              )}
              <Button className="ml-auto" onClick={() => envio.mutate(texto)} disabled={envio.isPending || !texto.trim()}>
                {envio.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-h-[55vh] space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-3">
            {(mensagens.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mensagem registrada ainda.</p>
            ) : (
              mensagens.data!.map((m) => <Bolha key={m.id} m={m} />)
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
