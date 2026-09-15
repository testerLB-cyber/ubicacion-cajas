/* Tráfico App · Anticipos · guardado atómico configuración por destino */
(function(){
  'use strict';
  if(window.__CC_ANT_DEST_CONFIG_ATOMIC_V1__)return;
  window.__CC_ANT_DEST_CONFIG_ATOMIC_V1__=true;

  const sb=()=>window.gmSupabase;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  let currentDestinoId='';

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-general-destcfg],[data-general-destedit]');
    if(!b)return;
    currentDestinoId=b.dataset.generalDestcfg||b.dataset.generalDestedit||'';
  },true);

  async function resolveDestinoId(form){
    if(currentDestinoId)return currentDestinoId;
    const modal=form.closest('#ccDestCfgGeneral')||document.getElementById('ccDestCfgGeneral');
    const title=String(modal?.querySelector('strong')?.textContent||'');
    const marker='Configuración por destino ·';
    const nombre=title.includes(marker)?title.split(marker).slice(1).join(marker).trim():'';
    if(!nombre)return '';
    const c=sb();if(!c)return '';
    const {data,error}=await c.rpc('cc_ant_list');
    if(error)throw error;
    const hit=(data?.destinos||[]).find(x=>norm(x.nombre)===norm(nombre));
    currentDestinoId=hit?.id||'';
    return currentDestinoId;
  }

  document.addEventListener('submit',async e=>{
    const form=e.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='ccDestCfgGeneralForm')return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const tipoId=form.elements.tipo?.value||'';
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
      const destinoId=await resolveDestinoId(form);
      if(!destinoId)throw new Error('No se pudo identificar el destino abierto.');
      const c=sb();if(!c)throw new Error('Supabase no está disponible.');
      const {data,error}=await c.rpc('cc_ant_save_destination_config_general',{
        p_destino_id:destinoId,
        p_tipo_unidad_general_id:tipoId,
        p_items:rows
      });
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la configuración.');
      if(!Number(data?.conceptosGuardados||0))throw new Error('Supabase no confirmó conceptos guardados.');
      document.getElementById('ccDestCfgGeneral')?.remove();
      currentDestinoId='';
      await window.ccAntLoad?.(true);
      document.dispatchEvent(new CustomEvent('cc-ant-destination-config-saved',{detail:{destinoId,tipoId,count:Number(data.conceptosGuardados||0)}}));
      setTimeout(()=>document.dispatchEvent(new Event('cc-ant-catalogs-general-refreshed')),120);
      alert('Configuración guardada correctamente. '+Number(data.conceptosGuardados||0)+' concepto(s).');
    }catch(err){
      alert('No se pudo guardar la configuración.\n\n'+(err?.message||err));
    }finally{
      if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=oldText||'Guardar configuración';}
    }
  },true);
})();
