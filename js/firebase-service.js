/* Global Drive International · Firebase Authentication y Firestore.
   Los documentos privados se descargan de Supabase usando el token Firebase.
   Recepción pública desactivada hasta añadir un backend seguro de carga. */
const config = window.GDI_FIREBASE_CONFIG || {};
const readyToConfigure = ['apiKey', 'authDomain', 'projectId', 'appId']
  .every((k) => typeof config[k] === 'string' && config[k].trim().length > 0);
let active = null;
let pending = null;
const sdk = 'https://www.gstatic.com/firebasejs/13.4.0/';

const api = {
  configured: readyToConfigure,
  // Sólo se activa en index.html?test=1 y requiere sesión autenticada del administrador.
  receptionReady: new URLSearchParams(location.search).get('test') === '1',
  async init() {
    if (!readyToConfigure) throw new Error('Firebase no está configurado. Completa js/firebase-config.js.');
    if (active) return active;
    if (pending) return pending;
    pending = (async () => {
      const [app, authApi, fs] = await Promise.all([
        import(`${sdk}firebase-app.js`), import(`${sdk}firebase-auth.js`),
        import(`${sdk}firebase-firestore.js`)
      ]);
      const instance = app.initializeApp(config);
      const auth = authApi.getAuth(instance);
      const db = fs.getFirestore(instance);
      active = {auth,db,authApi,fs};
      return active;
    })();
    try { return await pending; } finally { pending = null; }
  },
  async submit(form, packageCode, years, categories, _paymentDeclared, onProgress) {
    if (!this.receptionReady) throw new Error('La recepción pública continúa desactivada.');
    const {auth,fs,db} = await this.init();
    // El modo de prueba exige el MISMO administrador autenticado del panel,
    // comprobado también por reglas Firestore y Supabase Storage.
    await auth.authStateReady();
    const user=auth.currentUser;
    if (!user || user.isAnonymous || user.uid !== config.adminUid)
      throw new Error('Abre admin.html, inicia sesión con tu administrador, y vuelve a este formulario de prueba.');
    const claims=await user.getIdTokenResult(true);
    if (claims.claims.role !== 'authenticated') throw new Error('Falta el rol authenticated en el token Firebase; cierra sesión y vuelve a entrar.');
    const prices=window.GDI_CONFIG.pricesRUB;
    if (!['standard','premium'].includes(packageCode) || ![1,3,5,10,20].includes(Number(years)))
      throw new Error('Selecciona un paquete y una duración válidos.');
    if (!Array.isArray(categories) || !categories.length || categories.length > 20)
      throw new Error('Selecciona las categorías de la licencia.');
    const field=(key)=>String(form.elements.namedItem(key)?.value ?? '').trim();
    const needed=['firstName','lastName','country','city','homeAddress','birthDate','birthCountry','licenseNumber',
      'licenseIssue','licenseExpiry','phone','email','deliveryCountry','deliveryCity','deliveryAddress'];
    if (needed.some(k=>!field(k))) throw new Error('Faltan campos obligatorios.');
    if (!form.elements.namedItem('privacyConsent')?.checked) throw new Error('Falta la confirmación del paso anterior.');
    const files=[['photo',form.elements.namedItem('photo')?.files?.[0]],
      ['license',form.elements.namedItem('licenseOriginal')?.files?.[0]],
      ['signature',form.elements.namedItem('signature')?.files?.[0]]];
    const allowed={photo:['image/jpeg','image/png'],license:['image/jpeg','application/pdf'],signature:['image/jpeg','image/png']};
    for(const [kind,file] of files) {
      if (!file || !allowed[kind].includes(file.type) || !file.size || file.size > 5*1024*1024)
        throw new Error('El archivo '+kind+' debe ser JPG/PNG o PDF según su tipo, hasta 5 MB.');
    }
    // Advertencia visible: se guardan SOLAMENTE datos de ensayo inventados.
    const personal={};
    for(const key of ['firstName','lastName','country','city','homeAddress','province','zip','birthDate','birthCountry',
      'licenseNumber','licenseIssue','licenseExpiry','phone','email']) personal[key]=field(key);
    const delivery={};
    for(const key of ['deliveryCountry','deliveryCity','deliveryAddress','deliveryZip','notes']) delivery[key]=field(key);
    const data={
      isTest:true, status:'uploading', paymentStatus:'pending', paymentDeclared:false,
      packageCode, years:Number(years), priceRUB:Number(prices[packageCode][years]),
      categories, personal, delivery, files:{},
      createdAt:fs.serverTimestamp(), updatedAt:fs.serverTimestamp()
    };
    onProgress?.('Registrando solicitud de prueba en Firestore…');
    const reference=await fs.addDoc(fs.collection(db,'submissions'),data);
    const folder=crypto.randomUUID().replaceAll('-','').slice(0,16);
    const stored={};
    try {
      const storage=window.GDI_SUPABASE_STORAGE;
      if (!storage?.configured) throw new Error('Supabase no está configurado.');
      for(const [kind,file] of files) {
        let ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'pdf';
        const path=`submissions/${reference.id}/${folder}/${kind}.${ext}`;
        await storage.uploadTestPrivate(path,file,onProgress);
        stored[kind]=path;
      }
      await fs.updateDoc(fs.doc(db,'submissions',reference.id),{
        files:stored, status:'new', updatedAt:fs.serverTimestamp()
      });
      return {reference:reference.id};
    } catch(e) {
      // Se conserva como 'uploading' para que el administrador identifique
      // el ensayo incompleto y pueda eliminar manualmente cualquier objeto huérfano.
      throw new Error('La prueba quedó incompleta (#'+reference.id+'): '+e.message);
    }
  },
  async signInAdmin(email, password) {
    const {auth,authApi} = await this.init();
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      throw new Error('Introduce correo electrónico y contraseña.');
    }
    // La contraseña se envía directamente a Firebase Auth, sin guardarla en JS/Firestore.
    const cred = await authApi.signInWithEmailAndPassword(auth, email.trim(), password);
    return cred;
  },
  async signOutAdmin() {
    const {auth,authApi} = await this.init();
    return authApi.signOut(auth);
  },
  async watchAuth(callback) {
    const {auth,authApi} = await this.init();
    return authApi.onAuthStateChanged(auth, async (user) => {
      if (!user) { callback(null, false); return; }
      try {
        const token = await authApi.getIdTokenResult(user, true);
        // La autorización real la imponen Firestore/Storage Rules.
        const sameUid = typeof config.adminUid === 'string'
          && config.adminUid.length > 0 && user.uid === config.adminUid;
        callback(user, token.claims.admin === true || sameUid);
      } catch (e) { callback(user, false, e); }
    });
  },
  async listenAdmin(callback, onError) {
    const {db,fs} = await this.init();
    return fs.onSnapshot(fs.query(fs.collection(db, 'submissions'), fs.orderBy('createdAt','desc'), fs.limit(200)), callback, onError);
  },
  async updateAdmin(id, fields) {
    const {db,fs} = await this.init();
    const safeFields = {};
    for (const k of ['status','paymentStatus','adminNote']) if (Object.hasOwn(fields,k)) safeFields[k] = fields[k];
    return fs.updateDoc(fs.doc(db, 'submissions', id), {...safeFields, updatedAt:fs.serverTimestamp()});
  },
  async loadPrivateFile(path) {
    if (!/^submissions\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/(photo|signature|license)\.(jpg|jpeg|png|pdf)$/.test(path || '')) throw new Error('Ruta de archivo no válida.');
    const gateway = window.GDI_SUPABASE_STORAGE;
    if (!gateway?.configured) throw new Error('Supabase no está configurado.');
    return gateway.downloadPrivate(path);
  }
};
window.GDI_DATA = api;
