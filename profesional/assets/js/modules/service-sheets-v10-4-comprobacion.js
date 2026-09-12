/* Tráfico App Profesional · Hojas de Servicio v10.4 · parche comprobación por operador */
(function(){
  if(window.__hsV104ComprobacionPatch)return;
  window.__hsV104ComprobacionPatch=true;
  const sb=()=>window.gmSupabase;
  const today=()=>new Date().toISOString().slice(0,10);

  function rowId(row){ return row?.dataset?.row || ''; }
  function value(row,sel){ return String(row?.querySelector(sel)?.value||'').trim(); }
  function setBusy(btn,on){ if(btn)btn.disabled=!!on; }

  function upgradeRows(){
    const view=document.getElementById('hsViewComprobacion');
    if(!view)return;
    view.querySelectorAll('[data-row]').forEach(row=>{
      const servicio=row.querySelector('[data-servicio]');
      const comprobar=row.querySelector('[data-comprobar]');
      if(!servicio||!comprobar)return; // Solo la vista "Comprobación por operador" heredada v5.

      const serviceField=servicio.closest('.cc-field');
      const label=serviceField?.querySelector('label');
      if(label)label.textContent='Tipo de servicio *';
      servicio.placeholder='Ej. Exportación, Importación, Cruce, Local…';
      servicio.required=true;

      const grid=serviceField?.parentElement;
      if(grid){
        grid.style.gridTemplateColumns='repeat(auto-fit,minmax(180px,1fr))';
        if(!row.querySelector('[data-clasificacion]')){
          const field=document.createElement('div');
          field.className='cc-field';
          field.style.margin='0';
          field.innerHTML='<label>Clasificación *</label><input data-clasificacion required placeholder="Ej. Cargado, Vacío, Foráneo…">';
          grid.appendChild(field);
        }
      }

      const regresar=row.querySelector('[data-return]');
      if(regresar){
        regresar.textContent='Regresar sin usar';
        regresar.title='Devuelve la hoja en blanco al responsable y la deja disponible para volver a asignarse';
      }
      comprobar.textContent='Comprobar hoja';
      comprobar.title='Guardar Tipo de servicio y Clasificación de esta hoja';
    });
  }

  async function refreshView(){
    try{
      const nav=document.querySelector('#ccPanelHojasServicio [data-hsv="Comprobacion"]');
      if(nav){ setTimeout(()=>nav.click(),80); return; }
    }catch(_){ }
    setTimeout(upgradeRows,120);
  }

  async function comprobar(row,btn){
    const folioId=rowId(row);
    const fecha=value(row,'[data-fecha]')||today();
    const clienteId=value(row,'[data-cliente]');
    const tipoViaje=value(row,'[data-servicio]');
    const clasificacion=value(row,'[data-clasificacion]');
    if(!folioId)return alert('No se pudo identificar la hoja a comprobar.');
    if(!fecha)return alert('Captura la fecha del servicio.');
    if(!clienteId)return alert('Selecciona un cliente del catálogo general.');
    if(!tipoViaje)return alert('Captura el Tipo de servicio.');
    if(!clasificacion)return alert('Captura la Clasificación.');
    if(!sb())return alert('Supabase no está disponible.');

    setBusy(btn,true);
    try{
      const r=await sb().rpc('hs_mark_used',{p_item:{
        folioId,
        fechaUso:fecha,
        fecha,
        clienteId,
        tipoViaje,
        clasificacion,
        servicio:tipoViaje,
        observaciones:''
      }});
      if(r.error)throw r.error;
      if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo comprobar la hoja.');
      alert('Hoja comprobada correctamente.');
      await refreshView();
    }catch(e){
      alert(e?.message||e||'No se pudo comprobar la hoja.');
      setBusy(btn,false);
    }
  }

  async function regresar(row,btn){
    const folioId=rowId(row);
    const fecha=value(row,'[data-fecha]')||today();
    if(!folioId)return alert('No se pudo identificar la hoja.');
    const ok=confirm('¿Confirmas que esta hoja NO fue utilizada?\n\nSe devolverá en blanco al responsable y quedará disponible para volver a asignarse.');
    if(!ok)return;
    if(!sb())return alert('Supabase no está disponible.');

    setBusy(btn,true);
    try{
      const r=await sb().rpc('hs_return_blank',{p_item:{
        folioId,
        fecha,
        observaciones:'Regresada sin usar desde comprobación por operador'
      }});
      if(r.error)throw r.error;
      if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo regresar la hoja.');
      alert('Hoja regresada sin usar. Volvió al responsable y puede asignarse nuevamente.');
      await refreshView();
    }catch(e){
      alert(e?.message||e||'No se pudo regresar la hoja.');
      setBusy(btn,false);
    }
  }

  // Captura antes que los handlers heredados v5 para evitar guardar el formato antiguo.
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#hsViewComprobacion [data-comprobar], #hsViewComprobacion [data-return]');
    if(!btn)return;
    const row=btn.closest('[data-row]');
    if(!row||!row.querySelector('[data-servicio]'))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(btn.matches('[data-comprobar]'))comprobar(row,btn);
    else regresar(row,btn);
  },true);

  let observer=null;
  function observe(){
    const view=document.getElementById('hsViewComprobacion');
    if(!view)return false;
    upgradeRows();
    if(!observer){
      observer=new MutationObserver(()=>upgradeRows());
      observer.observe(view,{childList:true,subtree:true});
    }
    return true;
  }

  function install(){
    let n=0;
    const t=setInterval(()=>{n++;if(observe()||n>80)clearInterval(t)},250);
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#ccTabHojasServicio,#ccPanelHojasServicio [data-hsv="Comprobacion"]'))setTimeout(upgradeRows,120);
    },true);
    // Respaldo ante renderizadores heredados que reemplazan la vista cada cierto tiempo.
    setInterval(()=>{
      const p=document.getElementById('ccPanelHojasServicio');
      if(p&&p.offsetParent!==null)upgradeRows();
    },1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
