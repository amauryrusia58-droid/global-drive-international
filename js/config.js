// El proyecto puede publicarse de inmediato como catálogo y formulario de prueba.
// Para recibir solicitudes REALES, establecer aquí un endpoint HTTPS seguro propio.
// Ese endpoint debe validar campos, precio y archivos en el servidor y proteger datos personales.
window.GDI_CONFIG = Object.freeze({
  submissionEndpoint: '',
  maxFileBytes: 10 * 1024 * 1024,
  pricesRUB: Object.freeze({
    standard: Object.freeze({1: 8300, 3: 8500, 5: 8800, 10: 9100, 20: 9900}),
    premium: Object.freeze({1: 9900, 3: 10300, 5: 10700, 10: 11100, 20: 13600})
  })
});
