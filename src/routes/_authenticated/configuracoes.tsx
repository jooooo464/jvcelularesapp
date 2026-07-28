import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { Field } from "./clientes";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — CelTech ERP" },
      { name: "description", content: "Perfil do usuário, fornecedores e categorias do sistema." },
      { property: "og:title", content: "Configurações — CelTech ERP" },
      { property: "og:description", content: "Ajuste dados da equipe, fornecedores e categorias." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const { data: me } = useProfile();
  const [perfil, setPerfil] = useState({ nome: "", telefone: "", cargo: "" });
  const [iniciado, setIniciado] = useState(false);

  if (!iniciado && me?.profile) {
    setPerfil({
      nome: me.profile.nome ?? "",
      telefone: me.profile.telefone ?? "",
      cargo: me.profile.cargo ?? "",
    });
    setIniciado(true);
  }

  const salvarPerfil = useMutation({
    mutationFn: async () => {
      if (!me?.profile) throw new Error("Perfil não carregado");
      const { error } = await supabase
        .from("profiles")
        .update({ nome: perfil.nome, telefone: perfil.telefone || null, cargo: perfil.cargo || null })
        .eq("id", me.profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Configurações" description="Seu perfil, fornecedores e categorias do catálogo." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-4 text-sm font-semibold">Meu perfil</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" className="sm:col-span-2">
              <Input value={perfil.nome} onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <Input value={perfil.telefone} onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })} />
            </Field>
            <Field label="Cargo">
              <Input value={perfil.cargo} onChange={(e) => setPerfil({ ...perfil, cargo: e.target.value })} />
            </Field>
            <Field label="E-mail" className="sm:col-span-2">
              <Input value={me?.profile?.email ?? ""} readOnly disabled />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{me?.roles?.[0] ?? "sem função"}</Badge>
            <Button className="ml-auto" onClick={() => salvarPerfil.mutate()} disabled={salvarPerfil.isPending}>
              Salvar perfil
            </Button>
          </div>
        </section>

        <Fornecedores />
        <Categorias />
      </div>
    </div>
  );
}

function Fornecedores() {
  const qc = useQueryClient();
  const [f, setF] = useState({ nome: "", telefone: "", email: "", cidade: "" });

  const { data: lista = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => (await supabase.from("fornecedores").select("*").order("nome")).data ?? [],
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!f.nome.trim()) throw new Error("Informe o nome");
      const { error } = await supabase.from("fornecedores").insert({
        nome: f.nome.trim(),
        telefone: f.telefone || null,
        email: f.email || null,
        cidade: f.cidade || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado");
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      setF({ nome: "", telefone: "", email: "", cidade: "" });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor removido");
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  return (
    <section className="surface p-5">
      <h2 className="mb-4 text-sm font-semibold">Fornecedores</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Nome"><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
        <Field label="Telefone"><Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></Field>
        <Field label="E-mail"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Cidade"><Input value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></Field>
      </div>
      <Button variant="outline" onClick={() => criar.mutate()} disabled={criar.isPending}>
        <Plus className="size-4" /> Adicionar fornecedor
      </Button>

      <div className="mt-4">
        {lista.length === 0 ? (
          <EmptyState message="Nenhum fornecedor cadastrado." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Contato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="font-medium">{x.nome}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {x.telefone || x.email || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(x.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function Categorias() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"Acessórios" | "Peças">("Peças");

  const { data: lista = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await supabase.from("categorias").select("*").order("nome")).data ?? [],
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome");
      const { error } = await supabase.from("categorias").insert({ nome: nome.trim(), tipo });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria criada");
      qc.invalidateQueries({ queryKey: ["categorias"] });
      setNome("");
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria removida");
      qc.invalidateQueries({ queryKey: ["categorias"] });
    },
    onError: (e: Error) => toast.error("Não foi possível remover", { description: e.message }),
  });

  return (
    <section className="surface p-5">
      <h2 className="mb-4 text-sm font-semibold">Categorias</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
        <Field label="Tipo">
          <Select value={tipo} onValueChange={(v) => setTipo(v as "Acessórios" | "Peças")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Peças">Peças</SelectItem>
              <SelectItem value="Acessórios">Acessórios</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Button variant="outline" onClick={() => criar.mutate()} disabled={criar.isPending}>
        <Plus className="size-4" /> Adicionar categoria
      </Button>

      <div className="mt-4 flex flex-wrap gap-2">
        {lista.length === 0 && <EmptyState message="Nenhuma categoria cadastrada." />}
        {lista.map((c) => (
          <Badge key={c.id} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5">
            {c.nome}
            <span className="text-[10px] text-muted-foreground">{c.tipo}</span>
            <button aria-label="Remover" onClick={() => excluir.mutate(c.id)} className="rounded p-0.5 hover:bg-muted">
              <Trash2 className="size-3 text-destructive" />
            </button>
          </Badge>
        ))}
      </div>
    </section>
  );
}
