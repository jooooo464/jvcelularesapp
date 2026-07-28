import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ETAPAS, etapaDoStatus } from "@/lib/portal-etapas";

export function PortalTimeline({
  status,
  orcamento,
}: {
  status: string;
  orcamento: string;
}) {
  const atual = etapaDoStatus(status, orcamento);

  return (
    <ol className="relative space-y-0">
      {ETAPAS.map((etapa, i) => {
        const estado = i < atual ? "done" : i === atual ? "current" : "todo";
        return (
          <li key={etapa} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                  estado === "done" && "border-success bg-success/15 text-success",
                  estado === "current" && "border-warning bg-warning/20 text-warning",
                  estado === "todo" && "border-border bg-muted text-muted-foreground",
                )}
              >
                {estado === "done" ? (
                  <Check className="size-4" />
                ) : estado === "current" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Circle className="size-3" />
                )}
              </span>
              {i < ETAPAS.length - 1 && (
                <span className={cn("w-px flex-1", i < atual ? "bg-success/50" : "bg-border")} />
              )}
            </div>
            <div className="pb-5 pt-1">
              <p
                className={cn(
                  "text-sm",
                  estado === "todo" ? "text-muted-foreground" : "font-medium",
                  estado === "current" && "text-warning",
                )}
              >
                {etapa}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
