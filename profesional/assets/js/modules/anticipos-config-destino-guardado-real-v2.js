/* Tráfico App · Anticipos · guardado real configuración por destino v2 */
(function(){
  'use strict';
  if(window.__CC_ANT_DEST_CONFIG_REAL_V2__)return;
  window.__CC_ANT_DEST_CONFIG_REAL_V2__=true;

  const sb=()=>window.gmSupabase;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

  async function resolveDestinoId(modal){
    const title=String(modal?.querySelector('strong')?.textContent||'');
    const name=title.includes('·')?title.split('·').slice(1).join('·').trim():'';
    if(!name)throw new Error('No se pudo identificar el destino abierto.');
    const c=sb();if(!c)throw new Error('Supabase no está disponible.');
    const {data,error}=await c.rpc('cc_ant_list');
    if(error)throw error;
    const d=(data?.destinos||[]).find(x=>norm(x.nombre)===norm(name));
    if(!d)throw new Error('No se encontró el destino '+name+' en el catálogo.');
    return d.id;
  }

  function pokeCatalog(){
    const root=document.getElementById('ccAntViewCatalogos');
    if(!root)return;
    const n=document.createElement('span');n.hidden=true;root.appendChild(n);requestAnimationFrame(()=>n.remove());
  }

  document.addEventListener('submit',async e=>{
    const form=e.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='ccDestCompactForm')return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const tipoId=form.elements.tipo?.value||'';
    if(!tipoId)return alert('Selecciona el tipo de unidad.');

    const rows=[...form.querySelectorAll('[data-row]')].map(r=>({
      conceptoId:String(r.dataset.concept||''),
      monto:Number(r.querySelector('[data-amt]')?.value||0),
      esDefault:!!r.querySelector('[data-def]')?.checked,
      estatus:String(r.querySelector('[data-status]')?.value||'ACTIVO').toUpperCase()
    })).filter(x=>x.conceptoId);

    if(!rows.length)return alert('Agrega al menos un concepto antes de guardar.');

    const btn=form.querySelector('button[type="submit"]');
    const old=btn?.textContent||'Guardar cambios';
    if(btn){btn.disabled=true;btn.textContent='Guardando…';}

    try{
      const modal=document.getElementById('ccDestCompactEditor');
      const destinoId=await resolveDestinoId(modal);
      const c=sb();if(!c)throw new Error('Supabase no está disponible.');
      const {data,error}=await c.rpc('cc_ant_save_destination_config_general',{
        p_destino_id:destinoId,
        p_tipo_unidad_general_id:tipoId,
        p_items:rows
      });
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la configuración.');
      if(Number(data?.conceptosGuardados||0)!==rows.length)throw new Error('Supabase no confirmó todos los conceptos enviados.');

      modal?.remove();
      await window.ccAntLoad?.(true);
      pokeCatalog();
      alert('Configuración guardada correctamente. '+rows.length+' concepto(s).');
    }catch(err){
      alert('No se pudo guardar la configuración.\n\n'+(err?.message||err));
    }finally{
      if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=old;}
    }
  },true);
})();
