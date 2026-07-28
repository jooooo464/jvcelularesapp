ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS portal_link text,
  ADD COLUMN IF NOT EXISTS portal_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_criado_em timestamptz NOT NULL DEFAULT now();

UPDATE public.ordens_servico SET portal_link = '/portal/' || portal_token WHERE portal_link IS NULL;

CREATE OR REPLACE FUNCTION public.set_portal_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.portal_token IS NULL OR NEW.portal_token = '' THEN
    NEW.portal_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  END IF;
  NEW.portal_link := '/portal/' || NEW.portal_token;
  IF TG_OP = 'INSERT' THEN
    NEW.portal_criado_em := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_portal_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_set_portal_link ON public.ordens_servico;
CREATE TRIGGER trg_set_portal_link
BEFORE INSERT OR UPDATE OF portal_token ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.set_portal_link();