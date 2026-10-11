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
function open(){const el=$('#ccAntViewCasetasNuevo');if(!el)return;document.querySelectorAll('#ccPanelAnticipos .cc-ant-view').forEach(x=>x.style.display='none');el.style.display='block';el.classList.add('cas-fullscreen');showWorkspaceTab('entregar');document.body.style.overflow='hidden';document.querySelectorAll('#ccPanelAnticipos [data-antv]').forEach(x=>x.className='cc-btn cc-btn-light');const b=$('#ccAntNavCasetasNuevo');if(b)b.className='cc-btn cc-btn-primary';if(!state.loaded)load();else render();}
function active(){return (state.data?.anticipos||[]).filter(a=>Number(a.pendiente)>0);}
function funds(op){return active().filter(a=>a.operadorId===op);}
function ops(){return state.data?.operadores||[];}
function current(){return ops().find(o=>o.id===state.op);}
function summary(){let d=state.data||{},a=d.anticipos||[],mov=d.movimientos||[],cuenta=(d.cuentas||[]).find(x=>x.es_default_casetas)||(d.cuentas||[])[0];let balance=Number(cuenta?.saldo_inicial||0)+mov.reduce((s,x)=>s+(x.tipo==='DEPOSITO'||x.tipo==='DEVOLUCION'||x.tipo==='AJUSTE_ENTRADA'?1:-1)*Number(x.monto||0),0);return {cuenta,balance,pend:a.reduce((s,x)=>s+Number(x.pendiente||0),0),ent:a.reduce((s,x)=>s+Number(x.montoEntregado||0),0),comp:a.reduce((s,x)=>s+Number(x.comprobado||0),0),dev:a.reduce((s,x)=>s+Number(x.devuelto||0),0)};}
function render(){
 const d=state.data,s=summary(),op=current(),ff=funds(state.op);
 $('#casMetrics').innerHTML=[['Caja principal',s.cuenta?.nombre||'SIN CONFIGURAR'],['Saldo estimado de caja',money(s.balance)],['Entregado acumulado',money(s.ent)],['Tickets comprobados',money(s.comp)],['Efectivo devuelto',money(s.dev)],['Pendiente de justificar',money(s.pend)]].map(x=>'<div class="cas-kpi"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></div>').join('');
 const q=($('#casSearch')?.value||'').toLowerCase().trim();
 $('#casOperators').innerHTML=ops().filter(o=>!q||(o.nombre||'').toLowerCase().includes(q)||(o.numero_empleado||'').toLowerCase().includes(q)).map(o=>{let v=(d.anticipos||[]).filter(a=>a.operadorId===o.id),p=v.reduce((n,a)=>n+Number(a.pendiente||0),0);return '<button class="cas-person '+(state.op===o.id?'selected':'')+'" data-op="'+esc(o.id)+'"><b>'+esc(o.nombre)+'</b><span>'+esc(o.numero_empleado||'')+'</span><strong>'+money(p)+'</strong></button>'}).join('')||'<p>Sin operadores.</p>';
 $('#casOperatorName').textContent=op?op.nombre:'Seleccione un operador';
 let pending=ff.reduce((n,a)=>n+Number(a.pendiente||0),0);
 $('#casOperatorBalance').textContent=money(pending);
 $('#casFunds').innerHTML=ff.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.folio)+' · '+money(a.pendiente)+'</option>').join('');
 $('#casHistory').innerHTML=(d.anticipos||[]).filter(a=>a.operadorId===state.op).slice(0,25).map(a=>'<tr><td>'+esc(a.folio)+'</td><td>'+esc((a.fecha||'').slice(0,10))+'</td><td>'+money(a.montoEntregado)+'</td><td>'+money(a.comprobado)+'</td><td>'+money(a.devuelto)+'</td><td><b>'+money(a.pendiente)+'</b></td></tr>').join('')||'<tr><td colspan="6">Sin movimientos</td></tr>';
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
 const cards=[...section.querySelectorAll(':scope > .cas-card')];const byTitle=t=>cards.find(x=>x.querySelector('h3')?.textContent.toLowerCase().includes(t));
 const groups=[
 ['entregar','Entregar',[section.querySelector('#casEntregaSimple')]],
 ['comprobar','Comprobar',[section.querySelector('#casComprobarSimple')]]
 ];
 const nav=document.createElement('nav');nav.className='cas-work-tabs';nav.setAttribute('aria-label','Operaciones de casetas');
 const host=document.createElement('div');host.className='cas-work-content';
 for(const [id,title,items] of groups){
  const btn=document.createElement('button');btn.type='button';btn.textContent=title;btn.dataset.casTab=id;nav.append(btn);
  const panel=document.createElement('section');panel.className='cas-work-panel';panel.dataset.casPanel=id;panel.hidden=true;
  for(const item of items.filter(Boolean))panel.append(item);
  host.append(panel);
 }
 section.prepend(host);section.prepend(nav);for(const card of cards){if(!card.closest('.cas-work-panel'))card.style.display='none';}
 const hero=section.querySelector('.cas-action-hero');if(hero)hero.remove();
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-cas-tab]');if(b)showWorkspaceTab(b.dataset.casTab);});
 showWorkspaceTab('entregar');
}
function showWorkspaceTab(id){
 const root=$('#ccAntViewCasetasNuevo');if(!root)return;
 root.querySelectorAll('[data-cas-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.casTab===id);b.setAttribute('aria-selected',String(b.dataset.casTab===id));});
 root.querySelectorAll('[data-cas-panel]').forEach(p=>{p.hidden=p.dataset.casPanel!==id;p.style.display=p.hidden?'none':'block';});
}
window.ccCasetasShowTab=showWorkspaceTab;
let entregaSelectedId=null;
function entregaOptions(){
 const input=$('#casEntregaOperador'),list=$('#casEntregaSuggestions');if(!input||!list)return;
 const q=input.value.trim().toLocaleLowerCase('es-MX'),matches=ops().filter(o=>!q||(o.nombre||'').toLocaleLowerCase('es-MX').includes(q)||(o.numero_empleado||'').toLocaleLowerCase('es-MX').includes(q)).slice(0,12);
 list.innerHTML=matches.map(o=>'<button type="button" class="cas-operator-option" role="option" data-entrega-op="'+esc(o.id)+'"><span>'+esc(o.nombre)+'</span><small>'+esc(o.numero_empleado||'')+'</small></button>').join('')||'<div class="cas-operator-empty">No se encontraron operadores</div>';
 list.hidden=document.activeElement!==input;input.setAttribute('aria-expanded',String(!list.hidden));
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
 const q=input.value.trim().toLocaleLowerCase('es-MX');
 const matches=ops().filter(o=>!q||(o.nombre||'').toLocaleLowerCase('es-MX').includes(q)||(o.numero_empleado||'').toLocaleLowerCase('es-MX').includes(q)||(o.id||'').toLocaleLowerCase('es-MX').includes(q)).slice(0,12);
 list.innerHTML=matches.map(o=>'<button type="button" class="cas-operator-option" role="option" data-comprobar-op="'+esc(o.id)+'"><span>'+esc(o.nombre)+'</span><small>'+esc(o.numero_empleado||'')+'</small></button>').join('')||'<div class="cas-operator-empty">No se encontraron operadores</div>';
 list.hidden=document.activeElement!==input;input.setAttribute('aria-expanded',String(!list.hidden));
}
function comprobarPick(id){
 const op=ops().find(o=>o.id===id);if(!op)return;
 comprobarSelectedId=id;state.op=id;$('#casComprobarOperador').value=(op.numero_empleado?op.numero_empleado+' · ':'')+op.nombre;$('#casComprobarSuggestions').hidden=true;$('#casComprobarOperador').setAttribute('aria-expanded','false');comprobarUpdate();
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
async function comprobarGuardar(){
 const fail=t=>statusBox('#casComprobarEstado',t,true);
 if(state.busy){fail('Hay una operación en curso. Espera un momento.');return;}
 const op=ops().find(o=>o.id===comprobarSelectedId&&((o.numero_empleado?o.numero_empleado+' · ':'')+o.nombre)===$('#casComprobarOperador').value.trim()),pending=funds(comprobarSelectedId).reduce((s,a)=>s+Number(a.pendiente||0),0),items=comprobarItems(),qty=items.reduce((s,i)=>s+i.cantidad,0),amount=items.reduce((s,i)=>s+i.cantidad*Number(casTarifas.find(t=>t.id===i.tipoUnidad)?.importe||0),0),fecha=$('#casComprobarFecha').value;
 if(!op){fail('Selecciona un operador válido de la lista');return;}
 if(pending<=0){fail('El operador no tiene anticipos pendientes para comprobar');return;}
 if(items.some(i=>!Number.isSafeInteger(i.cantidad)||i.cantidad<0||i.cantidad>1000)){fail('Las cantidades deben ser números enteros entre 0 y 1000');return;}
 if(qty<=0){fail('Captura al menos un ticket');return;}
 if(!Number.isFinite(amount)||amount<=0||amount>pending){fail('El total de '+money(amount)+' excede el saldo pendiente de '+money(pending));return;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)){fail('Selecciona una fecha válida');return;}
 if(!confirm('¿Comprobar '+qty+' tickets por '+money(amount)+' para '+op.nombre+'?')){fail('Operación cancelada; no se registró ninguna comprobación.');return;}
 state.busy=true;$('#casComprobarGuardar').disabled=true;statusBox('#casComprobarEstado','Guardando comprobación…');
 let saved=false;
 try{
  await rpc('cc_ant_casetas_comprobar_mixto',{operadorId:op.id,tickets:items,fecha:fecha+'T12:00:00'});
  saved=true;
  document.querySelectorAll('#casComprobarTiposFilas [data-cas-qty]').forEach(el=>el.value='0');
  comprobarSelectedId=null;$('#casComprobarOperador').value='';$('#casComprobarSuggestions').hidden=true;$('#casComprobarFecha').value=new Date().toLocaleDateString('en-CA');
  statusBox('#casComprobarEstado','✓ Comprobación guardada correctamente. Actualizando saldos…');
  try{await refreshBalances();casSimpleHistory();statusBox('#casComprobarEstado','✓ Comprobación guardada correctamente. Saldos actualizados.');}
  catch(e){statusBox('#casComprobarEstado','✓ Comprobación guardada, pero no se pudieron actualizar los saldos: '+(e.message||e),true);}
 }catch(e){if(!saved)fail('No se confirmó la comprobación: '+(e.message||e));}
 finally{state.busy=false;$('#casComprobarGuardar').disabled=false;}
}
function bind(){let root=$('#ccAntViewCasetasNuevo');root.addEventListener('click',e=>{let o=e.target.closest('[data-op]');if(o){state.op=o.dataset.op;batch.length=0;render();batchRender();loadCFDI();document.getElementById('casOperatorSection')?.scrollIntoView({behavior:'smooth',block:'start'});}let k=e.target.closest('[data-cas-action]');if(k)act(k.dataset.casAction);let remove=e.target.closest('[data-batch-remove]');if(remove){batch.splice(Number(remove.dataset.batchRemove),1);batchRender();}});$('#casSearch').addEventListener('input',render);root.addEventListener('input',e=>{if(['casTicketAmount','casReturnAmount','casNewAmount','casCashDeclared'].includes(e.target.id))calc();});$('#casRefresh').onclick=load;$('#casEntregaGuardar').onclick=guardarEntrega;$('#casSimpleCFDITo').value=casLocalDate();$('#casSimpleCFDIFrom').value=casLocalDate(new Date(Date.now()-6*86400000));$('#casComprobarNuevaFecha').value=casLocalDate();$('#casComprobarGuardar').onclick=comprobarGuardar;$('#casComprobarEntregar').onclick=casComprobarEntregar;$('#casSimpleCFDILoad').onclick=casSimpleCFDI;const ci=$('#casComprobarOperador');ci.addEventListener('focus',comprobarOptions);ci.addEventListener('input',()=>{comprobarSelectedId=null;comprobarOptions();comprobarUpdate();++casCFDIRequest;$('#casSimpleCFDIBody').innerHTML='<tr><td colspan="4">Selecciona un operador.</td></tr>';});ci.addEventListener('keydown',e=>{if(e.key==='Escape')$('#casComprobarSuggestions').hidden=true;else if(e.key==='Enter'){const first=$('#casComprobarSuggestions [data-comprobar-op]');if(first&&!$('#casComprobarSuggestions').hidden){e.preventDefault();comprobarPick(first.dataset.comprobarOp);}}});$('#casComprobarSuggestions').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-comprobar-op]');if(b){e.preventDefault();comprobarPick(b.dataset.comprobarOp);}});$('#casComprobarTiposFilas').addEventListener('input',comprobarResumen);document.addEventListener('pointerdown',e=>{if(!e.target.closest('#casComprobarSimple .cas-operator-picker'))$('#casComprobarSuggestions').hidden=true;});const ei=$('#casEntregaOperador');ei.addEventListener('focus',entregaOptions);ei.addEventListener('input',()=>{entregaSelectedId=null;entregaOptions();});ei.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#casEntregaSuggestions').hidden=true;}else if(e.key==='Enter'){let first=$('#casEntregaSuggestions [data-entrega-op]');if(first&&!$('#casEntregaSuggestions').hidden){e.preventDefault();entregaPick(first.dataset.entregaOp);}}});$('#casEntregaSuggestions').addEventListener('pointerdown',e=>{let b=e.target.closest('[data-entrega-op]');if(b){e.preventDefault();entregaPick(b.dataset.entregaOp);}});document.addEventListener('pointerdown',e=>{if(!e.target.closest('.cas-operator-picker')){$('#casEntregaSuggestions').hidden=true;ei.setAttribute('aria-expanded','false');}});$('#casBatchAdd').onclick=batchAdd;$('#casBatchSave').onclick=batchSave;for(const id of ['#casBatchReturn','#casBatchDelivery'])$(id).addEventListener('input',batchRender);$('#casCFDILoad').onclick=loadCFDI;}
window.ccCasetasNuevoOpen=open;window.ccCasetasNuevoClose=function(){let el=$('#ccAntViewCasetasNuevo');if(el){el.classList.remove('cas-fullscreen');el.style.display='none';}document.body.style.overflow='';let b=document.querySelector('#ccPanelAnticipos [data-antv="anticipos"]');if(b&&window.ccAntView)window.ccAntView('anticipos',b);};
window.ccCasetasNuevoInit=function(){let el=$('#ccAntViewCasetasNuevo');if(el&&!el.dataset.bound){el.dataset.bound='1';setupWorkspace();bind();const today=new Date(),past=new Date(today.getTime()-6*86400000);const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');$('#casCFDITo').value=iso(today);$('#casEntregaFecha').value=iso(today);$('#casComprobarFecha').value=iso(today);$('#casBatchDate').value=iso(today);$('#casCFDIFrom').value=iso(past);}};
})();
