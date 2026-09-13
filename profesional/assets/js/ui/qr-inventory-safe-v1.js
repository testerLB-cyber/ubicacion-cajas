(function(){
  if(window.__QR_INVENTORY_SAFE_V1__) return;
  window.__QR_INVENTORY_SAFE_V1__=true;
  function addVisibleQr(){
    const body=document.getElementById('ccInventarioBody');
    if(!body) return;
    body.querySelectorAll('tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<3) return;
      const source=[...tr.querySelectorAll('[onclick]')].find(el=>(el.getAttribute('onclick')||'').includes('ccMostrarQrUnidad(')) || [...tr.querySelectorAll('[onclick]')].find(el=>(el.getAttribute('onclick')||'').includes('ccEditarUnidadDirecto('));
      const oc=source?.getAttribute('onclick')||'';
      const m=oc.match(/ccMostrarQrUnidad\('([^']+)'\)/)||oc.match(/ccEditarUnidadDirecto\('([^']+)'\)/);
      if(!m) return;
      const id=m[1];
      const cell=cells[2];
      if(cell.querySelector('.cc-visible-qr-button')) return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='cc-btn cc-btn-primary cc-visible-qr-button';
      btn.style.marginTop='6px';
      btn.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Generar QR';
      btn.title='Generar QR para actualizar la ubicación de esta unidad';
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(typeof window.ccMostrarQrUnidad==='function') window.ccMostrarQrUnidad(id); else alert('El generador QR aún no está disponible.');};
      cell.appendChild(document.createElement('br'));
      cell.appendChild(btn);
    });
  }
  const old=window.ccRenderInventario;
  if(typeof old==='function'&&!old.__qrSafeWrapped){
    const wrapped=function(){const r=old.apply(this,arguments);setTimeout(addVisibleQr,0);return r;};
    wrapped.__qrSafeWrapped=true;
    window.ccRenderInventario=wrapped;
  }
  document.addEventListener('click',e=>{if(e.target?.closest?.("[onclick*=\"ccTab('inventario'\"]")) setTimeout(addVisibleQr,80);});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(addVisibleQr,500));
})();