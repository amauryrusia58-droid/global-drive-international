/* V10 · Lectura privada de nuevas solicitudes en Supabase.
   La política RLS limita todo al UID del administrador Firebase. */
(() => {
  'use strict';
  const c=window.GDI_SUPABASE_CONFIG||{};
  const valid=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url||'');
  async function headers() {
    const {auth}=await window.GDI_DATA.init();
    const user=auth.currentUser;
    if(!user || user.uid!==c.adminUid)throw new Error('Debes iniciar sesión con tu usuario administrador.');
    const token=await user.getIdToken();
    return {apikey:c.publishableKey,Authorization:`Bearer ${token}`};
  }
  async function list() {
    if(!valid) throw new Error('Supabase no está configurado.');
    const resp=await fetch(c.url+'/rest/v1/gdi_public_submissions?select=id,data,created_at&order=created_at.desc&limit=200',
      {headers:await headers(),cache:'no-store',credentials:'omit'});
    if(!resp.ok)throw new Error('No se pudieron cargar las solicitudes públicas (HTTP '+resp.status+').');
    const rows=await resp.json();
    if(!Array.isArray(rows))throw new Error('Respuesta inesperada de Supabase.');
    return rows.map(r=>({id:r.id,data:r.data||{},source:'supabase'}));
  }
  async function update(id,fields) {
    if(!/^[a-f0-9]{32}$/.test(id))throw new Error('Referencia de solicitud no válida.');
    const h=await headers();
    const url=c.url+'/rest/v1/gdi_public_submissions?id=eq.'+encodeURIComponent(id)+'&select=id,data';
    const current=await fetch(url,{headers:h,cache:'no-store',credentials:'omit'});
    if(!current.ok)throw new Error('No se pudo consultar la solicitud (HTTP '+current.status+').');
    const rows=await current.json();
    if(rows.length!==1)throw new Error('La solicitud no existe o no tienes permisos.');
    const updated={...rows[0].data};
    for(const key of ['status','adminNote','paymentStatus'])if(Object.hasOwn(fields,key))updated[key]=fields[key];
    updated.updatedAt=new Date().toISOString();
    const response=await fetch(url,{method:'PATCH',headers:{...h,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({data:updated,updated_at:new Date().toISOString()}),credentials:'omit',cache:'no-store'});
    if(!response.ok)throw new Error('No se pudo guardar el cambio de estado (HTTP '+response.status+').');
    const changed=await response.json();
    if(changed.length!==1)throw new Error('Supabase no confirmó la actualización.');
    return changed[0];
  }
  window.GDI_PUBLIC_ADMIN=Object.freeze({list,update});
})();
