import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function baseUrl() {
  const origin = getRequestHeader("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const host = getRequestHeader("host");
  const proto = getRequestHeader("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

const EVENTOS_WEBHOOK = [
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "CONNECTION_UPDATE",
  "QRCODE_UPDATED",
];

/* ------------------------------------------------------------------ */
/* configuração / conexão                                              */
/* ------------------------------------------------------------------ */

export const waStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const wa = await import("@/lib/whatsapp.server");
    const db = await wa.adminDb();
    const cfg = await wa.getConfig(db);
    if (!cfg) return { configurado: false as const, config: null, status: "desconectado" };
    if (!cfg.api_url || !cfg.api_key || !cfg.instance_name) {
      return { configurado: false as const, config: wa.sanitize(cfg), status: "desconectado" };
    }

    const state = await wa.evo<{ instance?: { state?: string } }>(
      cfg,
      `/instance/connectionState/${encodeURIComponent(cfg.instance_name)}`,
    );
    const status = wa.mapStatus(state.data?.instance?.state);

    let phone = cfg.phone_number;
    let nome = cfg.profile_name;
    let foto = cfg.profile_picture;

    if (status === "conectado") {
      const inst = await wa.evo<Array<Record<string, unknown>> | { instance?: Record<string, unknown> }>(
        cfg,
        `/instance/fetchInstances?instanceName=${encodeURIComponent(cfg.instance_name)}`,
      );
      const raw = Array.isArray(inst.data) ? inst.data[0] : (inst.data as { instance?: Record<string, unknown> })?.instance;
      const item = ((raw as { instance?: Record<string, unknown> })?.instance ?? raw ?? {}) as Record<string, unknown>;
      phone = String(item.owner ?? item.ownerJid ?? item.number ?? phone ?? "").split("@")[0] || phone;
      nome = (item.profileName as string) ?? (item.name as string) ?? nome;
      foto = (item.profilePicUrl as string) ?? (item.profilePictureUrl as string) ?? foto;
    }

    await db
      .from("whatsapp_config")
      .update({
        connection_status: status,
        phone_number: phone,
        profile_name: nome,
        profile_picture: foto,
        last_sync: new Date().toISOString(),
      })
      .eq("id", cfg.id);

    const atual = await wa.getConfig(db);
    return { configurado: true as const, config: wa.sanitize(atual), status, erro: state.erro };
  });

export const waSalvarConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        api_url: z.string().trim().url("Informe uma URL válida.").max(300),
        api_key: z.string().trim().max(300).optional(),
        instance_name: z
          .string()
          .trim()
          .min(2)
          .max(60)
          .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline."),
        auto_enviar: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const wa = await import("@/lib/whatsapp.server");
    const db = await wa.adminDb();
    const atual = await wa.getConfig(db);
    const payload: Record<string, unknown> = {
      api_url: wa.normalizeUrl(data.api_url),
      instance_name: data.instance_name,
      auto_enviar: data.auto_enviar ?? atual?.auto_enviar ?? true,
    };
    if (data.api_key) payload.api_key = data.api_key;

    if (atual) await db.from("whatsapp_config").update(payload).eq("id", atual.id);
    else await db.from("whatsapp_config").insert({ ...payload, api_key: data.api_key ?? "" });

    return { ok: true as const, config: wa.sanitize(await wa.getConfig(db)) };
  });

export const waTestarConexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const wa = await import("@/lib/whatsapp.server");
    const cfg = await wa.getConfig();
    if (!cfg?.api_url || !cfg.api_key) return { ok: false as const, erro: "Configure a URL e a API Key primeiro." };
    const res = await wa.evo<{ instance?: { state?: string } }>(
      cfg,
      `/instance/connectionState/${encodeURIComponent(cfg.instance_name)}`,
    );
    if (!res.ok && res.status !== 404) return { ok: false as const, erro: res.erro };
    return { ok: true as const, status: wa.mapStatus(res.data?.instance?.state) };
  });

