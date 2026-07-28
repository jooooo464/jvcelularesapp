import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/vendas")({
  beforeLoad: () => {
    throw redirect({ to: "/pdv", replace: true });
  },
});
