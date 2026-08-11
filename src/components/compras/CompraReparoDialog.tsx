import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wrench, CheckCircle2 } from "lucide-react";

interface CompraReparoDialogProps {
  compraId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompraReparoDialog({ compraId, open, onOpenChange }: CompraReparoDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    descricao: "",
    valor_estimado: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: reparoError } = await supabase
        .from("compras_reparos" as any)
        .insert({
          compra_id: compraId,
          descricao: formData.descricao,
          valor_estimado: Number(formData.valor_estimado),
          status: "Pendente",
        } as any);

      if (reparoError) throw reparoError;

      const { error: statusError } = await supabase
        .from("compras_celulares" as any)
        .update({ status: "Aguardando reparo" } as any)
        .eq("id", compraId);

      if (statusError) throw statusError;

      toast.success("Necessidade de reparo registrada!");
      queryClient.invalidateQueries({ queryKey: ["compras_celulares"] });
      onOpenChange(false);
      setFormData({ descricao: "", valor_estimado: "" });
    } catch (error: any) {
      toast.error("Erro ao registrar reparo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-blue-500" />
            Registrar Necessidade de Reparo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do Defeito / Peça Necessária</Label>
            <Textarea
              id="descricao"
              placeholder="Ex: Troca de tela original, bateria com saúde baixa..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor Estimado (Custo)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                id="valor"
                type="number"
                step="0.01"
                className="pl-9"
                placeholder="0,00"
                value={formData.valor_estimado}
                onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <CheckCircle2 className="size-4" /> Salvar Reparo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}