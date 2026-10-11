/* Control de Casetas: consulta bajo demanda */
(function(){
'use strict';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), money=n=>Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const state={data:null,op:null,busy:false,loaded:false};
const sb=()=>window.gmSupabase;
function client(){let s=sb();if(s&&typeof s.rpc==='function')return s;throw Error('No hay sesión de Supabase disponible');}
async function rpc(name,item){let {data,error}=await client().rpc(name,item===undefined?undefined:{p_item:item});if(error)throw error;if(data?.ok===false)throw Error(data.error||'Operación rechazada');return data;}
function statusBox(id,t,bad=false){const box=$(id);if(!box)return;box.textContent=t||'';box.hidden=!t;box.style.display=t?'block':'none';box.style.color=bad?'#991b1b':'#065f46';box.style.background=bad?'#fef2f2':'#ecfdf5';box.style.border=bad?'1px solid #fecaca':'1px solid #a7f3d0';}
function note(t,bad=false){const el=$('#casMessage');if(el){const visible=bad||(/registrad[oa]|conciliaci[oó]n registrada/i.test(t||''));el.textContent=visible?(t||''):'';el.hidden=!visible;el.style.display=visible?'block':'none';el.style.color=bad?'#b91c1c':'#0f766e';}
const active=$('#ccAntViewCasetasNuevo [data-cas-panel="comprobar"]')?.style.display!=='none';
if(active)statusBox('#casComprobarEstado',t,bad);else statusBox('#casEntregaEstado',t,bad);
}
async function refreshBalances(){const d=await rpc('cc_ant_casetas_list');state.data=d;state.loaded=true;render();entregaOptions();comprobarUpdate();return d;}
function open(){const el=$('#ccAntViewCasetasNuevo');if(!el)return;const search=$('#casSearch');if(search){search.value='';delete search.dataset.expanded;}const list=$('#casOperators');if(list)list.hidden=true;document.querySelectorAll('#ccPanelAnticipos .cc-ant-view').forEach(x=>x.style.display='none');el.style.display='block';el.classList.add('cas-fullscreen');showWorkspaceTab('entregar');casAuditTab('operar');document.body.style.overflow='hidden';document.querySelectorAll('#ccPanelAnticipos [data-antv]').forEach(x=>x.className='cc-btn cc-btn-light');const b=$('#ccAntNavCasetasNuevo');if(b)b.className='cc-btn cc-btn-primary';if(!state.loaded)load();else render();}
function active(){return (state.data?.anticipos||[]).filter(a=>Number(a.pendiente)>0);}
function funds(op){return active().filter(a=>a.operadorId===op);}
function ops(){return state.data?.operadores||[];}
function current(){return ops().find(o=>o.id===state.op);}
function summary(){let d=state.data||{},a=d.anticipos||[],mov=d.movimientos||[],cuenta=(d.cuentas||[]).find(x=>x.es_default_casetas)||(d.cuentas||[])[0];let balance=Number(cuenta?.saldo_inicial||0)+mov.reduce((s,x)=>s+(x.tipo==='DEPOSITO'||x.tipo==='DEVOLUCION'||x.tipo==='AJUSTE_ENTRADA'?1:-1)*Number(x.monto||0),0);return {cuenta,balance,pend:a.reduce((s,x)=>s+Number(x.pendiente||0),0),ent:a.reduce((s,x)=>s+Number(x.montoEntregado||0),0),comp:a.reduce((s,x)=>s+Number(x.comprobado||0),0),dev:a.reduce((s,x)=>s+Number(x.devuelto||0),0)};}
function render(){
 const d=state.data,s=summary(),op=current(),ff=funds(state.op);
 const pendingOps=new Set((d.anticipos||[]).filter(a=>Number(a.pendiente||0)>0).map(a=>a.operadorId)).size;
 const pendingAnt=(d.anticipos||[]).filter(a=>Number(a.pendiente||0)>0).length;
 const metrics=[['Caja principal',s.cuenta?.nombre||'SIN CONFIGURAR'],['Saldo estimado de caja',money(s.balance)],['Entregado acumulado',money(s.ent)],['Tickets comprobados',money(s.comp)],['Efectivo devuelto',money(s.dev)],['Pendiente de justificar',money(s.pend)],['Operadores con pendiente',String(pendingOps)],['Anticipos CAS pendientes',String(pendingAnt)],['Diferencia por justificar',money(Math.max(0,s.ent-s.comp-s.dev-s.pend))]];
 $('#casMetrics').innerHTML=metrics.map((x,i)=>'<div class="cas-kpi"'+(i===5||i===6||i===7?' role="button" tabindex="0" data-cas-kpi-pending="1" title="Ver saldos por operador" style="cursor:pointer"':'')+'><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></div>').join('');
 const q=($('#casSearch')?.value||'').toLowerCase().trim();
 $('#casOperators').hidden=!$('#casSearch').dataset.expanded&&!q;
 $('#casOperators').innerHTML=(!$('#casOperators').hidden?ops().filter(o=>!q||(o.nombre||'').toLowerCase().includes(q)||(o.numero_empleado||'').toLowerCase().includes(q)):[]).map(o=>{let v=(d.anticipos||[]).filter(a=>a.operadorId===o.id),p=v.reduce((n,a)=>n+Number(a.pendiente||0),0);return '<button class="cas-person '+(state.op===o.id?'selected':'')+'" data-op="'+esc(o.id)+'"><b>'+esc(o.nombre)+'</b><span>'+esc(o.numero_empleado||'')+'</span><strong>'+money(p)+'</strong></button>'}).join('')||'<p>Sin operadores.</p>';
 $('#casOperatorName').textContent=op?op.nombre:'Seleccione un operador';
 let pending=ff.reduce((n,a)=>n+Number(a.pendiente||0),0);
 $('#casOperatorBalance').textContent=money(pending);
 $('#casFunds').innerHTML=ff.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.folio)+' · '+money(a.pendiente)+'</option>').join('');
 $('#casHistory').innerHTML=(d.anticipos||[]).filter(a=>a.operadorId===state.op).slice(0,25).map(a=>{const delivered=Number(a.montoEntregado||0),checked=Number(a.comprobado||0),returned=Number(a.devuelto||0),pending=Number(a.pendiente||0),diff=delivered-checked-returned-pending;return '<tr title="Conciliación: entregado - comprobado - devuelto - pendiente = '+money(diff)+'"><td>'+esc(a.folio)+'</td><td>'+esc((a.fecha||'').slice(0,10))+'</td><td>'+money(delivered)+'</td><td>'+money(checked)+'</td><td>'+money(returned)+'</td><td><b>'+money(pending)+'</b>'+(Math.abs(diff)>0.01?'<small style="display:block;color:#b91c1c">Diferencia: '+money(diff)+'</small>':'')+'</td></tr>'}).join('')||'<tr><td colspan="6">Sin movimientos</td></tr>';
 $('#casTickets').innerHTML=(d.tickets||[]).filter(t=>t.operador_id===state.op).slice(0,25).map(t=>'<tr><td>'+esc((t.fecha||'').slice(0,10))+'</td><td>'+esc(t.plaza||'—')+'</td><td>'+esc(t.folio_ticket||'—')+'</td><td>'+money(t.total)+'</td><td>'+esc(t.estatus)+'</td></tr>').join('')||'<tr><td colspan="5">Sin tickets</td></tr>';
 $('#casOperatorSection').hidden=false;$('#casOperatorSection').style.display='block';
 calc();
}
function calc(){let p=funds(state.op).reduce((s,a)=>s+Number(a.pendiente||0),0),ticket=Number($('#casTicketAmount')?.value||0),dev=Number($('#casReturnAmount')?.value||0),ent=Number($('#casNewAmount')?.value||0),cash=$('#casCashDeclared')?.value;$('#casExpected').textContent=money(p-ticket-dev+ent);$('#casDeclaredDiff').textContent=cash===''?'Sin declarar':money(Number(cash)-(p-ticket-dev+ent));}
async function load(){if(state.busy)return;state.busy=true;note('Consultando saldos…');try{const d=await rpc('cc_ant_casetas_list');state.data=d;state.loaded=true;note('');render();entregaOptions();comprobarUpdate();await cargarTarifas();}catch(e){note(e.message||String(e),true)}finally{state.busy=false;}}
async function act(kind){if(state.busy||!state.op)return;let f=$('#casFunds').value,amount=Number($(kind==='ticket'?'#casTicketAmount':kind==='return'?'#casReturnAmount':'#casNewAmount').value),pending=funds(state.op).find(a=>a.id===f);if(!Number.isFinite(amount)||amount<=0){note('Indique un importe válido',true);return;}if(kind!=='delivery'&&(!pending||amount>Number(pending.pendiente))){note('El importe excede el fondo seleccionado',true);return;}if(!confirm('¿Confirmar '+(kind==='ticket'?'ticket':kind==='return'?'devolución de efectivo':'entrega')+' por '+money(amount)+'?'))return;
state.busy=true;note('Registrando movimiento…');
try{let payload;if(kind==='ticket'){payload={anticipoId:f,monto:amount,fecha:$('#casTicketDate').value,folioTicket:$('#casTicketFolio').value.trim(),plaza:$('#casTicketPlaza').value.trim(),carril:$('#casTicketLane').value.trim(),observaciones:$('#casTicketNotes').value.trim()};await rpc('cc_ant_casetas_ticket',payload);}
else if(kind==='delivery'){payload={operadorId:state.op,monto:amount,fecha:new Date().toISOString(),observaciones:$('#casNotes').value.trim()};await rpc('cc_ant_casetas_entregar',payload);}
else{payload={anticipoId:f,cuentaId:pending.cuentaId,tipo:'DEVOLUCION',monto:amount,fecha:new Date().toISOString(),referencia:pending.folio,observaciones:$('#casNotes').value.trim()};await rpc('cc_ant_add_cash_movement',payload);}
note('Movimiento registrado correctamente');for(let id of ['#casTicketAmount','#casReturnAmount','#casNewAmount'])$(id).value='';}catch(e){note(e.message||String(e),true)}finally{state.busy=false;}await load();}
async function loadCFDI(){
const op=current(),status=$('#casCFDIStatus'),body=$('#casCFDIBody');if(!op)return;
const from=$('#casCFDIFrom').value,to=$('#casCFDITo').value;if(!from||!to||from>to){status.textContent='Selecciona un rango válido';return;}
status.textContent='Consultando hojas CFDI comprobadas…';body.innerHTML='';$('#casCFDICount').textContent='…';
try{
const {data,error}=await client().from('hs_comprobaciones').select('folio_id,fecha_comprobacion,fecha,cliente_nombre,servicio,operador_id,operador_nombre').gte('fecha_comprobacion',from+'T00:00:00').lte('fecha_comprobacion',to+'T23:59:59').or('operador_id.eq.'+op.id+',operador_nombre.eq.'+encodeURIComponent(op.nombre)).limit(500);
if(error)throw error;
let items=(data||[]).filter(x=>x.folio_id);let unique=[...new Map(items.map(x=>[x.folio_id,x])).values()];
let ids=unique.map(x=>x.folio_id);let folios=[];for(let i=0;i<ids.length;i+=100){let v=await client().from('hs_folios').select('id,folio').in('id',ids.slice(i,i+100));if(v.error)throw v.error;folios.push(...(v.data||[]));}
let map=new Map(folios.map(f=>[f.id,f.folio]));unique=unique.filter(x=>/^CFDI-/i.test(map.get(x.folio_id)||''));
$('#casCFDICount').textContent=String(unique.length);
body.innerHTML=unique.map(x=>'<tr><td><b>'+esc(map.get(x.folio_id))+'</b></td><td>'+esc((x.fecha_comprobacion||x.fecha||'').slice(0,10))+'</td><td>'+esc(x.cliente_nombre||'—')+'</td><td>'+esc(x.servicio||'—')+'</td></tr>').join('')||'<tr><td colspan="4">No se encontraron hojas CFDI comprobadas.</td></tr>';
status.textContent=unique.length+' hojas CFDI únicas · rango '+from+' a '+to+(items.length===500?' · Consulta limitada a 500 registros':'');
}catch(e){status.textContent='No fue posible consultar CFDI: '+(e.message||e);$('#casCFDICount').textContent='—';}
}
const batch=[];
function batchRender(){
 const list=$('#casBatchItems');if(!list)return;
 list.innerHTML=batch.map((t,i)=>'<div style="display:flex;justify-content:space-between;padding:9px;border-bottom:1px solid #ddd"><span>'+esc(t.folioTicket||'Sin folio')+' · '+esc(t.plaza||'Caseta')+' · '+money(t.monto)+'</span><button type="button" data-batch-remove="'+i+'" style="color:#b91c1c">Quitar</button></div>').join('')||'<p style="color:#64748b">Aún no agregas tickets.</p>';
 const total=batch.reduce((s,t)=>s+Number(t.monto),0),dev=Number($('#casBatchReturn')?.value||0),ent=Number($('#casBatchDelivery')?.value||0),pending=funds(state.op).reduce((s,a)=>s+Number(a.pendiente||0),0);
 $('#casBatchSummary').textContent='Tickets: '+money(total)+' | Devolución: '+money(dev)+' | Nueva entrega: '+money(ent)+' | Pendiente estimado: '+money(pending-total-dev+ent);
}
function batchAdd(){
 const monto=Number($('#casBatchAmount').value),folio=$('#casBatchFolio').value.trim(),plaza=$('#casBatchPlaza').value.trim(),fecha=$('#casBatchDate').value;
 if(!Number.isFinite(monto)||monto<=0||!plaza||!fecha){note('Indica importe, plaza y fecha válidos',true);return;}
 if(batch.length>=50){note('Máximo 50 tickets por conciliación',true);return;}
 batch.push({monto,folioTicket:folio,plaza,fecha});$('#casBatchAmount').value='';$('#casBatchFolio').value='';$('#casBatchPlaza').value='';batchRender();
}
async function batchSave(){
 if(state.busy||!state.op)return;
 const t=batch.reduce((s,x)=>s+Number(x.monto),0),dev=Number($('#casBatchReturn').value||0),ent=Number($('#casBatchDelivery').value||0),cash=$('#casBatchCash').value,selected=funds(state.op).find(a=>a.id===$('#casFunds').value);
 if([dev,ent].some(x=>!Number.isFinite(x)||x<0)||t+dev+ent<=0){note('Agrega un movimiento válido',true);return;}
 if(t+dev>0&&(!selected||t+dev>Number(selected.pendiente))){note('Selecciona un fondo con saldo suficiente para tickets y devolución',true);return;}
 if(cash!==''&&(!Number.isFinite(Number(cash))||Number(cash)<0)){note('El efectivo declarado no es válido',true);return;}
 if(!confirm('¿Guardar conciliación completa? Tickets '+money(t)+', devolución '+money(dev)+', entrega '+money(ent)))return;
 state.busy=true;$('#casBatchSave').disabled=true;note('Guardando conciliación…');
 try{await rpc('cc_ant_casetas_conciliar',{operadorId:state.op,anticipoId:selected?.id||null,cuentaId:selected?.cuentaId||null,tickets:batch,devolucion:dev,entrega:ent,efectivoDeclarado:cash===''?null:Number(cash),observaciones:$('#casBatchNotes').value.trim()});batch.length=0;for(const id of ['#casBatchReturn','#casBatchDelivery','#casBatchCash','#casBatchNotes'])$(id).value='';note('Conciliación registrada');}
 catch(e){note(e.message||String(e),true);}
 finally{state.busy=false;$('#casBatchSave').disabled=false;}
 await load();batchRender();
}
function setupWorkspace(){
 const root=$('#ccAntViewCasetasNuevo'),section=$('#casOperatorSection');if(!root||!section||root.dataset.workspace)return;root.dataset.workspace='1';
 const cards=[...section.querySelectorAll(':scope > .cas-card')];
 const audit=$('#casAuditPanel');if(audit){const oldNav=audit.previousElementSibling;if(oldNav?.classList.contains('cas-work-nav'))oldNav.remove();}
 const groups=[
 ['entregar','Entregar',[section.querySelector('#casEntregaSimple')]],
 ['comprobar','Comprobar',[section.querySelector('#casComprobarSimple')]],
 ['saldos','Saldos por operador',[]],
 ['historial','Historial',[audit]],
 ['reportes','Reportes',[]]
 ];
 const nav=document.createElement('nav');nav.className='cas-work-tabs';nav.setAttribute('aria-label','Operaciones de casetas');
 const host=document.createElement('div');host.className='cas-work-content';
 for(const [id,title,items] of groups){
  const btn=document.createElement('button');btn.type='button';btn.textContent=title;btn.dataset.casTab=id;nav.append(btn);
  const panel=document.createElement('section');panel.className='cas-work-panel';panel.dataset.casPanel=id;panel.hidden=true;
  if(id==='saldos'){panel.innerHTML='<div class="cas-card"><div class="cas-section-head"><div><h3>Saldos por operador</h3><p>Dinero entregado pendiente de justificar. Consulta bajo demanda.</p></div><button type="button" class="cc-btn cc-btn-light" id="casBalancesRefresh">Actualizar saldos</button></div><label for="casBalancesOnlyPending" style="display:flex;gap:10px;align-items:center;margin:12px 0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;cursor:pointer;font-size:13px;font-weight:700;color:#334155"><input type="checkbox" id="casBalancesOnlyPending" checked style="appearance:auto;-webkit-appearance:checkbox;display:inline-block;flex:0 0 18px;width:18px;height:18px;margin:0;accent-color:#0f766e"><span id="casBalancesFilterLabel">Mostrar solo operadores con anticipos pendientes</span></label><div class="cas-scroll"><table><thead><tr><th>Operador</th><th>Entregado</th><th>Comprobado</th><th>Devuelto</th><th>Pendiente</th><th>Última entrega</th></tr></thead><tbody id="casBalancesBody"><tr><td colspan="6">Presiona Actualizar saldos.</td></tr></tbody></table></div><div id="casBalancesDetail" style="margin-top:12px"></div><div style="margin-top:22px;padding-top:15px;border-top:1px solid #cbd5e1"><h3>Saldo pendiente a operadores</h3><p style="font-size:13px;color:#64748b">Importes comprobados superiores al dinero entregado que aún deben pagarse al operador.</p><div class="cas-scroll"><table><thead><tr><th>Operador</th><th>Fecha</th><th>Importe por pagar</th><th>Comentarios</th><th>Acción</th></tr></thead><tbody id="casOwedBody"><tr><td colspan="5">Presiona Actualizar saldos.</td></tr></tbody></table></div></div></div>';}
  if(id==='reportes'){panel.innerHTML='<div class="cas-card"><div class="cas-section-head"><div><h3>Reportes de Casetas</h3><p>Cortes administrativos, comprobaciones de operadores y resumen ejecutivo. Consultas bajo demanda.</p></div></div><div class="cas-grid"><label>Desde<input id="casReportFrom" type="date"></label><label>Hasta<input id="casReportTo" type="date"></label><label>Reporte<select id="casReportType"><option value="CAJA">Movimientos y cierre administrativo de caja</option><option value="OPERADORES">Anticipos y comprobaciones por operador</option><option value="EJECUTIVO">Resumen ejecutivo de Casetas</option></select></label><label>Efectivo contado (opcional, para conciliación)<input id="casReportCounted" type="number" min="0" step="0.01" placeholder="Importe físico contado"></label></div><div style="display:flex;flex-wrap:wrap;gap:9px;margin:12px 0"><button type="button" class="cc-btn cc-btn-primary" id="casReportRun">Generar reporte</button><button type="button" class="cc-btn cc-btn-light" id="casReportPdf" disabled>Exportar PDF / Imprimir</button><button type="button" class="cc-btn cc-btn-light" id="casReportExcel" disabled>Exportar Excel (CSV)</button></div><p id="casReportStatus" role="status" style="font-size:12px;color:#64748b">Selecciona el periodo y genera el reporte.</p><div id="casReportOutput"></div><p style="font-size:11px;color:#64748b;margin-top:12px">La consulta no cierra ni modifica la caja. El saldo esperado se calcula desde movimientos reales, incluidas entradas y salidas manuales y transferencias registradas.</p></div>';}
  for(const item of items.filter(Boolean)){panel.append(item);if(id==='historial'){item.hidden=false;item.style.display='block';}}
  host.append(panel);
 }
 section.prepend(host);section.prepend(nav);
 for(const card of cards){if(!card.closest('.cas-work-panel'))card.style.display='none';}
 const hero=section.querySelector('.cas-action-hero');if(hero)hero.remove();
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-cas-tab]');if(b){showWorkspaceTab(b.dataset.casTab);if(b.dataset.casTab==='historial'){casAuditOperators();casAuditLoad();}if(b.dataset.casTab==='saldos')casBalancesLoad();}});
 showWorkspaceTab('entregar');
}