/** Cria (se necessário) a instância, configura o webhook e devolve o QR Code. */
export const waQrCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const wa = await import("@/lib/whatsapp.server");
    const cfg = await wa.getConfig();
    if (!cfg?.api_url || !cfg.api_key || !cfg.instance_name) {
      return { ok: false as const, erro: "Salve a URL, a API Key e o nome da instância antes de gerar o QR Code." };
    }

    const webhookUrl = `${baseUrl()}/api/public/whatsapp/webhook`;
    const inst = encodeURIComponent(cfg.instance_name);

    const state = await wa.evo<{ instance?: { state?: string } }>(cfg, `/instance/connectionState/${inst}`);
    if (!state.ok) {
      const criada = await wa.evo(cfg, "/instance/create", {
        method: "POST",
        body: {
          instanceName: cfg.instance_name,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: { url: webhookUrl, byEvents: false, base64: true, events: EVENTOS_WEBHOOK },
        },
      });
      if (!criada.ok) return { ok: false as const, erro: criada.erro };
    }

    await wa.evo(cfg, `/webhook/set/${inst}`, {
      method: "POST",
      body: { webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: true, events: EVENTOS_WEBHOOK } },
    });

    const conn = await wa.evo<{ base64?: string; code?: string; qrcode?: { base64?: string; code?: string } }>(
      cfg,
      `/instance/connect/${inst}`,
    );
    const base64 = conn.data?.base64 ?? conn.data?.qrcode?.base64 ?? null;
    const code = conn.data?.code ?? conn.data?.qrcode?.code ?? null;
    if (!base64 && !code) {
      return { ok: false as const, erro: conn.erro ?? "A Evolution API não retornou um QR Code." };
    }
    return { ok: true as const, base64, code };
  });

export const waDesconectar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const wa = await import("@/lib/whatsapp.server");
    const db = await wa.adminDb();
    const cfg = await wa.getConfig(db);
    if (!cfg) return { ok: false as const, erro: "Nenhuma configuração salva." };
    const res = await wa.evo(cfg, `/instance/logout/${encodeURIComponent(cfg.instance_name)}`, { method: "DELETE" });
    await db
      .from("whatsapp_config")
      .update({ connection_status: "desconectado", last_sync: new Date().toISOString() })
      .eq("id", cfg.id);
    return { ok: res.ok, erro: res.erro };
  });

export const waReiniciar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const wa = await import("@/lib/whatsapp.server");
    const cfg = await wa.getConfig();
    if (!cfg) return { ok: false as const, erro: "Nenhuma configuração salva." };
    const res = await wa.evo(cfg, `/instance/restart/${encodeURIComponent(cfg.instance_name)}`, { method: "POST" });
    return { ok: res.ok, erro: res.erro };
  });

/* ------------------------------------------------------------------ */
/* mensagens                                                           */
/* ------------------------------------------------------------------ */

type Ctx = { userId: string };

async function dadosOs(db: Awaited<ReturnType<typeof import("@/lib/whatsapp.server").adminDb>>, osId: string) {
  const { data } = await db
    .from("ordens_servico")
    .select(
      "id, numero_os, status, valor_total, defeito, portal_token, cliente_id, clientes(nome, telefone, whatsapp), aparelhos(marca, modelo)",
    )
    .eq("id", osId)
    .maybeSingle();
  return data as
    | {
        id: string;
        numero_os: number;
        status: string;
        valor_total: number;
        defeito: string | null;
        portal_token: string;
        cliente_id: string;
        clientes: { nome: string; telefone: string | null; whatsapp: string | null } | null;
        aparelhos: { marca: string; modelo: string } | null;
      }
    | null;
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
}

/** Monta o texto de um modelo já com as variáveis da OS substituídas. */
export const waMontarMensagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ordem_servico_id: z.string().uuid(), chave: z.string().trim().min(1).max(60).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const wa = await import("@/lib/whatsapp.server");
    const db = await wa.adminDb();
    const os = await dadosOs(db, data.ordem_servico_id);
    if (!os) return { ok: false as const, erro: "Ordem de serviço não encontrada." };

    const { data: modelos } = await db.from("whatsapp_modelos").select("*").eq("ativo", true);
    const lista = (modelos ?? []) as Array<{ chave: string; evento: string | null; conteudo: string }>;
    const modelo =
      (data.chave && lista.find((m) => m.chave === data.chave)) ||
      lista.find((m) => m.evento === os.status) ||
      lista.find((m) => m.chave === "os_criada");

    const texto = wa.aplicarVariaveis(modelo?.conteudo ?? "", {
      nome_cliente: os.clientes?.nome ?? "cliente",
      numero_os: `#${os.numero_os}`,
      modelo: [os.aparelhos?.marca, os.aparelhos?.modelo].filter(Boolean).join(" ") || "aparelho",
      status: os.status,
      valor: brl(Number(os.valor_total)),
      defeito: os.defeito ?? "",
      portal_link: `${baseUrl()}/portal/${os.portal_token}`,
    });

    return {
      ok: true as const,
      texto,
      telefone: os.clientes?.whatsapp || os.clientes?.telefone || "",
      cliente: os.clientes?.nome ?? "",
      modelo_chave: modelo?.chave ?? null,
    };
  });

const envioSchema = z.object({
  telefone: z.string().trim().min(8).max(30),
  texto: z.string().trim().max(4000).default(""),
  ordem_servico_id: z.string().uuid().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  media_url: z.string().trim().url().max(2000).nullable().optional(),
  media_nome: z.string().trim().max(200).nullable().optional(),
  tipo: z.enum(["texto", "image", "video", "audio", "document"]).default("texto"),
});

