import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone, Wrench, Boxes, ShoppingCart, Wallet, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CelTech ERP — Gestão para assistência técnica de celulares" },
      {
        name: "description",
        content:
          "ERP completo para assistências técnicas: ordens de serviço, estoque de peças, PDV, financeiro e relatórios em um só lugar.",
      },
      { property: "og:title", content: "CelTech ERP — Gestão para assistência técnica de celulares" },
      {
        property: "og:description",
        content: "Ordens de serviço, estoque, PDV e financeiro integrados para sua assistência técnica.",
      },
    ],
  }),
  component: Landing,
});

const RECURSOS = [
  { icon: Wrench, title: "Ordens de serviço", desc: "Do recebimento à entrega, com numeração automática, histórico e impressão." },
  { icon: Boxes, title: "Estoque de peças", desc: "Custos, margens calculadas e alertas de estoque mínimo em tempo real." },
  { icon: ShoppingCart, title: "PDV integrado", desc: "Venda acessórios com baixa automática de estoque e lançamento no caixa." },
  { icon: Wallet, title: "Financeiro", desc: "Contas a pagar e receber, baixas e alertas de vencimento." },
  { icon: BarChart3, title: "Relatórios", desc: "Faturamento, lucro, produtos campeões e exportação em CSV." },
  { icon: Smartphone, title: "Clientes e aparelhos", desc: "Cadastro completo com IMEI, histórico e contato por WhatsApp." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center gap-2.5 px-6 py-6">
        <div className="brand-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-raised">
          <Smartphone className="size-4.5" />
        </div>
        <span className="font-display text-sm font-semibold">CelTech ERP</span>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-16 text-center sm:pt-24">
          <p className="mb-4 inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Feito para assistências técnicas de celulares
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Toda a sua oficina em um sistema só
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Controle ordens de serviço, estoque de peças, vendas no balcão e o financeiro da loja com a mesma
            clareza de um app premium.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link to="/auth">
                Acessar o sistema <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="surface p-5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <h2 className="mt-4 font-display text-base font-semibold">{title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        CelTech ERP · Gestão completa para assistência técnica
      </footer>
    </div>
  );
}
