from pathlib import Path

P=Path('profesional/assets/js/modules/service-sheets.js')
if not P.exists(): raise SystemExit('No existe service-sheets.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Hojas de Servicio v4 · comprobación final cliente + servicio */'
if marker in s:
    print('v4 ya aplicado'); raise SystemExit(0)
js=r'''

/* Tráfico App Profesional · Hojas de Servicio v4 · comprobación final cliente + servicio */
(function(){
 if(window.__ccServiceSheetsV4)return;window.__ccServiceSheetsV4=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const today=()=>new Date().toISOString().slice(0,10);
 let D=null;
 async function reload(){const r=await sb().rpc('hs_list');if(r.error)throw r.error;D=r.data;render();}
 function modal(title,body,onSave,saveLabel='Guardar comprobación'){
  const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:100240;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="width:min(720px,97vw);max-height:94vh;overflow:auto;background:white;border-radius:18px;box-shadow:0 24px 70px #0f172a55"><div style="padding:16px 18px;background:#0f172a;color:white;display:flex;justify-content:space-between;align-items:center"><div><strong>'+esc(title)+'</strong><div style="font-size:10px;color:#cbd5e1;margin-top:3px">Cierra el ciclo de la hoja de servicio.</div></div><button type="button" data-close style="border:0;background:none;color:white;font-size:23px">×</button></div><form style="padding:18px">'+body+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" data-cancel class="cc-btn cc-btn-light">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">'+esc(saveLabel)+'</button></div></form></div>';
  document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-close]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
  ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSave(new FormData(e.currentTarget));close();await reload()}catch(x){alert(x.message||x);b.disabled=false}};
 }
 function opts(xs,label){return (xs||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(label(x))+'</option>').join('')}
 function comprobar(folioId){
  const f=(D?.foliosAsignadosOperador||[]).find(x=>x.id===folioId);if(!f)return alert('La hoja ya no está pendiente de comprobar.');
  const clientes=D?.clientes||[];if(!clientes.length)return alert('No hay clientes activos en el catálogo general.');
  const body='<div style="padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:14px"><strong style="font-size:16px">'+esc(f.folio)+'</strong><div style="font-size:11px;color:#475569;margin-top:4px">Operador: '+esc(f.operador||'—')+' · Responsable: '+esc(f.responsable||'—')+'</div></div><div class="cc-grid"><div class="cc-field"><label>Fecha del servicio *</label><input type="date" name="fecha" value="'+today()+'" required></div><div class="cc-field"><label>Cliente *</label><select name="clienteId" required><option value="">Seleccionar cliente…</option>'+opts(clientes,x=>x.nombre+(x.razonSocial&&x.razonSocial!==x.nombre?' · '+x.razonSocial:''))+'</select></div></div><div class="cc-field"><label>Servicio realizado *</label><input name="servicio" placeholder="Ej. Exportación, cruce, movimiento local…" required></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones" placeholder="Opcional"></textarea></div><div style="margin-top:10px;font-size:10px;color:#64748b">Al guardar, la hoja queda <b>COMPROBADA / UTILIZADA</b> y sale de pendientes.</div>';
  modal('Comprobar hoja utilizada',body,async fd=>{const r=await sb().rpc('hs_mark_used',{p_item:{folioId,fecha:fd.get('fecha'),clienteId:fd.get('clienteId'),servicio:fd.get('servicio'),observaciones:fd.get('observaciones')}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo comprobar');alert('Hoja '+r.data.folio+' comprobada correctamente.');});
 }
 function devolver(folioId){
  const f=(D?.foliosAsignadosOperador||[]).find(x=>x.id===folioId);if(!f)return alert('La hoja ya no está con el operador.');
  const body='<div style="padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:14px"><strong>'+esc(f.folio)+'</strong><div style="font-size:11px;color:#7c2d12;margin-top:4px">Esta hoja regresará en blanco al responsable y podrá volver a asignarse.</div></div><div class="cc-field"><label>Fecha de devolución *</label><input type="date" name="fecha" value="'+today()+'" required></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones" placeholder="Opcional"></textarea></div>';
  modal('Regresar hoja sin usar',body,async fd=>{const r=await sb().rpc('hs_return_blank',{p_item:{folioId,fecha:fd.get('fecha'),observaciones:fd.get('observaciones')}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo regresar');alert('Hoja devuelta en blanco al responsable.');},'Regresar sin usar');
 }
 function render(){
  const panel=document.getElementById('ccPanelHojasServicio');if(!panel||!D)return;
  let view=document.getElementById('hsViewComprobacion');if(!view)return;
  let head=view.querySelector('.cc-toolbar');if(head){head.innerHTML='<div><strong>Comprobación de hojas</strong><div class="cc-note">Cuando el operador entrega una hoja: compruébala con cliente y servicio, o regístrala como devuelta sin usar.</div></div><div style="font-size:11px;font-weight:800;color:#92400e;background:#fef3c7;padding:7px 10px;border-radius:999px">'+(D.foliosAsignadosOperador||[]).length+' pendiente(s)</div>'}
  const tb=view.querySelector('tbody');if(tb){const rows=D.foliosAsignadosOperador||[];tb.innerHTML=rows.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.operador||'—')+'</td><td>'+esc(x.responsable||'—')+'</td><td>'+new Date(x.asignadoAt||Date.now()).toLocaleDateString('es-MX')+'</td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="cc-btn cc-btn-primary" data-hs-use="'+esc(x.id)+'">Comprobar utilizada</button><button class="cc-btn cc-btn-light" data-hs-return="'+esc(x.id)+'">Regresar sin usar</button></div></td></tr>').join('')||'<tr><td colspan="5" style="padding:24px;text-align:center;color:#64748b">No hay hojas pendientes de comprobar.</td></tr>';tb.querySelectorAll('[data-hs-use]').forEach(b=>b.onclick=()=>comprobar(b.dataset.hsUse));tb.querySelectorAll('[data-hs-return]').forEach(b=>b.onclick=()=>devolver(b.dataset.hsReturn));}
  document.querySelectorAll('#ccPanelHojasServicio [data-hsv="Comprobacion"]').forEach(b=>b.textContent='Comprobación');
  // En historial/control, usar lenguaje de negocio.
  view.querySelectorAll('th').forEach(th=>{if((th.textContent||'').trim().toUpperCase()==='ACCIONES')th.textContent='COMPROBAR / DEVOLVER'});
 }
 async function boot(){if(!window.CC_AUTH_READY||!window.gmSupabase)return setTimeout(boot,600);try{await reload()}catch(e){console.warn('HS V4',e)}setInterval(()=>{if(document.getElementById('ccPanelHojasServicio')?.classList.contains('active'))reload().catch(()=>{})},30000)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900));else setTimeout(boot,900);
})();
'''
s += js
P.write_text(s,encoding='utf-8')
print('Hojas de Servicio v4 agregado')
