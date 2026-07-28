import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Link2, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalTimeline } from "@/components/PortalTimeline";
import { SUGESTOES } from "@/lib/portal-etapas";
import { dateTimeBR, onlyDigits } from "@/lib/format";

export type OsPortal = {
  id: string;
  numero_os: number;
  status: string;
  portal_token: string;
  orcamento_status: string;
  clientes?: { nome: string; whatsapp?: string | null } | null;
};

export function OsAtualizacoesDialog({
  os,
  open,
  onOpenChange,
}: {
  os: OsPortal | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState(SUGESTOES[0]);
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  const { data: atualizacoes = [] } = useQuery({
    queryKey: ["atualizacoes", os?.id],
    enabled: !!os && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atualizacoes_os")
        .select("id, titulo, descricao, status, foto_url, created_at, profiles(nome)")
        .eq("ordem_servico_id", os!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const link = os && typeof window !== "undefined" ? `${window.location.origin}/portal/${os.portal_token}` : "";

  const registrar = useMutation({
    mutationFn: async () => {
      if (!os) return;
      if (!titulo.trim()) throw new Error("Informe o título da atualização");
      let foto: string | null = null;
      if (arquivo) {
        const caminho = `${os.id}/${crypto.randomUUID()}-${arquivo.name.replace(/[^\w.-]/g, "")}`;
        const { error } = await supabase.storage.from("os-fotos").upload(caminho, arquivo);
        if (error) throw error;
        foto = caminho;
      }
      const { data: sess } = await supabase.auth.getUser();
      const { error } = await supabase.from("atualizacoes_os").insert({
        ordem_servico_id: os.id,
        usuario_id: sess.user?.id ?? null,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        status: os.status,
        foto_url: foto,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualização registrada");
      setDescricao("");
      setArquivo(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["atualizacoes", os?.id] });
      qc.invalidateQueries({ queryKey: ["ordens"] });
    },
    onError: (e: Error) => toast.error("Erro ao registrar", { description: e.message }),
  });

  const enviarOrcamento = useMutation({
    mutationFn: async () => {
      if (!os) return;
      const { error } = await supabase
        .from("ordens_servico")
        .update({ orcamento_status: "Pendente" })
        .eq("id", os.id);
      if (error) throw error;
      await supabase.from("atualizacoes_os").insert({
        ordem_servico_id: os.id,
        titulo: "Orçamento enviado",
        descricao: "O cliente pode aprovar ou recusar o orçamento pelo portal.",
        status: os.status,
      });
    },
    onSuccess: () => {
      toast.success("Orçamento liberado para aprovação no portal");
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["atualizacoes", os?.id] });
    },
    onError: (e: Error) => toast.error("Erro ao enviar orçamento", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("atualizacoes_os").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atualizacoes", os?.id] }),
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  if (!os) return null;

  const msg = encodeURIComponent(
    `Olá ${os.clientes?.nome ?? ""}! Acompanhe o reparo do seu aparelho (OS #${os.numero_os}) em tempo real: ${link}`,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Portal do cliente — OS #{os.numero_os}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success("Link exclusivo copiado");
            }}
          >
            <Link2 className="size-4" /> Copiar link
          </Button>
          {os.clientes?.whatsapp && (
            <Button variant="outline" size="sm" asChild>
              <a target="_blank" rel="noreferrer" href={`https://wa.me/55${onlyDigits(os.clientes.whatsapp)}?text=${msg}`}>
                <Send className="size-4" /> Enviar por WhatsApp
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={os.orcamento_status === "Pendente" || enviarOrcamento.isPending}
            onClick={() => enviarOrcamento.mutate()}
          >
            Enviar orçamento para aprovação
          </Button>
          <span className="self-center text-xs text-muted-foreground">Orçamento: {os.orcamento_status}</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-[1fr_1.2fr]">
          <div className="surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Etapas</h3>
            <PortalTimeline status={os.status} orcamento={os.orcamento_status} />
          </div>

          <div className="space-y-4">
            <div className="surface space-y-3 p-4">
              <h3 className="text-sm font-semibold">Nova atualização</h3>
              <Select value={titulo} onValueChange={setTitulo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUGESTOES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da etapa" />
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Observação da etapa (opcional)"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
                <Camera className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <Button className="w-full" disabled={registrar.isPending} onClick={() => registrar.mutate()}>
                Registrar atualização
              </Button>
            </div>

            <div className="surface p-4">
              <h3 className="mb-3 text-sm font-semibold">Histórico</h3>
              {atualizacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atualização ainda.</p>
              ) : (
                <ol className="space-y-3">
                  {atualizacoes.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2 border-l-2 border-primary/30 pl-3">
                      <div>
                        <p className="numeric text-xs text-muted-foreground">{dateTimeBR(a.created_at)}</p>
                        <p className="text-sm font-medium">{a.titulo}</p>
                        {a.descricao && <p className="text-sm text-muted-foreground">{a.descricao}</p>}
                        {a.profiles?.nome && <p className="text-xs text-muted-foreground">Por {a.profiles.nome}</p>}
                        {a.foto_url && <p className="text-xs text-muted-foreground">📷 foto anexada</p>}
                      </div>
                      <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(a.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
