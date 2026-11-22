# Global Drive International · V9: prueba interna de recepción

**Esta versión NO activa la recepción pública de clientes.** Permite que TÚ, usando la sesión de administrador, pruebes el mismo formulario con datos y archivos completamente ficticios. El sistema guarda la prueba en **Firebase Firestore** y las tres imágenes en **Supabase Storage privado**; luego aparecen en el panel de administración. No solicita cobro ni verifica pagos.

## Antes de probar

1. Conserva las reglas Firestore que ya autorizan solamente tu UID como administrador. No abras lectura/escritura pública.
2. En Supabase > Global Drive International > SQL Editor, ejecuta **una sola vez** `supabase-storage-admin-test-insert.sql`. Concede solamente a tu UID de Firebase permiso `INSERT` en `documentos-clientes`, bajo `submissions/...`. La política `gdi_admin_read_only` de lectura existente se conserva. No selecciones ninguna opción para hacer público el bucket.
3. Sube los archivos descomprimidos del ZIP a la raíz de GitHub Pages. Asegúrate de incluir `js/supabase-storage.js`, `js/firebase-service.js`, `js/app.js`, ambos HTML y las CSS. Comprueba que terminó el despliegue.

## Prueba real de extremo a extremo, SIN DATOS REALES

1. Abre `admin.html`, inicia sesión con el administrador de Firebase y déjala iniciada.
2. Abre **en ese mismo navegador y perfil** la URL `index.html?test=1` de tu GitHub Pages. Aparece una banda amarilla **PRUEBA INTERNA — SIN PAGOS**.
3. Pulsa *Solicitar ahora* y rellena todos los pasos con información **ficticia**, seleccionando un paquete y varias categorías. Adjunta tres imágenes JPG/PNG/PDF de prueba: `photo`, `license`, `signature`, hasta 5 MB por archivo. No uses documentos ni fotos de personas reales, ni transfieras dinero.
4. Acepta el paso de revisión y pulsa **Enviar solicitud de prueba**. La web crea el documento Firestore en `submissions` con `isTest: true`, `paymentStatus: pending`, y sube las tres imágenes privadas a `documentos-clientes/submissions/<id>/<nonce>/`.
5. En `admin.html` verás una nueva solicitud, con las tres imágenes completas cargadas como miniaturas. Puedes pulsarlas para ampliar y usar *Descargar* o *Descargar todo (ZIP)*.

Si aparece *Acceso denegado* al subir, comprueba que el rol `authenticated` esté en el token Firebase, vuelve a iniciar sesión y verifica la política de **INSERT**. Si la carga se interrumpe, el registro quedará con estado `uploading`/«Carga incompleta»; NO repitas sin comprobar si ya se creó. No elimines pruebas anteriores sin antes confirmar sus identificadores.

**NO permite** que un visitante sin cuenta suba archivos: para ello falta un backend de recepción con validaciones, defensa antispam (por ejemplo Turnstile), límites, privacidad y gestión de retención. Esta versión NO contiene `service_role`, claves secretas ni cuentas de servicio de Firebase en código público.

**Precio mostrado:** Estándar 8 idiomas y Premium 28 idiomas, 1/3/5/10/20 años; precios originales aprobados. **No pagos reales.**
