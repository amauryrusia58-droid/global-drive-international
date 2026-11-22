/* Descarga de objetos privados Supabase para el panel administrativo.
   El backend aplica las políticas RLS: este archivo NO concede permisos. */
const cfg = window.GDI_SUPABASE_CONFIG || {};
const isConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url || '')
  && typeof cfg.publishableKey === 'string' && cfg.publishableKey.startsWith('sb_publishable_')
  && cfg.bucket === 'documentos-clientes';
const filePathPattern = /^submissions\/[A-Za-z0-9_-]{8,128}\/[A-Za-z0-9_-]{8,128}\/(photo|signature|license)\.(jpg|jpeg|png|pdf)$/;

async function downloadPrivate(path) {
  if (!isConfigured) throw new Error('Conexión Supabase no configurada.');
  if (!filePathPattern.test(path || '')) throw new Error('Ruta de archivo privada no válida.');
  if (/(photo|signature)\.pdf$/.test(path) || /license\.png$/.test(path)) throw new Error('Formato no permitido para ese documento.');
  const {auth} = await window.GDI_DATA.init();
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.uid !== cfg.adminUid) throw new Error('Inicia sesión con la cuenta autorizada.');
  const token = await user.getIdToken();
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${cfg.url}/storage/v1/object/authenticated/${encodeURIComponent(cfg.bucket)}/${safePath}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': cfg.publishableKey, 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
      credentials: 'omit'
    });
  } catch {
    throw new Error('No fue posible contactar con Supabase. Comprueba Internet y permisos del navegador.');
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Acceso denegado en Supabase: verifica el rol authenticated y la política RLS.');
    }
    if (response.status === 404) throw new Error('No existe el documento en el bucket privado.');
    throw new Error(`Error de almacenamiento privado (HTTP ${response.status}).`);
  }
  const maximum = 5 * 1024 * 1024;
  const size = Number(response.headers.get('content-length'));
  if (Number.isFinite(size) && size > maximum) throw new Error('El archivo supera el límite de 5 MB.');
  const blob = await response.blob();
  if (blob.size > maximum) throw new Error('El archivo supera el límite de 5 MB.');
  return blob;
}

window.GDI_SUPABASE_STORAGE = Object.freeze({configured:isConfigured, downloadPrivate});
