/* Tráfico App · Inventario · refresco inmediato de tipo de unidad v1 */
(function(){
  'use strict';
  if(window.__CC_INVENTARIO_TIPO_REFRESH_V1__)return;
  window.__CC_INVENTARIO_TIPO_REFRESH_V1__=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toUpperCase();
  let refreshing=false;

  function patchRow(numero,nombre){
    const body=document.getElementById('ccInventarioBody');
    if(!body||!numero||!nombre)return false;
    const key=norm(numero);
    let changed=false;
    [...body.querySelectorAll('tr')].forEach(tr=>{
      const cells=[...tr.children];
      if(cells.length<3||norm(cells[2]?.textContent)!==key)return;
      cells[1].innerHTML='<span class="cc-unit-type-badge">'+esc(nombre)+'</span>';
      cells[1].dataset.ccCanonicalType=String(nombre);
      cells[1].dataset.ccTipoCatalogo=String(nombre);
      changed=true;
    });
    return changed;
  }

  async function refreshFromDatabase(){
    if(refreshing||!window.gmSupabase)return false;
    refreshing=true;
    try{
      const r=await window.gmSupabase.rpc('cc_unit_type_map');
      if(r.error)throw r.error;
      (r.data?.rows||[]).forEach(x=>patchRow(x.numero,x.tipoUnidadGeneralNombre||'SIN TIPO'));
      return true;
    }catch(e){
      console.warn('Refresco de tipo de unidad:',e);
      return false;
    }finally{
      refreshing=false;
    }
  }

  function scheduleRefresh(){
    setTimeout(refreshFromDatabase,250);
    setTimeout(refreshFromDatabase,700);
    setTimeout(()=>{window.ccRenderInventario?.();refreshFromDatabase();},1300);
  }

  document.addEventListener('submit',e=>{
    const form=e.target;
    if(!(form instanceof HTMLFormElement))return;

    const unitModal=form.closest('#ccEditUnitModal,#ccFormModal');
    if(unitModal){
      const numero=form.querySelector('[name="numero"]')?.value?.trim();
      const tipo=form.querySelector('[name="tipoUnidadGeneralId"]');
      const nombre=tipo?.selectedOptions?.[0]?.textContent?.trim();
      if(numero&&nombre){
        setTimeout(()=>patchRow(numero,nombre),0);
        scheduleRefresh();
      }
      return;
    }

    if(form.closest('#ccCanonicalTypeModal'))scheduleRefresh();
  },true);

  document.addEventListener('cc:unit-type-changed',e=>{
    const d=e.detail||{};
    if(d.numero&&d.nombre)patchRow(d.numero,d.nombre);
    scheduleRefresh();
  });

  window.ccRefreshInventoryTypesNow=refreshFromDatabase;
})();