let casReportRows=[],casReportHeaders=[],casReportTitle='',casReportSummary=[],casReportDateRange='';
function casReportDownloadCsv(){
 if(!casReportHeaders.length)return;
 const rows=[['Reporte',casReportTitle],['Periodo',casReportDateRange],[],...casReportSummary,[],casReportHeaders,...casReportRows];
 const csv='\\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\\r\\n');
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='casetas-'+$('#casReportType').value.toLowerCase()+'-'+casLocalDate()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function casReportPrint(){
 const table=$('#casReportOutput').innerHTML;
 const w=window.open('','_blank');if(!w){alert('Permite ventanas emergentes para generar el PDF.');return;}
 w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+esc(casReportTitle)+'</title><style>body{font:12px Arial,sans-serif;color:#172b4d;margin:28px}h1{font-size:20px}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #dbe2ea;padding:7px;text-align:left}th{background:#edf4fc}strong{font-weight:800}.cas-report-kpis{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.cas-report-kpis div{padding:12px;border:1px solid #dbe2ea;min-width:125px}.cas-report-kpis small{display:block;color:#64748b}@page{size:A4 landscape;margin:12mm}</style></head><body><h1>'+esc(casReportTitle)+'</h1><p>Periodo: '+esc(casReportDateRange)+' · Generado: '+esc(new Date().toLocaleString('es-MX'))+'</p>'+table+'<p>Reporte informativo generado por Tráfico App. No representa un cierre definitivo autorizado.</p></body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),350);
}
function casReportRender(title,summary,headers,rows){
 casReportTitle=title;casReportSummary=summary;casReportHeaders=headers;casReportRows=rows;
 const kpis='<div class="cas-report-kpis" style="display:flex;flex-wrap:wrap;gap:9px;margin:14px 0">'+summary.map(x=>'<div style="border:1px solid #cbd5e1;border-radius:9px;padding:11px;min-width:145px;background:#f8fafc"><small style="display:block;color:#64748b">'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></div>').join('')+'</div>';
 const table='<div class="cas-scroll"><table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 $('#casReportOutput').innerHTML='<h3>'+esc(title)+'</h3>'+kpis+table;
 $('#casReportPdf').disabled=false;$('#casReportExcel').disabled=false;
}
async function casReportRun(){
 const from=$('#casReportFrom').value,to=$('#casReportTo').value,type=$('#casReportType').value,status=$('#casReportStatus');
 if(!from||!to||from>to){status.textContent='Selecciona un rango válido.';return;}
 const span=Math.round((new Date(to+'T12:00:00')-new Date(from+'T12:00:00'))/86400000);if(span>366){status.textContent='El máximo por consulta es de 366 días.';return;}
 const btn=$('#casReportRun');btn.disabled=true;status.textContent='Generando reporte desde los movimientos registrados…';$('#casReportPdf').disabled=true;$('#casReportExcel').disabled=true;
 casReportDateRange=from+' al '+to;
 try{
  const caja=await rpc('cc_ant_casetas_reporte_caja',{desde:from,hasta:to});
  const cashMov=caja.movimientos||[],fmt=n=>money(n),date=x=>String(x||'').slice(0,16).replace('T',' ');
  const count=$('#casReportCounted').value.trim(),counted=count===''?null:Number(count);
  if(counted!==null&&(!Number.isFinite(counted)||counted<0))throw Error('El efectivo contado debe ser un importe válido.');
  const base=[['Saldo inicial',fmt(caja.saldoInicial)],['Entradas de caja',fmt(caja.entradas)],['Salidas de caja',fmt(caja.salidas)],['Saldo final esperado',fmt(caja.saldoFinal)]];
  if(counted!==null){base.push(['Efectivo contado',fmt(counted)],['Diferencia',fmt(counted-Number(caja.saldoFinal))]);}
  if(type==='CAJA'){
   const rows=cashMov.map(x=>[date(x.fecha),x.concepto||x.tipo,x.naturaleza||'SIN CLASIFICAR',x.operador||'—',x.anticipo||x.referencia||'—',x.naturaleza==='ENTRADA'?fmt(x.monto):'—',x.naturaleza==='SALIDA'?fmt(x.monto):'—',x.observaciones||'—']);
   casReportRender('Movimientos y cierre administrativo de Caja de Casetas',base,['Fecha','Movimiento','Naturaleza','Operador','Folio / Referencia','Entrada','Salida','Comentarios'],rows);
  }else{
   const data=await rpc('cc_ant_casetas_list'),opsMap=new Map((data.operadores||[]).map(o=>[o.id,o.nombre])),ant=(data.anticipos||[]).filter(a=>String(a.fecha||'').slice(0,10)>=from&&String(a.fecha||'').slice(0,10)<=to),comp=(data.comprobaciones_resumen||[]).filter(x=>String(x.fecha||'').slice(0,10)>=from&&String(x.fecha||'').slice(0,10)<=to);
   if(type==='OPERADORES'){
    const map=new Map();const ensure=id=>{if(!map.has(id))map.set(id,{nombre:opsMap.get(id)||'Operador',ent:0,comp:0,dev:0,tickets:0});return map.get(id);};
    ant.forEach(a=>{let x=ensure(a.operadorId);x.ent+=Number(a.montoEntregado||0);x.dev+=Number(a.devuelto||0);});
    comp.forEach(c=>{let x=ensure(c.operador_id);x.comp+=Number(c.importe_total||0);x.tickets+=Number(c.cantidad||0);});
    const owed=await rpc('cc_ant_casetas_saldos_favor_list'),owedMap=new Map();(owed.saldos||[]).forEach(x=>owedMap.set(x.operadorId,(owedMap.get(x.operadorId)||0)+Number(x.pendiente||0)));
    const rows=[...map.entries()].sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre)).map(([id,x])=>[x.nombre,fmt(x.ent),fmt(x.comp),fmt(x.dev),fmt(Math.max(x.ent-x.comp-x.dev,0)),fmt(owedMap.get(id)||0),x.tickets]);
    casReportRender('Anticipos y comprobaciones por operador', [['Operadores con movimientos',String(rows.length)],['Tickets comprobados',String(comp.reduce((n,x)=>n+Number(x.cantidad||0),0))]],['Operador','Entregado en periodo','Comprobado en periodo','Devuelto (anticipos del periodo)','Diferencia del periodo*','Por pagar actual','Tickets'],rows);
    $('#casReportOutput').insertAdjacentHTML('beforeend','<p style="font-size:11px;color:#64748b">* Diferencia del periodo: indicador comparativo, no equivale necesariamente al saldo pendiente real por operador. Las devoluciones se asocian a anticipos fechados en el periodo.</p>');
   }else{
    const owed=await rpc('cc_ant_casetas_saldos_favor_list');
    const totals=[...base,['Comprobaciones del periodo',fmt(comp.reduce((n,x)=>n+Number(x.importe_total||0),0))],['Tickets comprobados',String(comp.reduce((n,x)=>n+Number(x.cantidad||0),0))],['Pendiente por pagar a operadores (actual)',fmt((owed.saldos||[]).reduce((n,x)=>n+Number(x.pendiente||0),0))]];
    casReportRender('Resumen ejecutivo de Casetas',totals,['Fecha','Movimiento','Naturaleza','Importe'],cashMov.map(x=>[date(x.fecha),x.concepto||x.tipo,x.naturaleza||'—',fmt(x.monto)]));
   }
  }
  status.textContent='Reporte generado: '+cashMov.length+' movimientos contables de caja en el periodo. Las comprobaciones no se descuentan dos veces.';
 }catch(e){status.textContent='No se pudo generar el reporte: '+(e.message||e);$('#casReportOutput').textContent='';}
 finally{btn.disabled=false;}
}
async function casBalancesLoad(){
 const body=$('#casBalancesBody');if(!body)return;body.innerHTML='<tr><td colspan="6">Actualizando saldos…</td></tr>';
 try{
  const [data,owed]=await Promise.all([rpc('cc_ant_casetas_list'),client().rpc('cc_ant_casetas_saldos_favor_list').then(({data,error})=>{if(error)throw error;return data;})]),items=data.anticipos||[],map=new Map();
  const owedBody=$('#casOwedBody');if(owedBody){owedBody.innerHTML=(owed.saldos||[]).map(x=>'<tr><td>'+esc(x.operador)+'</td><td>'+esc(String(x.fecha||'').slice(0,10))+'</td><td><strong>'+money(x.pendiente)+'</strong></td><td>'+esc(x.comentarios||'—')+'</td><td><button type="button" class="cc-btn cc-btn-light" data-owed-pay="'+esc(x.id)+'">Registrar pago</button></td></tr>').join('')||'<tr><td colspan="5">No hay saldos pendientes de pago a operadores.</td></tr>';owedBody.onclick=async e=>{const btn=e.target.closest('[data-owed-pay]');if(!btn)return;const x=(owed.saldos||[]).find(x=>x.id===btn.dataset.owedPay);if(!x||!confirm('¿Confirmas que entregaste '+money(x.pendiente)+' a '+x.operador+'? Se descontará de caja y se liquidará este saldo.'))return;btn.disabled=true;try{await rpc('cc_ant_casetas_saldo_favor_pagar',{id:x.id});await casBalancesLoad();}catch(err){alert('No se registró el pago: '+(err.message||err));btn.disabled=false;}};}
  for(const o of data.operadores||ops())map.set(o.id,{id:o.id,nombre:o.nombre,ent:0,comp:0,dev:0,pend:0,last:''});
  for(const a of items){let x=map.get(a.operadorId);if(!x){x={id:a.operadorId,nombre:a.operador||'—',ent:0,comp:0,dev:0,pend:0,last:''};map.set(a.operadorId,x);}x.ent+=Number(a.montoEntregado)||0;x.comp+=Number(a.comprobado)||0;x.dev+=Number(a.devuelto)||0;x.pend+=Number(a.pendiente)||0;if(String(a.fecha||'')>x.last)x.last=a.fecha;}
  const all=[...map.values()],only=$('#casBalancesOnlyPending')?.checked;
  const shown=all.filter(x=>!only||x.pend>0.005).sort((a,b)=>b.pend-a.pend);
  const total=k=>all.reduce((n,x)=>n+x[k],0);
  const balance=Number((data.cuentas||[]).reduce((n,c)=>n+Number(c.saldo_inicial||0),0))+(data.movimientos||[]).reduce((n,m)=>n+(['DEPOSITO','DEVOLUCION','AJUSTE_ENTRADA'].includes(m.tipo)?1:-1)*Number(m.monto||0),0);

  body.innerHTML=shown.map(x=>'<tr data-cas-balance-op="'+esc(x.id)+'" style="cursor:pointer"><td><b>'+esc(x.nombre)+'</b></td><td>'+money(x.ent)+'</td><td>'+money(x.comp)+'</td><td>'+money(x.dev)+'</td><td><b>'+money(x.pend)+'</b></td><td>'+esc(String(x.last||'—').slice(0,10))+'</td></tr>').join('')||'<tr><td colspan="6">No hay operadores con saldo pendiente.</td></tr>';
  body.onclick=e=>{const row=e.target.closest('[data-cas-balance-op]');if(!row)return;const x=map.get(row.dataset.casBalanceOp);$('#casBalancesDetail').innerHTML='<div class="cas-card"><strong>'+esc(x.nombre)+'</strong><p>Entregado: '+money(x.ent)+' · Comprobado: '+money(x.comp)+' · Devuelto: '+money(x.dev)+' · <b>Pendiente: '+money(x.pend)+'</b></p><small>Última entrega: '+esc(String(x.last||'—').slice(0,10))+'</small></div>';};
 }catch(e){body.innerHTML='<tr><td colspan="6">Error al consultar saldos: '+esc(e.message||e)+'</td></tr>';}
}
function showWorkspaceTab(id){
 const root=$('#ccAntViewCasetasNuevo');if(!root)return;
 root.querySelectorAll('[data-cas-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.casTab===id);b.setAttribute('aria-selected',String(b.dataset.casTab===id));});
 root.querySelectorAll('[data-cas-panel]').forEach(p=>{p.hidden=p.dataset.casPanel!==id;p.style.display=p.hidden?'none':'block';});
 if(id==='saldos'&&state.loaded){const refresh=root.querySelector('#casBalancesRefresh');if(refresh&&!refresh.disabled)refresh.click();}
}
window.ccCasetasShowTab=showWorkspaceTab;
let entregaSelectedId=null;
function entregaOptions(){
 const input=$('#casEntregaOperador'),list=$('#casEntregaSuggestions');if(!input||!list)return;
 if(!input.value.trim()){list.hidden=true;list.innerHTML='';input.setAttribute('aria-expanded','false');return;}
 const q=input.value.trim().toLocaleLowerCase('es-MX'),matches=ops().filter(o=>!q||(o.nombre||'').toLocaleLowerCase('es-MX').includes(q)||(o.numero_empleado||'').toLocaleLowerCase('es-MX').includes(q)).slice(0,12);
 list.innerHTML=matches.map(o=>'<button type="button" class="cas-operator-option" role="option" data-entrega-op="'+esc(o.id)+'"><span>'+esc(o.nombre)+'</span><small>'+esc(o.numero_empleado||'')+'</small></button>').join('')||'<div class="cas-operator-empty">No se encontraron operadores</div>';
 list.hidden=false;input.setAttribute('aria-expanded','true');
}
function entregaPick(id){
 const op=ops().find(o=>o.id===id);if(!op)return;
 entregaSelectedId=id;$('#casEntregaOperador').value=op.nombre;$('#casEntregaSuggestions').hidden=true;$('#casEntregaOperador').setAttribute('aria-expanded','false');
}
async function guardarEntrega(){
 if(state.busy){statusBox('#casEntregaEstado','Hay una operación en curso. Espera un momento.',true);return;}
 const name=$('#casEntregaOperador').value.trim(),matching=ops().filter(o=>o.id===entregaSelectedId&&o.nombre===name),amount=Number($('#casEntregaImporte').value),fecha=$('#casEntregaFecha').value;
 const fail=t=>statusBox('#casEntregaEstado',t,true);
 if(matching.length!==1){fail('Selecciona un operador válido de la lista');return;}
 if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(Math.round(amount*100))){fail('Captura un importe válido');return;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){fail('Selecciona la fecha de entrega');return;}
 if(!confirm('¿Entregar '+money(amount)+' a '+matching[0].nombre+' con fecha '+fecha+'?')){statusBox('#casEntregaEstado','Operación cancelada; no se registró ningún movimiento.',true);return;}
 state.busy=true;$('#casEntregaGuardar').disabled=true;statusBox('#casEntregaEstado','Guardando entrega…');
 let saved=false;
 try{
  await rpc('cc_ant_casetas_entregar',{operadorId:matching[0].id,monto:amount,fecha:fecha+'T12:00:00',observaciones:''});
  saved=true;state.op=matching[0].id;entregaSelectedId=null;$('#casEntregaOperador').value='';$('#casEntregaImporte').value='';$('#casEntregaFecha').value=new Date().toLocaleDateString('en-CA');$('#casEntregaSuggestions').hidden=true;
  statusBox('#casEntregaEstado','✓ Entrega guardada correctamente. Actualizando saldos…');
  try{await refreshBalances();statusBox('#casEntregaEstado','✓ Entrega guardada correctamente. Saldos actualizados.');}
  catch(e){statusBox('#casEntregaEstado','✓ Entrega guardada, pero no se pudieron actualizar los saldos: '+(e.message||e),true);}
 }catch(e){if(!saved)fail('No se confirmó el registro de la entrega: '+(e.message||e));}
 finally{state.busy=false;$('#casEntregaGuardar').disabled=false;}
}

