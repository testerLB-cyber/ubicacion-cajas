from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists():
    raise SystemExit('No existe anticipos-profesional-flow.js')

extra=r'''

/* Tráfico App Profesional · Gestión de comprobantes desde Comprobar y listado */
(function(){
  if(window.__ccProfCompGestionV2)return;
  window.__ccProfCompGestionV2=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';

  async function datos(){
    const r=await sb().rpc('cc_ant_list');
    if(r?.error)throw r.error;
    if(!r?.data?.ok)throw new Error(r?.data?.error||'No se pudieron cargar las comprobaciones');
    return r.data;
  }

  async function editar(anticipoId,compId,onDone){
    const d=await datos(),a=(d.anticipos||[]).find(x=>x.id===anticipoId),c=(d.comprobaciones||[]).find(x=>x.id===compId);
    if(!a||!c)return;
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){alert('Primero debes abrir el anticipo para editar comprobaciones.');return}
    document.getElementById('ccProfCompInlineEdit')?.remove();
    const ov=document.createElement('div');ov.id='ccProfCompInlineEdit';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100006;display:flex;align-items:center;justify-content:center;padding:18px';
    ov.innerHTML='<div style="background:#fff;width:min(660px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><strong>Editar comprobante</strong><button id="ccPCIEX" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form id="ccPCIEForm" style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="'+esc(String(c.fecha||'').slice(0,10))+'"></div><div class="cc-field"><label>Concepto *</label><input name="concepto" required value="'+esc(c.concepto||'')+'"></div><div class="cc-field"><label>Tipo documento</label><input name="tipoDocumento" value="'+esc(c.tipo_documento||'')+'"></div><div class="cc-field"><label>Folio</label><input name="folioDocumento" value="'+esc(c.folio_documento||'')+'"></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required value="'+Number(c.monto||0)+'"></div><div class="cc-field"><label>URL evidencia</label><input name="evidenciaUrl" value="'+esc(c.evidencia_url||'')+'"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="observaciones">'+esc(c.observaciones||'')+'</textarea></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" id="ccPCIECancel">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('#ccPCIEX').onclick=close;ov.querySelector('#ccPCIECancel').onclick=close;
    ov.querySelector('#ccPCIEForm').onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(ev.currentTarget),b=ev.currentTarget.querySelector('button[type=submit]');b.disabled=true;try{const item={id:compId,fecha:new Date(String(fd.get('fecha'))+'T12:00:00').toISOString(),concepto:String(fd.get('concepto')||''),tipoDocumento:String(fd.get('tipoDocumento')||''),folioDocumento:String(fd.get('folioDocumento')||''),monto:Number(fd.get('monto')||0),evidenciaUrl:String(fd.get('evidenciaUrl')||''),observaciones:String(fd.get('observaciones')||'')};const r=await sb().rpc('cc_ant_update_comprobacion',{p_item:item});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo actualizar');close();await window.ccAntLoad?.(true);if(onDone)await onDone()}catch(e){alert(e.message||e);b.disabled=false}};
  }

  async function eliminar(anticipoId,compId,onDone){
    const d=await datos(),a=(d.anticipos||[]).find(x=>x.id===anticipoId),c=(d.comprobaciones||[]).find(x=>x.id===compId);if(!a||!c)return;
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){alert('Primero debes abrir el anticipo para eliminar comprobaciones.');return}
    if(!confirm('¿Eliminar el comprobante de '+money(c.monto)+'? Se conservará en historial como cancelado.'))return;
    const motivo=prompt('Motivo de eliminación:','Corrección de comprobante')||'Corrección de comprobante';
    try{const r=await sb().rpc('cc_ant_delete_comprobacion',{p_id:compId,p_motivo:motivo});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo eliminar');await window.ccAntLoad?.(true);if(onDone)await onDone()}catch(e){alert(e.message||e)}
  }

  async function renderEnComprobar(anticipoId){
    const modal=document.getElementById('ccAntCompModal');if(!modal)return;
    const anchor=modal.querySelector('#ccCompList');if(!anchor)return;
    let box=modal.querySelector('#ccProfSavedComps');if(!box){box=document.createElement('div');box.id='ccProfSavedComps';box.className='cc-comp-list';box.style='margin-top:14px;border-top:2px solid #e2e8f0;padding-top:12px';anchor.insertAdjacentElement('afterend',box)}
    try{
      const d=await datos(),a=(d.anticipos||[]).find(x=>x.id===anticipoId),comps=(d.comprobaciones||[]).filter(x=>x.anticipo_id===anticipoId&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
      if(!a)return;const editable=!['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())&&(typeof window.ccPerm!=='function'||window.ccPerm('anticipos.editar'));
      box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><div><strong>Comprobaciones ya guardadas</strong><div class="cc-note">Puedes corregirlas antes de cerrar el anticipo.</div></div><span class="cc-badge">'+comps.length+' comprobante(s)</span></div>'+(comps.length?comps.map(c=>'<div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;background:#fff"><div style="display:flex;justify-content:space-between;gap:10px"><div><strong>'+esc(c.concepto||'Comprobante')+'</strong><div style="font-size:10px;color:#64748b">'+date(c.fecha)+' · '+esc(c.tipo_documento||'—')+' · Folio '+esc(c.folio_documento||'—')+'</div><div style="font-size:10px;color:#64748b;margin-top:3px">'+esc(c.observaciones||'')+'</div></div><strong>'+money(c.monto)+'</strong></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+(c.evidencia_url?'<a class="cc-btn cc-btn-light" href="'+esc(c.evidencia_url)+'" target="_blank" rel="noopener">Ver archivo</a>':'')+(editable?'<button class="cc-btn cc-btn-light" data-inline-edit="'+esc(c.id)+'"><i class="fa-solid fa-pen mr-1"></i>Editar</button><button class="cc-btn cc-btn-danger" data-inline-del="'+esc(c.id)+'"><i class="fa-solid fa-trash mr-1"></i>Eliminar</button>':'<span class="cc-badge">Solo lectura</span>')+'</div></div>').join(''):'<div class="cc-note">Todavía no hay comprobaciones guardadas.</div>');
      box.onclick=ev=>{const eb=ev.target.closest('[data-inline-edit]'),db=ev.target.closest('[data-inline-del]');if(eb)editar(anticipoId,eb.dataset.inlineEdit,()=>renderEnComprobar(anticipoId));if(db)eliminar(anticipoId,db.dataset.inlineDel,()=>renderEnComprobar(anticipoId))};
    }catch(e){box.innerHTML='<div class="cc-note" style="color:#b91c1c">'+esc(e.message||e)+'</div>'}
  }

  function wrapComprobar(){
    if(typeof window.ccAntComprobar!=='function'||window.ccAntComprobar.__profCompsV2)return;
    const original=window.ccAntComprobar;
    const wrapped=async function(id){const r=await original.apply(this,arguments);setTimeout(()=>renderEnComprobar(id),80);setTimeout(()=>renderEnComprobar(id),600);return r};
    wrapped.__profCompsV2=true;window.ccAntComprobar=wrapped;
  }

  function botonesListado(){
    const body=document.getElementById('ccAntBody'),rows=Array.from(body?.querySelectorAll('tr')||[]),data=Array.isArray(window.ccAntFiltered)?window.ccAntFiltered:[];
    rows.forEach((tr,i)=>{const a=data[i];if(!a)return;const actions=tr.lastElementChild?.querySelector('div')||tr.lastElementChild;if(!actions||actions.querySelector('[data-prof-comp-view]'))return;const b=document.createElement('button');b.type='button';b.className='cc-btn';b.style.background='#7c3aed';b.style.color='#fff';b.dataset.profCompView=a.id;b.innerHTML='<i class="fa-solid fa-receipt mr-1"></i>Ver comprobantes';b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();if(typeof window.ccProfVerComprobantes==='function')window.ccProfVerComprobantes(a.id)};actions.appendChild(b)});
  }

  function install(){
    wrapComprobar();botonesListado();
    if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__profCompsListV2){const o=window.ccAntRender,w=function(){const r=o.apply(this,arguments);setTimeout(botonesListado,0);wrapComprobar();return r};w.__profCompsListV2=true;window.ccAntRender=w}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
'''

text=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Gestión de comprobantes desde Comprobar y listado */'
if marker not in text:
    P.write_text(text+extra,encoding='utf-8')
print('Gestión v2 de comprobantes integrada en flujo profesional')
