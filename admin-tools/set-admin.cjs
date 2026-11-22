/* EJECUTAR ÚNICAMENTE EN EL EQUIPO DE ADMINISTRACIÓN CON GOOGLE_APPLICATION_CREDENTIALS.
   npm install && node set-admin.cjs <UID_DE_AUTHENTICATION>
   Nunca subir JSON de cuenta de servicio a GitHub. */
const admin = require('firebase-admin');
const uid = process.argv[2];
if (!uid || !/^[A-Za-z0-9_-]{8,128}$/.test(uid)) {
  console.error('Uso: node set-admin.cjs <UID_DE_AUTHENTICATION>'); process.exit(1);
}
admin.initializeApp({credential: admin.credential.applicationDefault()});
(async()=>{
  const user = await admin.auth().getUser(uid);
  const current = user.customClaims || {};
  await admin.auth().setCustomUserClaims(uid, {...current, admin:true, role:'authenticated'});
  console.log(`Claims admin:true y role:authenticated aplicadas al UID: ${uid}. Cierra sesión y vuelve a entrar para renovar el token.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
