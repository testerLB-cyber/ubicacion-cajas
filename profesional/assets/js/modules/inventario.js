/* Tráfico App · Inventario · acciones estables */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};

  function normalizarAccionesInventario(){
    const body=document.getElementById('ccInventarioBody');
    if(!body)return;

    body.querySelectorAll('tr').forEach(tr=>{
      const celdas=tr.querySelectorAll('td');
      if(!celdas.length)return;
      const acciones=celdas[celdas.length-1];
      if(!acciones)return;

      const editar=acciones.querySelector('button[onclick*="ccEditarUnidadDirecto"]');
      const editarOnclick=editar?.getAttribute('onclick')||'';
      const match=editarOnclick.match(/ccEditarUnidadDirecto\('([^']+)'\)/);
      if(!match)return;
      const id=match[1];

      const mantenimiento=acciones.querySelector('.cc-btn-maintenance');
      if(mantenimiento){
        mantenimiento.innerHTML='<i class="fa-solid fa-triangle-exclamation mr-1"></i>Mantenimiento';
        mantenimiento.title='Poner unidad en mantenimiento / fuera de servicio';
        mantenimiento.style.padding='5px 8px';
        mantenimiento.style.fontSize='9px';
      }

      const dot=acciones.querySelector('button[onclick*="ccAbrirDotRegistro"]');
      if(dot){
        dot.style.padding='5px 8px';
        dot.style.fontSize='9px';
      }

      acciones.querySelectorAll('button[onclick*="ccMostrarQrUnidad"],button[data-inventario-qr="1"]').forEach(b=>b.remove());

      const qr=document.createElement('button');
      qr.type='button';
      qr.className='cc-btn cc-btn-light';
      qr.dataset.inventarioQr='1';
      qr.title='Generar QR para registrar la ubicación de esta unidad';
      qr.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>QR';
      qr.style.padding='5px 8px';
      qr.style.fontSize='9px';
      qr.style.display='inline-flex';
      qr.style.alignItems='center';
      qr.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        if(typeof window.ccMostrarQrUnidad!=='function'){
          alert('El generador QR no está disponible. Recarga la aplicación.');
          return;
        }
        window.ccMostrarQrUnidad(id);
      };
      acciones.appendChild(qr);
    });
  }

  const renderOriginal=window.ccRenderInventario;
  if(typeof renderOriginal==='function'&&!renderOriginal.__inventarioQrLimpio){
    const render=function(){
      const resultado=renderOriginal.apply(this,arguments);
      normalizarAccionesInventario();
      return resultado;
    };
    render.__inventarioQrLimpio=true;
    window.ccRenderInventario=render;
  }

  root.modules.inventario={
    name:'inventario',
    open(){
      const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));
      if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);
    },
    render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},
    edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);},
    qr(id){if(typeof window.ccMostrarQrUnidad==='function')return window.ccMostrarQrUnidad(id);}
  };

  normalizarAccionesInventario();
})();