let casTarifas=[];
async function cargarTarifas(){
 try{const data=await rpc('cc_ant_casetas_tarifas_list');casTarifas=data.tarifas||[];
 const holder=$('#casComprobarTiposFilas');
 if(holder){const previous=Object.fromEntries([...holder.querySelectorAll('[data-cas-qty]')].map(e=>[e.dataset.casQty,e.value]));
 holder.innerHTML=casTarifas.filter(t=>t.activo).map(t=>'<label style="display:grid;grid-template-columns:minmax(110px,1fr) 90px 100px;gap:8px;align-items:center;margin:8px 0">'+esc(t.nombre)+' <input type="number" min="0" max="1000" step="1" value="'+esc(previous[t.id]??'0')+'" data-cas-qty="'+esc(t.id)+'" aria-label="Tickets '+esc(t.nombre)+'"><small style="text-align:right">'+money(t.importe)+'/ticket</small></label>').join('')||'No hay tipos activos.';
 }
 const box=$('#casTarifasLista');if(box){box.innerHTML=casTarifas.map(t=>'<div style="display:grid;grid-template-columns:minmax(120px,1fr) 110px 90px 85px;gap:8px;align-items:center;margin:7px 0" data-tarifa-row="'+esc(t.id)+'"><input aria-label="Tipo unidad" data-tarifa-nombre value="'+esc(t.nombre)+'"><input aria-label="Importe por ticket" type="number" min="0.01" step=".01" data-tarifa-importe value="'+Number(t.importe)+'"><label style="font-size:12px"><input type="checkbox" data-tarifa-activo '+(t.activo?'checked':'')+'> Activo</label><button type="button" class="cc-btn cc-btn-primary" data-tarifa-save="'+esc(t.id)+'">Guardar</button></div>').join('');}
 comprobarResumen();
 }catch(e){note(e.message||String(e),true);const box=$('#casTarifasLista');if(box)box.textContent='Error: '+(e.message||e);}
}
window.ccCasetasTarifasCargar=cargarTarifas;
async function guardarTarifa(id){
 const row=[...document.querySelectorAll('[data-tarifa-row]')].find(e=>e.dataset.tarifaRow===id);if(!row)return;
 const nombre=row.querySelector('[data-tarifa-nombre]').value.trim(),importe=Number(row.querySelector('[data-tarifa-importe]').value),activo=row.querySelector('[data-tarifa-activo]').checked;
 if(!nombre||!Number.isFinite(importe)||importe<=0){alert('Nombre e importe deben ser válidos');return;}
 try{await rpc('cc_ant_casetas_tarifas_guardar',{id,nombre,importe,activo});await cargarTarifas();}catch(e){alert(e.message||String(e));}
}
document.addEventListener('click',e=>{const save=e.target.closest('[data-tarifa-save]');if(save)guardarTarifa(save.dataset.tarifaSave);if(e.target.closest('[data-antv="catalogos"]'))cargarTarifas();});
let comprobarSelectedId=null;
function comprobarOptions(){
 const input=$('#casComprobarOperador'),list=$('#casComprobarSuggestions');if(!input||!list)return;
 if(!input.value.trim()){list.hidden=true;list.innerHTML='';input.setAttribute('aria-expanded','false');return;}
 const q=input.value.trim().toLocaleLowerCase('es-MX');
 const matches=ops().filter(o=>!q||(o.nombre||'').toLocaleLowerCase('es-MX').includes(q)||(o.numero_empleado||'').toLocaleLowerCase('es-MX').includes(q)||(o.id||'').toLocaleLowerCase('es-MX').includes(q)).slice(0,12);
 list.innerHTML=matches.map(o=>'<button type="button" class="cas-operator-option" role="option" data-comprobar-op="'+esc(o.id)+'"><span>'+esc(o.nombre)+'</span><small>'+esc(o.numero_empleado||'')+'</small></button>').join('')||'<div class="cas-operator-empty">No se encontraron operadores</div>';
 list.hidden=false;input.setAttribute('aria-expanded','true');
}
function comprobarPick(id){
 const op=ops().find(o=>o.id===id);if(!op)return;
 comprobarSelectedId=id;state.op=id;$('#casComprobarOperador').value=(op.numero_empleado?op.numero_empleado+' · ':'')+op.nombre;$('#casComprobarSuggestions').hidden=true;$('#casComprobarOperador').setAttribute('aria-expanded','false');comprobarUpdate();casSimpleHistory();casSimpleCFDI();
}
function casLocalDate(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function casSimpleHistory(){
 const body=$('#casSimpleHistory');if(!body)return;
 const op=comprobarSelectedId;if(!op){body.innerHTML='<tr><td colspan="4">Selecciona un operador.</td></tr>';return;}
 const advances=(state.data?.anticipos||[]).filter(a=>a.operadorId===op).map(a=>({date:a.fecha||'',kind:'Entrega',ref:a.folio,amount:a.montoEntregado||0}));
 const tickets=(state.data?.tickets||[]).filter(t=>t.operador_id===op).map(t=>({date:t.fecha||t.created_at||'',kind:'Comprobación',ref:t.folio_ticket||'Ticket',amount:t.total||0}));
 const rows=[...advances,...tickets].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
 body.innerHTML=rows.map(x=>'<tr><td>'+esc(String(x.date).slice(0,16).replace('T',' '))+'</td><td>'+esc(x.kind)+'</td><td>'+esc(x.ref||'—')+'</td><td><b>'+money(x.amount)+'</b></td></tr>').join('')||'<tr><td colspan="4">Sin movimientos registrados.</td></tr>';
}
let casCFDIRequest=0;
async function casSimpleCFDI(){
 const op=ops().find(o=>o.id===comprobarSelectedId),status=$('#casSimpleCFDIStatus'),body=$('#casSimpleCFDIBody'),from=$('#casSimpleCFDIFrom').value,to=$('#casSimpleCFDITo').value,request=++casCFDIRequest;
 if(!op){status.textContent='Selecciona un operador.';body.innerHTML='';return;}
 if(!from||!to||from>to){status.textContent='Selecciona un rango válido.';return;}
 status.textContent='Consultando CFDI…';body.innerHTML='';
 try{
 const {data,error}=await client().from('hs_comprobaciones').select('folio_id,fecha_comprobacion,fecha,cliente_nombre,servicio,operador_id,operador_nombre').gte('fecha_comprobacion',from+'T00:00:00').lte('fecha_comprobacion',to+'T23:59:59').or('operador_id.eq.'+op.id+',operador_nombre.eq.'+encodeURIComponent(op.nombre)).order('fecha_comprobacion',{ascending:false}).limit(500);
 if(error)throw error;
 const unique=[...new Map((data||[]).filter(x=>x.folio_id).map(x=>[x.folio_id,x])).values()],ids=unique.map(x=>x.folio_id),folios=[];
 for(let i=0;i<ids.length;i+=100){let f=await client().from('hs_folios').select('id,folio').in('id',ids.slice(i,i+100));if(f.error)throw f.error;folios.push(...(f.data||[]));}
 if(request!==casCFDIRequest)return;
 const map=new Map(folios.map(f=>[f.id,f.folio])),rows=unique.filter(x=>/^CFDI-/i.test(map.get(x.folio_id)||'')).sort((a,b)=>String(b.fecha_comprobacion||b.fecha||'').localeCompare(String(a.fecha_comprobacion||a.fecha||'')));
 body.innerHTML=rows.map(x=>'<tr><td>'+esc((x.fecha_comprobacion||x.fecha||'').slice(0,16).replace('T',' '))+'</td><td><b>'+esc(map.get(x.folio_id))+'</b></td><td>'+esc(x.cliente_nombre||'—')+'</td><td>'+esc(x.servicio||'—')+'</td></tr>').join('')||'<tr><td colspan="4">Sin CFDI comprobadas en este periodo.</td></tr>';
 status.textContent=rows.length+' hojas CFDI · '+from+' a '+to+(data.length===500?' · Límite de consulta: 500':'');
 }catch(e){if(request===casCFDIRequest)status.textContent='Error al consultar CFDI: '+(e.message||e);}
}
async function casComprobarEntregar(){
 const op=ops().find(o=>o.id===comprobarSelectedId),amount=Number($('#casComprobarNuevaEntrega').value),fecha=$('#casComprobarNuevaFecha').value,btn=$('#casComprobarEntregar'),box='#casComprobarEntregaEstado';
 if(state.busy){statusBox(box,'Hay otra operación en curso.',true);return;}
 if(!op){statusBox(box,'Selecciona un operador.',true);return;}
 if(!Number.isFinite(amount)||amount<=0){statusBox(box,'Captura un importe válido.',true);return;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){statusBox(box,'Selecciona una fecha válida.',true);return;}
 if(!confirm('¿Entregar '+money(amount)+' a '+op.nombre+'?'))return;
 state.busy=true;btn.disabled=true;statusBox(box,'Guardando entrega…');
 try{await rpc('cc_ant_casetas_entregar',{operadorId:op.id,monto:amount,fecha:fecha+'T12:00:00',observaciones:''});$('#casComprobarNuevaEntrega').value='';statusBox(box,'Entrega guardada. Actualizando saldos…');try{await refreshBalances();casSimpleHistory();statusBox(box,'✓ Entrega guardada y saldos actualizados.');}catch(e){statusBox(box,'✓ Entrega guardada; error al actualizar saldos: '+(e.message||e),true);}}
 catch(e){statusBox(box,'No se guardó la entrega: '+(e.message||e),true);}finally{state.busy=false;btn.disabled=false;}
}
function comprobarUpdate(){
 const pending=funds(comprobarSelectedId).reduce((s,a)=>s+Number(a.pendiente||0),0);
 $('#casComprobarSaldo').textContent=money(pending);
 comprobarResumen();casSimpleHistory();
}
function comprobarItems(){
 return [...document.querySelectorAll('#casComprobarTiposFilas [data-cas-qty]')].map(el=>({tipoUnidad:el.dataset.casQty,cantidad:Number(el.value)}));
}
function comprobarResumen(){
 const pending=funds(comprobarSelectedId).reduce((s,a)=>s+Number(a.pendiente||0),0),items=comprobarItems(),qty=items.reduce((s,i)=>s+(Number.isSafeInteger(i.cantidad)&&i.cantidad>=0?i.cantidad:0),0),amount=items.reduce((s,i)=>s+(Number.isSafeInteger(i.cantidad)&&i.cantidad>=0?i.cantidad*Number(casTarifas.find(t=>t.id===i.tipoUnidad)?.importe||0):0),0);
 $('#casComprobarImporteCalculado').textContent=money(amount);
 const box=$('#casComprobarResumen');
 const rows=[['Tickets',String(qty)],['Total comprobado',money(amount)],['Saldo anterior',money(pending)],['Saldo restante',money(pending-amount)]];
 box.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px">'+rows.map(([label,value],i)=>'<div style="background:#fff;border:1px solid '+(i===3?'#99f6e4':'#dbeafe')+';border-radius:12px;padding:12px 14px;box-shadow:0 2px 8px rgba(15,23,42,.04)"><div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:5px">'+esc(label)+'</div><strong style="display:block;font-size:19px;line-height:1.25;color:'+(i===3?'#0f766e':'#0f172a')+'">'+esc(value)+'</strong></div>').join('')+'</div>'+(!comprobarSelectedId?'<div style="font-size:12px;color:#64748b;margin-top:10px">Selecciona un operador para consultar sus anticipos pendientes.</div>':'');
}
let casDeliveryOperator=null;
function casDeliveryClose(){const m=$('#casDeliveryModal');m.hidden=true;m.style.display='none';casDeliveryOperator=null;$('#casDeliveryFields').hidden=true;$('#casDeliveryConfirm').hidden=true;$('#casDeliveryYes').hidden=false;$('#casDeliveryModalStatus').textContent='';}
function casDeliveryAsk(op,pending,amount){
 casDeliveryOperator=op;
 const advances=(state.data?.anticipos||[]).filter(a=>a.operadorId===op.id);
 const total=k=>advances.reduce((n,a)=>n+Number(a[k]||0),0);
 const remaining=total('pendiente');
 const returned=total('devuelto');
 const card=(label,value,accent,desc)=>'<div style="background:'+accent+';padding:14px;border-radius:13px;border:1px solid #e2e8f0;min-width:0"><div style="font-size:12px;font-weight:700;color:#475569">'+esc(label)+'</div><strong style="display:block;font-size:23px;line-height:1.4;color:#0f172a">'+esc(money(value))+'</strong><small style="color:#64748b">'+esc(desc)+'</small></div>';
 $('#casDeliveryTitle').textContent='✓ Comprobación registrada';
 $('#casDeliveryInfo').innerHTML='<strong style="font-size:15px;color:#0f172a">'+esc(op.nombre)+'</strong><br><span style="font-size:13px">Resumen del efectivo y comprobaciones del operador</span>';
 $('#casDeliverySummary').innerHTML=card('Saldo antes de comprobar',pending,'#f1f5f9','Pendiente previo')+card('Comprobado ahora',amount,'#eff6ff','Tickets registrados')+card('Efectivo devuelto',returned,'#f0fdf4','Devoluciones acumuladas')+card('Saldo pendiente actual',remaining,'#ecfdf5','Por comprobar o devolver')+'<div style="grid-column:1/-1;background:#f8fafc;border-radius:10px;padding:12px;font-size:13px;color:#334155"><strong>¿Deseas entregar más dinero al operador?</strong><br>El saldo pendiente es dinero por justificar; no confirma el efectivo físico que lleva consigo.</div>';
 $('#casDeliveryModalDate').value=casLocalDate();$('#casDeliveryModalAmount').value='';
 const m=$('#casDeliveryModal');m.hidden=false;m.style.display='flex';$('#casDeliveryYes').focus();
}
async function casDeliveryConfirm(){const op=casDeliveryOperator,monto=Number($('#casDeliveryModalAmount').value),fecha=$('#casDeliveryModalDate').value;if(!op||!Number.isFinite(monto)||monto<=0||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha)){$('#casDeliveryModalStatus').textContent='Indica una fecha y un importe válidos.';return;}const b=$('#casDeliveryConfirm');b.disabled=true;try{await rpc('cc_ant_casetas_entregar',{operadorId:op.id,monto,fecha:fecha+'T12:00:00',observaciones:'Entrega posterior a comprobación'});await refreshBalances();casDeliveryClose();statusBox('#casComprobarEstado','✓ Comprobación y entrega registradas correctamente.');}catch(e){ $('#casDeliveryModalStatus').textContent='No se registró la entrega: '+(e.message||e);}finally{b.disabled=false;}}
function casConfirmExcess(op,excess){
 return new Promise(resolve=>{
  const modal=document.createElement('div');modal.style.cssText='position:fixed;inset:0;z-index:100010;background:#0f172abf;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML='<div role="dialog" aria-modal="true" aria-label="Excedente de comprobación" style="background:white;border-radius:18px;padding:24px;max-width:480px;width:100%;box-shadow:0 22px 60px #0004"><div style="font-size:14px;color:#64748b">Comprobación superior al anticipo</div><h3 style="font-size:23px;color:#0f172a;margin:8px 0">'+esc(op.nombre)+'</h3><div style="background:#fef3c7;border-radius:12px;padding:16px;margin:14px 0"><div style="font-size:13px">Importe adicional que corresponde al operador</div><strong style="font-size:30px;color:#92400e">'+money(excess)+'</strong></div><p style="color:#334155;font-size:14px">¿Ya entregaste este dinero al operador? Si confirmas que sí, se descontará de la caja. Si no, quedará registrado como <b>saldo pendiente por pagar al operador</b>.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="cc-btn cc-btn-light" data-excess="CANCELAR">Cancelar</button><button type="button" class="cc-btn cc-btn-light" data-excess="PENDIENTE">No, dejar pendiente</button><button type="button" class="cc-btn cc-btn-primary" data-excess="PAGADO">Sí, dinero entregado</button></div></div>';
  document.body.append(modal);modal.querySelectorAll('[data-excess]').forEach(b=>b.onclick=()=>{const mode=b.dataset.excess;modal.remove();resolve(mode);});
 });
}
async function comprobarGuardar(){
 const fail=t=>statusBox('#casComprobarEstado',t,true);
 if(state.busy){fail('Hay una operación en curso. Espera un momento.');return;}
 const op=ops().find(o=>o.id===comprobarSelectedId&&((o.numero_empleado?o.numero_empleado+' · ':'')+o.nombre)===$('#casComprobarOperador').value.trim()),pending=funds(comprobarSelectedId).reduce((s,a)=>s+Number(a.pendiente||0),0),items=comprobarItems(),qty=items.reduce((s,i)=>s+i.cantidad,0),amount=items.reduce((s,i)=>s+i.cantidad*Number(casTarifas.find(t=>t.id===i.tipoUnidad)?.importe||0),0),fecha=$('#casComprobarFecha').value;
 if(!op){fail('Selecciona un operador válido de la lista');return;}
 if(pending<=0){fail('El operador no tiene anticipos pendientes para comprobar');return;}
 if(items.some(i=>!Number.isSafeInteger(i.cantidad)||i.cantidad<0||i.cantidad>1000)){fail('Las cantidades deben ser números enteros entre 0 y 1000');return;}
 if(qty<=0){fail('Captura al menos un ticket');return;}
 if(!Number.isFinite(amount)||amount<=0){fail('El importe de comprobación no es válido');return;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){fail('Selecciona una fecha válida');return;}
 let excesoModo='';if(amount>pending){excesoModo=await casConfirmExcess(op,amount-pending);if(excesoModo==='CANCELAR'){fail('Operación cancelada; no se registró ninguna comprobación.');return;}}else if(!confirm('¿Comprobar '+qty+' tickets por '+money(amount)+' para '+op.nombre+'?')){fail('Operación cancelada; no se registró ninguna comprobación.');return;}
 state.busy=true;$('#casComprobarGuardar').disabled=true;statusBox('#casComprobarEstado','Guardando comprobación…');
 let saved=false;
 try{
  await rpc('cc_ant_casetas_comprobar_mixto',{operadorId:op.id,tickets:items,fecha:fecha+'T12:00:00',comentarios:$('#casComprobarComentarios').value.trim(),excesoModo});
  saved=true;
  document.querySelectorAll('#casComprobarTiposFilas [data-cas-qty]').forEach(el=>el.value='0');
  comprobarSelectedId=null;$('#casComprobarComentarios').value='';$('#casComprobarOperador').value='';$('#casComprobarSuggestions').hidden=true;$('#casComprobarFecha').value=new Date().toLocaleDateString('en-CA');
  statusBox('#casComprobarEstado','✓ Comprobación guardada correctamente. Actualizando saldos…');
  try{await refreshBalances();casSimpleHistory();statusBox('#casComprobarEstado','✓ Comprobación guardada correctamente. Saldos actualizados.');if(excesoModo==='PENDIENTE')statusBox('#casComprobarEstado','✓ Comprobación guardada. Excedente registrado como saldo pendiente por pagar al operador.');else casDeliveryAsk(op,pending,amount);}
  catch(e){statusBox('#casComprobarEstado','✓ Comprobación guardada, pero no se pudieron actualizar los saldos: '+(e.message||e),true);}
 }catch(e){if(!saved)fail('No se confirmó la comprobación: '+(e.message||e));}
 finally{state.busy=false;$('#casComprobarGuardar').disabled=false;}
}

