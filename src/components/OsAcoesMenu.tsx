import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreVertical, Pencil, Printer, Share2, Activity, Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/routes/_authenticated/clientes";
import { cancelarOs, excluirOs } from "@/lib/os-acoes";

export type OsAcao = { id: string; numero_os: number; status: string; fotos?: string[] | null };

type Props = {
  os: OsAcao;
  isAdmin: boolean;
  onEditar: () => void;
  onImprimir: () => void;
  onCompartilhar: () => void;
  onAtualizacoes: () => void;
};

export function OsAcoesMenu({ os, isAdmin, onEditar, onImprimir, onCompartilhar, onAtualizacoes }: Props) {
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [confirma, setConfirma] = useState("");

  function refresh() {
    qc.invalidateQueries({ queryKey: ["ordens"] });
    qc.invalidateQueries({ queryKey: ["ordens-lixeira"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const cancelar = useMutation({
    mutationFn: () => cancelarOs(os, motivo),
    onSuccess: () => {
      toast.success(`OS #${os.numero_os} cancelada`);
      setCancelOpen(false);
      setMotivo("");
      refresh();
    },
    onError: (e: Error) => toast.error("Não foi possível cancelar", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: () => excluirOs(os),
    onSuccess: (tipo) => {
      toast.success(
        tipo === "soft"
          ? `OS #${os.numero_os} movida para a lixeira (possui registros vinculados)`
          : `OS #${os.numero_os} excluída definitivamente`,
      );
      setDelOpen(false);
      setConfirma("");
      refresh();
    },
    onError: (e: Error) => toast.error("Não foi possível excluir", { description: e.message }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Ações da OS">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onEditar}>
            <Pencil className="size-4" /> Editar ordem de serviço
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onImprimir}>
            <Printer className="size-4" /> Imprimir / Gerar PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCompartilhar}>
            <Share2 className="size-4" /> Compartilhar portal do cliente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAtualizacoes}>
            <Activity className="size-4" /> Atualizações do portal
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={os.status === "Cancelada"}
                onClick={() => setCancelOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="size-4" /> Cancelar ordem de serviço
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDelOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Excluir ordem de serviço
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar OS #{os.numero_os}</DialogTitle>
            <DialogDescription>
              A ordem continuará no histórico com o selo CANCELADA. Lançamentos financeiros pendentes desta OS serão
              estornados.
            </DialogDescription>
          </DialogHeader>
          <Field label="Motivo do cancelamento (obrigatório)">
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo..." />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={motivo.trim().length < 3 || cancelar.isPending}
              onClick={() => cancelar.mutate()}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir OS #{os.numero_os}</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação poderá ser irreversível. Se houver
              financeiro, atualizações ou fotos vinculadas, a OS irá para a lixeira; caso contrário será removida
              definitivamente.
            </DialogDescription>
          </DialogHeader>
          <Field label='Digite EXCLUIR para confirmar'>
            <Input value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder="EXCLUIR" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={confirma.trim().toUpperCase() !== "EXCLUIR" || excluir.isPending}
              onClick={() => excluir.mutate()}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
