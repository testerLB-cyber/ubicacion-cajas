/* Tráfico App · API pública · Inventario */
(function(){
  const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};
  function loadQr(){
    if(window.__CC_UNIT_QR_SYSTEM_V2__)return;
    if(document.querySelector('script[data-unit-qr-system-v2]'))return;
    const s=document.createElement('script');
    s.src='assets/js/modules/inventario-qr-system-v1.js?v=unit-qr-preview-print-v3-20260913-0003';
    s.dataset.unitQrSystemV2='1';
    s.onerror=e=>console.warn('No se pudo cargar sistema QR de unidades',e);
    document.body.appendChild(s);
  }
  root.modules.inventario={name:'inventario',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);},render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);}};
  loadQr();
})();