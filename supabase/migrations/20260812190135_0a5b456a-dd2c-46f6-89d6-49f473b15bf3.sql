DROP POLICY IF EXISTS "Authenticated can view creative-assets" ON storage.objects;
CREATE POLICY "Admins can view creative-assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'creative-assets' AND has_role(auth.uid(), 'admin'::app_role));