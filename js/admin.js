/* Panel privado · no contiene credenciales ni permisos; Firebase Rules los verifican. */
(() => {
  'use strict';
  const $ = (sel,root=document)=>root.querySelector(sel);
  let all=[], selection=null, stopListening=null, previewURLs=[];
  const labels={new:'Nueva',review:'En revisión',approved:'Aprobada',rejected:'Rechazada',uploading:'Carga incompleta'};
  const keyLabel={photo:'Fotografía personal',license:'Licencia original',signature:'Firma'};
  const escDate=(v)=> v?.toDate ? v.toDate().toLocaleString('es-ES') : '—';
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
  function resetPreviews() { for (const u of previewURLs) URL.revokeObjectURL(u);previewURLs=[]; }
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
      const meta=document.createElement('small');meta.textContent=(x.data.packageCode==='premium'?'Premium · 28 idiomas':'Estándar · 8 idiomas')+' · '+escDate(x.data.createdAt);
      b.append(ref,bd,name,meta);b.addEventListener('click',()=>selectRequest(x.id));wrap.append(b);
    });
    if(selection){const x=all.find(r=>r.id===selection);if(x)renderDetail(x);else{$('#detailsContent').hidden=true;$('#detailsEmpty').hidden=false;selection=null;}}
  }
  function selectRequest(id){selection=id;$('#detailsEmpty').hidden=true;$('#detailsContent').hidden=false;resetPreviews();refresh();}
  function renderDetail(row){
    const d=row.data,p=d.personal||{},delivery=d.delivery||{};
    $('#detailReference').textContent='Solicitud #'+row.id;
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
      ['Método','Sberbank (RUB)'],['Referencia bancaria','Terminada en 9713'],['Declaración del cliente',d.paymentDeclared?'Indica que transfirió (sin verificar)':'No declaró transferencia'],
      ['Comprobación',d.paymentStatus==='verified'?'Verificada por administrador':'Pendiente de comprobación'],['Monto declarado',price(d.priceRUB)]]));
    $('#verifyPayment').disabled=d.paymentStatus==='verified'||d.status==='uploading';
    $('#markReview').disabled=d.status==='uploading';$('#approveRequest').disabled=d.status==='uploading';$('#rejectRequest').disabled=d.status==='uploading';
    $('#detailMessage').hidden=true;
    const grid=$('#documentGrid');grid.replaceChildren();
    for(const key of ['photo','license','signature']) {
      const path=d.files?.[key], card=document.createElement('div');card.className='document';
      const heading=document.createElement('h4');heading.textContent=keyLabel[key];
      const preview=document.createElement('div');preview.className='preview';preview.textContent=path?'Vista protegida':'Archivo pendiente';
      const buttons=document.createElement('div');buttons.className='document-actions';
      if(path){
        const show=document.createElement('button');show.className='outline';show.textContent='Ver';show.type='button';
        show.addEventListener('click',async()=>{
          show.disabled=true;preview.textContent='Cargando…';try{
            const blob=await window.GDI_DATA.loadPrivateFile(path);if(!blob.type.startsWith('image/')){preview.textContent='Documento PDF · usa Descargar';return;}
            const url=URL.createObjectURL(blob);previewURLs.push(url);
            const img=document.createElement('img');img.src=url;img.alt=keyLabel[key];preview.replaceChildren(img);
          }catch(e){preview.textContent='No se pudo abrir: '+e.message;}finally{show.disabled=false;}
        });buttons.append(show);
        const down=document.createElement('button');down.className='primary';down.type='button';down.textContent='Descargar';
        down.addEventListener('click',async()=>{down.disabled=true;try{const blob=await window.GDI_DATA.loadPrivateFile(path);download(blob,filenameFor(row,key,path));}catch(e){notice('No se pudo descargar el archivo: '+e.message);}finally{down.disabled=false;}});
        buttons.append(down);
      }
      card.append(heading,preview,buttons);grid.append(card);
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
  async function update(fields){if(!selection)return;for(const id of ['verifyPayment','markReview','approveRequest','rejectRequest'])$('#'+id).disabled=true;
    try{await window.GDI_DATA.updateAdmin(selection,fields);notice('Cambio guardado correctamente.');}
    catch(e){notice('No se pudo actualizar: '+e.message);}
    finally{const row=all.find(x=>x.id===selection);if(row)renderDetail(row);}
  }
  async function authorizedUI(user,isAdmin,error){
    if(!isAdmin){resetPreviews();stopListening?.();stopListening=null;all=[];selection=null;$('#adminWorkspace').hidden=true;$('#adminLogin').hidden=false;
      if(error)setLogin('Error al comprobar acceso: '+error.message,true);
      else if(!user)setLogin('Utiliza la cuenta de Google que tenga asignado el permiso de administrador.');
      else setLogin('Esta cuenta no tiene autorización de administrador. Contacta con el responsable de Firebase para asignar el rol.',true);
      $('#loginGoogle').hidden=!!user;$('#logoutDenied').hidden=!user;$('#adminIdentity').textContent=user?.email||'Acceso privado';return;
    }
    $('#adminIdentity').textContent=user.email||'Administrador';$('#adminLogin').hidden=true;$('#adminWorkspace').hidden=false;
    if(stopListening)return;
    try{stopListening=await window.GDI_DATA.listenAdmin((snapshot)=>{
      all=snapshot.docs.map(s=>({id:s.id,data:s.data()}));if(!selection && all.length)selection=all.find(x=>x.data.status!=='uploading')?.id||null;
      refresh();$('#detailsEmpty').hidden=!!selection;$('#detailsContent').hidden=!selection;
    },(e)=>{console.error(e);notice('Error al consultar solicitudes: '+e.message);});}
    catch(e){console.error(e);notice('No se pudo conectar con Firestore: '+e.message);}
  }
  async function start(){
    $('#loginGoogle').addEventListener('click',async()=>{$('#loginGoogle').disabled=true;try{await window.GDI_DATA.signInAdmin();}catch(e){setLogin('No se pudo iniciar sesión: '+e.message,true);}finally{$('#loginGoogle').disabled=false;}});
    for(const id of ['adminLogout','logoutDenied'])$('#'+id).addEventListener('click',()=>window.GDI_DATA.signOutAdmin().catch((e)=>setLogin(e.message,true)));
    $('#searchRequests').addEventListener('input',refresh);$('#filterStatus').addEventListener('change',refresh);
    $('#downloadAll').addEventListener('click',zipAll);
    $('#markReview').addEventListener('click',()=>update({status:'review'}));
    $('#approveRequest').addEventListener('click',()=>{if(confirm('¿Aprobar esta solicitud? No significa que el pago esté verificado.'))update({status:'approved'});});
    $('#rejectRequest').addEventListener('click',()=>{if(confirm('¿Rechazar esta solicitud?'))update({status:'rejected'});});
    $('#verifyPayment').addEventListener('click',()=>{if(confirm('¿Has comprobado personalmente que el dinero llegó a la cuenta bancaria?'))update({paymentStatus:'verified'});});
    if(!window.GDI_DATA?.configured){setLogin('Falta completar js/firebase-config.js y publicar las reglas de seguridad de Firebase.');return;}
    setLogin('Conectando con Firebase…');$('#loginGoogle').hidden=false;
    try{await window.GDI_DATA.watchAuth(authorizedUI);}catch(e){setLogin('No se pudo iniciar Firebase: '+e.message,true);}
  }
  // El módulo y el script clásico comparten la interfaz una vez cargados.
  window.addEventListener('gdi-admin-ready',start,{once:true});
})();
