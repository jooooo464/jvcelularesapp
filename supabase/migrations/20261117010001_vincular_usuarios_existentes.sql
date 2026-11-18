-- Vincula todos os usuários já existentes à loja legada, sem descartar equipe/perfis.
DO $$
DECLARE v_store uuid;
BEGIN
  SELECT id INTO v_store FROM public.lojas ORDER BY created_at LIMIT 1;
  INSERT INTO public.loja_usuarios(loja_id,user_id,role,ativo)
  SELECT v_store, p.id,
    COALESCE(
      (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id=p.id
       ORDER BY CASE ur.role WHEN 'administrador' THEN 0 WHEN 'financeiro' THEN 1 WHEN 'tecnico' THEN 2 ELSE 3 END LIMIT 1),
      'vendedor'::public.app_role
    ),
    p.ativo
  FROM public.profiles p
  ON CONFLICT (loja_id,user_id) DO NOTHING;

  UPDATE public.user_roles ur SET loja_id=v_store
  WHERE ur.loja_id IS DISTINCT FROM v_store;
  INSERT INTO public.user_roles(user_id,role,loja_id)
  SELECT p.id,'vendedor'::public.app_role,v_store
  FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id)
  ON CONFLICT (user_id,role) DO NOTHING;
END $$;
