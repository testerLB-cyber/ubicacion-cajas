/* Tráfico App · Inventario · módulo estable limpio */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};

  function loadQrSystem(){
    if(window.__CC_UNIT_QR_SYSTEM_V1__) return;
    if(document.querySelector('script[data-unit-qr-system-v1]')) return;
    const s=document.createElement('script');
    s.src='assets/js/modules/inventario-qr-system-v1.js?v=unit-qr-rebuild-v1-20260912-2338';
    s.dataset.unitQrSystemV1='1';
    s.onerror=e=>console.warn('No se pudo cargar el sistema QR de unidades',e);
    document.body.appendChild(s);
  }

  function compactarAcciones(){
    const body=document.getElementById('ccInventarioBody');
    if(!body)return;
    body.querySelectorAll('tr').forEach(tr=>{
      const acciones=tr.querySelector('td:last-child');
      if(!acciones)return;
      acciones.querySelectorAll('button[data-inventario-qr="1"],button[data-qr-catalogo="1"]').forEach(b=>b.remove());
      const mantenimiento=acciones.querySelector('.cc-btn-maintenance');
      if(mantenimiento){
        mantenimiento.innerHTML='<i class="fa-solid fa-triangle-exclamation mr-1"></i>Mantenimiento';
        mantenimiento.title='Poner unidad en mantenimiento / fuera de servicio';
        mantenimiento.style.padding='5px 8px';
        mantenimiento.style.fontSize='9px';
      }
      const dot=acciones.querySelector('button[onclick*="ccAbrirDotRegistro"]');
      if(dot){dot.style.padding='5px 8px';dot.style.fontSize='9px';}
    });
  }

  const original=window.ccRenderInventario;
  if(typeof original==='function'&&!original.__inventarioModuloEstableV2){
    const wrapped=function(){
      const r=original.apply(this,arguments);
      compactarAcciones();
      loadQrSystem();
      return r;
    };
    wrapped.__inventarioModuloEstableV2=true;
    window.ccRenderInventario=wrapped;
  }

  root.modules.inventario={
    name:'inventario',
    open(){
      const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));
      if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);
    },
    render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},
    edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);}
  };

  compactarAcciones();
  loadQrSystem();
})();