/* Tráfico App · Anticipos · guardado atómico configuración por destino */
(function(){
  'use strict';
  if(window.__CC_ANT_DEST_CONFIG_ATOMIC_V1__)return;
  window.__CC_ANT_DEST_CONFIG_ATOMIC_V1__=true;

  const sb=()=>window.gmSupabase;
  let currentDestinoId='';

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-general-destcfg],[data-general-destedit]');
    if(!b)return;
    currentDestinoId=b.dataset.generalDestcfg||b.dataset.generalDestedit||'';
  },true);

  document.addEventListener('submit',async e=>{
    const form=e.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='ccDestCfgGeneralForm')return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const destinoId=currentDestinoId;
    const tipoId=form.elements.tipo?.value||'';
    if(!destinoId)return alert('No se pudo identificar el destino. Cierra y vuelve a abrir Configurar.');
    if(!tipoId)return alert('Selecciona un tipo de unidad.');

    const rows=[...form.querySelectorAll('[data-amt]')].map(inp=>{
      const conceptoId=inp.dataset.amt;
      const monto=Number(inp.value||0);
      const esDefault=!!form.querySelector('[data-def="'+CSS.escape(conceptoId)+'"]')?.checked;
      const estatus=form.querySelector('[data-status="'+CSS.escape(conceptoId)+'"]')?.value||'INACTIVO';
      return {conceptoId,monto,esDefault,estatus};
    }).filter(x=>x.estatus==='ACTIVO'||x.monto>0||x.esDefault);

    if(!rows.length)return alert('Agrega al menos un concepto activo, con monto o marcado como Default.');

    const btn=form.querySelector('button[type="submit"],button:not([type])');
    const oldText=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    try{
      const c=sb();if(!c)throw new Error('Supabase no está disponible.');
      const {data,error}=await c.rpc('cc_ant_save_destination_config_general',{
        p_destino_id:destinoId,
        p_tipo_unidad_general_id:tipoId,
        p_items:rows
      });
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la configuración.');
      document.getElementById('ccDestCfgGeneral')?.remove();
      await window.ccAntLoad?.(true);
      setTimeout(()=>document.dispatchEvent(new Event('cc-ant-catalogs-general-refreshed')),100);
    }catch(err){
      alert('No se pudo guardar la configuración.\n\n'+(err?.message||err));
    }finally{
      if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=oldText||'Guardar configuración';}
    }
  },true);
})();
