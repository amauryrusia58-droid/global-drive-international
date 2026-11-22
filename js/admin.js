/* Panel privado · no contiene credenciales ni permisos; Firebase Rules los verifican. */
(() => {
  'use strict';
  const $ = (sel,root=document)=>root.querySelector(sel);
  let all=[], firestoreRows=[], publicRows=[], selection=null, stopListening=null, publicTimer=null, previewURLs=[], lastDetailFingerprint='';
  const labels={new:'Nueva',review:'En revisión',approved:'Aprobada',rejected:'Rechazada',uploading:'Carga incompleta'};
  const keyLabel={photo:'Fotografía personal',license:'Licencia original',signature:'Firma'};
let previewGeneration=0;
  const escDate=(v)=> {const date=v?.toDate ? v.toDate() : (typeof v==='string'||typeof v==='number' ? new Date(v) : null);return date&&!Number.isNaN(date.getTime())?date.toLocaleString('es-ES'):'—';};
  const price=(n)=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:0}).replace(/\u00a0/g,'.')+' ₽';
  const text=(v)=>String(v ?? '—');
  const notice=(message)=>{$('#detailMessage').textContent=message;$('#detailMessage').hidden=false;};
  function setLogin(message, failed=false) {
    $('#loginNotice').textContent=message;$('#loginNotice').style.background=failed?'#ffe9eb':'#f5ecff';
  }
  function buildDl(rows) {
    const frag=document.createDocumentFragment();
    for(const [k,v] of rows) {
      const row=document.createElement('div'), dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=k;dd.textContent=text(v);row.append(dt,dd);frag.append(row);
    }
    return frag;
  }
  function badge(status) {
    const b=document.createElement('span');b.className='status '+String(status||'');b.textContent=labels[status]||status||'—';return b;
  }
  function resetPreviews() { previewGeneration++;closeViewer();for (const u of previewURLs) URL.revokeObjectURL(u);previewURLs=[]; }
