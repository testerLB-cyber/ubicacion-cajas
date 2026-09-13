/* Tráfico App · Tipos de unidad · edición segura v3 · 2026-09-13 */
(function(){
  if(window.__CC_UNIT_TYPES_SAFE_EDIT_V3__) return;
  window.__CC_UNIT_TYPES_SAFE_EDIT_V3__ = true;
  window.__CC_UNIT_TYPES_EDIT_HOTFIX__ = true;

  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const sb=()=>window.gmSupabase;

  function dedupeSelects(){
    document.querySelectorAll('select[name="tipoUnidadId"]').forEach(sel=>{
      const seen=new Set();
      [...sel.options].reverse().forEach(o=>{
        const k=String(o.value||'');
        if(!k)return;
        if(seen.has(k))o.remove();else seen.add(k);
      });
    });
  }

  function cleanDuplicateRows(){
    const table=document.getElementById('ccTiposUnidadList');
    if(!table)return;
    const seen=new Set();
    [...table.querySelectorAll('tr')].reverse().forEach(tr=>{
      const b=tr.querySelector('button[onclick*="ccNuevoTipoUnidad"]');
      const m=(b?.getAttribute('onclick')||'').match(/ccNuevoTipoUnidad\('([^']+)'\)/);
      if(!m)return;
      if(seen.has(m[1]))tr.remove();else seen.add(m[1]);
    });
  }

  function impactText(d){
    const i=d?.impact||{};
    const parts=[];
    if(Number(i.unidades||0))parts.push(Number(i.unidades)+' unidad(es) de Inventario');
    if(Number(i.anticipos||0))parts.push(Number(i.anticipos)+' anticipo(s)');
    if(Number(i.configuracionesDestino||0))parts.push(Number(i.configuracionesDestino)+' configuración(es) por destino');
    return parts.join('\n• ');
  }

  async function loadTipo(id){
    const s=sb();if(!s)throw new Error('Supabase no está disponible.');
    if(!id)return {id:'',nombre:'',categoria:'CAJA',estatus:'ACTIVO'};
    const r=await s.from('cc_tipos_unidad').select('id,nombre,categoria,estatus').eq('id',id).single();
    if(r.error)throw r.error;
    return r.data;
  }

  function openModal(x){
    document.getElementById('ccTipoUnidadSafeModal')?.remove();
    const ov=document.createElement('div');
    ov.id='ccTipoUnidadSafeModal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:100500;display:flex;align-items:center;justify-content:center;padding:18px';
    ov.innerHTML='<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.32)"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>'+(x.id?'Editar':'Nuevo')+' tipo de unidad</strong><button type="button" data-close style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Nombre del tipo</label><input name="nombre" required value="'+esc(x.nombre||'')+'" placeholder="Ej. CAJA SECA"></div><div class="cc-field"><label>Categoría</label><select name="categoria"><option value="CAJA" '+(x.categoria==='CAJA'?'selected':'')+'>CAJA</option><option value="CARRO" '+(x.categoria==='CARRO'?'selected':'')+'>CARRO</option><option value="OTRO" '+(x.categoria==='OTRO'?'selected':'')+'>OTRO</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option value="ACTIVO" '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option value="INACTIVO" '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div class="cc-note" style="margin-top:10px">Si el tipo ya está utilizado, antes de guardar se mostrará exactamente qué módulos o registros pueden verse afectados.</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();ov.querySelector('[data-close]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{
      e.preventDefault();
      const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Validando...';
      try{
        const item={id:x.id||'',nombre:String(e.currentTarget.nombre.value||'').trim().toUpperCase(),categoria:e.currentTarget.categoria.value,estatus:e.currentTarget.estatus.value};
        let r=await sb().rpc('cc_tipo_unidad_save',{p_item:item,p_confirm:false});
        if(r.error)throw r.error;
        if(r.data?.requiresConfirmation){
          const det=impactText(r.data);
          const ok=confirm('Este cambio afecta registros relacionados:\n\n• '+det+'\n\n¿Deseas aplicar el cambio de todos modos?\n\nSí = guardar el cambio\nNo = cancelar sin modificar nada');
          if(!ok){btn.disabled=false;btn.textContent='Guardar cambios';return;}
          r=await sb().rpc('cc_tipo_unidad_save',{p_item:item,p_confirm:true});
          if(r.error)throw r.error;
        }
        if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo guardar el tipo de unidad.');
        close();
        alert('Tipo de unidad guardado correctamente en Supabase.');
        location.reload();
      }catch(err){
        console.error('TIPO UNIDAD SAFE SAVE',err);
        alert('No se guardó en Supabase.\n\n'+(err.message||err));
        btn.disabled=false;btn.textContent='Guardar cambios';
      }
    };
  }

  window.ccNuevoTipoUnidad=async function(id){
    try{openModal(await loadTipo(id||''));}
    catch(err){alert('No se pudo abrir el tipo de unidad.\n\n'+(err.message||err));}
  };

  document.addEventListener('click',()=>setTimeout(()=>{dedupeSelects();cleanDuplicateRows();},50),true);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{dedupeSelects();cleanDuplicateRows();},300));
  setTimeout(()=>{dedupeSelects();cleanDuplicateRows();},800);
})();
