export {};
// Global Drive International V10.1 - recepción pública sin Cloudflare.
// Desplegar como Supabase Edge Function con Verify JWT desactivado.
// No depende de sesión de usuario. Controles: validación de datos, archivos y antispam sencillo.
// Las claves de servidor SE QUEDAN en los secretos de Supabase Edge Functions.

const ORIGIN = Deno.env.get('GDI_PUBLIC_ORIGIN') || 'https://amauryrusia58-droid.github.io';
const API_BASE = Deno.env.get('SUPABASE_URL') || '';
const BACKEND_KEY = Deno.env.get('GDI_BACKEND_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const enabled = Deno.env.get('GDI_INTAKE_ENABLED') === 'true';
const BUCKET = 'documentos-clientes';
const MAX_FILE = 5 * 1024 * 1024;
const MAX_REQUEST = 16 * 1024 * 1024;

const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
};
function reply(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {status, headers: {...cors,'Content-Type':'application/json; charset=utf-8'}});
}
const trim=(v: unknown,limit=200)=>typeof v==='string'?v.trim().slice(0,limit):'';
const limited=(v: unknown,limit: number)=>typeof v==='string' && v.trim().length>0 && v.trim().length<=limit;
function exactDate(v:string) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'T00:00:00Z')); }
function extKind(blob:Uint8Array):'jpg'|'png'|'pdf'|null {
  if(blob.length>3 && blob[0]===0xff && blob[1]===0xd8 && blob[2]===0xff)return 'jpg';
  if(blob.length>8 && [137,80,78,71,13,10,26,10].every((v,i)=>blob[i]===v))return 'png';
  if(blob.length>5 && [37,80,68,70,45].every((v,i)=>blob[i]===v))return 'pdf';
  return null;
}
async function serverFetch(route:string,options:RequestInit={}) {
  return fetch(`${API_BASE}${route}`,{
    ...options,
    headers:{apikey:BACKEND_KEY,...(BACKEND_KEY.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${BACKEND_KEY}`}),...options.headers},
  });
}
function publicError(message:string) {return reply(400,{error:message});}

Deno.serve(async (req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply(405,{error:'Método no permitido.'});
  // El encabezado Origin reduce llamadas casuales cruzadas; NO constituye autenticación ni protección antibots.
  if(req.headers.get('origin')!==ORIGIN)return reply(403,{error:'Origen no autorizado.'});
  if(!enabled || !API_BASE || !BACKEND_KEY)
    return reply(503,{error:'Recepción temporalmente deshabilitada. No se ha enviado la solicitud.'});
  // Notificación del cliente, no confirmación bancaria. Sólo para solicitudes ya registradas.
  if(req.headers.get('content-type')?.startsWith('application/json')) {
    try {
      const message=await req.json();
      if(message?.action!=='declare_payment'||typeof message.requestId!=='string'||!/^[a-f0-9]{32}$/.test(message.requestId))
        return publicError('Notificación inválida.');
      const id=message.requestId;
      const lookup=await serverFetch('/rest/v1/gdi_public_submissions?id=eq.'+id+'&select=data');
      if(!lookup.ok)return reply(502,{error:'No se pudo consultar la solicitud.'});
      const records=await lookup.json();
      if(records.length!==1)return reply(404,{error:'Solicitud no encontrada.'});
      const data=records[0].data;
      if(!data || data.status==='uploading'||!data.files?.photo||!data.files?.license||!data.files?.signature)
        return reply(409,{error:'La solicitud todavía no está completa.'});
      if(data.paymentStatus==='confirmed'||data.paymentStatus==='paid')return reply(200,{status:'confirmed'});
      if(data.paymentDeclared===true)return reply(200,{status:'pending'});
      data.paymentDeclared=true;
      data.paymentStatus='pending_verification';
      data.paymentNotifiedAt=new Date().toISOString();
      data.updatedAt=data.paymentNotifiedAt;
      const update=await serverFetch('/rest/v1/gdi_public_submissions?id=eq.'+id+'&data-%3E%3EpaymentDeclared=eq.false',{
        method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},
        body:JSON.stringify({data,updated_at:data.updatedAt})
      });
      if(!update.ok)return reply(502,{error:'No se pudo registrar la notificación de pago.'});
      const changed=await update.json();
      if(changed.length!==1)return reply(409,{error:'El estado cambió. Consulta con soporte.'});
      return reply(200,{status:'pending'});
    } catch(err){console.error('Error al notificar pago',String(err));return reply(500,{error:'No se pudo registrar el aviso de pago.'});}
  }
  const contentType=req.headers.get('content-type')||'';
  if(!contentType.startsWith('multipart/form-data;'))return publicError('Formato de envío incorrecto.');
  const length=Number(req.headers.get('content-length')||0);
  if(length>MAX_REQUEST)return reply(413,{error:'El conjunto de documentos supera el tamaño admitido.'});

  try {
    // No confiar sólo en Content-Length: leer el cuerpo con tope incluso si un cliente omite ese encabezado.
    if(!req.body)return publicError('No se recibieron los documentos.');
    let received=0;const chunks:Uint8Array[]=[];
    const reader=req.body.getReader();
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      if(value){received+=value.byteLength;
        if(received>MAX_REQUEST){await reader.cancel();return reply(413,{error:'El conjunto de documentos supera el tamaño admitido.'});}
        chunks.push(value);
      }
    }
    const form=await new Response(new Blob(chunks,{type:contentType})).formData();
    // Trampa antispam invisible para los usuarios; por sí sola no sustituye un CAPTCHA.
    if(form.get('companyWebsite')!=='')return publicError('No se pudo aceptar la solicitud.');
    const raw=form.get('payload');
    const requestId=trim(form.get('requestId'),48);
    if(typeof raw!=='string'||raw.length>12000||!/^[a-f0-9]{32}$/.test(requestId))
      return publicError('Faltan datos para completar la solicitud.');

    let body:Record<string,unknown>;
    try {body=JSON.parse(raw);}catch{return publicError('Los datos del formulario no son válidos.');}
    if(!body || typeof body !== 'object' || Array.isArray(body))return publicError('Los datos del formulario no son válidos.');
    const personal=body.personal as Record<string,unknown>|undefined;
    const delivery=body.delivery as Record<string,unknown>|undefined;
    if(!personal||!delivery||typeof personal!=='object'||typeof delivery!=='object' || body.consent!==true)
      return publicError('Debes completar y aceptar la información de privacidad.');
    const requiredPersonal=['firstName','lastName','country','city','homeAddress','birthDate','birthCountry',
      'licenseNumber','licenseIssue','licenseExpiry','phone','email'];
    const requiredDelivery=['deliveryCountry','deliveryCity','deliveryAddress'];
    if(requiredPersonal.some(k=>!limited(personal[k],180))||requiredDelivery.some(k=>!limited(delivery[k],200)))
      return publicError('Completa todos los datos obligatorios.');
    const email=trim(personal.email,180).toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return publicError('El correo electrónico no es válido.');
    if(!['birthDate','licenseIssue','licenseExpiry'].every(k=>exactDate(trim(personal[k],20))))
      return publicError('Revisa las fechas de nacimiento y licencia.');
    if(trim(personal.licenseExpiry,20)<=trim(personal.licenseIssue,20))return publicError('La licencia debe vencer después de su emisión.');
    const packageCode=trim(body.packageCode,12);
    const years=Number(body.years);
    const priceTable:Record<string,Record<number,number>>={
      standard:{1:8300,3:8500,5:8800,10:9100,20:9900},
      premium:{1:9900,3:10300,5:10700,10:11100,20:13600}
    };
    if(!['standard','premium'].includes(packageCode)||!Number.isInteger(years)||!priceTable[packageCode]?.[years])
      return publicError('Selecciona un paquete y una duración válidos.');
    if(!Array.isArray(body.categories)||body.categories.length<1||body.categories.length>16||
       body.categories.some((c)=>typeof c!=='string'||c.trim().length===0||c.length>80))
      return publicError('Selecciona las categorías de licencia correspondientes.');
    const categories=[...new Set((body.categories as string[]).map(c=>c.trim()))];

    const blobs:Record<string,{data:Uint8Array;mime:string;ext:string}>={};
    for(const kind of ['photo','license','signature']){
      const file=form.get(kind);
      if(!(file instanceof File)||file.size<20||file.size>MAX_FILE)
        return publicError('Adjunta los tres archivos válidos (máximo 5 MB por archivo).');
      const data=new Uint8Array(await file.arrayBuffer());
      const ext=extKind(data);
      const accepts=kind==='license'?['jpg','pdf']:['jpg','png'];
      if(!ext||!accepts.includes(ext))return publicError('Formato de '+kind+' no admitido. Usa imágenes JPG/PNG o PDF según el campo.');
      const mime=ext==='jpg'?'image/jpeg':ext==='png'?'image/png':'application/pdf';
      blobs[kind]={data,mime,ext};
    }
    const now=new Date().toISOString();
    const cleanPersonal:Record<string,string>={};
    for(const key of [...requiredPersonal,'province','zip'])cleanPersonal[key]=trim(personal[key],200);
    cleanPersonal.email=email;
    const cleanDelivery:Record<string,string>={};
    for(const key of [...requiredDelivery,'deliveryZip','notes'])cleanDelivery[key]=trim(delivery[key],500);
    const data={source:'public',isTest:false,status:'uploading',paymentStatus:'pending',paymentDeclared:false,
      packageCode,years,priceRUB:priceTable[packageCode][years],categories,personal:cleanPersonal,delivery:cleanDelivery,
      files:{},createdAt:now,updatedAt:now};
    const insert=await serverFetch('/rest/v1/gdi_public_submissions',{
      method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({id:requestId,data,created_at:now,updated_at:now})
    });
    if(insert.status===409)return reply(409,{error:'Esta solicitud ya fue recibida o está incompleta. Contacta con soporte con la referencia antes de repetir.'});
    if(!insert.ok)return reply(502,{error:'No se pudo registrar la solicitud de forma segura.'});

    const folder=crypto.randomUUID().replaceAll('-','').slice(0,16);
    const saved:Record<string,string>={};
    try {
      for(const kind of ['photo','license','signature']){
        const b=blobs[kind],path=`submissions/${requestId}/${folder}/${kind}.${b.ext}`;
        const encoded=path.split('/').map(encodeURIComponent).join('/');
        const uploaded=await serverFetch(`/storage/v1/object/${BUCKET}/${encoded}`,{
          method:'POST',headers:{'Content-Type':b.mime,'x-upsert':'false'},body:b.data
        });
        if(!uploaded.ok)throw new Error('No se pudo almacenar el archivo '+kind+'.');
        saved[kind]=path;
      }
      data.files=saved;data.status='new';data.updatedAt=new Date().toISOString();
      const done=await serverFetch('/rest/v1/gdi_public_submissions?id=eq.'+requestId,{
        method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},
        body:JSON.stringify({data,updated_at:data.updatedAt})
      });
      if(!done.ok||(await done.json()).length!==1)throw new Error('No se pudo finalizar el registro de la solicitud.');
    } catch(error){
      // Mantener registro uploading para resolver los objetos subidos de forma parcial por el administrador.
      console.error('Intake incompleto',requestId,String(error));
      return reply(502,{error:'La solicitud quedó incompleta. Comunica esta referencia a soporte: '+requestId});
    }
    return reply(201,{reference:requestId,status:'received'});
  } catch(err){
    console.error('Intake falló',String(err));
    return reply(500,{error:'No se pudo completar el envío. Consulta con soporte antes de repetir la solicitud.'});
  }
});
