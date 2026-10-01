/* Historial Hojas · edición completa de comprobación */
(function(){
'use strict';if(window.__HS_HISTORY_FULL_EDIT_V1__)return;window.__HS_HISTORY_FULL_EDIT_V1__=true;
const sb=()=>window.gmSupabase, txt=v=>String(v??'').trim();
async function currentByFolio(folio){const {data,error}=await sb().rpc('hs_list');if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo cargar la comprobación.');return (data.comprobaciones||[]).find(x=>txt(x.folio)===txt(folio));}
function folioFromModal(m){return txt(m.querySelector('.hs-edit-comp-head strong')?.textContent).replace(/^Editar comprobación\s*·\s*/i,'');}
async function enhance(m){if(!m||m.dataset.fullEdit==='1')return;m.dataset.fullEdit='1';const folio=folioFromModal(m);if(!folio)return;let c;try{c=await currentByFolio(folio)}catch(e){console.warn(e);return;}const grid=m.querySelector('.hs-edit-grid');if(!grid)return;
 const fields=document.createElement('div');fields.style.display='contents';fields.innerHTML=`<div class="cc-field"><label>Operador</label><input data-full-operador value="${txt(c.operador).replace(/"/g,'&quot;')}"></div><div class="cc-field"><label>Unidad</label><input data-full-unidad value="${txt(c.unidad).replace(/"/g,'&quot;')}"></div><div class="cc-field"><label>Remolque</label><input data-full-remolque value="${txt(c.remolque).replace(/"/g,'&quot;')}"></div><div class="cc-field"><label>Aceptado por</label><input data-full-aceptado value="${txt(c.aceptadoPor).replace(/"/g,'&quot;')}"></div>`;grid.appendChild(fields);
 const save=m.querySelector('[data-save]');if(!save)return;
 save.addEventListener('click',async function(ev){ev.preventDefault();ev.stopImmediatePropagation();const fecha=m.querySelector('[data-fecha]')?.value,clienteId=m.querySelector('[data-cliente]')?.value,tipoId=m.querySelector('[data-tipo]')?.value,clasId=m.querySelector('[data-clas]')?.value;if(!fecha||!clienteId||!tipoId||!clasId)return alert('Completa fecha, cliente, tipo y clasificación.');save.disabled=true;try{
   const base={comprobacionId:c.id,fechaUso:fecha,clienteId,tipoViajeId:tipoId,clasificacionId:clasId,observaciones:m.querySelector('[data-obs]')?.value||''};const r1=await sb().rpc('hs_update_comprobacion',{p_item:base});if(r1.error||!r1.data?.ok)throw new Error(r1.error?.message||r1.data?.error||'No se pudieron guardar los datos principales.');
   const extra={operador_nombre:txt(m.querySelector('[data-full-operador]')?.value)||null,unidad_numero:txt(m.querySelector('[data-full-unidad]')?.value)||null,remolque_numero:txt(m.querySelector('[data-full-remolque]')?.value)||null,aceptado_por_nombre:txt(m.querySelector('[data-full-aceptado]')?.value)||null};const r2=await sb().from('hs_comprobaciones').update(extra).eq('id',c.id);if(r2.error)throw new Error('Datos principales guardados, pero no se pudieron actualizar operador/unidad/remolque/aceptado por: '+r2.error.message);
   m.remove();document.getElementById('hs104Refresh')?.click();setTimeout(()=>window.hsSetComprobacionHistory?.(true),450);
 }catch(e){alert(e?.message||e);save.disabled=false;}
 },true);
}
new MutationObserver(()=>document.querySelectorAll('.hs-edit-comp-modal').forEach(enhance)).observe(document.body,{childList:true,subtree:true});
})();