/* Configuración web (pública) de Firebase para Global Drive International.
   La clave apiKey identifica la app; NO es una credencial de administrador.
   Jamás incluir aquí contraseñas, tokens privados o cuentas de servicio. */
window.GDI_FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyDDVhtIvv6oj6yVjPtlheNqbXeFKJgI0iw',
  authDomain: 'global-drive-international.firebaseapp.com',
  projectId: 'global-drive-international',
  storageBucket: 'global-drive-international.firebasestorage.app',
  messagingSenderId: '529812313821',
  appId: '1:529812313821:web:281ce0d4b6f4510c24ad34',
  measurementId: 'G-J3FLJMB564',
  // Copiar ÚNICAMENTE el UID de Firebase Authentication (nunca la contraseña).
  // Debe coincidir con el UID en firestore.rules y storage.rules.
  adminUid: 'Tj2ACB3I9OWAa3uZS6uYGtAbxIR2',
  // Opcional: clave pública reCAPTCHA v3 para App Check.
  appCheckSiteKey: '',
  // NO activar hasta: política de privacidad, Storage Blaze, reglas probadas y App Check.
  privacyApproved: false
});
