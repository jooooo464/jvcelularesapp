export function LoadingScreen({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
