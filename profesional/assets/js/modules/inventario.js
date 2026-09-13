/* Tráfico App · Inventario · módulo estable */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};

  function cargarQrToolbar(){
    if(window.__INVENTARIO_QR_TOOLBAR_V2__) return;
    if(document.querySelector('script[data-inventario-qr-toolbar-v2]')) return;
    const s=document.createElement('script');
    s.src='assets/js/modules/inventario-qr-toolbar-v2.js?v=toolbar-v2-20260912-2330';
    s.dataset.inventarioQrToolbarV2='1';
    s.onerror=e=>console.warn('No se pudo cargar Generar QR de Inventario',e);
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
  if(typeof original==='function'&&!original.__inventarioModuloEstable){
    const wrapped=function(){
      const r=original.apply(this,arguments);
      compactarAcciones();
      cargarQrToolbar();
      return r;
    };
    wrapped.__inventarioModuloEstable=true;
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
  cargarQrToolbar();
})();
