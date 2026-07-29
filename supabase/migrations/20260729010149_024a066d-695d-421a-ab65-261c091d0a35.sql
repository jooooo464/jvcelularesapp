ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS orcamento_aprovado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_pagamento text NOT NULL DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS data_aprovacao timestamptz,
  ADD COLUMN IF NOT EXISTS data_pagamento timestamptz,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS valor_previsto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_recebido numeric NOT NULL DEFAULT 0;

DROP TRIGGER IF EXISTS os_lanca_financeiro ON public.ordens_servico;
DROP TRIGGER IF EXISTS trg_os_lanca_financeiro ON public.ordens_servico;

CREATE OR REPLACE FUNCTION public.os_lanca_financeiro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Aprovação do orçamento -> Futuro Faturamento
  IF NEW.orcamento_status = 'Aprovado' AND NOT NEW.orcamento_aprovado THEN
    NEW.orcamento_aprovado := true;
    NEW.data_aprovacao := COALESCE(NEW.data_aprovacao, now());
  END IF;
  IF NEW.orcamento_status <> 'Aprovado' THEN
    NEW.orcamento_aprovado := false;
    NEW.data_aprovacao := NULL;
  END IF;

  NEW.valor_previsto := CASE WHEN NEW.orcamento_aprovado AND NEW.status <> 'Entregue'
    THEN COALESCE(NEW.valor_total, 0) ELSE 0 END;

  -- Faturamento real: apenas entregue + pago
  IF NEW.status = 'Entregue' AND NEW.status_pagamento = 'Pago' THEN
    NEW.data_entrega := COALESCE(NEW.data_entrega, CURRENT_DATE);
    NEW.data_pagamento := COALESCE(NEW.data_pagamento, now());
    IF COALESCE(NEW.valor_recebido, 0) = 0 THEN
      NEW.valor_recebido := COALESCE(NEW.valor_total, 0);
    END IF;
  ELSE
    NEW.valor_recebido := 0;
    NEW.data_pagamento := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.os_lanca_financeiro() FROM PUBLIC;

CREATE TRIGGER os_financeiro_fluxo
BEFORE INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.os_lanca_financeiro();

CREATE OR REPLACE FUNCTION public.os_sincroniza_caixa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'Entregue' AND NEW.status_pagamento = 'Pago' THEN
    IF NOT EXISTS (SELECT 1 FROM public.financeiro WHERE os_id = NEW.id) THEN
      INSERT INTO public.financeiro (tipo, descricao, categoria, valor, vencimento, status, os_id)
      VALUES ('Entrada', 'OS #' || NEW.numero_os || COALESCE(' - ' || NEW.forma_pagamento, ''),
              'Serviços', COALESCE(NEW.valor_recebido, NEW.valor_total), CURRENT_DATE, 'Pago', NEW.id);
    ELSE
      UPDATE public.financeiro
      SET valor = COALESCE(NEW.valor_recebido, NEW.valor_total),
          status = 'Pago',
          descricao = 'OS #' || NEW.numero_os || COALESCE(' - ' || NEW.forma_pagamento, '')
      WHERE os_id = NEW.id;
    END IF;
  ELSE
    DELETE FROM public.financeiro WHERE os_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.os_sincroniza_caixa() FROM PUBLIC;

CREATE TRIGGER os_sincroniza_caixa_trg
AFTER INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.os_sincroniza_caixa();

DROP TRIGGER IF EXISTS calc_total_os ON public.ordens_servico;
CREATE TRIGGER calc_total_os_trg
BEFORE INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.calc_total_os();

DROP TRIGGER IF EXISTS set_portal_link ON public.ordens_servico;
CREATE TRIGGER set_portal_link_trg
BEFORE INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.set_portal_link();

DELETE FROM public.financeiro f
USING public.ordens_servico o
WHERE f.os_id = o.id
  AND NOT (o.status = 'Entregue' AND o.status_pagamento = 'Pago');