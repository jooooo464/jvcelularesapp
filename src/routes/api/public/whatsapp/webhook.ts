import { createFileRoute } from "@tanstack/react-router";

type Payload = {
  event?: string;
  instance?: string;
  apikey?: string;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
};

function textoDaMensagem(msg: Record<string, unknown>): { texto: string; tipo: string; nome?: string } {
  const m = (msg.message ?? {}) as Record<string, any>;
  if (m.conversation) return { texto: String(m.conversation), tipo: "texto" };
  if (m.extendedTextMessage?.text) return { texto: String(m.extendedTextMessage.text), tipo: "texto" };
  if (m.imageMessage) return { texto: String(m.imageMessage.caption ?? "[imagem]"), tipo: "image" };
  if (m.videoMessage) return { texto: String(m.videoMessage.caption ?? "[vídeo]"), tipo: "video" };
  if (m.audioMessage) return { texto: "[áudio]", tipo: "audio" };
  if (m.documentMessage)
    return { texto: String(m.documentMessage.caption ?? "[documento]"), tipo: "document", nome: m.documentMessage.fileName };
  return { texto: "[mensagem não suportada]", tipo: "texto" };
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: Payload;
        try {
          payload = (await request.json()) as Payload;
        } catch {
          return new Response("Payload inválido", { status: 400 });
        }

        const wa = await import("@/lib/whatsapp.server");
        const db = await wa.adminDb();
        const cfg = await wa.getConfig(db);

        // Validação: instância e (quando enviada) a apikey precisam bater com a configuração.
        if (!cfg || !cfg.instance_name) return new Response("Não configurado", { status: 401 });
        if (payload.instance && payload.instance !== cfg.instance_name) {
          return new Response("Instância desconhecida", { status: 401 });
        }
        const headerKey = request.headers.get("apikey");
        if (headerKey && headerKey !== cfg.api_key) return new Response("Não autorizado", { status: 401 });

        const evento = (payload.event ?? "").toLowerCase().replace(/_/g, ".");
        const itens = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];

        try {
          if (evento === "connection.update") {
            const raw = (itens[0]?.state ?? itens[0]?.connection) as string | undefined;
            await db
              .from("whatsapp_config")
              .update({ connection_status: wa.mapStatus(raw), last_sync: new Date().toISOString() })
              .eq("id", cfg.id);
          }

          if (evento === "messages.upsert" || evento === "send.message") {
            for (const item of itens) {
              const key = (item.key ?? {}) as Record<string, unknown>;
              const jid = String(key.remoteJid ?? "");
              if (jid.endsWith("@g.us") || jid === "status@broadcast") continue;
              const telefone = jid.split("@")[0];
              const fromMe = Boolean(key.fromMe);
              const { texto, tipo, nome } = textoDaMensagem(item);

              const { data: cliente } = await db
                .from("clientes")
                .select("id")
                .or(`telefone.ilike.%${telefone.slice(-8)}%,whatsapp.ilike.%${telefone.slice(-8)}%`)
                .limit(1)
                .maybeSingle();

              const { data: os } = cliente
                ? await db
                    .from("ordens_servico")
                    .select("id")
                    .eq("cliente_id", cliente.id)
                    .eq("deleted", false)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle()
                : { data: null };

              const evolutionId = String(key.id ?? "");
              if (evolutionId) {
                const { data: existe } = await db
                  .from("whatsapp_mensagens")
                  .select("id")
                  .eq("evolution_id", evolutionId)
                  .maybeSingle();
                if (existe) continue;
              }

              await db.from("whatsapp_mensagens").insert({
                telefone,
                direcao: fromMe ? "enviada" : "recebida",
                tipo,
                conteudo: texto,
                media_nome: nome ?? null,
                status: fromMe ? "enviada" : "recebida",
                evolution_id: evolutionId || null,
                cliente_id: cliente?.id ?? null,
                ordem_servico_id: os?.id ?? null,
                usuario_nome: fromMe ? "WhatsApp" : null,
                lida: fromMe,
              });
            }
          }

          if (evento === "messages.update") {
            for (const item of itens) {
              const id = String((item.key as Record<string, unknown>)?.id ?? item.keyId ?? "");
              const st = String(item.status ?? "").toUpperCase();
              const mapa: Record<string, string> = {
                DELIVERY_ACK: "entregue",
                DELIVERED: "entregue",
                READ: "lida",
                PLAYED: "lida",
                SERVER_ACK: "enviada",
              };
              if (id && mapa[st]) {
                await db.from("whatsapp_mensagens").update({ status: mapa[st] }).eq("evolution_id", id);
              }
            }
          }
        } catch (e) {
          console.error("[whatsapp webhook] erro ao processar", e);
          return new Response("Erro interno", { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
