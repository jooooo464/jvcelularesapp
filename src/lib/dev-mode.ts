/**
 * Modo de desenvolvimento: ativo quando o backend (Supabase) não está configurado.
 * Nesse modo a autenticação é desabilitada e as telas usam dados locais (mock).
 */
export const isBackendConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

export const isDevMode = !isBackendConfigured;

export const devUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "dev@local",
  nome: "Modo de desenvolvimento",
};

/** Mensagens de erro amigáveis para falhas de autenticação. */
export function friendlyAuthError(error: unknown): string {
  const msg = (error as { message?: string } | null)?.message ?? "";
  console.error("[auth]", error);
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha inválidos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
  if (/user already registered/i.test(msg)) return "Este e-mail já possui cadastro.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns instantes.";
  if (/network|fetch/i.test(msg)) return "Falha de conexão. Verifique sua internet.";
  return msg || "Ocorreu um erro inesperado. Tente novamente.";
}
