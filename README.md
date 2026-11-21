# Global Drive International — Web + recepción Firebase + panel privado

**Entrega preparada para configuración, no conectada aún a una cuenta Firebase real.**

Este proyecto conserva el diseño aprobado de Global Drive International y añade:

- `index.html`: portada, dos paquetes, diez precios RUB y formulario de cinco pasos.
- `admin.html`: panel privado para consultar solicitudes, pagos declarados y archivos.
- `js/app.js`: formulario, categorías múltiples, direcciones, revisión y pago Sberbank.
- `js/firebase-service.js`: Firebase Authentication, Firestore, Storage y subida de archivos.
- `js/admin.js`: bandeja de solicitudes, estados, visualización y descarga de archivos, ZIP local.
- `js/firebase-config.js`: **único sitio para completar la configuración pública del proyecto**.
- `firestore.rules` y `storage.rules`: normas de acceso por propietario y rol admin.
- `firebase.json`: reglas para despliegue con Firebase CLI.
- `admin-tools/set-admin.cjs`: script para conceder el rol `admin` con privilegios de servidor.
- `privacy.html`: **plantilla por completar antes de aceptar datos reales**.
- `storage-cors.example.json`: ejemplo de CORS para descargar archivos protegidos desde GitHub Pages.

## Opciones de precio confirmadas (sin envío)

| Vigencia | Estándar blanco (8 idiomas) | Premium azul (28 idiomas) |
| --- | ---: | ---: |
| 1 año | 8.300 ₽ | 9.900 ₽ |
| 3 años | 8.500 ₽ | 10.300 ₽ |
| 5 años | 8.800 ₽ | 10.700 ₽ |
| 10 años | 9.100 ₽ | 11.100 ₽ |
| 20 años | 9.900 ₽ | 13.600 ₽ |

La vigencia del libreto no amplía la de una licencia nacional, y la aceptación depende del país. Los precios se validan de nuevo en reglas Firestore (no solo en el navegador). **Al cambiar precios en `js/config.js`, es obligatorio actualizar `firestore.rules` también.**

## Solicitud del cliente

El cliente elige paquete y duración, marca **varias categorías**, completa nombre, apellidos, país, ciudad, **dirección particular**, fecha de nacimiento, datos de licencia nacional, contacto, y dirección de entrega; también adjunta **foto personal, firma y fotografía de la licencia original (una sola cara)**. Foto y firma admiten JPG/PNG, licencia JPG/PDF, tamaño máximo 10 MB por archivo. Todos los datos de texto se guardan en Firestore; los archivos se guardan en **Cloud Storage para Firebase** (no GitHub).

Al pulsar «Enviar solicitud para revisión», si la plataforma está habilitada, se crea una referencia en Firestore, se cargan tres archivos a Storage y, solo tras terminar todas las cargas, se marca `new`. Los campos `paymentDeclared` y `paymentStatus` se almacenan por separado: el administrador debe comprobar el ingreso **directamente en el banco** antes de marcarlo como verificado. La tarjeta Sberbank terminada en **9713** sigue mostrándose **sin pagos habilitados** (`sberbank.enabled: false`), hasta verificar titularidad y requisitos bancarios.

## Preparación obligatoria antes de recibir documentos personales

### 1) Crear o seleccionar el proyecto Firebase

