import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronLeft, 
  Smartphone, 
  User, 
  Calendar, 
  Wallet, 
  Wrench, 
  TrendingUp,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/compras/$id")({
  component: CompraDetailsPage,
});

function CompraDetailsPage() {
  const { id } = Route.useParams();

  const { data: compra, isLoading } = useQuery({
    queryKey: ["compra_celular", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras_celulares")
        .select(`
          *,
          compras_reparos (*),
          compras_fotos (*),
          compras_testes (*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-8 text-center">Carregando detalhes...</div>;
  if (!compra) return <div className="p-8 text-center">Compra não encontrada.</div>;

  const custoReparos = compra.compras_reparos?.reduce((acc: number, r: any) => acc + (Number(r.valor_real) || Number(r.valor_estimado) || 0), 0) || 0;
  const custoTotal = Number(compra.valor_compra) + custoReparos;
  const lucro = compra.valor_venda ? Number(compra.valor_venda) - custoTotal : 0;
  const margem = compra.valor_venda ? (lucro / Number(compra.valor_venda)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/compras">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {compra.marca} {compra.modelo}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="outline">{compra.status}</Badge>
            <span>•</span>
            <span>IMEI: {compra.imei1 || "N/A"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna da Esquerda: Detalhes do Aparelho */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="size-5 text-primary" />
                Informações do Aparelho
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Cor</p>
                <p className="font-medium">{compra.cor || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Armazenamento</p>
                <p className="font-medium">{compra.armazenamento || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Série</p>
                <p className="font-medium">{compra.serial_number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Estado Geral</p>
                <p className="font-medium">{compra.estado_geral || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground uppercase font-bold">Observações</p>
                <p className="text-sm mt-1">{compra.observacoes || "Nenhuma observação registrada."}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="size-5 text-blue-500" />
                Checklist de Entrada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {compra.compras_testes?.[0]?.itens_teste && 
                  Object.entries(compra.compras_testes[0].itens_teste).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                      {value === "Funcionando" ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : value === "Com Defeito" ? (
                        <XCircle className="size-4 text-red-500" />
                      ) : (
                        <AlertCircle className="size-4 text-amber-500" />
                      )}
                      <span className="text-xs capitalize">{key.replace('_', ' ')}</span>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="size-5 text-purple-500" />
                Fotos do Aparelho
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compra.compras_fotos?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {compra.compras_fotos.map((foto: any) => (
                    <div key={foto.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img src={foto.url_foto} alt="Estado do aparelho" className="object-cover size-full" />
                      {foto.observacao && (
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white line-clamp-2">{foto.observacao}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  Nenhuma foto registrada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna da Direita: Resumo Financeiro e Vendedor */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Valor de Compra</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(compra.valor_compra))}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Custo de Reparos</span>
                <span className="font-medium text-red-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(custoReparos)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-bold">
                <span>Custo Total</span>
                <span>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(custoTotal)}
                </span>
              </div>

              {compra.status === "Vendido" && (
                <div className="pt-4 mt-4 border-t-2 border-dashed border-green-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-semibold">Valor da Venda</span>
                    <span className="text-xl font-black text-green-700">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(compra.valor_venda))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-green-100 p-2 rounded text-green-800">
                    <span className="text-xs uppercase font-bold">Lucro Líquido</span>
                    <span className="font-bold">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lucro)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-green-600 font-medium">Margem de Lucro: {margem.toFixed(2)}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="size-5 text-amber-500" />
                Dados do Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Nome</p>
                <p className="text-sm font-medium">{compra.vendedor_nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">CPF</p>
                  <p className="text-sm">{compra.vendedor_cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4") || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Telefone</p>
                  <p className="text-sm">{compra.vendedor_telefone || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Endereço</p>
                <p className="text-xs">
                  {compra.vendedor_endereco} {compra.vendedor_numero && `, ${compra.vendedor_numero}`}
                  <br />
                  {compra.vendedor_bairro} {compra.vendedor_cidade && ` - ${compra.vendedor_cidade}/${compra.vendedor_estado}`}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Data da Compra</p>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <Calendar className="size-3" />
                  {format(new Date(compra.data_compra || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}