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
import { DollarSign, CheckCircle2, TrendingUp } from "lucide-react";

interface CompraVendaDialogProps {
  compra: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompraVendaDialog({ compra, open, onOpenChange }: CompraVendaDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [valorVenda, setValorVenda] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valorVendaNum = Number(valorVenda);
      const { error: updateError } = await supabase
        .from("compras_celulares")
        .update({
          status: "Vendido",
          valor_venda: valorVendaNum,
          data_venda: new Date().toISOString(),
        })
        .eq("id", compra.id);

      if (updateError) throw updateError;

      // Registrar Entrada Financeira
      const { error: financeiroError } = await supabase
        .from("financeiro")
        .insert({
          descricao: `Venda de Aparelho: ${compra.marca} ${compra.modelo} (IMEI: ${compra.imei1 || '—'})`,
          valor: valorVendaNum,
          tipo: "Entrada",
          status: "Pago",
          vencimento: new Date().toISOString().split('T')[0],
          categoria: "Aparelho para Revenda",
        });

      if (financeiroError) throw financeiroError;

      toast.success("Venda registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["compras_celulares"] });
      onOpenChange(false);
      setValorVenda("");
    } catch (error: any) {
      toast.error("Erro ao registrar venda: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const custoTotal = Number(compra.valor_compra);
  const lucroEstimado = valorVenda ? Number(valorVenda) - custoTotal : 0;
  const margemLucro = valorVenda ? (lucroEstimado / Number(valorVenda)) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <TrendingUp className="size-5" />
            Registrar Venda do Aparelho
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aparelho:</span>
            <span className="font-medium">{compra.marca} {compra.modelo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo de Compra:</span>
            <span className="font-medium text-red-600">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(custoTotal)}
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor_venda">Valor da Venda</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              <Input
                id="valor_venda"
                type="number"
                step="0.01"
                className="pl-9 text-lg"
                placeholder="0,00"
                value={valorVenda}
                onChange={(e) => setValorVenda(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {valorVenda && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <p className="text-[10px] text-green-600 uppercase font-bold">Lucro Líquido</p>
                <p className="text-lg font-bold text-green-700">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lucroEstimado)}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-[10px] text-blue-600 uppercase font-bold">Margem</p>
                <p className="text-lg font-bold text-blue-700">{margemLucro.toFixed(2)}%</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="size-4" /> Confirmar Venda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}