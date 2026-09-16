/* Tráfico App · API pública · Inventario · limpio v3 + documentos */
(function(){
  'use strict';
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};
  root.modules.inventario={
    name:'inventario',
    open(){
      const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));
      if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);
    },
    render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},
    edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);}
  };
  if(!document.querySelector('script[data-cc-inventory-unit-docs]')){
    const s=document.createElement('script');
    s.src='assets/js/modules/inventario-documentos-unidad-v1.js?v=20260917-docs-1';
    s.async=false;
    s.setAttribute('data-cc-inventory-unit-docs','1');
    document.head.appendChild(s);
  }
})();
