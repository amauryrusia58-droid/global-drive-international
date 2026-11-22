# Global Drive International — V9 · ensayo de recepción privado

Web HTML/CSS/JS preparada para GitHub Pages, con el catálogo, el formulario y el panel administrador.

Esta V9 añade un **modo de prueba restringido a la cuenta administradora** (`index.html?test=1`) que guarda datos ficticios en Firestore y archivos ficticios en Supabase Storage. No activa recepción real desde visitantes públicos. También muestra miniaturas completas y permite ampliar y descargar archivos en el panel.

## Instrucciones

Lee **`PASOS-PRUEBA-V9.md`** antes de publicar o probar. Para activar el envío de pruebas hay que ejecutar **`supabase-storage-admin-test-insert.sql`** en SQL Editor, una sola vez, manteniendo el bucket privado y las reglas actuales de Firestore.

No transferir dinero ni utilizar datos o documentos personales reales en este ensayo. No subir contraseñas ni secretos a GitHub.
