import { supabase } from "@/integrations/supabase/client";

export type AcaoOs = "Cancelar" | "Excluir" | "Excluir definitivamente" | "Restaurar";

type OsRef = { id: string; numero_os: number };

async function usuarioAtual() {
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;
  if (!user) return { id: null as string | null, nome: null as string | null };
  const { data: perfil } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
  return { id: user.id, nome: perfil?.nome ?? user.email ?? null };
}

async function ipPublico() {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    if (!r.ok) return null;
    return (await r.json()).ip as string;
  } catch {
    return null;
  }
}

export async function registrarAuditoria(os: OsRef, acao: AcaoOs, motivo?: string | null) {
  const [{ id, nome }, ip] = await Promise.all([usuarioAtual(), ipPublico()]);
  await supabase.from("auditoria_os").insert({
    ordem_servico_id: os.id,
    numero_os: os.numero_os,
    usuario_id: id,
    usuario_nome: nome,
    acao,
    motivo: motivo ?? null,
    ip,
    dispositivo: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
}

/** Cancela a OS, guarda o motivo e remove lançamentos financeiros pendentes vinculados. */
export async function cancelarOs(os: OsRef, motivo: string) {
  const texto = motivo.trim();
  if (texto.length < 3) throw new Error("Informe o motivo do cancelamento.");
  const { id: userId } = await usuarioAtual();

  const { error } = await supabase
    .from("ordens_servico")
    .update({
      status: "Cancelada",
      motivo_cancelamento: texto,
      cancelada_em: new Date().toISOString(),
      cancelada_por: userId,
    })
    .eq("id", os.id);
  if (error) throw error;

  // Estorna o que ainda não foi pago desta OS.
  await supabase.from("financeiro").delete().eq("os_id", os.id).eq("status", "Pendente");

  await registrarAuditoria(os, "Cancelar", texto);
}

export async function restaurarOs(os: OsRef, cancelada: boolean) {
  const { error } = await supabase
    .from("ordens_servico")
    .update(
      cancelada
        ? { status: "Recebido", motivo_cancelamento: null, cancelada_em: null, cancelada_por: null }
        : { deleted: false, deleted_at: null, deleted_by: null },
    )
    .eq("id", os.id);
  if (error) throw error;
  await registrarAuditoria(os, "Restaurar");
}

export type Dependencias = {
  financeiro: number;
  pagamentos: number;
  atualizacoes: number;
  fotos: number;
  possui: boolean;
};

export async function verificarDependencias(os: OsRef & { fotos?: string[] | null }): Promise<Dependencias> {
  const [fin, pagos, upd] = await Promise.all([
    supabase.from("financeiro").select("id", { count: "exact", head: true }).eq("os_id", os.id),
    supabase.from("financeiro").select("id", { count: "exact", head: true }).eq("os_id", os.id).eq("status", "Pago"),
    supabase.from("atualizacoes_os").select("id", { count: "exact", head: true }).eq("ordem_servico_id", os.id),
  ]);
  const dep = {
    financeiro: fin.count ?? 0,
    pagamentos: pagos.count ?? 0,
    atualizacoes: upd.count ?? 0,
    fotos: os.fotos?.length ?? 0,
  };
  return { ...dep, possui: dep.financeiro + dep.atualizacoes + dep.fotos > 0 };
}

/** Exclusão inteligente: soft delete quando há vínculos, hard delete quando não há. */
export async function excluirOs(os: OsRef & { fotos?: string[] | null }, motivo?: string) {
  const dep = await verificarDependencias(os);
  const { id: userId } = await usuarioAtual();

  if (dep.possui) {
    const { error } = await supabase
      .from("ordens_servico")
      .update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", os.id);
    if (error) throw error;
    await registrarAuditoria(os, "Excluir", motivo ?? "Exclusão lógica (possui registros vinculados)");
    return "soft" as const;
  }

  const { error } = await supabase.from("ordens_servico").delete().eq("id", os.id);
  if (error) throw error;
  await registrarAuditoria(os, "Excluir", motivo ?? "Exclusão definitiva (sem registros vinculados)");
  return "hard" as const;
}

/** Exclusão definitiva a partir da lixeira: remove vínculos e a própria OS. */
export async function excluirDefinitivo(os: OsRef) {
  await supabase.from("atualizacoes_os").delete().eq("ordem_servico_id", os.id);
  await supabase.from("financeiro").delete().eq("os_id", os.id);
  const { error } = await supabase.from("ordens_servico").delete().eq("id", os.id);
  if (error) throw error;
  await registrarAuditoria(os, "Excluir definitivamente");
}
