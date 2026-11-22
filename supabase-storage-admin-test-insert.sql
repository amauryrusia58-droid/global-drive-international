-- Global Drive International V9: sólo TEST INTERNO por administrador autenticado.
-- Ejecutar una sola vez en SQL Editor, proyecto Global Drive International.
-- NO habilitar para anon, ni añadir reglas públicas.
CREATE POLICY "gdi_admin_test_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-clientes'
    AND (auth.jwt() ->> 'sub') = 'Tj2ACB3I9OWAa3uZS6uYGtAbxIR2'
    AND (auth.jwt() ->> 'iss') = 'https://securetoken.google.com/global-drive-international'
    AND (storage.foldername(name))[1] = 'submissions'
    AND array_length(storage.foldername(name),1) = 3
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','pdf')
    AND (name ~ '^submissions/[A-Za-z0-9_-]{8,128}/[A-Za-z0-9_-]{8,128}/(photo|signature|license)\.(jpg|jpeg|png|pdf)$')
  );
