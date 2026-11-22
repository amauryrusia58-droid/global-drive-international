# Global Drive International · V8 Firebase + Supabase (preparación segura)

La V8 conserva el diseño aprobado: portada «Licencia Internacional de Conducir», paquetes blanco (8 idiomas) y azul (28 idiomas), duraciones 1/3/5/10/20 años, precios en RUB y formulario con selección múltiple de categorías, dirección particular y entrega, foto personal, firma y licencia original.

## Integración prevista
- **Firebase Authentication:** acceso del administrador por correo y contraseña.
- **Cloud Firestore:** lista de solicitudes y estados del panel; sigue sujeta a reglas que debes configurar/probar en Firebase.
- **Supabase Storage:** lectura privada para el administrador del bucket `documentos-clientes`, con token emitido por Firebase. Configuración pública incluida en `js/supabase-config.js`.
- **Panel:** `admin.html` continúa ofreciendo vista previa de documentos, descargas individuales y ZIP cuando haya solicitudes con archivos reales.
- **Seguridad:** `supabase-storage-admin-readonly.sql` limita la lectura a tu UID Firebase; no concede escrituras.

**No hay recepción pública de documentos ni pagos habilitados.** El formulario permite revisar y descargar un resumen, pero aún no transmite datos reales. Las claves de servicio, las políticas RLS y los claims no se publican/configuran automáticamente con el ZIP. No subas documentos sensibles hasta realizar pruebas y completar privacidad.

Para configurar y probar, lee primero **`PASOS-SUPABASE-V8.md`**.

## Precios aprobados (sin envío)

| Vigencia | Estándar blanco | Premium azul |
|---|---:|---:|
| 1 año | 8.300 ₽ | 9.900 ₽ |
| 3 años | 8.500 ₽ | 10.300 ₽ |
| 5 años | 8.800 ₽ | 10.700 ₽ |
| 10 años | 9.100 ₽ | 11.100 ₽ |
| 20 años | 9.900 ₽ | 13.600 ₽ |

**Nota:** el libreto de traducción es complementario a una licencia nacional válida; no sustituye ni extiende el permiso original ni garantiza aceptación en un país específico.
