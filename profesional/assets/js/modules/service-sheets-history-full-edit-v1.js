/* Historial Hojas · edición completa de comprobación · v3 */
(function(){
'use strict';if(window.__HS_HISTORY_FULL_EDIT_V3__)return;window.__HS_HISTORY_FULL_EDIT_V3__=true;
const sb=()=>window.gmSupabase;
const txt=v=>String(v??'').trim();
const esc=v=>txt(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const num=v=>v==null?'':String(v);

async function currentByFolio(folio){
  const shared=typeof window.hs104GetData==='function'?window.hs104GetData():null;
  const item=(shared?.comprobaciones||[]).find(x=>txt(x.folio)===txt(folio));
  if(!item)throw new Error('No se encontró la comprobación.');
  if(!item.id)return item;
  const r=await sb().from('hs_comprobaciones').select('*').eq('id',item.id).maybeSingle();
  if(r.error)throw r.error;
  return {...item,...(r.data||{}),folio:item.folio};
}
function folioFromModal(m){return txt(m.querySelector('.hs-edit-comp-head strong')?.textContent).replace(/^Editar comprobación\s*·\s*/i,'');}
function unlock(m){m.querySelectorAll('input,select,textarea').forEach(el=>{if(el.type!=='hidden'&&!el.hasAttribute('data-system-readonly')){el.disabled=false;el.readOnly=false;el.removeAttribute('readonly');el.removeAttribute('disabled')}})}
function val(m,s){return txt(m.querySelector(s)?.value)}
function nullableNumber(v){const x=txt(v);return x===''?'':x;}

async function enhance(m){
  if(!m||m.dataset.fullEdit==='3'||m.dataset.unifiedEdit==='1')return;
  m.dataset.fullEdit='3';
  unlock(m);
  const folio=folioFromModal(m);if(!folio)return;
  let c;try{c=await currentByFolio(folio)}catch(e){console.warn('Historial edición completa',e);return;}
  const grid=m.querySelector('.hs-edit-grid');if(!grid)return;

  const section=document.createElement('div');
  section.style.gridColumn='1/-1';
  section.innerHTML='<div style="margin:8px 0 2px;font-size:10px;font-weight:900;color:#64748b">DATOS OPERATIVOS</div>';
  grid.appendChild(section);

  const fields=document.createElement('div');fields.style.display='contents';
  fields.innerHTML=`
    ${String(folio).toUpperCase().startsWith("CFDI-")?`<div class="cc-field"><label>Número de factura CFDI</label><input data-full-factura maxlength="100" value="${esc(c.factura_numero||'')}"></div>`:""}
    <div class="cc-field"><label>Operador</label><input data-full-operador value="${esc(c.operador_nombre||c.operador||'')}"></div>
    <div class="cc-field"><label>Unidad</label><input data-full-unidad value="${esc(c.unidad_numero||c.unidad||'')}"></div>
    <div class="cc-field"><label>Tipo de unidad</label><input data-full-unidad-tipo value="${esc(c.unidad_tipo||c.unidadTipo||'')}"></div>
    <div class="cc-field"><label>Remolque</label><input data-full-remolque value="${esc(c.remolque_numero||c.remolque||'')}"></div>
    <div class="cc-field"><label>Responsable</label><input data-full-responsable value="${esc(c.responsable_nombre||c.responsable||'')}"></div>
    <div class="cc-field"><label>Beneficiario</label><input data-full-beneficiario value="${esc(c.beneficiario_nombre||c.beneficiario||'')}"></div>
    <div class="cc-field"><label>Aceptado por</label><input data-full-aceptado value="${esc(c.aceptado_por_nombre||c.aceptadoPor||'')}"></div>
    <div class="cc-field"><label>Correo de aceptación</label><input type="email" data-full-aceptado-email value="${esc(c.aceptado_por_email||'')}"></div>
    <div style="grid-column:1/-1;margin:8px 0 2px;font-size:10px;font-weight:900;color:#64748b">DATOS DE COBRO</div>
    <div class="cc-field"><label>Cantidad de cobro</label><input type="number" step="0.01" data-full-cantidad value="${esc(num(c.cantidad_cobro))}"></div>
    <div class="cc-field"><label>Unidad de cobro</label><input data-full-unidad-cobro value="${esc(c.unidad_cobro||'')}" placeholder="Ej. HORA, VIAJE"></div>
    <div class="cc-field"><label>Tarifa aplicada</label><input type="number" step="0.01" data-full-tarifa value="${esc(num(c.tarifa_aplicada))}"></div>
    <div class="cc-field"><label>Importe calculado</label><input type="number" step="0.01" data-full-importe value="${esc(num(c.importe_calculado))}"></div>
    <div style="grid-column:1/-1;margin:8px 0 2px;font-size:10px;font-weight:900;color:#64748b">CONTROL DEL SISTEMA</div>
    <div class="cc-field"><label>Tipo de persona</label><input data-system-readonly readonly value="${esc(c.tipo_persona||'—')}"></div>
    <div class="cc-field"><label>Estatus de hoja</label><input data-system-readonly readonly value="${esc(c.tipo||'UTILIZADA')}"></div>
    <div class="cc-field"><label>Fecha de comprobación</label><input data-system-readonly readonly value="${esc(c.fecha_comprobacion||c.created_at||'—')}"></div>
    <div class="cc-field"><label>Folio</label><input data-system-readonly readonly value="${esc(folio)}"></div>`;
  grid.appendChild(fields);unlock(m);

  const save=m.querySelector('[data-save]');if(!save)return;
  save.textContent='Guardar todos los cambios';
  save.addEventListener('click',async function(ev){
    ev.preventDefault();ev.stopImmediatePropagation();
    const fecha=val(m,'[data-fecha]'),clienteId=val(m,'[data-cliente]'),tipoId=val(m,'[data-tipo]'),clasId=val(m,'[data-clas]');
    if(!fecha||!clienteId||!tipoId||!clasId)return alert('Completa fecha, cliente, tipo y clasificación.');
    save.disabled=true;
    try{
      const payload={
        comprobacionId:c.id,
        fechaUso:fecha,
        clienteId,
        tipoViajeId:tipoId,
        clasificacionId:clasId,
        observaciones:val(m,'[data-obs]'),
        ...(String(folio).toUpperCase().startsWith('CFDI-')?{facturaNumero:val(m,'[data-full-factura]')}:{}),
        operadorNombre:val(m,'[data-full-operador]'),
        unidadNumero:val(m,'[data-full-unidad]'),
        unidadTipo:val(m,'[data-full-unidad-tipo]'),
        remolqueNumero:val(m,'[data-full-remolque]'),
        responsableNombre:val(m,'[data-full-responsable]'),
        beneficiarioNombre:val(m,'[data-full-beneficiario]'),
        aceptadoPor:val(m,'[data-full-aceptado]'),
        aceptadoPorEmail:val(m,'[data-full-aceptado-email]'),
        cantidadCobro:nullableNumber(val(m,'[data-full-cantidad]')),
        unidadCobro:val(m,'[data-full-unidad-cobro]'),
        tarifaAplicada:nullableNumber(val(m,'[data-full-tarifa]')),
        importeCalculado:nullableNumber(val(m,'[data-full-importe]'))
      };
      const r=await sb().rpc('hs_update_comprobacion',{p_item:payload});
      if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudieron guardar los cambios.');
      m.remove();
      document.getElementById('hs104Refresh')?.click();
      setTimeout(()=>window.hsSetComprobacionHistory?.(true),450);
    }catch(e){alert(e?.message||e);save.disabled=false;}
  },true);
}
new MutationObserver(()=>document.querySelectorAll('.hs-edit-comp-modal').forEach(enhance)).observe(document.body,{childList:true,subtree:true});
document.querySelectorAll('.hs-edit-comp-modal').forEach(enhance);
})();