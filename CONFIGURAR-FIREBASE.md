# Global Drive International — Configuración del proyecto real

## Lo realizado en esta entrega V6
- Configuración **web** de Firebase conectada en `js/firebase-config.js` (identificador `global-drive-international`).
- Acceso del administrador cambiado a **correo y contraseña**, igual que el proveedor que ya habilitaste en Authentication.
- Módulo Firebase preparado para conectar con Firestore/Storage; NO se han tocado tus reglas remotas ni habilitado la recepción pública.
- `privacyApproved: false`, pagos bancarios desactivados y `adminUid` sin completar para no abrir acceso sin verificarlo.

## Paso siguiente: copiar el UID
1. Abre **Firebase → Authentication → Usuarios**.
2. Copia el UID completo del usuario administrador que ya creaste.
3. Pega ese UID en `js/firebase-config.js` (`adminUid`) y sustituye el texto `REEMPLAZAR_CON_UID_DE_AUTHENTICATION` por el mismo UID en **`firestore.rules` y `storage.rules`**.
4. **No publiques todavía las reglas nuevas** hasta que estén terminadas y revisadas (las actuales ya limitan el acceso a tu UID).
5. No compartas la contraseña con nadie ni la escribas en código o archivos públicos.

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
