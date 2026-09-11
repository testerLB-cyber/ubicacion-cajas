from pathlib import Path

P=Path('profesional/assets/js/modules/service-sheets.js')
if not P.exists(): raise SystemExit('No existe service-sheets.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Hojas de Servicio v5 · comprobación por operador */'
if marker in s:
    print('v5 ya aplicado'); raise SystemExit(0)
js=r'''

/* Tráfico App Profesional · Hojas de Servicio v5 · comprobación por operador */
(function(){
 if(window.__ccServiceSheetsV5)return;window.__ccServiceSheetsV5=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const today=()=>new Date().toISOString().slice(0,10);
 let D=null, selectedOperatorId='';
 const opLabel=o=>(o.nombre||'')+(o.numeroEmpleado?' · '+o.numeroEmpleado:'');
 async function reload(){const r=await sb().rpc('hs_list');if(r.error)throw r.error;D=r.data;render();}
 function clientOptions(){return '<option value="">Seleccionar cliente…</option>'+((D?.clientes||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc((x.nombre||'')+(x.razonSocial&&x.razonSocial!==x.nombre?' · '+x.razonSocial:''))+'</option>').join(''));}
 function operatorsWithPending(){const ids=new Set((D?.foliosAsignadosOperador||[]).map(x=>x.operadorId));return (D?.operadores||[]).filter(o=>ids.has(o.id));}
 async function submitUsed(row,folioId){const fecha=row.querySelector('[data-fecha]').value,clienteId=row.querySelector('[data-cliente]').value,servicio=row.querySelector('[data-servicio]').value.trim();if(!fecha)return alert('Captura la fecha del servicio.');if(!clienteId)return alert('Selecciona un cliente del catálogo general.');if(!servicio)return alert('Captura el servicio realizado.');const b=row.querySelector('[data-comprobar]');b.disabled=true;try{const r=await sb().rpc('hs_mark_used',{p_item:{folioId,fecha,clienteId,servicio,observaciones:''}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo comprobar');await reload()}catch(e){alert(e.message||e);b.disabled=false}}
 async function returnBlank(row,folioId){const fecha=row.querySelector('[data-fecha]').value||today();if(!confirm('¿Confirmas que esta hoja regresó SIN USAR y vuelve al responsable?'))return;const b=row.querySelector('[data-return]');b.disabled=true;try{const r=await sb().rpc('hs_return_blank',{p_item:{folioId,fecha,observaciones:'Regresada sin usar desde comprobación por operador'}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo regresar');await reload()}catch(e){alert(e.message||e);b.disabled=false}}
 function render(){
  const view=document.getElementById('hsViewComprobacion');if(!view||!D)return;
  const pending=D.foliosAsignadosOperador||[], ops=operatorsWithPending();
  if(selectedOperatorId && !ops.some(o=>o.id===selectedOperatorId)) selectedOperatorId='';
  view.innerHTML='<div class="cc-toolbar"><div><strong>Comprobación por operador</strong><div class="cc-note">Busca al operador, revisa todas sus hojas pendientes y compruébalas una por una. Cliente proviene del catálogo general de Clientes.</div></div><div style="font-size:11px;font-weight:900;color:#92400e;background:#fef3c7;padding:8px 12px;border-radius:999px">'+pending.length+' hoja(s) pendiente(s)</div></div>'+
   '<div style="background:linear-gradient(135deg,#eff6ff,#f8fafc);border:1px solid #bfdbfe;border-radius:16px;padding:14px;margin-bottom:14px"><div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:10px;align-items:end"><div class="cc-field" style="margin:0"><label>Buscar operador</label><input id="hsOpSearch" placeholder="Escribe nombre o número de empleado…"></div><div class="cc-field" style="margin:0"><label>Seleccionar operador con hojas pendientes</label><select id="hsOpSelect"><option value="">Seleccionar operador…</option>'+ops.map(o=>'<option value="'+esc(o.id)+'" '+(o.id===selectedOperatorId?'selected':'')+'>'+esc(opLabel(o))+' · '+pending.filter(x=>x.operadorId===o.id).length+' pendiente(s)</option>').join('')+'</select></div></div></div>'+
   '<div id="hsOpSummary"></div><div id="hsOpPendingList"></div>';
  const search=view.querySelector('#hsOpSearch'), sel=view.querySelector('#hsOpSelect');
  search.oninput=()=>{const q=search.value.trim().toLowerCase();[...sel.options].forEach((o,i)=>{if(i===0)return;o.hidden=q&&!o.textContent.toLowerCase().includes(q)});};
  sel.onchange=()=>{selectedOperatorId=sel.value;renderOperator();};
  renderOperator();
 }
 function renderOperator(){
  const view=document.getElementById('hsViewComprobacion');if(!view||!D)return;const sum=view.querySelector('#hsOpSummary'), list=view.querySelector('#hsOpPendingList');if(!sum||!list)return;
  if(!selectedOperatorId){sum.innerHTML='';list.innerHTML='<div style="padding:28px;text-align:center;border:1px dashed #cbd5e1;border-radius:14px;color:#64748b;background:white"><div style="font-size:28px;margin-bottom:8px">👤</div><strong>Selecciona un operador</strong><div style="font-size:11px;margin-top:4px">Aquí aparecerán todas sus hojas pendientes de comprobar.</div></div>';return;}
  const op=(D.operadores||[]).find(x=>x.id===selectedOperatorId), rows=(D.foliosAsignadosOperador||[]).filter(x=>x.operadorId===selectedOperatorId);
  sum.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:4px 0 12px"><div><strong style="font-size:15px">'+esc(op?.nombre||'Operador')+'</strong><div style="font-size:10px;color:#64748b">'+esc(op?.numeroEmpleado||'')+'</div></div><span style="font-size:11px;font-weight:900;background:#fee2e2;color:#991b1b;padding:7px 10px;border-radius:999px">'+rows.length+' pendiente(s)</span></div>';
  if(!rows.length){list.innerHTML='<div style="padding:26px;text-align:center;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;color:#166534"><strong>Este operador no tiene hojas pendientes.</strong></div>';return;}
  list.innerHTML='<div style="display:grid;gap:10px">'+rows.map(x=>'<div data-row="'+esc(x.id)+'" style="background:#fff;border:1px solid #e2e8f0;border-radius:15px;padding:13px;box-shadow:0 8px 20px #0f172a0d"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px"><div><strong style="font-size:16px;color:#0f172a">'+esc(x.folio)+'</strong><div style="font-size:10px;color:#64748b;margin-top:3px">Responsable: '+esc(x.responsable||'—')+' · Entregada: '+new Date(x.asignadoAt||Date.now()).toLocaleDateString('es-MX')+'</div></div><span style="font-size:10px;font-weight:900;background:#fff7ed;color:#9a3412;padding:6px 9px;border-radius:999px">PENDIENTE DE COMPROBAR</span></div><div style="display:grid;grid-template-columns:150px minmax(220px,1fr) minmax(220px,1fr);gap:8px"><div class="cc-field" style="margin:0"><label>Fecha *</label><input type="date" data-fecha value="'+today()+'"></div><div class="cc-field" style="margin:0"><label>Cliente *</label><select data-cliente>'+clientOptions()+'</select></div><div class="cc-field" style="margin:0"><label>Servicio *</label><input data-servicio placeholder="Ej. Exportación, cruce, local…"></div></div><div style="display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:10px"><button class="cc-btn cc-btn-light" data-return>Regresar sin usar</button><button class="cc-btn cc-btn-primary" data-comprobar>Comprobar hoja</button></div></div>').join('')+'</div>';
  list.querySelectorAll('[data-row]').forEach(row=>{const id=row.dataset.row;row.querySelector('[data-comprobar]').onclick=()=>submitUsed(row,id);row.querySelector('[data-return]').onclick=()=>returnBlank(row,id);});
 }
 async function boot(){if(!window.CC_AUTH_READY||!window.gmSupabase)return setTimeout(boot,600);try{await reload()}catch(e){console.warn('HS V5',e)}setInterval(()=>{if(document.getElementById('ccPanelHojasServicio')?.classList.contains('active'))reload().catch(()=>{})},30000)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200));else setTimeout(boot,1200);
})();
'''
s += js
P.write_text(s,encoding='utf-8')
print('Hojas de Servicio v5 agregado')
