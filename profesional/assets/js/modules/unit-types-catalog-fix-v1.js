/* Tráfico App · Hotfix Inventario · 2026-09-13
   Desactiva el parche de catálogo maestro que provocaba un ciclo de
   MutationObserver al abrir los modales de alta/edición de unidades.
   El catálogo y los datos permanecen en Supabase; el flujo original de
   Inventario queda a cargo de control-cajas-core + tipo-unidad-general.
*/
(function(){
  if(window.__CC_UNIT_TYPES_FIX_V2__) return;
  window.__CC_UNIT_TYPES_FIX_V2__ = true;
  window.__CC_UNIT_TYPES_EDIT_HOTFIX__ = true;
})();
