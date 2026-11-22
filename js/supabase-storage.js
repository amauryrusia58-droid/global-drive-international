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


// SOLO para la prueba interna: el backend exige identidad Firebase del administrador
// y una política INSERT adicional, restrictiva, en Supabase Storage.
async function uploadTestPrivate(path, file, onProgress) {
  if (!isConfigured || !filePathPattern.test(path || '')) throw new Error('Ruta de prueba no válida.');
  if (file.size > 5 * 1024 * 1024 || !file.size) throw new Error('El archivo debe tener entre 1 byte y 5 MB.');
  const ext = path.split('.').pop();
  const types = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',pdf:'application/pdf'};
  if (file.type !== types[ext]) throw new Error('El formato no coincide con la extensión del archivo.');
  if (/(photo|signature)\.pdf$/.test(path) || /license\.png$/.test(path)) throw new Error('Formato no permitido para este documento.');
  const {auth} = await window.GDI_DATA.init();
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.uid !== cfg.adminUid) throw new Error('Primero inicia sesión con el administrador en admin.html.');
  const token = await user.getIdToken(true);
  const url = `${cfg.url}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  onProgress?.('Subiendo ' + path.split('/').pop() + ' de forma privada…');
  const resp = await fetch(url, {
    method:'POST', headers: {
      apikey:cfg.publishableKey, Authorization:`Bearer ${token}`,
      'Content-Type':file.type, 'cache-control':'0', 'x-upsert':'false'
    }, body:file, credentials:'omit', cache:'no-store'
  });
  if (!resp.ok) {
    if ([401,403].includes(resp.status)) throw new Error('Subida privada denegada: comprueba la política INSERT y la sesión Firebase.');
    if (resp.status === 413) throw new Error('El archivo es demasiado grande.');
    throw new Error('Error al subir el archivo (HTTP ' + resp.status + ').');
  }
  return path;
}
window.GDI_SUPABASE_STORAGE = Object.freeze({configured:isConfigured, downloadPrivate, uploadTestPrivate});
