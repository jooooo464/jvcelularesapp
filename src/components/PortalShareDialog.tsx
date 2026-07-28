import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Share2, MessageCircle, Mail, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { onlyDigits } from "@/lib/format";

export type OsShare = {
  id: string;
  numero_os: number;
  portal_token: string;
  portal_ativo?: boolean | null;
  clientes?: { nome?: string | null; whatsapp?: string | null } | null;
};

export function portalUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/portal/${token}`;
}

function mensagem(nome: string, link: string) {
  return `Olá, *${nome}*.

Sua Ordem de Serviço foi cadastrada com sucesso na *JV Celulares*.

Você pode acompanhar todas as atualizações do reparo do seu aparelho em tempo real através do link abaixo:

${link}

Sempre que houver uma atualização no serviço, ela ficará disponível nesse portal.

Obrigado por escolher a JV Celulares!`;
}

export function PortalShareDialog({
  os,
  open,
  onOpenChange,
}: {
  os: OsShare | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const link = os ? portalUrl(os.portal_token) : "";
  const nome = os?.clientes?.nome ?? "cliente";
  const ativo = os?.portal_ativo !== false;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado com sucesso.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const compartilhar = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `OS #${os?.numero_os} — JV Celulares`, text: mensagem(nome, link), url: link });
        return;
      } catch {
        return;
      }
    }
    copiar();
  };

  const alternar = useMutation({
    mutationFn: async () => {
      if (!os) return;
      const { error } = await supabase.from("ordens_servico").update({ portal_ativo: !ativo }).eq("id", os.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(ativo ? "Link desativado." : "Link ativado.");
      qc.invalidateQueries({ queryKey: ["ordens"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Falha ao atualizar o link", { description: e.message }),
  });

  const whats = os?.clientes?.whatsapp ? onlyDigits(os.clientes.whatsapp) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Portal do Cliente
            <Badge variant={ativo ? "default" : "secondary"}>{ativo ? "Ativo" : "Inativo"}</Badge>
          </DialogTitle>
          <DialogDescription>
            Link exclusivo e seguro da OS #{os?.numero_os} para {nome} acompanhar o reparo em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="break-all font-mono text-xs text-muted-foreground">{link}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={copiar}>
            <Copy className="size-4" /> Copiar link
          </Button>
          <Button variant="outline" asChild>
            <a href={link} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Abrir portal
            </a>
          </Button>
          <Button variant="outline" onClick={compartilhar}>
            <Share2 className="size-4" /> Compartilhar
          </Button>
          <Button variant="outline" asChild disabled={!whats}>
            <a
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${whats.length > 11 ? whats : `55${whats}`}?text=${encodeURIComponent(
                mensagem(nome, link),
              )}`}
            >
              <MessageCircle className="size-4" /> Enviar pelo WhatsApp
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`mailto:?subject=${encodeURIComponent(
                `Acompanhe sua OS #${os?.numero_os} — JV Celulares`,
              )}&body=${encodeURIComponent(mensagem(nome, link))}`}
            >
              <Mail className="size-4" /> Enviar por e-mail
            </a>
          </Button>
          <Button variant="ghost" disabled={alternar.isPending} onClick={() => alternar.mutate()}>
            <Power className="size-4" /> {ativo ? "Desativar link" : "Reativar link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
