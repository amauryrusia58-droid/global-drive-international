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
  receptionReady: false,
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
  async submit() {
    throw new Error('La recepción de solicitudes está desactivada: falta un servicio seguro de subida y validación. No se han enviado archivos ni datos.');
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
