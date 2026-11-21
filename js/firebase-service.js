/* Global Drive International · capa Firebase (Firebase JS SDK 13.4.0).
   Las decisiones de acceso se hacen en Firestore/Storage Rules, NO en el JS. */
const config = window.GDI_FIREBASE_CONFIG || {};
const readyToConfigure = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId']
  .every((k) => typeof config[k] === 'string' && config[k].trim().length > 0);
let active = null;
let pending = null;
const prices = window.GDI_CONFIG?.pricesRUB;
// La recepción debe permanecer inactiva hasta completar los datos del responsable de privacidad.
const privacyApproved = config.privacyApproved === true;
const sdk = 'https://www.gstatic.com/firebasejs/13.4.0/';

const api = {
  configured: readyToConfigure,
  receptionReady: readyToConfigure && privacyApproved,
  async init() {
    if (!readyToConfigure) throw new Error('Firebase no está configurado. Completa js/firebase-config.js.');
    if (active) return active;
    if (pending) return pending;
    pending = (async () => {
      const [app, authApi, fs, st] = await Promise.all([
        import(`${sdk}firebase-app.js`), import(`${sdk}firebase-auth.js`),
        import(`${sdk}firebase-firestore.js`), import(`${sdk}firebase-storage.js`)
      ]);
      const instance = app.initializeApp(config);
      const auth = authApi.getAuth(instance);
      const db = fs.getFirestore(instance);
      const storage = st.getStorage(instance);
      if (config.appCheckSiteKey) {
        const ac = await import(`${sdk}firebase-app-check.js`);
        ac.initializeAppCheck(instance, {
          provider: new ac.ReCaptchaV3Provider(config.appCheckSiteKey),
          isTokenAutoRefreshEnabled: true
        });
      }
      active = {auth,db,storage,authApi,fs,st};
      return active;
    })();
    try { return await pending; } finally { pending = null; }
  },
  async submit(form, pkg, year, categoryValues, paymentDeclared, progress) {
    if (!privacyApproved) throw new Error('La recepción permanece cerrada hasta configurar Storage, privacidad y reglas seguras.');
    const {auth,db,storage,authApi,fs,st} = await this.init();
    if (!auth.currentUser) await authApi.signInAnonymously(auth);
    const uid = auth.currentUser.uid;
    const price = prices?.[pkg]?.[year];
    if (!price) throw new Error('Paquete o período inválido.');
    const v = (field) => String(form.elements.namedItem(field)?.value || '').trim();
    const personal = {};
    for (const key of ['firstName','lastName','country','city','homeAddress','province','zip','birthDate','birthCountry','licenseNumber','licenseIssue','licenseExpiry','phone','email']) personal[key] = v(key);
    const delivery = {};
    for (const key of ['deliveryCountry','deliveryCity','deliveryAddress','deliveryZip','notes']) delivery[key] = v(key);
    const reference = fs.doc(fs.collection(db, 'submissions'));
    const docData = {
      ownerUid: uid, status: 'uploading', paymentStatus: 'unverified', paymentDeclared: Boolean(paymentDeclared),
      paymentMethod: 'sberbank', packageCode: pkg, years: Number(year), priceRUB: Number(price),
      categories: categoryValues, personal, delivery, files: {},
      createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp()
    };
    progress?.('Registrando solicitud de forma protegida…');
    await fs.setDoc(reference, docData);
    const files = {};
    for (const [name, field] of [['photo','photo'], ['signature','signature'], ['license','licenseOriginal']]) {
      const file = form.elements.namedItem(field)?.files?.[0];
      if (!file) throw new Error(`Falta adjuntar: ${name}.`);
      const ext = file.name.split('.').pop().toLowerCase();
      const allowed = name === 'license' ? ['jpg','jpeg','pdf'] : ['jpg','jpeg','png'];
      const mimeAllowed = name === 'license' ? ['image/jpeg','application/pdf'] : ['image/jpeg','image/png'];
      if (!allowed.includes(ext) || !mimeAllowed.includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) {
        throw new Error(`Archivo ${name} inválido: revisa formato y tamaño (máximo 10 MB).`);
      }
      const path = `submissions/${uid}/${reference.id}/${name}.${ext}`;
      progress?.(`Subiendo ${name === 'photo' ? 'fotografía' : name === 'signature' ? 'firma' : 'licencia original'}…`);
      await st.uploadBytes(st.ref(storage, path), file, {contentType: file.type});
      files[name] = path;
    }
    progress?.('Confirmando recepción de documentos…');
    await fs.updateDoc(reference, {files, status:'new', updatedAt: fs.serverTimestamp()});
    return {reference: reference.id, paymentVerified: false};
  },
  async signInAdmin(email, password) {
    const {auth,authApi} = await this.init();
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      throw new Error('Introduce correo electrónico y contraseña.');
    }
    // La contraseña se envía directamente a Firebase Auth, sin guardarla en JS/Firestore.
    return authApi.signInWithEmailAndPassword(auth, email.trim(), password);
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
    const {storage,st} = await this.init();
    return st.getBlob(st.ref(storage,path), 10 * 1024 * 1024 + 1);
  }
};
window.GDI_DATA = api;
