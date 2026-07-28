import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Smartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/LoadingScreen";
import { friendlyAuthError, isDevMode } from "@/lib/dev-mode";

export const Route = createFileRoute("/auth")({
  ssr: false,
  // Se já existe sessão válida, nunca mostrar a tela de login.
  beforeLoad: async () => {
    if (isDevMode) throw redirect({ to: "/dashboard" });
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
    } catch (error) {
      if ((error as { to?: string })?.to) throw error;
      console.error("[auth] falha ao verificar sessão", error);
    }
  },
  pendingComponent: () => <LoadingScreen label="Verificando sessão..." />,
  pendingMs: 0,
  head: () => ({
    meta: [
      { title: "Entrar — CelTech ERP para Assistência Técnica" },
      {
        name: "description",
        content:
          "Acesse o CelTech ERP e gerencie ordens de serviço, estoque, PDV e financeiro da sua assistência técnica de celulares.",
      },
      { property: "og:title", content: "Entrar — CelTech ERP" },
      {
        property: "og:description",
        content: "Gestão completa para assistências técnicas de celulares e lojas de acessórios.",
      },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
});

const signupSchema = loginSchema.extend({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
});

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setChecking(false);
      })
      .catch((error) => {
        console.error("[auth] getSession", error);
        if (active) setChecking(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);

  const login = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const signup = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { nome: "", email: "", password: "" },
  });

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setBusy(false);
    if (error)
      return toast.error("Não foi possível entrar", { description: friendlyAuthError(error) });
    navigate({ to: "/dashboard", replace: true });
  }

  async function onSignup(values: z.infer<typeof signupSchema>) {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: window.location.origin, data: { nome: values.nome } },
    });
    setBusy(false);
    if (error)
      return toast.error("Não foi possível criar a conta", {
        description: friendlyAuthError(error),
      });
    toast.success("Conta criada", { description: "Você já pode acessar o sistema." });
    navigate({ to: "/dashboard", replace: true });
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error)
      return toast.error("Falha no login com Google", {
        description: friendlyAuthError(result.error),
      });
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  async function onRecover() {
    const email = login.getValues("email");
    if (!email) return toast.error("Informe seu e-mail no campo acima");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(friendlyAuthError(error));
    toast.success("E-mail de recuperação enviado");
  }

  if (checking) return <LoadingScreen label="Verificando sessão..." />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="brand-gradient mb-4 flex size-12 items-center justify-center rounded-2xl text-primary-foreground shadow-raised">
            <Smartphone className="size-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">CelTech ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão completa da sua assistência técnica
          </p>
        </div>

        <div className="surface p-6">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={login.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" type="email" autoComplete="email" {...login.register("email")} />
                  <FieldError msg={login.formState.errors.email?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    {...login.register("password")}
                  />
                  <FieldError msg={login.formState.errors.password?.message} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Entrar
                </Button>
                <button
                  type="button"
                  onClick={onRecover}
                  className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={signup.handleSubmit(onSignup)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" {...signup.register("nome")} />
                  <FieldError msg={signup.formState.errors.nome?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" type="email" {...signup.register("email")} />
                  <FieldError msg={signup.formState.errors.email?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    {...signup.register("password")}
                  />
                  <FieldError msg={signup.formState.errors.password?.message} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={onGoogle}>
            Continuar com Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}