async function enviarInterno(
  input: z.infer<typeof envioSchema>,
  ctx: Partial<Ctx> & { usuario_nome?: string | null },
) {
  const wa = await import("@/lib/whatsapp.server");
  const db = await wa.adminDb();
  const cfg = await wa.getConfig(db);
  const numero = wa.toJid(input.telefone);

  const registrar = async (status: string, erro?: string | null, evolutionId?: string | null) => {
    await db.from("whatsapp_mensagens").insert({
      ordem_servico_id: input.ordem_servico_id ?? null,
      cliente_id: input.cliente_id ?? null,
      telefone: numero,
      direcao: "enviada",
      tipo: input.tipo,
      conteudo: input.texto,
      media_url: input.media_url ?? null,
      media_nome: input.media_nome ?? null,
      status,
      erro: erro ?? null,
      evolution_id: evolutionId ?? null,
      usuario_id: ctx.userId ?? null,
      usuario_nome: ctx.usuario_nome ?? null,
      lida: true,
    });
  };

  if (!cfg?.api_url || !cfg.api_key || !cfg.instance_name) {
    await registrar("falha", "WhatsApp não configurado.");
    return { ok: false as const, erro: "WhatsApp não configurado." };
  }
  if (!numero) {
    await registrar("falha", "Telefone inválido.");
    return { ok: false as const, erro: "Telefone inválido." };
  }

  const inst = encodeURIComponent(cfg.instance_name);
  const body =
    input.tipo === "texto"
      ? { number: numero, text: input.texto }
      : {
          number: numero,
          mediatype: input.tipo === "document" ? "document" : input.tipo,
          media: input.media_url,
          fileName: input.media_nome ?? undefined,
          caption: input.texto || undefined,
        };
  const path = input.tipo === "texto" ? `/message/sendText/${inst}` : `/message/sendMedia/${inst}`;

  // Uma tentativa + um reenvio automático em caso de falha temporária.
  let res = await wa.evo<{ key?: { id?: string } }>(cfg, path, { method: "POST", body });
  if (!res.ok && res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1200));
    res = await wa.evo<{ key?: { id?: string } }>(cfg, path, { method: "POST", body });
  }

  await registrar(res.ok ? "enviada" : "falha", res.ok ? null : res.erro, res.data?.key?.id ?? null);
  return res.ok ? { ok: true as const } : { ok: false as const, erro: res.erro };
}

export const waEnviar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => envioSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("nome")
      .eq("id", context.userId)
      .maybeSingle();
    return enviarInterno(data, { userId: context.userId, usuario_nome: perfil?.nome ?? null });
  });

/** Dispara automaticamente a mensagem do modelo correspondente ao status atual da OS. */
export const waNotificarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ordem_servico_id: z.string().uuid(), chave: z.string().max(60).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const wa = await import("@/lib/whatsapp.server");
    const db = await wa.adminDb();
    const cfg = await wa.getConfig(db);
    if (!cfg?.auto_enviar) return { ok: false as const, erro: "Envio automático desativado." };
    if (cfg.connection_status !== "conectado") return { ok: false as const, erro: "WhatsApp desconectado." };

    const os = await dadosOs(db, data.ordem_servico_id);
    if (!os) return { ok: false as const, erro: "OS não encontrada." };

    const { data: modelos } = await db.from("whatsapp_modelos").select("*").eq("ativo", true);
    const lista = (modelos ?? []) as Array<{ chave: string; evento: string | null; conteudo: string }>;
    const modelo = (data.chave && lista.find((m) => m.chave === data.chave)) || lista.find((m) => m.evento === os.status);
    if (!modelo) return { ok: false as const, erro: "Nenhum modelo ativo para este status." };

    const texto = wa.aplicarVariaveis(modelo.conteudo, {
      nome_cliente: os.clientes?.nome ?? "cliente",
      numero_os: `#${os.numero_os}`,
      modelo: [os.aparelhos?.marca, os.aparelhos?.modelo].filter(Boolean).join(" ") || "aparelho",
      status: os.status,
      valor: brl(Number(os.valor_total)),
      defeito: os.defeito ?? "",
      portal_link: `${baseUrl()}/portal/${os.portal_token}`,
    });

    return enviarInterno(
      {
        telefone: os.clientes?.whatsapp || os.clientes?.telefone || "",
        texto,
        tipo: "texto",
        ordem_servico_id: os.id,
        cliente_id: os.cliente_id,
      },
      { userId: context.userId, usuario_nome: "Automático" },
    );
  });
