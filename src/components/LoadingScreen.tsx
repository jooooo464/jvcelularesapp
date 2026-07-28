import { BrandLogo, BRAND_NAME } from "@/components/BrandLogo";

export function LoadingScreen({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="brand-frame size-20 p-2">
        <BrandLogo className="size-full rounded-xl" />
      </div>
      <p className="font-display text-lg font-semibold tracking-tight">{BRAND_NAME}</p>
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
