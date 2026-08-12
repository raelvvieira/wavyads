DROP POLICY IF EXISTS "Public can view creative-assets" ON storage.objects;
CREATE POLICY "Authenticated can view creative-assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'creative-assets');