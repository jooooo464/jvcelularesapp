import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { isDevMode } from "@/lib/dev-mode";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Modo de desenvolvimento: backend não configurado, libera todas as telas.
    if (isDevMode) return { user: null };
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/auth" });
      return { user: data.session.user };
    } catch (error) {
      if ((error as { isRedirect?: boolean })?.isRedirect) throw error;
      console.error("[auth] falha ao restaurar sessão", error);
      throw redirect({ to: "/auth" });
    }
  },
  pendingComponent: () => <LoadingScreen label="Verificando sessão..." />,
  pendingMs: 0,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
