/* Entrada de compatibilidad · Hojas + Tipos + Anticipos · certificación 2026-09-13 */
(function(){
  if(window.__HS_CERTIFIED_LOADER_20260913__) return;
  window.__HS_CERTIFIED_LOADER_20260913__=true;

  function load(src,key){
    if(document.querySelector('script[data-certified="'+key+'"]'))return;
    const s=document.createElement('script');
    s.src=src;
    s.dataset.certified=key;
    s.onerror=e=>console.warn('No se pudo cargar '+key,e);
    document.body.appendChild(s);
  }

  /* Control de Hojas principal v104: carga única y protegida contra duplicados. */
  load('assets/js/modules/service-sheets-v104.js?v=20261003-folios-assign-fix2','hojas-v104-principal');

  /* Hojas web: selección de unidad, detección de Tracto-Camión y remolque obligatorio. */
  load('assets/js/modules/service-sheets-unit-trailer-v1.js?v=20260926-authunit2','hojas-unidad-remolque');

  /* Catálogo maestro con edición protegida y revisión de impacto. */
  load('assets/js/modules/unit-types-catalog-fix-v1.js?v=20260913-integral2','tipos-unidad-seguros');

  /* Inventario usa el mismo tipo canónico que Anticipos y Hojas. */
  load('assets/js/modules/inventario-tipo-unidad-general.js?v=20260913-integral2','inventario-tipo-canonico');

  /* Anticipos: catálogos administrables, multi-concepto y tipo automático desde unidad. */
  load('assets/js/modules/anticipos-final-cleanup-v6.js?v=20260913-integral2','anticipos-integral');

  /* Proformas: botón Texto en historial para copiar datos organizados a facturación. */
  load('assets/js/modules/service-sheets-proforma-texto-v1.js?v=20260930-1','proforma-texto-facturacion');

  /* Historial: edición completa de datos, remolque, aceptado por y evidencia. */
  load('assets/js/modules/service-sheets-history-full-edit-v1.js?v=20260930-1','hojas-historial-edicion-completa');
})();
