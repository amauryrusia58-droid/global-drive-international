# Global Drive International — Configuración del proyecto real

## Lo realizado en esta entrega V7
- Configuración **web** de Firebase conectada en `js/firebase-config.js` (identificador `global-drive-international`).
- Acceso del administrador cambiado a **correo y contraseña**, igual que el proveedor que ya habilitaste en Authentication.
- Módulo Firebase preparado para conectar con Firestore/Storage; NO se han tocado tus reglas remotas ni habilitado la recepción pública.
- UID del administrador configurado en la app y en las dos reglas locales; el UID fue facilitado por el titular y **aún no ha sido comprobado contra Firebase de forma remota**.
- `privacyApproved: false` y pagos bancarios desactivados para evitar solicitudes o transferencias antes de completar los preparativos.

## Paso siguiente: verificar autorización del administrador
1. El UID facilitado ya está incorporado en `js/firebase-config.js`, `firestore.rules` y `storage.rules`; **no hace falta copiarlo otra vez**.
2. Verifica en **Firebase → Authentication → Usuarios** que el UID de tu cuenta coincida exactamente.
3. Tus reglas remotas existentes **no se han modificado**. No publiques las nuevas reglas sin revisarlas y probarlas: incluyen permisos de creación anónima que deben mantenerse cerrados hasta implementar controles antispam y Storage.
4. Comprueba el acceso con tu cuenta usando `admin.html` bajo HTTPS; el panel puede estar vacío hasta recibir una solicitud de prueba.
5. Nunca compartas tu contraseña ni subas archivos de cuentas de servicio a GitHub.

## Activar la recepción de clientes (pendiente)
1. Firebase Authentication: habilita **Anónimo** además del correo/contraseña, únicamente cuando tengas listas las reglas y protección antiabuso.
2. Cloud Storage para Firebase: activar **Blaze** (plan de facturación por uso), crear bucket y revisar alertas presupuestarias.
3. Reglas: probar `firestore.rules` y `storage.rules`, que separan los documentos por dueño y restringen la bandeja al administrador. Las reglas del proyecto V6 **NO se han publicado por ChatGPT**.
4. Añadir el dominio autorizado en **Authentication → Configuración → Dominios autorizados**.
5. Completar `privacy.html` con datos legales, contacto, tiempos de conservación, derechos, etc.; configurar App Check y pruebas de abuso.
6. Confirmar primero con archivos ficticios que se guarden la foto, licencia original (frente), firma y datos en Firestore, y que puedas descargarlos desde `admin.html`.
7. Sólo después cambiar `privacyApproved` a `true` y, si procede, habilitar pagos verificados en `js/config.js`.

**Nota importante**: el botón «Enviar solicitud» seguirá desactivado a nivel funcional hasta completar lo anterior. Pegar `firebaseConfig` por sí solo no habilita Storage ni protege tus datos automáticamente.

**Importante sobre GitHub Pages**: la configuración web `apiKey` es pública por diseño; nunca subir contraseñas, tokens de cuenta de servicio ni claves privadas. Firebase Rules son el control de acceso verdadero.
