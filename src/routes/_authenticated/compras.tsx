import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Smartphone, 
  Wrench, 
  Wallet, 
  TrendingUp,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/compras")({
  component: ComprasPage,
});

function ComprasPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: compras, isLoading } = useQuery({
    queryKey: ["compras_celulares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras_celulares" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = {
    totalInvestido: compras?.reduce((acc, c) => acc + Number(c.valor_compra), 0) || 0,
    emReparo: compras?.filter(c => c.status === 'Em reparo').length || 0,
    prontosVenda: compras?.filter(c => c.status === 'Pronto para venda').length || 0,
    lucroEstimado: 0, // Implementar lógica posterior
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Comprado: "secondary",
      "Em análise": "outline",
      "Aguardando reparo": "warning",
      "Em reparo": "destructive",
      "Pronto para venda": "success",
      Vendido: "default",
    };
    return (
      <Badge variant={(variants[status] || "outline") as any}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compra de Celulares</h1>
          <p className="text-muted-foreground">Gerencie a compra e revenda de aparelhos semi-novos.</p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" /> Comprar Celular
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.totalInvestido)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Reparo</CardTitle>
            <Wrench className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emReparo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prontos para Venda</CardTitle>
            <Smartphone className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prontosVenda}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Total</CardTitle>
            <TrendingUp className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
          </CardContent>
        </Card>
      </div>

      <div className="surface border-none p-0 overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por marca, modelo ou IMEI..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="size-4" />
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aparelho</TableHead>
              <TableHead>IMEI / Serial</TableHead>
              <TableHead>Valor Pago</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Compra</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Carregando...</TableCell>
              </TableRow>
            ) : compras?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Nenhuma compra registrada.</TableCell>
              </TableRow>
            ) : (
              compras?.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="font-medium">
                    <div>{compra.marca} {compra.modelo}</div>
                    <div className="text-xs text-muted-foreground">{compra.cor} - {compra.armazenamento}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{compra.imei1 || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{compra.serial_number}</div>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(compra.valor_compra))}
                  </TableCell>
                  <TableCell>{getStatusBadge(compra.status || "Comprado")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(compra.data_compra || new Date()), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="size-4" /> Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Wrench className="size-4" /> Adicionar Reparo
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <Trash2 className="size-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}