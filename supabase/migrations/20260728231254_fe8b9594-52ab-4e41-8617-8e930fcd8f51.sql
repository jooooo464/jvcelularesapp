CREATE POLICY "os_fotos_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'os-fotos' AND public.is_active_user());
CREATE POLICY "os_fotos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'os-fotos' AND public.is_active_user());
CREATE POLICY "os_fotos_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'os-fotos' AND public.is_active_user());
CREATE POLICY "os_fotos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'os-fotos' AND public.is_active_user());