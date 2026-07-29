/** Cliente server-only da Evolution API. Nunca importar no navegador. */
import type { SupabaseClient } from "@supabase/supabase-js";

export type WaConfig = {
  id: string;
  api_url: string;
  api_key: string;
  instance_name: string;
  phone_number: string | null;
  profile_name: string | null;
  profile_picture: string | null;
  connection_status: string;
  last_sync: string | null;
  auto_enviar: boolean;
};

export async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export async function getConfig(db?: SupabaseClient): Promise<WaConfig | null> {
  const client = db ?? (await adminDb());
  const { data } = await client
    .from("whatsapp_config")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as WaConfig) ?? null;
}

export function sanitize(cfg: WaConfig | null) {
  if (!cfg) return null;
  const { api_key, ...rest } = cfg;
  return { ...rest, api_key_definida: Boolean(api_key) };
}

export function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

/** Normaliza telefone brasileiro para o formato aceito pela Evolution (E.164 sem "+"). */
export function toJid(phone: string) {
  let n = (phone || "").replace(/\D/g, "");
  if (!n) return "";
  if (n.length <= 11) n = `55${n}`;
  return n;
}

export async function evo<T = unknown>(
  cfg: WaConfig,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: T | null; erro?: string }> {
  const url = `${normalizeUrl(cfg.api_url)}${path}`;
  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.api_key,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      console.error("[evolution] erro", res.status, path, text.slice(0, 500));
      return {
        ok: false,
        status: res.status,
        data: data as T,
        erro:
          (data as { message?: string; error?: string })?.message ||
          (data as { error?: string })?.error ||
          `Falha ${res.status} na Evolution API.`,
      };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    console.error("[evolution] exceção", path, e);
    return { ok: false, status: 0, data: null, erro: "Não foi possível contatar a Evolution API." };
  }
}

/** Mapeia o estado bruto da Evolution para o vocabulário do ERP. */
export function mapStatus(raw?: string | null) {
  const v = (raw || "").toLowerCase();
  if (v === "open" || v === "conectado") return "conectado";
  if (v === "connecting" || v === "conectando" || v === "qr") return "conectando";
  return "desconectado";
}

export function aplicarVariaveis(template: string, vars: Record<string, string | number | null | undefined>) {
  return template.replace(/\{\{\s*([a-z_0-9]+)\s*\}\}/gi, (_m, k: string) => {
    const v = vars[k.toLowerCase()];
    return v === null || v === undefined ? "" : String(v);
  });
}
