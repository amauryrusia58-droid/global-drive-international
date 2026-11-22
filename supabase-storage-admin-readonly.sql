-- Global Drive International · política privada ADMINISTRADOR ÚNICO.
-- Ejecutar en SUPABASE > SQL Editor, proyecto Global Drive International.
-- IMPORTANTE: la identidad Firebase debe tener en su JWT role: authenticated.
-- Esta política permite DESCARGAR archivos, NO subir ni modificar.
-- No ejecutar si ya existe una política demasiado amplia sin revisarla.

create policy "gdi_admin_read_only"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documentos-clientes'
    and (auth.jwt() ->> 'sub') = 'Tj2ACB3I9OWAa3uZS6uYGtAbxIR2'
    and (auth.jwt() ->> 'iss') = 'https://securetoken.google.com/global-drive-international'
  );
