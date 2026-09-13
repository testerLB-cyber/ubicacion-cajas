/* Entrada de compatibilidad · Control de Hojas de Servicio v104 ÚNICA */
(function(){
  if(window.__HS_V104_LOADER__) return;
  window.__HS_V104_LOADER__=true;
  // La carga completa de v104 se conserva sin cambios.
  if(!document.querySelector('script[data-hs-unit-trailer-v1]')){
    const s=document.createElement('script');
    s.src='assets/js/modules/service-sheets-unit-trailer-v1.js?v=20260913-1';
    s.dataset.hsUnitTrailerV1='1';
    s.onerror=e=>console.warn('No se pudo cargar Unidad/Remolque de Hojas',e);
    document.body.appendChild(s);
  }
  // Fix visible de catálogo Tipos de unidad + selector destacado en alta/edición de unidades.
  if(!document.querySelector('script[data-unit-types-fix-v1]')){
    const s2=document.createElement('script');
    s2.src='assets/js/modules/unit-types-catalog-fix-v1.js?v=20260913-1340';
    s2.dataset.unitTypesFixV1='1';
    s2.onerror=e=>console.warn('No se pudo cargar el catálogo de Tipos de unidad',e);
    document.body.appendChild(s2);
  }
})();