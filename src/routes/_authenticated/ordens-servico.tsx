import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ordens-servico")({
  beforeLoad: () => {
    throw redirect({ to: "/ordens", replace: true });
  },
});
