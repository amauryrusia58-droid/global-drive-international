/* Global Drive International V10.1 · Recepción pública sin Cloudflare.
   No utiliza credenciales de administrador ni claves privadas en el navegador.
   Envío desactivado hasta que GDI_INTAKE_ENABLED sea true en Supabase y
   enabled sea true en js/public-config.js. */
(() => {
  'use strict';
  const cfg=window.GDI_PUBLIC_CONFIG||{};
  const validUrl=/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/gdi-public-intake$/.test(cfg.endpoint||'');
  const configured=Boolean(cfg.enabled && validUrl);
  let requestId=null;

  // Este campo no se muestra al cliente; sólo dificulta formularios automatizados muy simples.
  function installHoneypot(){
    const form=document.getElementById('requestForm');
    if(!form || form.elements.namedItem('companyWebsite'))return;
    const wrap=document.createElement('div');
    wrap.setAttribute('aria-hidden','true');
    wrap.style.cssText='position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;';
    const input=document.createElement('input');
    input.type='text';input.name='companyWebsite';input.tabIndex=-1;input.autocomplete='off';
    wrap.append(input);form.append(wrap);
  }
  const field=(form,name)=>String(form.elements.namedItem(name)?.value||'').trim();
  async function submit(form,packageCode,years,categories,_declared,onProgress) {
    if(!configured)throw new Error('El envío público todavía no está habilitado.');
    if(!requestId)requestId=crypto.randomUUID().replace(/-/g,'');
    const personal={},delivery={};
    for(const k of ['firstName','lastName','country','city','homeAddress','province','zip','birthDate','birthCountry',
      'licenseNumber','licenseIssue','licenseExpiry','phone','email'])personal[k]=field(form,k);
    for(const k of ['deliveryCountry','deliveryCity','deliveryAddress','deliveryZip','notes'])delivery[k]=field(form,k);
    const data={packageCode,years:Number(years),categories,personal,delivery,consent:!!form.elements.namedItem('privacyConsent')?.checked};
    const fd=new FormData();
    fd.set('payload',JSON.stringify(data));
    fd.set('requestId',requestId);
    fd.set('companyWebsite',field(form,'companyWebsite'));
    for(const [key,input] of [['photo','photo'],['license','licenseOriginal'],['signature','signature']]){
      const file=form.elements.namedItem(input)?.files?.[0];
      if(!file)throw new Error('Falta adjuntar: '+key);
      fd.append(key,file,file.name);
    }
    onProgress?.('Enviando la solicitud y tres documentos de forma privada…');
    let response;
    try {response=await fetch(cfg.endpoint,{method:'POST',body:fd,credentials:'omit',cache:'no-store',mode:'cors'});}
    catch {throw new Error('No fue posible conectar con el receptor. Verifica en el panel antes de repetir; puede haber un envío incompleto.');}
    let body={};try{body=await response.json();}catch{}
    if(!response.ok)throw new Error(typeof body.error==='string'?body.error:`Error HTTP ${response.status}`);
    if(!/^[a-f0-9]{32}$/.test(body.reference||''))throw new Error('No se pudo confirmar la referencia; contacta con soporte antes de repetir.');
    return {reference:body.reference};
  }
  async function notifyPayment(reference) {
    if(!configured || !/^[a-f0-9]{32}$/.test(reference))throw new Error('Referencia inválida.');
    const response=await fetch(cfg.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'declare_payment',requestId:reference}),cache:'no-store'});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||'No se pudo registrar el aviso.');
    return body;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHoneypot);
  else installHoneypot();
  window.GDI_PUBLIC_INTAKE=Object.freeze({configured,submit,notifyPayment});
})();
