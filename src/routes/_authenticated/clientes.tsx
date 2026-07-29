import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Smartphone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateBR, onlyDigits } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — JV Celulares" },
      { name: "description", content: "Cadastro, busca e histórico de clientes da assistência técnica." },
      { property: "og:title", content: "Clientes — JV Celulares" },
      { property: "og:description", content: "Gerencie a base de clientes e seus aparelhos." },
    ],
  }),
  component: ClientesPage,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().max(255).email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().trim().max(200).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  estado: z.string().trim().max(2).optional().or(z.literal("")),
  observacoes: z.string().trim().max(1000).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

function ClientesPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { nome: "" } });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*, aparelhos(id), ordens_servico(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, cpf: values.cpf ? onlyDigits(values.cpf) : null };
      if (editId) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Cliente atualizado" : "Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setOpen(false);
      setEditId(null);
      form.reset({ nome: "" });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  const filtrados = clientes.filter((c) =>
    [c.nome, c.telefone, c.cpf, c.email, c.cidade]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(busca.toLowerCase()),
  );

  const clienteDetalhe = clientes.find((c) => c.id === detalhe);

  return (
    <div>
      <PageHeader title="Clientes" description="Base de clientes, contatos e histórico de atendimentos.">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-56 pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditId(null);
            form.reset({ nome: "" });
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo cliente
        </Button>
      </PageHeader>

      <div className="surface overflow-hidden">
        {filtrados.length === 0 ? (
          <EmptyState message="Nenhum cliente encontrado." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                <TableHead className="hidden sm:table-cell">Aparelhos</TableHead>
                <TableHead className="hidden sm:table-cell">OS</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetalhe(c.id)}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.telefone || c.whatsapp || c.email || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{c.aparelhos?.length ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{c.ordens_servico?.length ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {c.whatsapp && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`https://wa.me/55${onlyDigits(c.whatsapp)}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => {
                          setEditId(c.id);
                          form.reset({
                            nome: c.nome,
                            cpf: c.cpf ?? "",
                            telefone: c.telefone ?? "",
                            whatsapp: c.whatsapp ?? "",
                            email: c.email ?? "",
                            endereco: c.endereco ?? "",
                            cidade: c.cidade ?? "",
                            estado: c.estado ?? "",
                            observacoes: c.observacoes ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        onClick={() => excluir.mutate(c.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form
            id="form-cliente"
            onSubmit={form.handleSubmit((v) => salvar.mutate(v))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Nome" className="sm:col-span-2" error={form.formState.errors.nome?.message}>
              <Input {...form.register("nome")} />
            </Field>
            <Field label="CPF"><Input {...form.register("cpf")} /></Field>
            <Field label="Telefone"><Input {...form.register("telefone")} /></Field>
            <Field label="WhatsApp"><Input {...form.register("whatsapp")} /></Field>
            <Field label="E-mail" error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register("email")} />
            </Field>
            <Field label="Endereço" className="sm:col-span-2"><Input {...form.register("endereco")} /></Field>
            <Field label="Cidade"><Input {...form.register("cidade")} /></Field>
            <Field label="Estado"><Input maxLength={2} {...form.register("estado")} /></Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea rows={3} {...form.register("observacoes")} />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="form-cliente" disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{clienteDetalhe?.nome}</DialogTitle>
          </DialogHeader>
          {detalhe && <HistoricoCliente clienteId={detalhe} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoricoCliente({ clienteId }: { clienteId: string }) {
  const { data } = useQuery({
    queryKey: ["cliente-historico", clienteId],
    queryFn: async () => {
      const [ap, os] = await Promise.all([
        supabase.from("aparelhos").select("*").eq("cliente_id", clienteId),
        supabase
          .from("ordens_servico")
          .select("numero_os,status,valor_total,data_entrada")
          .eq("cliente_id", clienteId)
          .eq("deleted", false)
          .order("data_entrada", { ascending: false }),
      ]);
      return { aparelhos: ap.data ?? [], ordens: os.data ?? [] };
    },
  });

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Aparelhos</h3>
        {data?.aparelhos.length ? (
          <ul className="space-y-1.5">
            {data.aparelhos.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <Smartphone className="size-4 text-muted-foreground" />
                {a.marca} {a.modelo}
                {a.imei && <span className="ml-auto text-xs text-muted-foreground">IMEI {a.imei}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum aparelho cadastrado.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold">Ordens de serviço</h3>
        {data?.ordens.length ? (
          <ul className="space-y-1.5">
            {data.ordens.map((o) => (
              <li key={o.numero_os} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="numeric text-xs text-muted-foreground">#{o.numero_os}</span>
                <Badge variant="secondary" className="text-[11px]">{o.status}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{dateBR(o.data_entrada)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sem atendimentos registrados.</p>
        )}
      </section>
    </div>
  );
}

export function Field({
  label,
  children,
  error,
  className,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