function closeViewer(){ const overlay=$('#gdiImageViewer'); if(overlay)overlay.hidden=true; }
function openViewer(src,alt){$('#gdiViewerImage').src=src;$('#gdiViewerImage').alt=alt;$('#gdiImageViewer').hidden=false;$('#gdiCloseViewer').focus();}
  function mergeSources() {
    all=[...firestoreRows,...publicRows].sort((a,b)=>{
      const stamp=(row)=>{const v=row.data.createdAt;return v?.toMillis?.() || new Date(v||0).getTime() || 0;};
      return stamp(b)-stamp(a);
    });
    if(!selection&&all.length)selection=all.find(x=>x.data.status!=='uploading')?.id||null;
    refresh();$('#detailsEmpty').hidden=!!selection;$('#detailsContent').hidden=!selection;
  }
  async function refreshPublic() {
    try { publicRows=await window.GDI_PUBLIC_ADMIN.list();mergeSources(); }
    catch(e) {console.error('Solicitudes públicas:',e);notice('Aviso: no se pudieron consultar las solicitudes públicas de Supabase: '+e.message);}
  }
  function refresh() {
    $('#countTotal').textContent=all.filter(x=>x.data.status!=='uploading').length;
    $('#countPending').textContent=all.filter(x=>x.data.status!=='uploading'&&x.data.paymentStatus!=='verified').length;
    $('#countApproved').textContent=all.filter(x=>x.data.status==='approved').length;
    $('#countReview').textContent=all.filter(x=>x.data.status==='review').length;
    const term=$('#searchRequests').value.trim().toLocaleLowerCase(), status=$('#filterStatus').value;
    const filtered=all.filter(x=>{
      if(status && x.data.status!==status)return false;
      const p=x.data.personal||{};
      return [x.id,p.firstName,p.lastName,p.email,p.phone].join(' ').toLocaleLowerCase().includes(term);
    });
    $('#listCount').textContent=filtered.length+' resultados';
    const wrap=$('#requestsList');wrap.replaceChildren();
    if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='No hay solicitudes que coincidan.';wrap.append(p);}
    filtered.forEach(x=>{
      const b=document.createElement('button');b.type='button';b.className='request-row'+(selection===x.id?' active':'');
      const p=x.data.personal||{};
      const ref=document.createElement('strong');ref.className='ref';ref.textContent='#'+x.id.slice(0,12);
      const bd=badge(x.data.status);const name=document.createElement('strong');name.textContent=[p.firstName,p.lastName].join(' ').trim()||'Sin nombre';
      const meta=document.createElement('small');meta.textContent=(x.data.isTest?'PRUEBA · ':'')+(x.data.packageCode==='premium'?'Premium · 28 idiomas':'Estándar · 8 idiomas')+' · '+escDate(x.data.createdAt);
      b.append(ref,bd,name,meta);b.addEventListener('click',()=>selectRequest(x.id));wrap.append(b);
    });
    if (selection) {
      const x=all.find(r=>r.id===selection);
      if(x) {
        // El filtro/buscador no debe reiniciar las vistas previas cada vez.
        const signature=selection+'|'+JSON.stringify(x.data);
        if(signature!==lastDetailFingerprint){lastDetailFingerprint=signature;renderDetail(x);}
      } else {
        $('#detailsContent').hidden=true;$('#detailsEmpty').hidden=false;
        selection=null;lastDetailFingerprint='';resetPreviews();
      }
    }
  }
  function selectRequest(id){
    if (selection===id) return;
    selection=id;lastDetailFingerprint='';
    $('#detailsEmpty').hidden=true;$('#detailsContent').hidden=false;
    $('#detailMessage').hidden=true;
    refresh();
  }
  function setActionButtons(d) {
    const incomplete=d.status==='uploading';
    $('#verifyPayment').disabled=!!d.isTest||d.source==='public'||d.paymentStatus==='verified'||incomplete;
    $('#markReview').disabled=incomplete||d.status==='review';
    $('#approveRequest').disabled=incomplete||d.status==='approved';
    $('#rejectRequest').disabled=incomplete||d.status==='rejected';
    // Aprobar una prueba solo cambia el estado en Firestore, nunca confirma pagos.
    $('#approveRequest').textContent=d.isTest?'✓ Aprobar prueba (sin pagos)':'✓ Aprobar solicitud';
  }
  function renderDetail(row){
    const d=row.data,p=d.personal||{},delivery=d.delivery||{};
    $('#detailReference').textContent='Solicitud #'+row.id+(d.isTest?' · PRUEBA INTERNA':'');
    $('#detailStatus').replaceWith((()=>{const b=badge(d.status);b.id='detailStatus';return b;})());
    $('#personalList').replaceChildren(buildDl([
      ['Nombre',p.firstName],['Apellidos',p.lastName],['País',p.country],['Ciudad',p.city],['Dirección particular',p.homeAddress],
      ['Provincia',p.province],['Código postal',p.zip],['Fecha de nacimiento',p.birthDate],['País de nacimiento',p.birthCountry],
      ['Número de licencia',p.licenseNumber],['Emisión de licencia',p.licenseIssue],['Vencimiento',p.licenseExpiry],
      ['Correo',p.email],['Teléfono',p.phone],['Recibida',escDate(d.createdAt)]]));
    $('#packageList').replaceChildren(buildDl([['Modelo',d.packageCode==='premium'?'Premium · azul · 28 idiomas':'Estándar · blanco · 8 idiomas'],['Duración',d.years+' año(s)']]));
    $('#detailPrice').textContent=price(d.priceRUB);
    $('#categoryList').replaceChildren(...(d.categories||[]).map(c=>{const s=document.createElement('span');s.textContent=c;return s;}));
    $('#deliveryList').replaceChildren(buildDl([['País',delivery.deliveryCountry],['Ciudad',delivery.deliveryCity],['Dirección',delivery.deliveryAddress],['Código postal',delivery.deliveryZip],['Observaciones',delivery.notes]]));
    $('#paymentList').replaceChildren(buildDl([
      ['Método','Sberbank (RUB) · no habilitado en recepción pública'],['Referencia bancaria','Terminada en 9713'],['Declaración del cliente',d.paymentDeclared?'Indica que transfirió (sin verificar)':'No declaró transferencia'],
      ['Comprobación',d.paymentStatus==='verified'?'Verificada por administrador':'Pendiente de comprobación'],['Monto declarado',price(d.priceRUB)]]));
    setActionButtons(d);
    resetPreviews();const currentGeneration=previewGeneration;
const grid=$('#documentGrid');grid.replaceChildren();
    for(const key of ['photo','license','signature']) {
      const path=d.files?.[key], card=document.createElement('div');card.className='document';
      const heading=document.createElement('h4');heading.textContent=keyLabel[key];
      const preview=document.createElement('div');preview.className='preview';
      preview.textContent=path?'Vista privada · cargando…':'Archivo pendiente';
      const buttons=document.createElement('div');buttons.className='document-actions';
      if(path) {
        // La variable debe declararse: antes 'showButton=show' provocaba ReferenceError.
        const show=document.createElement('button');
        show.className='outline';show.textContent='Ver';show.type='button';
        let previewUrl=null;
        const loadPreview=async(openAfter=false)=>{
          if(previewUrl){
            if(openAfter) openViewer(previewUrl,keyLabel[key]);
            return;
          }
          if(show.disabled) return;
          show.disabled=true;preview.textContent='Cargando…';
          try {
            const blob=await window.GDI_DATA.loadPrivateFile(path);
            if(currentGeneration!==previewGeneration || !preview.isConnected)return;
            const isImage=blob.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(path);
            if(!isImage){preview.textContent='Documento PDF · usa Descargar';return;}
            const url=URL.createObjectURL(blob);previewURLs.push(url);previewUrl=url;
            const img=document.createElement('img');img.src=url;img.alt=keyLabel[key];
            img.title='Ampliar imagen';img.loading='eager';
            img.addEventListener('click',()=>openViewer(url,keyLabel[key]));
            img.addEventListener('error',()=>{if(currentGeneration===previewGeneration)preview.textContent='No se pudo mostrar la vista previa. Usa Descargar.';});
            preview.replaceChildren(img);
            if(openAfter) openViewer(url,keyLabel[key]);
          } catch(e) {
            if(currentGeneration===previewGeneration && preview.isConnected)
              preview.textContent='No se pudo abrir: '+(e?.message||'Error de descarga');
          } finally {show.disabled=false;}
        };
        show.addEventListener('click',()=>loadPreview(true));buttons.append(show);
        const down=document.createElement('button');down.className='primary';down.type='button';down.textContent='Descargar';
        down.addEventListener('click',async()=>{
          down.disabled=true;
          try { const blob=await window.GDI_DATA.loadPrivateFile(path);download(blob,filenameFor(row,key,path)); }
          catch(e){notice('No se pudo descargar el archivo: '+e.message);}
          finally{down.disabled=false;}
        });
        buttons.append(down);
        // Carga privada automática, sin requerir que se pulse Ver.
        card.append(heading,preview,buttons);grid.append(card);
        queueMicrotask(()=>{if(card.isConnected && currentGeneration===previewGeneration)loadPreview(false);});
      } else {card.append(heading,preview,buttons);grid.append(card);}
    }
    $('#downloadAll').disabled=!d.files?.photo || !d.files?.signature || !d.files?.license;
  }
  function filenameFor(row,key,path){return row.id+'-'+key+'.'+String(path).split('.').pop().replace(/[^a-zA-Z0-9]/g,'');}
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60_000);}
  // ZIP mínimo sin compresión externa; los archivos se mantienen en su formato original.
  function makeZip(entries){
    const enc=new TextEncoder(),parts=[],central=[];let offset=0;
    const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0;}
    const crc=(a)=>{let v=0xffffffff;for(const b of a)v=table[(v^b)&255]^(v>>>8);return (v^0xffffffff)>>>0;};
    const w16=(d,v,o)=>d.setUint16(o,v,true),w32=(d,v,o)=>d.setUint32(o,v,true);
    for(const [name,raw] of entries){const nameBytes=enc.encode(name),bytes=new Uint8Array(raw),checksum=crc(bytes);
      const local=new Uint8Array(30+nameBytes.length),lv=new DataView(local.buffer);w32(lv,0x04034b50,0);w16(lv,20,4);w16(lv,0,6);w16(lv,0,8);w32(lv,checksum,14);w32(lv,bytes.length,18);w32(lv,bytes.length,22);w16(lv,nameBytes.length,26);local.set(nameBytes,30);
      const c=new Uint8Array(46+nameBytes.length),cv=new DataView(c.buffer);w32(cv,0x02014b50,0);w16(cv,20,4);w16(cv,20,6);w16(cv,0,8);w16(cv,0,10);w32(cv,checksum,16);w32(cv,bytes.length,20);w32(cv,bytes.length,24);w16(cv,nameBytes.length,28);w32(cv,offset,42);c.set(nameBytes,46);central.push(c);
      parts.push(local,bytes);offset+=local.length+bytes.length;
    }
    const centralLen=central.reduce((sum,a)=>sum+a.length,0);
    const tail=new Uint8Array(22),dv=new DataView(tail.buffer);w32(dv,0x06054b50,0);w16(dv,entries.length,8);w16(dv,entries.length,10);w32(dv,centralLen,12);w32(dv,offset,16);
    return new Blob([...parts,...central,tail],{type:'application/zip'});
  }
  async function zipAll(){const row=all.find(x=>x.id===selection);if(!row)return;const b=$('#downloadAll');b.disabled=true;const entries=[];
    try{for(const key of ['photo','license','signature']){const path=row.data.files?.[key];if(!path)throw new Error('Falta '+key);const data=await window.GDI_DATA.loadPrivateFile(path);entries.push([filenameFor(row,key,path),await data.arrayBuffer()]);}
      const json=new Blob([JSON.stringify({...row.data,createdAt:escDate(row.data.createdAt),updatedAt:escDate(row.data.updatedAt)},null,2)],{type:'application/json'});
      entries.push(['datos-solicitud.json',await json.arrayBuffer()]);download(makeZip(entries),'GlobalDrive-'+row.id+'.zip');notice('Se ha preparado el ZIP de esta solicitud.');
    }catch(e){notice('No se pudo preparar el ZIP: '+e.message);}finally{b.disabled=false;}
  }
  async function update(fields){
    const id=selection,row=all.find(x=>x.id===id);
    if(!id||!row)return;
    if(fields.status===row.data.status){notice('La solicitud ya tiene ese estado.');return;}
    for(const key of ['verifyPayment','markReview','approveRequest','rejectRequest'])$('#'+key).disabled=true;
    notice('Guardando cambio en '+(row.source==='supabase'?'Supabase':'Firebase')+'…');
    try {
      if(row.source==='supabase') await window.GDI_PUBLIC_ADMIN.update(id,fields);
      else await window.GDI_DATA.updateAdmin(id,fields);
      const current=all.find(x=>x.id===id);
      if(current){current.data={...current.data,...fields};lastDetailFingerprint='';refresh();}
      // V11.1: las aprobaciones de prueba internas envían aviso únicamente al
      // correo remitente de Brevo configurado en los secretos del servidor.
      // No se crean registros públicos ni se consumen los límites por IP/correo.
      const isApproval=fields.status==='approved';
      const testEmail=Boolean(row.data.isTest);
      if(isApproval && (testEmail || row.source==='supabase')){
        notice(testEmail
          ? 'Prueba aprobada. Comprobando correo de prueba del administrador…'
          : 'Solicitud aprobada. Comprobando envío del correo al cliente…');
        try {
          const {auth}=await window.GDI_DATA.init();
          if(!auth.currentUser)throw new Error('Debes iniciar sesión de administrador.');
          const token=await auth.currentUser.getIdToken();
          const cfg=window.GDI_SUPABASE_CONFIG;
          if(!cfg?.url||!cfg?.publishableKey)throw new Error('Falta la configuración pública de Supabase.');
          const response=await fetch(cfg.url+'/functions/v1/gdi-approval-email',{
            method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
            headers:{'Content-Type':'application/json',apikey:cfg.publishableKey,Authorization:'Bearer '+token},
            body:JSON.stringify(testEmail? {mode:'test',testRequestId:id}:{requestId:id})
          });
          let result={};try{result=await response.json();}catch{}
          if(!response.ok)throw new Error(result.error||'Error HTTP '+response.status);
          if(testEmail){
            if(result.status!=='test_sent')throw new Error('Brevo no confirmó la prueba.');
            notice('Prueba aprobada y correo de prueba aceptado por Brevo. Revisa tu correo remitente y la carpeta de spam. No se envió a un cliente.');
          }else{
            notice(result.status==='already_sent'
              ? 'Solicitud aprobada. El aviso ya había sido enviado a este cliente.'
              : result.status==='sent'
              ? 'Solicitud aprobada y aviso enviado por correo al cliente.'
              : 'Solicitud aprobada. El aviso de correo está pendiente de confirmación.');
          }
        }catch(emailError){
          console.error('No se pudo confirmar el aviso de aprobación:',emailError);
          notice((testEmail?'PRUEBA APROBADA':'SOLICITUD APROBADA')+', pero correo NO confirmado: '+
            (emailError.message||'error de red')+'. Revisa Logs de gdi-approval-email en Supabase.');
        }
      }else notice('Cambio de estado guardado correctamente.');
    } catch(e){
      console.error('No se pudo actualizar la solicitud:',e);
      const code=e?.code?' ('+e.code+')':'';
      notice('No se pudo actualizar'+code+': '+(e?.message||'Error desconocido')+'. No se cambió el estado.');
    } finally {
      const current=all.find(x=>x.id===id);
      if(current)setActionButtons(current.data);
    }
  }
  async function authorizedUI(user,isAdmin,error){
    if(!isAdmin){resetPreviews();stopListening?.();stopListening=null;if(publicTimer)clearInterval(publicTimer);publicTimer=null;firestoreRows=[];publicRows=[];all=[];selection=null;$('#adminWorkspace').hidden=true;$('#adminLogin').hidden=false;
      if(error)setLogin('Error al comprobar acceso: '+error.message,true);
      else if(!user)setLogin('Utiliza la cuenta de correo y contraseña que creaste en Firebase Authentication.');
      else setLogin('Esta cuenta no tiene autorización de administrador. Contacta con el responsable de Firebase para asignar el rol.',true);
      $('#adminLoginForm').hidden=!!user;$('#logoutDenied').hidden=!user;$('#adminIdentity').textContent=user?.email||'Acceso privado';return;
    }
    $('#adminIdentity').textContent=user.email||'Administrador';$('#adminLogin').hidden=true;$('#adminWorkspace').hidden=false;
    if(stopListening)return;
    try{stopListening=await window.GDI_DATA.listenAdmin((snapshot)=>{
      firestoreRows=snapshot.docs.map(s=>({id:s.id,data:s.data(),source:'firestore'}));
      mergeSources();
    },(e)=>{console.error(e);notice('Error al consultar solicitudes de Firebase: '+e.message);});}
    catch(e){console.error(e);notice('No se pudo conectar con Firestore: '+e.message);}
    await refreshPublic();
    if(!publicTimer)publicTimer=setInterval(refreshPublic,20000);
  }
  async function start(){
    $('#adminLoginForm').addEventListener('submit',async(event)=>{
      event.preventDefault();
      const button=$('#loginEmail');button.disabled=true;
      const password=$('#adminPassword').value;
      try { await window.GDI_DATA.signInAdmin($('#adminEmail').value,password); }
      catch(e) { setLogin('No se pudo iniciar sesión: revisa la cuenta, la contraseña y la conexión a Firebase ('+e.code+').',true); }
      finally { $('#adminPassword').value=''; button.disabled=false; }
    });
    for(const id of ['adminLogout','logoutDenied'])$('#'+id).addEventListener('click',()=>window.GDI_DATA.signOutAdmin().catch((e)=>setLogin(e.message,true)));
    $('#searchRequests').addEventListener('input',refresh);$('#filterStatus').addEventListener('change',refresh);
    $('#downloadAll').addEventListener('click',zipAll);
$('#gdiCloseViewer').addEventListener('click',closeViewer);
$('#gdiImageViewer').addEventListener('click',(e)=>{if(e.target.id==='gdiImageViewer')closeViewer();});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeViewer();});
    $('#markReview').addEventListener('click',()=>update({status:'review'}));
    $('#approveRequest').addEventListener('click',()=>{const r=all.find(x=>x.id===selection);const message=r?.data?.isTest?'¿Aprobar esta solicitud ficticia para comprobar el cambio de estado? No confirma ni cobra pagos.':'¿Aprobar esta solicitud? Esto NO significa que el pago esté verificado.';if(confirm(message))update({status:'approved'});});
    $('#rejectRequest').addEventListener('click',()=>{if(confirm('¿Rechazar esta solicitud?'))update({status:'rejected'});});
    $('#verifyPayment').addEventListener('click',()=>{if(confirm('¿Has comprobado personalmente que el dinero llegó a la cuenta bancaria?'))update({paymentStatus:'verified'});});
    if(!window.GDI_DATA?.configured){setLogin('Falta configurar la aplicación web en js/firebase-config.js.');return;}
    setLogin('Conectando con Firebase…');$('#adminLoginForm').hidden=false;
    try{await window.GDI_DATA.watchAuth(authorizedUI);}catch(e){setLogin('No se pudo iniciar Firebase: '+e.message,true);}
  }
  // El módulo y el script clásico comparten la interfaz una vez cargados.
  window.addEventListener('gdi-admin-ready',start,{once:true});
})();
