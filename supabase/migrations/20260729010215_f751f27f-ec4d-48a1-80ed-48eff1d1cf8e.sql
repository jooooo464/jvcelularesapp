REVOKE ALL ON FUNCTION public.os_lanca_financeiro() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.os_sincroniza_caixa() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.os_lanca_financeiro() TO service_role;
GRANT EXECUTE ON FUNCTION public.os_sincroniza_caixa() TO service_role;