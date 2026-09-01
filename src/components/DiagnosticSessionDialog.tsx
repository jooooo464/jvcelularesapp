import { useEffect, useMemo, useState } from "react";
import { QrCode, RefreshCw, Smartphone, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type OsDiagnostic = {
  id: string;
  numero_os: number;
  clientes?: { nome?: string | null } | null;
  aparelhos?: { marca?: string | null; modelo?: string | null; imei?: string | null } | null;
  profiles?: { nome?: string | null } | null;
};

type Session = { id: string; token: string; expires_at: string; status: string; device_info?: Record<string, unknown> };

export function DiagnosticSessionDialog({ os, open, onOpenChange }: { os: OsDiagnostic | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [type, setType] = useState("inicial");
  const [session, setSession] = useState<Session | null>(null);
  const [creating, setCreating] = useState(false);

  const diagnosticUrl = useMemo(
    () => (session && typeof window !== "undefined" ? `${window.location.origin}/diagnostico/${session.token}` : ""),
    [session],
  );

  useEffect(() => {
    if (!session?.id) return;
    const channel = (supabase as any)
      .channel(`diagnostic-monitor-${session.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "diagnostic_sessions", filter: `id=eq.${session.id}` }, (payload: { new: Session }) => {
        setSession((current) => current ? { ...current, ...payload.new } : current);
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [session?.id]);

  useEffect(() => {
    if (!open) {
      setSession(null);
      setType("inicial");
    }
  }, [open]);

  async function createSession() {
    if (!os) return;
    setCreating(true);
    const { data, error } = await (supabase as any).rpc("create_diagnostic_session", { p_os_id: os.id, p_tipo: type });
    setCreating(false);
    if (error) {
      const migrationPending = /does not exist|schema cache|relation .* does not exist/i.test(error.message);
      toast.error(migrationPending ? "O banco ainda precisa receber a migration de diagnósticos." : "Não foi possível gerar o QR Code", {
        description: migrationPending ? "No Lovable, aplique a migration 20260901150000_diagnosticos.sql no Supabase." : error.message,
      });
      return;
    }
    setSession(data as Session);
  }

  function copyLink() {
    navigator.clipboard.writeText(diagnosticUrl);
    toast.success("Link do diagnóstico copiado");
  }

  const connected = session?.status && !["aguardando", "cancelado"].includes(session.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Smartphone className="size-5 text-primary" />Teste do aparelho</DialogTitle>
          <DialogDescription>Este diagnóstico será vinculado automaticamente a esta Ordem de Serviço.</DialogDescription>
        </DialogHeader>

        {!session ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <p><span className="text-muted-foreground">OS:</span> <strong>#{os?.numero_os}</strong></p>
              <p><span className="text-muted-foreground">Cliente:</span> {os?.clientes?.nome || "—"}</p>
              <p><span className="text-muted-foreground">Aparelho:</span> {[os?.aparelhos?.marca, os?.aparelhos?.modelo].filter(Boolean).join(" ") || "—"}</p>
              <p><span className="text-muted-foreground">IMEI:</span> {os?.aparelhos?.imei || "—"}</p>
              <p><span className="text-muted-foreground">Técnico:</span> {os?.profiles?.nome || "—"}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Tipo de diagnóstico</p>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inicial">Diagnóstico inicial (antes do reparo)</SelectItem>
                  <SelectItem value="final">Diagnóstico final (depois do reparo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
              <img
                className="size-52"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&data=${encodeURIComponent(diagnosticUrl)}`}
                alt="QR Code para iniciar diagnóstico"
              />
            </div>
            <div className="text-center">
              <p className="font-medium">Escaneie este QR Code com o celular que deseja testar.</p>
              <p className="mt-1 text-xs text-muted-foreground">QR Code válido até {new Date(session.expires_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</p>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm">
              {connected ? <Wifi className="size-4 text-success" /> : <QrCode className="size-4 text-muted-foreground" />}
              <span>{connected ? "Celular conectado — acompanhe os testes em tempo real." : "Aguardando conexão do celular…"}</span>
              {connected && <Badge className="bg-success text-success-foreground">Conectado</Badge>}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {session ? (
            <>
              <Button variant="outline" onClick={copyLink}>Copiar link</Button>
              <Button variant="outline" onClick={createSession}><RefreshCw className="size-4" />Gerar novo QR Code</Button>
              <Button onClick={() => onOpenChange(false)}><X className="size-4" />Fechar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={createSession} disabled={creating}><QrCode className="size-4" />{creating ? "Gerando…" : "Gerar QR Code"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