let casAuditRows=[];
function casAuditTab(tab){const history=tab==='historial';const panel=$('#casAuditPanel');panel.hidden=false;panel.style.display='block';document.querySelectorAll('#ccAntViewCasetasNuevo [data-cas-work]').forEach(b=>b.classList.toggle('selected',b.dataset.casWork===tab));if(history){casAuditOperators();casAuditLoad();}}
function casAuditOperators(){const el=$('#casAuditOperator'),value=el.value;el.innerHTML='<option value="">Todos los operadores</option>'+ops().map(o=>'<option value="'+esc(o.id)+'">'+esc(o.nombre)+'</option>').join('');el.value=value;}
function casAuditCsv(){if(!casAuditRows.length)return;const cols=['Fecha','Movimiento','Operador','Folio / Referencia','Importe','Estado'];const rows=[cols,...casAuditRows.map(x=>[x.fecha,x.tipo,x.operador,x.referencia,x.monto,x.estatus])];const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='historial-casetas-'+casLocalDate()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function casAuditLoad(){
 const status=$('#casAuditStatus'),body=$('#casAuditBody'),from=$('#casAuditFrom').value,to=$('#casAuditTo').value,op=$('#casAuditOperator').value,kind=$('#casAuditType').value;
 if(from&&to&&from>to){status.textContent='El rango de fechas no es válido.';return;}
 const btn=$('#casAuditSearch');btn.disabled=true;status.textContent='Consultando historial de Casetas…';body.innerHTML='<tr><td colspan="6">Cargando movimientos…</td></tr>';
 try{
  // Consultar por RPC autorizada; no leer tablas protegidas desde el navegador.
  const data=await rpc('cc_ant_casetas_list');
  const names=new Map(ops().map(x=>[x.id,x.nombre])),rows=[];
  const within=x=>{const d=String(x.fecha||'').slice(0,10);return(!from||d>=from)&&(!to||d<=to)&&(!op||x.operadorId===op||x.operador_id===op);};
  for(const x of data.anticipos||[]){if(!within(x))continue;rows.push({id:x.id,fecha:x.fecha||'',tipo:'ENTREGA',operador:names.get(x.operadorId)||x.operador||'—',referencia:x.folio||x.id,monto:Number(x.montoEntregado)||0,estatus:x.estatus||'REGISTRADO',tickets:0});}
  const groups=new Map();
  for(const x of data.comprobaciones_resumen||[]){if(!within(x))continue;const key=[x.operador_id,x.fecha,x.creado_por||''].join('|');let g=groups.get(key);if(!g){g={fecha:x.fecha||'',tipo:'COMPROBACION',operador:names.get(x.operador_id)||'—',referencia:'Comprobación de casetas',monto:0,estatus:'COMPROBADO',tickets:0};groups.set(key,g);}g.monto+=Number(x.importe_total)||0;g.tickets+=Number(x.cantidad)||0;}
  for(const g of groups.values()){g.referencia=g.tickets+' tickets comprobados';rows.push(g);}
  for(const x of data.tickets||[]){if(!within(x)||x.estatus==='CANCELADO')continue;rows.push({fecha:x.fecha||'',tipo:'TICKET',operador:names.get(x.operador_id)||'—',referencia:x.folio_ticket||'Ticket de caseta',monto:Number(x.total)||0,estatus:x.estatus||'REGISTRADO',tickets:Number(x.cantidad)||1});}
  rows.sort((x,y)=>String(y.fecha).localeCompare(String(x.fecha)));
  const filtered=rows.filter(x=>!kind||x.tipo===kind);
  casAuditRows=filtered;
  const sum=type=>rows.filter(x=>x.tipo===type).reduce((n,x)=>n+x.monto,0);
  const ticketCount=rows.filter(x=>x.tipo==='TICKET').reduce((n,x)=>n+x.tickets,0)+rows.filter(x=>x.tipo==='COMPROBACION').reduce((n,x)=>n+x.tickets,0);
    body.innerHTML=filtered.map(x=>'<tr><td>'+esc(String(x.fecha).slice(0,16).replace('T',' '))+'</td><td><b>'+esc(x.tipo)+'</b></td><td>'+esc(x.operador)+'</td><td>'+esc(x.referencia)+'</td><td>'+money(x.monto)+'</td><td>'+esc(x.estatus)+'</td></tr>').join('')||'<tr><td colspan="6">Sin movimientos de Casetas para los filtros seleccionados.</td></tr>';
  status.textContent=filtered.length+' movimientos de Casetas';
 }catch(e){status.textContent='Error al consultar historial: '+(e.message||e);body.innerHTML='<tr><td colspan="6">No fue posible cargar los movimientos.</td></tr>';}finally{btn.disabled=false;}
}
async function casAuditEdit(id){
 const x=casAuditRows.find(y=>y.id===id&&y.tipo==='ENTREGA');if(!x)return;
 const amountText=prompt('Corregir dinero entregado a '+x.operador+'.\\nImporte actual: '+money(x.monto)+'\\nNuevo importe en pesos:',String(x.monto));
 if(amountText===null)return;const amount=Number(amountText.trim().replace(/,/g,''));
 if(!Number.isFinite(amount)||amount<0){alert('Captura un importe válido.');return;}
 if(amount===x.monto)return;
 const reason=prompt('Motivo de la corrección (obligatorio):');if(!reason||!reason.trim())return;
 if(!confirm('¿Cambiar entrega de '+money(x.monto)+' a '+money(amount)+'? Se actualizará el saldo de caja.'))return;
 try{await rpc('cc_ant_casetas_editar_entrega',{id,monto:amount,observaciones:'Corrección de importe: '+reason.trim()});await load();await casAuditLoad();alert('Importe corregido correctamente.');}
 catch(e){alert('No se pudo editar: '+(e.message||e));}
}

function bind(){let root=$('#ccAntViewCasetasNuevo');root.addEventListener('click',e=>{let o=e.target.closest('[data-op]');if(o){state.op=o.dataset.op;batch.length=0;render();batchRender();loadCFDI();document.getElementById('casOperatorSection')?.scrollIntoView({behavior:'smooth',block:'start'});}let k=e.target.closest('[data-cas-action]');if(k)act(k.dataset.casAction);let remove=e.target.closest('[data-batch-remove]');if(remove){batch.splice(Number(remove.dataset.batchRemove),1);batchRender();}});$('#casSearch').addEventListener('focus',()=>{$('#casSearch').dataset.expanded='1';render();});$('#casSearch').addEventListener('input',()=>{$('#casSearch').dataset.expanded='1';render();});document.addEventListener('pointerdown',e=>{if(!e.target.closest('#casSearch')&&!e.target.closest('#casOperators')){delete $('#casSearch').dataset.expanded;$('#casOperators').hidden=true;}});root.addEventListener('input',e=>{if(['casTicketAmount','casReturnAmount','casNewAmount','casCashDeclared'].includes(e.target.id))calc();});root.querySelectorAll('[data-cas-work]').forEach(b=>b.addEventListener('click',()=>casAuditTab(b.dataset.casWork)));$('#casReportRun').onclick=casReportRun;$('#casReportPdf').onclick=casReportPrint;$('#casReportExcel').onclick=casReportDownloadCsv;const todayReport=casLocalDate(),firstReport=todayReport.slice(0,8)+'01';$('#casReportFrom').value=firstReport;$('#casReportTo').value=todayReport;$('#casBalancesRefresh').onclick=casBalancesLoad;$('#casBalancesOnlyPending').onchange=()=>{$('#casBalancesFilterLabel').textContent=$('#casBalancesOnlyPending').checked?'Mostrar solo operadores con anticipos pendientes':'Mostrar todos los operadores';casBalancesLoad();};$('#casAuditSearch').onclick=casAuditLoad;$('#casAuditBody').addEventListener('click',e=>{const b=e.target.closest('[data-cas-edit]');if(b)casAuditEdit(b.dataset.casEdit);});casAuditOperators();$('#casAuditExport').onclick=casAuditCsv;$('#casAuditClear').onclick=()=>{$('#casAuditOperator').value='';$('#casAuditType').value='';$('#casAuditFrom').value='';$('#casAuditTo').value='';casAuditLoad();};$('#casRefresh').onclick=load;$('#casEntregaGuardar').onclick=guardarEntrega;const casWeekToday=new Date(),casWeekMonday=new Date(casWeekToday),casWeekSaturday=new Date(casWeekToday);casWeekMonday.setDate(casWeekToday.getDate()-((casWeekToday.getDay()+6)%7));casWeekSaturday.setDate(casWeekMonday.getDate()+5);$('#casSimpleCFDIFrom').value=casLocalDate(casWeekMonday);$('#casSimpleCFDITo').value=casLocalDate(casWeekSaturday);$('#casComprobarGuardar').onclick=comprobarGuardar;$('#casDeliveryNo').onclick=casDeliveryClose;$('#casDeliveryYes').onclick=()=>{$('#casDeliveryFields').hidden=false;$('#casDeliveryYes').hidden=true;$('#casDeliveryConfirm').hidden=false;$('#casDeliveryModalAmount').focus();};$('#casDeliveryConfirm').onclick=casDeliveryConfirm;$('#casSimpleCFDILoad').onclick=casSimpleCFDI;const ci=$('#casComprobarOperador');ci.addEventListener('focus',comprobarOptions);ci.addEventListener('input',()=>{comprobarSelectedId=null;comprobarOptions();comprobarUpdate();++casCFDIRequest;$('#casSimpleCFDIBody').innerHTML='<tr><td colspan="4">Selecciona un operador.</td></tr>';});ci.addEventListener('keydown',e=>{if(e.key==='Escape')$('#casComprobarSuggestions').hidden=true;else if(e.key==='Enter'){const first=$('#casComprobarSuggestions [data-comprobar-op]');if(first&&!$('#casComprobarSuggestions').hidden){e.preventDefault();comprobarPick(first.dataset.comprobarOp);}}});$('#casComprobarSuggestions').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-comprobar-op]');if(b){e.preventDefault();comprobarPick(b.dataset.comprobarOp);}});$('#casComprobarTiposFilas').addEventListener('input',comprobarResumen);document.addEventListener('pointerdown',e=>{if(!e.target.closest('#casComprobarSimple .cas-operator-picker'))$('#casComprobarSuggestions').hidden=true;});const ei=$('#casEntregaOperador');ei.addEventListener('focus',entregaOptions);ei.addEventListener('input',()=>{entregaSelectedId=null;entregaOptions();});ei.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#casEntregaSuggestions').hidden=true;}else if(e.key==='Enter'){let first=$('#casEntregaSuggestions [data-entrega-op]');if(first&&!$('#casEntregaSuggestions').hidden){e.preventDefault();entregaPick(first.dataset.entregaOp);}}});$('#casEntregaSuggestions').addEventListener('pointerdown',e=>{let b=e.target.closest('[data-entrega-op]');if(b){e.preventDefault();entregaPick(b.dataset.entregaOp);}});document.addEventListener('pointerdown',e=>{if(!e.target.closest('.cas-operator-picker')){$('#casEntregaSuggestions').hidden=true;ei.setAttribute('aria-expanded','false');}});$('#casBatchAdd').onclick=batchAdd;$('#casBatchSave').onclick=batchSave;for(const id of ['#casBatchReturn','#casBatchDelivery'])$(id).addEventListener('input',batchRender);$('#casCFDILoad').onclick=loadCFDI;}
window.ccCasetasNuevoOpen=open;window.ccCasetasNuevoClose=function(){let el=$('#ccAntViewCasetasNuevo');if(el){el.classList.remove('cas-fullscreen');el.style.display='none';}document.body.style.overflow='';let b=document.querySelector('#ccPanelAnticipos [data-antv="anticipos"]');if(b&&window.ccAntView)window.ccAntView('anticipos',b);};
window.ccCasetasNuevoInit=function(){let el=$('#ccAntViewCasetasNuevo');if(el&&!el.dataset.bound){el.dataset.bound='1';setupWorkspace();bind();const metrics=el.querySelector('#casMetrics');if(metrics){metrics.addEventListener('click',e=>{if(e.target.closest('[data-cas-kpi-pending]'))showWorkspaceTab('saldos');});metrics.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-cas-kpi-pending]')){e.preventDefault();showWorkspaceTab('saldos');}});}const today=new Date(),past=new Date(today.getTime()-6*86400000);const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');$('#casCFDITo').value=iso(today);$('#casEntregaFecha').value=iso(today);$('#casComprobarFecha').value=iso(today);$('#casBatchDate').value=iso(today);$('#casCFDIFrom').value=iso(past);}};
})();
