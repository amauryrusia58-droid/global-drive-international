# Global Drive International — conectar almacenamiento privado Supabase (V8)

## Configuración incluida
- Firebase Authentication / Firestore: proyecto `global-drive-international` y UID administrativo existente.
- Supabase URL: `https://pgozpyuganznlhtzkmtx.supabase.co`
- Clave **pública**: `sb_publishable_lLbwPl8_hNU43wrKLBtSVg_4vD9XpNV`
- Bucket privado: `documentos-clientes`, 5 MB/archivo, JPG/PNG/PDF.
- El botón de envío real del formulario **NO está habilitado**. El objetivo inmediato es conectar y comprobar las lecturas privadas del administrador.

## 1. Conceder el rol Firebase `authenticated` al administrador

Supabase necesita el custom claim de Firebase `role: 'authenticated'` para autorizar el acceso a Storage. La cuenta de Firebase ya existe, pero la conexión del proveedor no asigna ese rol automáticamente.

`admin-tools/set-admin.cjs` está preparado para asignar **`admin: true`** y **`role: 'authenticated'`** al UID del administrador (conserva los claims existentes), usando Firebase Admin SDK desde una máquina de confianza con las credenciales necesarias, nunca desde GitHub Pages.

Desde `admin-tools`, un administrador con credenciales adecuadas puede ejecutar:

```bash
npm install
node set-admin.cjs Tj2ACB3I9OWAa3uZS6uYGtAbxIR2
```

Requiere `GOOGLE_APPLICATION_CREDENTIALS` o credenciales locales compatibles con Firebase Admin SDK. **No compartas ni subas un JSON de cuenta de servicio.** Si ya existen claims, es obligatorio conservarlos. Cierra sesión en Firebase y vuelve a entrar para renovar el token.

## 2. Publicar solo una política de lectura

En Supabase > Global Drive International > SQL Editor abre el fichero `supabase-storage-admin-readonly.sql`, revísalo y ejecútalo SOLO si el UID coincide con el de tu administrador.

No añadas políticas `INSERT`, `UPDATE` ni `DELETE` todavía; **cero permisos de subida pública es intencionado**. Comprueba también que bucket `documentos-clientes` sigue como privado.

Esta política permite `SELECT` únicamente al usuario Firebase cuyo token tenga el UID esperado y el emisor del proyecto correcto, y cuya función de Postgres sea `authenticated`. No cambies `to authenticated` por `to anon`.

## 3. Probar primero con datos ficticios

El panel `admin.html` usa Firebase Authentication y Firestore para la lista y Supabase para descargar los archivos; no puede mostrar documentos hasta que existan solicitudes y los objetos tengan nombres/rutas que coincidan.

Para una prueba aislada, usar una cuenta de prueba y datos inventados, nunca licencias reales. Verifica: usuario sin autenticar (rechazado), UID diferente (rechazado), UID correcto con `role` (descarga permitida). Verifica que no se puedan hacer subidas ni listar documentos desde un cliente no autorizado.

## 4. Recepción de solicitudes (pendiente de implementación)

**No existe aún un servicio de recepción pública seguro.** La web bloquea el botón final y explica el motivo. Para completar la función es necesario programar un endpoint autenticado/captcha/verificado que acepte archivos, valide JPG/PNG/PDF, límite de 5 MB, coteje el importe de la solicitud y registre los metadatos de forma coherente en Firestore. Un proyecto en GitHub Pages por sí solo no puede custodiar claves de servicio.

No copies claves `secret`, `service_role` ni JSON de cuenta de servicio dentro de HTML/JavaScript o GitHub. Mantén la política de privacidad pendiente hasta definir responsable, contacto, retención y eliminación. No actives pagos ni declares pago confirmado sin verificación bancaria independiente.

## 5. Publicación de archivos web

Descomprime el ZIP; sube el contenido a la raíz del repositorio que contiene `index.html` y `admin.html`. Conserva una copia de respaldo y verifica el dominio/Pages antes de sustituir. Publicar el ZIP NO ejecuta la política SQL, NO establece claims en Firebase, NO crea reglas y NO recibe solicitudes reales.

**Fuentes oficiales**
- https://supabase.com/docs/guides/auth/third-party/firebase-auth
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/serving/downloads
