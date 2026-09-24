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

  /* Hojas web: selección de unidad, detección de Tracto-Camión y remolque obligatorio. */
  load('assets/js/modules/service-sheets-unit-trailer-v1.js?v=20260924-directcheck1','hojas-unidad-remolque');

  /* Catálogo maestro con edición protegida y revisión de impacto. */
  load('assets/js/modules/unit-types-catalog-fix-v1.js?v=20260913-integral2','tipos-unidad-seguros');

  /* Inventario usa el mismo tipo canónico que Anticipos y Hojas. */
  load('assets/js/modules/inventario-tipo-unidad-general.js?v=20260913-integral2','inventario-tipo-canonico');

  /* Anticipos: catálogos administrables, multi-concepto y tipo automático desde unidad. */
  load('assets/js/modules/anticipos-final-cleanup-v6.js?v=20260913-integral2','anticipos-integral');
})();