1. Abre https://console.firebase.google.com y selecciona un proyecto de Firebase de uso propio.
2. En **Configuración del proyecto → Tus apps**, registra una aplicación web y copia sus campos públicos (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`) a `js/firebase-config.js`.
3. En **Authentication → Sign-in method**, habilita **Anónimo** (para que los clientes no necesiten crear cuentas) y **Google** (para el administrador).
4. En **Authentication → Settings → Authorized domains**, añade el dominio exacto de GitHub Pages o tu dominio propio, sin inventar URLs.
5. Crea la base **Cloud Firestore** en modo seguro; crea **Cloud Storage para Firebase** (puede necesitar plan de facturación habilitado). No utilices «reglas abiertas».

### 2) Publicar las reglas

**Copia las reglas completas** a Firebase Console → Firestore → Rules y Storage → Rules, y pulsa publicar, o utiliza la Firebase CLI desde la carpeta del proyecto:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,storage
```

El despliegue requiere seleccionar **tu proyecto correcto**. Al usar `firestore.get` desde reglas de Storage, Firebase puede pedir permiso para que Cloud Storage consulte Firestore: habilítalo desde la consola si aparece.

**No publiques el sitio para clientes reales mientras las reglas de seguridad no estén comprobadas.** Prueba que un usuario anónimo no pueda leer documentos de otros usuarios y que una cuenta normal no pueda abrir la bandeja administrativa.

### 3) Autorizar tu cuenta de administrador

1. Visita la página `admin.html` publicada e inicia sesión con Google (primero el proveedor Google debe estar habilitado). Aparecerá «esta cuenta no tiene autorización» hasta completar el siguiente paso.
2. Copia el **UID** exacto de esa cuenta desde Firebase Console → Authentication → Users.
3. Ejecuta en un ordenador con **credenciales de servidor** de Firebase Admin SDK, desde `admin-tools/`:

```bash
npm install
# Configura GOOGLE_APPLICATION_CREDENTIALS con el archivo de cuenta de servicio,
# guardado únicamente en tu equipo, NUNCA en el ZIP, repo o chat.
node set-admin.cjs UID_DE_AUTHENTICATION
```

4. Cierra sesión y entra de nuevo en `admin.html`. El script crea el custom claim `admin: true`, que las reglas verificarán en cada petición. Activa la verificación en dos pasos en la cuenta de Google administradora.

**Nunca pongas una clave privada, contraseña, token de servicio, JSON de cuenta de servicio o credential de Admin SDK dentro de GitHub Pages o de `js/firebase-config.js`.** La configuración web `apiKey` de Firebase no es una credencial de administrador: la seguridad depende de las reglas y de los tokens autenticados.

### 4) Configurar los dominios y descargar documentos

Las descargas de documentos protegidos se realizan con el SDK de Storage `getBlob`, que consulta las reglas de lectura y devuelve el contenido al navegador **sin enlaces públicos permanentes**. El bucket puede necesitar configuración CORS para los orígenes HTTPS de la página de GitHub o el dominio propio. Sustituye los dominios de ejemplo en `storage-cors.example.json` y aplícalos con Google Cloud CLI al bucket real, según la documentación de Google Cloud:

```bash
gcloud storage buckets update gs://TU_BUCKET_REAL --cors-file=storage-cors.example.json
```

CORS **no** sustituye a las reglas de seguridad.

### 5) Privacidad y protección contra abuso

1. Completa `privacy.html`: identidad legal y contacto del responsable, base legal del tratamiento, finalidad, retención, posibilidad de eliminación, tratamiento internacional y derechos de los usuarios.
2. Publica la información de privacidad adecuada a los países donde prestes servicio.
3. Configura **App Check / reCAPTCHA** (clave pública de sitio en `appCheckSiteKey`) y activa su exigencia en Firebase para Firestore/Storage cuando esté comprobado. Evalúa límites de abuso, costos y procedimientos para eliminar cargas incompletas; la autenticación anónima por sí sola no evita ataques automáticos.
4. **Solo después** de probar las reglas y completar la información de privacidad, cambia `privacyApproved: false` a `true` en `js/firebase-config.js` para permitir la recepción real. El archivo queda en `false` de fábrica, por seguridad.
5. Haz una prueba con archivos ficticios, sin datos reales: comprueba que aparezcan en `admin.html`, que los tres se vean, que el ZIP se descargue y que los estados cambien. Después borra los datos ficticios desde Firebase Console.

## Funcionamiento del panel

`admin.html` contiene: lista de solicitudes recibidas, búsqueda, filtro de estados, datos personales, categorías múltiples, paquete y duración, dirección de entrega, foto, licencia original y **firma**. Tiene botón **Ver** y **Descargar** por cada archivo, y **Descargar todo (ZIP)** con los tres documentos y el resumen de datos. Los botones de gestión permiten «Marcar en revisión», «Aprobar», «Rechazar» y «Marcar pago como verificado»; el pago **nunca** se considera comprobado por el hecho de que el cliente marque la casilla.

Los documentos privados no se copian a repositorios ni se incluyen en informes públicos. `admin.html` puede tener una URL pública, pero las reglas restringen sus datos y archivos a usuarios con el custom claim `admin`.

## Publicación GitHub Pages

Descomprime y sube **los archivos dentro de la carpeta** a la raíz del repositorio (con `index.html` a nivel superior). GitHub → Settings → Pages → Deploy from a branch → `main`/`(root)`. Conserva cualquier configuración especial de tu dominio y haz copia de seguridad antes de reemplazar archivos existentes.

## Limitaciones y pendientes

- Esta entrega **NO** está conectada a una cuenta Firebase activa: no se han proporcionado credenciales públicas de configuración ni permisos para publicar reglas.
- Las reglas están preparadas, pero **no se han desplegado ni probado contra un emulador/entorno Firebase propio**: probarlas antes de permitir documentos reales.
- No hay confirmación bancaria automática. La cuenta Sberbank debe verificarse antes de habilitar cobros.
- La eliminación programada de archivos/datos y los mecanismos de recuperación de cargas interrumpidas quedan pendientes de una configuración operativa antes del lanzamiento.
- Para habilitar las descargas protegidas, revisar CORS del bucket. Usa los dominios reales del sitio.
- El panel recupera inicialmente las **200 solicitudes más recientes**; si crece el volumen, añadir paginación.
