import logo from "@/assets/jv-logo.asset.json";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "JV Celulares";
export const BRAND_TAGLINE = "Sistema de Gestão para Assistência Técnica";
export const brandLogoUrl = logo.url;

export function BrandLogo({
  className,
  alt = "JV Celulares",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={logo.url}
      alt={alt}
      width={512}
      height={512}
      loading="eager"
      decoding="async"
      className={cn("object-contain", className)}
    />
  );
}
