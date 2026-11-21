# Global Drive International — Web y formulario de solicitudes

Versión de trabajo para GitHub Pages. Diseño responsive y flujo de solicitud en cuatro pasos, respetando las decisiones aprobadas.

## Contenido

- `index.html` — Portada con presentación de los dos libretos, los paquetes y los pasos del servicio. El formulario **no aparece dentro de la portada**, sino en un cuadro de diálogo al pulsar «Solicitar ahora» o «Solicitar este paquete».
- `css/styles.css` — Diseño azul oscuro y violeta, compatible con pantallas pequeñas.
- `js/config.js` — Lista editable de precios y configuración del receptor.
- `js/app.js` — Selección de paquete, cálculo inmediato de precios, campos, validación y resumen.
- `assets/` — Muestras visuales de los libretos y fotografía aportada como referencia.

## Precios aprobados — rublos rusos (RUB)

| Duración | Estándar / blanco / 8 idiomas | Premium / azul / 28 idiomas |
|---|---:|---:|
| 1 año | 8.300 ₽ | 9.900 ₽ |
| 3 años | 8.500 ₽ | 10.300 ₽ |
| 5 años | 8.800 ₽ | 10.700 ₽ |
| 10 años | 9.100 ₽ | 11.100 ₽ |
| 20 años | 9.900 ₽ | 13.600 ₽ |

Los precios representan el costo del libreto, **sin gastos de envío ni otras comisiones**. El precio final debe revisarse cuando varíe el costo de proveedor o la tasa de cambio. La duración del libreto no prorroga la licencia nacional ni garantiza aceptación en otro país.

## Formulario

1. El cliente selecciona tipo de libreto (blanco 8 idiomas, azul 28 idiomas) y duración (1, 3, 5, 10 o 20 años). El total cambia inmediatamente en RUB.
2. Introduce nombre, apellidos, país, ciudad, **dirección particular**, provincia/estado, código postal, nacimiento, licencia nacional, categorías, teléfono y correo.
3. Adjunta foto y firma (JPG/PNG), licencia **original** por delante y opcionalmente por detrás (JPG/PDF), y completa dirección de entrega o copia su dirección particular.
4. Revisa todo, acepta el tratamiento de datos y puede descargar un resumen local sin los archivos adjuntos.

Cada archivo admite hasta 10 MB. La validación del navegador es **solo auxiliar**; antes de poner el sistema en producción, los mismos requisitos deben comprobarse en el servidor.

## Publicación en GitHub Pages

1. Crea un repositorio nuevo o usa el proyecto existente de Global Drive International.
2. Descomprime este ZIP y sube **el contenido de la carpeta** a la raíz del repositorio, con `index.html` en el nivel superior.
3. Ve a **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Selecciona `main` y la carpeta `/(root)`; guarda y abre la dirección de Pages que te indique GitHub.
5. Comprueba desde un ordenador y un móvil que se muestran los dos paquetes y abre el formulario.

Si tu repositorio ya tiene archivos y configuración especial, **haz una copia de seguridad** y revisa las diferencias antes de reemplazar su contenido.

## Importante: recepción real de solicitudes todavía NO configurada

Esta versión funciona para explorar el catálogo, elegir el precio, completar campos, adjuntar documentos **en la sesión del navegador**, revisar los datos y descargar un resumen. El botón «Enviar solicitud» indica expresamente que **no se ha enviado** nada si no hay un receptor configurado; no guarda datos en una base ni sube documentos a Internet.

Para habilitar solicitudes reales:

- Configura `submissionEndpoint` en `js/config.js` con una URL **HTTPS** de tu servidor o función segura.
- El servidor debe aceptar `POST` `multipart/form-data`, validar los archivos, revalidar el precio a partir de los IDs del paquete y la duración (sin confiar en `quotedPriceRUB`), procesar las solicitudes y devolver una respuesta JSON **solo cuando la solicitud se haya guardado**, por ejemplo `{ "accepted": true, "reference": "GDI-2026-0001" }`.
- Implementa restricciones de tamaño y formato **en el servidor**, autenticación administrativa, controles de acceso, cifrado, protección anti-abuso, política de privacidad y normas de conservación/eliminación de documentos.
- No alojes fotos, firmas ni licencias de clientes en un repositorio público ni las almacenes directamente en archivos de GitHub Pages.
- Publica claramente quién presta el servicio, qué documento se entrega y cuáles son sus límites legales. Las muestras de IAA son imágenes de referencia; evita hacer afirmaciones de afiliación o autoridad que no estén acreditadas.

**No hay integración con Firebase en esta entrega**, porque no se proporcionó la configuración de un proyecto y las reglas seguras para almacenar documentos. Configurar la recepción y las reglas es imprescindible antes de aceptar datos personales reales.
