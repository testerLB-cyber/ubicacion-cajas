/* Tráfico App · Inventario QR visible v3 · aislado al catálogo de unidades */
(function(){
  if(window.__INVENTARIO_QR_VISIBLE_V3__) return;
  window.__INVENTARIO_QR_VISIBLE_V3__=true;

  function getUnitId(row){
    const edit=row.querySelector('button[onclick*="ccEditarUnidadDirecto"]');
    const code=edit?.getAttribute('onclick')||'';
    const m=code.match(/ccEditarUnidadDirecto\('([^']+)'\)/);
    return m?m[1]:'';
  }

  function apply(){
    const body=document.getElementById('ccInventarioBody');
    if(!body) return;
    body.querySelectorAll('tr').forEach(row=>{
      const id=getUnitId(row);
      if(!id) return;
      const cells=row.querySelectorAll('td');
      if(!cells.length) return;
      const actions=cells[cells.length-1];
      if(!actions) return;

      // Limpia cualquier intento QR anterior en esta fila.
      actions.querySelectorAll('[data-qr-catalogo="1"]').forEach(x=>x.remove());
      const oldQr=actions.querySelector('button[onclick*="ccMostrarQrUnidad"]');
      if(oldQr) oldQr.style.display='none';

      // Compacta mantenimiento sin alterar su función.
      const mant=actions.querySelector('.cc-btn-maintenance');
      if(mant){
        mant.innerHTML='<i class="fa-solid fa-triangle-exclamation mr-1"></i>Mantenimiento';
        mant.style.cssText+=';padding:5px 7px!important;font-size:9px!important;';
      }
      const dot=actions.querySelector('button[onclick*="ccAbrirDotRegistro"]');
      if(dot) dot.style.cssText+=';padding:5px 7px!important;font-size:9px!important;';

      const qr=document.createElement('button');
      qr.type='button';
      qr.dataset.qrCatalogo='1';
      qr.className='cc-btn cc-btn-primary';
      qr.title='Generar QR de ubicación de esta unidad';
      qr.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>QR';
      qr.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;padding:5px 9px!important;font-size:9px!important;margin:2px 0 2px 3px!important;position:static!important;pointer-events:auto!important;z-index:2!important;';
      qr.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(typeof window.ccMostrarQrUnidad==='function') window.ccMostrarQrUnidad(id);
        else alert('El generador QR no está disponible en este momento.');
      });
      actions.appendChild(qr);
    });
  }

  function hookRender(){
    const fn=window.ccRenderInventario;
    if(typeof fn!=='function'||fn.__qrVisibleV3) return;
    const wrapped=function(){
      const r=fn.apply(this,arguments);
      apply();
      requestAnimationFrame(apply);
      return r;
    };
    wrapped.__qrVisibleV3=true;
    window.ccRenderInventario=wrapped;
  }

  hookRender();
  apply();
  document.addEventListener('click',function(e){
    const tab=e.target.closest?.('#controlCajasSection .cc-tab');
    if(tab && (tab.getAttribute('onclick')||'').includes("ccTab('inventario'")){
      setTimeout(()=>{hookRender();apply();},30);
    }
  },true);
  window.addEventListener('load',()=>setTimeout(()=>{hookRender();apply();},250));
})();
