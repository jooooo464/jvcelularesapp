import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const digits = (v: string) => v.replace(/\D/g, "");

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function signPhoto(db: Awaited<ReturnType<typeof admin>>, path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await db.storage.from("os-fotos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** Gera um código de verificação para o cliente informado (CPF ou telefone). */
export const portalSolicitarCodigo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ identificador: z.string().trim().min(3).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const alvo = digits(data.identificador);
    if (alvo.length < 8) return { ok: false as const, erro: "Informe um CPF ou telefone válido." };

    const { data: clientes } = await db.from("clientes").select("id, nome, cpf, telefone, whatsapp");
    const cliente = (clientes ?? []).find(
      (c) => [c.cpf, c.telefone, c.whatsapp].filter(Boolean).map((v) => digits(v as string)).includes(alvo),
    );
    if (!cliente) return { ok: false as const, erro: "Não encontramos nenhum cadastro com esses dados." };

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    await db.from("portal_codigos").insert({ cliente_id: cliente.id, identificador: alvo, codigo });

    // O envio por WhatsApp/e-mail pode ser plugado aqui.
    return { ok: true as const, nome: cliente.nome, codigo };
  });

/** Valida o código e devolve as ordens de serviço do cliente. */
export const portalVerificarCodigo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ identificador: z.string().trim().min(3).max(40), codigo: z.string().trim().length(6) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const alvo = digits(data.identificador);
    const { data: reg } = await db
      .from("portal_codigos")
      .select("*")
      .eq("identificador", alvo)
      .eq("codigo", data.codigo)
      .eq("usado", false)
      .gt("expira_em", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reg) return { ok: false as const, erro: "Código inválido ou expirado." };
    await db.from("portal_codigos").update({ usado: true }).eq("id", reg.id);

    const { data: ordens } = await db
      .from("ordens_servico")
      .select("id, numero_os, status, portal_token, data_entrada, aparelhos(marca, modelo)")
      .eq("cliente_id", reg.cliente_id)
      .order("data_entrada", { ascending: false });

    return { ok: true as const, ordens: ordens ?? [] };
  });

/** Dados completos de uma OS pelo link exclusivo do cliente. */
export const portalOrdem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().trim().min(10).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: os } = await db
      .from("ordens_servico")
      .select(
        "id, numero_os, status, defeito, diagnostico, servico_realizado, valor_servico, valor_pecas, desconto, valor_total, data_entrada, previsao_entrega, data_entrega, fotos, orcamento_status, orcamento_resposta_em, clientes(nome), aparelhos(marca, modelo, imei, cor), profiles(nome)",
      )
      .eq("portal_token", data.token)
      .maybeSingle();

    if (!os) return { ok: false as const, erro: "Ordem de serviço não encontrada." };

    const { data: updates } = await db
      .from("atualizacoes_os")
      .select("id, titulo, descricao, status, foto_url, created_at, profiles(nome)")
      .eq("ordem_servico_id", os.id)
      .order("created_at", { ascending: true });

    const atualizacoes = await Promise.all(
      (updates ?? []).map(async (u) => ({ ...u, foto_url: await signPhoto(db, u.foto_url) })),
    );
    const fotos = (await Promise.all(((os.fotos as string[]) ?? []).map((f) => signPhoto(db, f)))).filter(
      Boolean,
    ) as string[];

    return { ok: true as const, os: { ...os, fotos }, atualizacoes };
  });

/** Aprovação ou recusa do orçamento pelo cliente. */
export const portalResponderOrcamento = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().trim().min(10).max(64),
        aprovar: z.boolean(),
        dispositivo: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    let ip: string | null = null;
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      ip =
        req?.headers.get("cf-connecting-ip") ??
        req?.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        null;
    } catch {
      ip = null;
    }

    const { data: os } = await db
      .from("ordens_servico")
      .select("id, orcamento_status")
      .eq("portal_token", data.token)
      .maybeSingle();
    if (!os) return { ok: false as const, erro: "Ordem de serviço não encontrada." };
    if (os.orcamento_status !== "Pendente")
      return { ok: false as const, erro: "Não há orçamento aguardando resposta." };

    const novo = data.aprovar ? "Aprovado" : "Recusado";
    await db
      .from("ordens_servico")
      .update({
        orcamento_status: novo,
        orcamento_resposta_em: new Date().toISOString(),
        orcamento_ip: ip,
        orcamento_dispositivo: data.dispositivo ?? null,
      })
      .eq("id", os.id);

    await db.from("atualizacoes_os").insert({
      ordem_servico_id: os.id,
      titulo: data.aprovar ? "Cliente aprovou o orçamento" : "Cliente recusou o orçamento",
      descricao: `Resposta registrada pelo portal do cliente${ip ? ` • IP ${ip}` : ""}${
        data.dispositivo ? ` • ${data.dispositivo}` : ""
      }`,
      status: novo,
    });

    return { ok: true as const, status: novo };
  });
