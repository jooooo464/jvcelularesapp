import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Smartphone, User, DollarSign, CheckCircle2, ChevronRight, ChevronLeft, Camera } from "lucide-react";

interface CompraFormProps {
  children?: React.ReactNode;
}

type Step = "aparelho" | "testes" | "financeiro" | "vendedor";

export function CompraFormDialog({ children }: CompraFormProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("aparelho");
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      marca: "",
      modelo: "",
      cor: "",
      armazenamento: "",
      imei1: "",
      imei2: "",
      serial_number: "",
      estado_geral: "",
      observacoes: "",
      valor_compra: "",
      forma_pagamento: "Pix",
      vendedor_nome: "",
      vendedor_cpf: "",
      vendedor_telefone: "",
      vendedor_whatsapp: "",
      vendedor_endereco: "",
      vendedor_cidade: "",
      vendedor_estado: "",
      testes: {
        liga: "Funcionando",
        carrega: "Funcionando",
        tela: "Funcionando",
        touch: "Funcionando",
        cameras: "Funcionando",
        audio: "Funcionando",
        wifi_bt: "Funcionando",
        biometria: "Funcionando",
        bloqueado: "Não",
      }
    },
  });

  const onSubmit = async (values: any) => {
    try {
      const { data: compra, error: compraError } = await supabase
        .from("compras_celulares" as any)
        .insert({
          marca: values.marca,
          modelo: values.modelo,
          cor: values.cor,
          armazenamento: values.armazenamento,
          imei1: values.imei1,
          imei2: values.imei2,
          serial_number: values.serial_number,
          estado_geral: values.estado_geral,
          observacoes: values.observacoes,
          valor_compra: Number(values.valor_compra),
          forma_pagamento: values.forma_pagamento,
          vendedor_nome: values.vendedor_nome,
          vendedor_cpf: values.vendedor_cpf,
          vendedor_telefone: values.vendedor_telefone,
          vendedor_whatsapp: values.vendedor_whatsapp,
          vendedor_endereco: values.vendedor_endereco,
          vendedor_cidade: values.vendedor_cidade,
          vendedor_estado: values.vendedor_estado,
        } as any)
        .select()
        .single();

      if (compraError) throw compraError;

      const { error: testesError } = await supabase
        .from("compras_testes" as any)
        .insert({
          compra_id: (compra as any).id,
          itens_teste: values.testes,
        } as any);

      if (testesError) throw testesError;

      toast.success("Compra registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["compras_celulares"] });
      setOpen(false);
      form.reset();
      setStep("aparelho");
    } catch (error: any) {
      toast.error("Erro ao registrar compra: " + error.message);
    }
  };

  const nextStep = () => {
    if (step === "aparelho") setStep("testes");
    else if (step === "testes") setStep("financeiro");
    else if (step === "financeiro") setStep("vendedor");
  };

  const prevStep = () => {
    if (step === "testes") setStep("aparelho");
    else if (step === "financeiro") setStep("testes");
    else if (step === "vendedor") setStep("financeiro");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            Nova Compra de Celular
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-center mb-6 relative px-4">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 -translate-y-1/2 mx-8" />
          {(["aparelho", "testes", "financeiro", "vendedor"] as Step[]).map((s, index) => {
            const isActive = step === s;
            const isDone = ["aparelho", "testes", "financeiro", "vendedor"].indexOf(step) > index;
            return (
              <div 
                key={s} 
                className={`flex flex-col items-center gap-2 bg-background px-2 transition-colors ${isActive ? 'text-primary' : isDone ? 'text-green-500' : 'text-muted-foreground'}`}
              >
                <div className={`size-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${isActive ? 'border-primary bg-primary/10' : isDone ? 'border-green-500 bg-green-50' : 'border-border bg-background'}`}>
                  {isDone ? <CheckCircle2 className="size-5" /> : index + 1}
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold">{s}</span>
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === "aparelho" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl><Input placeholder="Ex: Apple, Samsung" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl><Input placeholder="Ex: iPhone 13, S22" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl><Input placeholder="Ex: Preto, Azul" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="armazenamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Armazenamento</FormLabel>
                      <FormControl><Input placeholder="Ex: 128GB, 256GB" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imei1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMEI 1</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Série</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="estado_geral"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado Físico do Aparelho</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Excelente">Excelente (Sem marcas)</SelectItem>
                              <SelectItem value="Bom">Bom (Marcas leves)</SelectItem>
                              <SelectItem value="Regular">Regular (Arranhões/Pequenos amassados)</SelectItem>
                              <SelectItem value="Ruim">Ruim (Trincado/Muito amassado)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {step === "testes" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {Object.keys(form.getValues().testes).map((teste) => (
                  <FormField
                    key={teste}
                    control={form.control}
                    name={`testes.${teste}` as any}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 gap-4 p-2 rounded-lg border bg-muted/30">
                        <FormLabel className="capitalize">{teste.replace('_', ' / ')}</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Funcionando">✅ Funcionando</SelectItem>
                              <SelectItem value="Com Defeito">❌ Defeito</SelectItem>
                              <SelectItem value="Não Testado">⚠️ Não Testado</SelectItem>
                              {teste === 'bloqueado' && (
                                <>
                                  <SelectItem value="Sim">Sim</SelectItem>
                                  <SelectItem value="Não">Não</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            )}

            {step === "financeiro" && (
              <div className="space-y-4 max-w-sm mx-auto">
                <FormField
                  control={form.control}
                  name="valor_compra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Pago</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="number" step="0.01" className="pl-9" placeholder="0,00" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="forma_pagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pix">Pix</SelectItem>
                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                            <SelectItem value="Transferência">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === "vendedor" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendedor_nome"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome Completo do Vendedor</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendedor_cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendedor_telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone / WhatsApp</FormLabel>
                      <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendedor_endereco"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-between pt-6 border-t mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep} 
                disabled={step === "aparelho"}
                className="gap-2"
              >
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              
              {step !== "vendedor" ? (
                <Button type="button" onClick={nextStep} className="gap-2">
                  Próximo <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button type="submit" className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="size-4" /> Finalizar Compra
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}