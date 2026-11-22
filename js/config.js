// Configuración pública del catálogo de Global Drive International.
// Firebase Authentication y Firestore para el administrador; Supabase para documentos privados. Recepción real de clientes aún no disponible.
// No publicar credenciales privadas en estos archivos.
window.GDI_CONFIG = Object.freeze({
  // Número aportado por el titular para mostrarlo en la interfaz.
  // Atención: los datos se vuelven PÚBLICOS al publicar GitHub Pages.
  // El cobro permanece desactivado hasta verificar titular, autorizaciones y receptor HTTPS.
  sberbank: Object.freeze({ enabled: false, cardNumber: '2202 2088 0978 9713', recipientName: '' }),
  maxFileBytes: 5 * 1024 * 1024,
  pricesRUB: Object.freeze({
    standard: Object.freeze({1: 8300, 3: 8500, 5: 8800, 10: 9100, 20: 9900}),
    premium: Object.freeze({1: 9900, 3: 10300, 5: 10700, 10: 11100, 20: 13600})
  })
});
