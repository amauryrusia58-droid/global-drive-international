/* admin.js (clásico) se carga antes de este módulo; este arranca el panel luego de firebase-service.js. */
await Promise.resolve();
window.dispatchEvent(new CustomEvent('gdi-admin-ready'));
