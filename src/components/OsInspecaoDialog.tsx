import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Trash2, Upload, ZoomIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateTimeBR } from "@/lib/format";
import {
  ACESSORIOS_PADRAO,
  CHECKLIST_CAMPOS,
  ETAPAS_FOTO,
  checklistVazio,
  type ChecklistKey,
} from "@/lib/inspecao";

export type OsInspecao = { id: string; numero_os: number; status: string };

type Acessorio = { nome_acessorio: string; entregue: boolean; observacao: string | null };

export function OsInspecaoDialog({
  os,
  open,
  onOpenChange,
}: {
  os: OsInspecao | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState(ETAPAS_FOTO[0]);
  const [descFoto, setDescFoto] = useState("");
  const [check, setCheck] = useState<Record<ChecklistKey, boolean>>(checklistVazio());
  const [outro, setOutro] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  const { data: checklist } = useQuery({
    queryKey: ["inspecao-checklist", os?.id],
    enabled: !!os && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_aparelho")
        .select("*")
        .eq("ordem_servico_id", os!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: acessoriosDb } = useQuery({
    queryKey: ["inspecao-acessorios", os?.id],
    enabled: !!os && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acessorios_entregues")
        .select("id, nome_acessorio, entregue, observacao")
        .eq("ordem_servico_id", os!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: fotos = [] } = useQuery({
    queryKey: ["inspecao-fotos", os?.id],
    enabled: !!os && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fotos_ordem_servico")
        .select("id, etapa, url_foto, descricao, created_at")
        .eq("ordem_servico_id", os!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (f) => {
          const { data: signed } = await supabase.storage.from("os-fotos").createSignedUrl(f.url_foto, 3600);
          return { ...f, src: signed?.signedUrl ?? "" };
        }),
      );
    },
  });

  // Preenche o formulário com o que já estiver salvo.
  useEffect(() => {
    if (!open) return;
    const base = checklistVazio();
    if (checklist) {
      for (const c of CHECKLIST_CAMPOS) base[c.key] = Boolean((checklist as Record<string, unknown>)[c.key]);
      setOutro((checklist.outro as string) ?? "");
      setObservacoes((checklist.observacoes as string) ?? "");
    }
    setCheck(base);
  }, [checklist, open]);

  useEffect(() => {
    if (!open) return;
    const salvos = acessoriosDb ?? [];
    const extras = salvos
      .filter((a) => !ACESSORIOS_PADRAO.includes(a.nome_acessorio))
      .map((a) => ({ nome_acessorio: a.nome_acessorio, entregue: a.entregue, observacao: a.observacao }));
    setAcessorios([
      ...ACESSORIOS_PADRAO.map((nome) => {
        const s = salvos.find((a) => a.nome_acessorio === nome);
        return { nome_acessorio: nome, entregue: s?.entregue ?? false, observacao: s?.observacao ?? null };
      }),
      ...extras,
    ]);
  }, [acessoriosDb, open]);

  const enviarFotos = useMutation({
    mutationFn: async (arquivos: File[]) => {
      if (!os) return;
      const { data: sess } = await supabase.auth.getUser();
      for (const arquivo of arquivos) {
        const caminho = `${os.id}/${crypto.randomUUID()}-${arquivo.name.replace(/[^\w.-]/g, "")}`;
        const { error } = await supabase.storage.from("os-fotos").upload(caminho, arquivo);
        if (error) throw error;
        const { error: e2 } = await supabase.from("fotos_ordem_servico").insert({
          ordem_servico_id: os.id,
          etapa,
          url_foto: caminho,
          descricao: descFoto.trim() || null,
          enviado_por: sess.user?.id ?? null,
        });
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Fotos anexadas");
      setDescFoto("");
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["inspecao-fotos", os?.id] });
    },
    onError: (e: Error) => toast.error("Erro ao enviar fotos", { description: e.message }),
  });

  const excluirFoto = useMutation({
    mutationFn: async (foto: { id: string; url_foto: string }) => {
      await supabase.storage.from("os-fotos").remove([foto.url_foto]);
      const { error } = await supabase.from("fotos_ordem_servico").delete().eq("id", foto.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspecao-fotos", os?.id] }),
    onError: (e: Error) => toast.error("Erro ao excluir foto", { description: e.message }),
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!os) return;
      const { data: sess } = await supabase.auth.getUser();
      const { error } = await supabase.from("checklist_aparelho").upsert(
        {
          ordem_servico_id: os.id,
          ...check,
          outro: outro.trim() || null,
          observacoes: observacoes.trim() || null,
          tecnico_id: sess.user?.id ?? null,
          inspecionado_em: new Date().toISOString(),
        },
        { onConflict: "ordem_servico_id" },
      );
      if (error) throw error;

      await supabase.from("acessorios_entregues").delete().eq("ordem_servico_id", os.id);
      const linhas = acessorios.map((a) => ({
        ordem_servico_id: os.id,
        nome_acessorio: a.nome_acessorio,
        entregue: a.entregue,
        observacao: a.observacao,
      }));
      if (linhas.length) {
        const { error: e2 } = await supabase.from("acessorios_entregues").insert(linhas);
        if (e2) throw e2;
      }

      await supabase.from("atualizacoes_os").insert({
        ordem_servico_id: os.id,
        usuario_id: sess.user?.id ?? null,
        titulo: "Inspeção inicial registrada",
        descricao: "Estado do aparelho, acessórios e fotos de entrada registrados.",
        status: os.status,
      });
    },
    onSuccess: () => {
      toast.success("Inspeção salva");
      qc.invalidateQueries({ queryKey: ["inspecao-checklist", os?.id] });
      qc.invalidateQueries({ queryKey: ["inspecao-acessorios", os?.id] });
      qc.invalidateQueries({ queryKey: ["atualizacoes", os?.id] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar inspeção", { description: e.message }),
  });

  if (!os) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Inspeção do aparelho — OS #{os.numero_os}</DialogTitle>
          </DialogHeader>

          {checklist?.inspecionado_em && (
            <p className="text-xs text-muted-foreground">
              Última inspeção em {dateTimeBR(checklist.inspecionado_em)}
              {checklist.profiles?.nome ? ` · Técnico ${checklist.profiles.nome}` : ""}
            </p>
          )}

          <section className="surface space-y-3 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="size-4" /> Registro fotográfico
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={etapa} onValueChange={setEtapa}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ETAPAS_FOTO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={descFoto}
                onChange={(e) => setDescFoto(e.target.value)}
                placeholder="Descrição (opcional)"
              />
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="text-xs"
                onChange={(e) => {
                  const arquivos = Array.from(e.target.files ?? []);
                  if (arquivos.length) enviarFotos.mutate(arquivos);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <Upload className="mr-1 inline size-3" /> Selecione várias fotos de uma vez (frente, traseira, laterais,
              IMEI, danos, acessórios...).
            </p>

            {fotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {fotos.map((f) => (
                  <figure key={f.id} className="group relative overflow-hidden rounded-lg border border-border">
                    <img
                      src={f.src}
                      alt={f.descricao ?? f.etapa}
                      loading="lazy"
                      className="aspect-square w-full cursor-zoom-in object-cover"
                      onClick={() => setZoom(f.src)}
                    />
                    <figcaption className="flex items-center justify-between gap-1 p-1.5 text-[11px]">
                      <span className="truncate">{f.etapa}</span>
                      <span className="flex shrink-0 gap-0.5">
                        <Button variant="ghost" size="icon" className="size-6" aria-label="Ampliar" onClick={() => setZoom(f.src)}>
                          <ZoomIn className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6" aria-label="Excluir foto" onClick={() => excluirFoto.mutate(f)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="surface space-y-3 p-4">
              <h3 className="text-sm font-semibold">Estado físico e funcional</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {CHECKLIST_CAMPOS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={check[c.key]}
                      onCheckedChange={(v) => setCheck({ ...check, [c.key]: v === true })}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <Input value={outro} onChange={(e) => setOutro(e.target.value)} placeholder="Outro (descreva)" />
            </section>

            <section className="surface space-y-3 p-4">
              <h3 className="text-sm font-semibold">Acessórios entregues</h3>
              <div className="space-y-2">
                {acessorios.map((a, i) => (
                  <div key={a.nome_acessorio} className="flex items-center gap-2">
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <Checkbox
                        checked={a.entregue}
                        onCheckedChange={(v) =>
                          setAcessorios(acessorios.map((x, j) => (i === j ? { ...x, entregue: v === true } : x)))
                        }
                      />
                      {a.nome_acessorio}
                    </label>
                    {!a.entregue && <Badge variant="outline" className="text-[10px]">Não entregue</Badge>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={novoAcessorio}
                  onChange={(e) => setNovoAcessorio(e.target.value)}
                  placeholder="Outro acessório"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const nome = novoAcessorio.trim();
                    if (!nome) return;
                    setAcessorios([...acessorios, { nome_acessorio: nome, entregue: true, observacao: null }]);
                    setNovoAcessorio("");
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </section>
          </div>

          <section className="surface space-y-2 p-4">
            <h3 className="text-sm font-semibold">Observações da entrada</h3>
            <Textarea
              rows={4}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Estado geral, danos existentes antes do reparo, peças faltando, lacres rompidos, aparelho previamente aberto..."
            />
          </section>

          <Button className="w-full" disabled={salvar.isPending} onClick={() => salvar.mutate()}>
            Salvar inspeção
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!zoom} onOpenChange={(v) => !v && setZoom(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Foto do aparelho</DialogTitle></DialogHeader>
          {zoom && <img src={zoom} alt="Foto ampliada do aparelho" className="max-h-[75vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
