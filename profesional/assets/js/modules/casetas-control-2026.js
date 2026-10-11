/* Control de Casetas v1: carga bajo demanda, sin fotos automáticas */
(function(){
'use strict';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), money=n=>Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const state={data:null,op:null,busy:false,loaded:false};
const sb=()=>window.gmSupabase;
function client(){let s=sb();if(s&&typeof s.rpc==='function')return s;throw Error('No hay sesión de Supabase disponible');}
async function rpc(name,item){let {data,error}=await client().rpc(name,item===undefined?undefined:{p_item:item});if(error)throw error;if(data?.ok===false)throw Error(data.error||'Operación rechazada');return data;}
function note(t,bad=false){let el=$('#casMessage');if(el){el.textContent=t||'';el.style.color=bad?'#b91c1c':'#0f766e';}}
function open(){const el=$('#ccAntViewCasetasNuevo');if(!el)return;document.querySelectorAll('#ccPanelAnticipos .cc-ant-view').forEach(x=>x.style.display='none');el.style.display='block';document.querySelectorAll('#ccPanelAnticipos [data-antv]').forEach(x=>x.className='cc-btn cc-btn-light');const b=$('#ccAntNavCasetasNuevo');if(b)b.className='cc-btn cc-btn-primary';if(!state.loaded)load();else render();}
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
 $('#casOperatorSection').hidden=!op;$('#casOperatorSection').style.display=op?'block':'none';
 calc();
}
function calc(){let p=funds(state.op).reduce((s,a)=>s+Number(a.pendiente||0),0),ticket=Number($('#casTicketAmount')?.value||0),dev=Number($('#casReturnAmount')?.value||0),ent=Number($('#casNewAmount')?.value||0),cash=$('#casCashDeclared')?.value;$('#casExpected').textContent=money(p-ticket-dev+ent);$('#casDeclaredDiff').textContent=cash===''?'Sin declarar':money(Number(cash)-(p-ticket-dev+ent));}
async function load(){if(state.busy)return;state.busy=true;note('Consultando saldos…');try{const d=await rpc('cc_ant_casetas_list');state.data=d;state.loaded=true;if(!state.op&&ops().length)state.op=ops()[0].id;note('Información actualizada');render();}catch(e){note(e.message||String(e),true)}finally{state.busy=false;}}
async function act(kind){if(state.busy||!state.op)return;let f=$('#casFunds').value,amount=Number($(kind==='ticket'?'#casTicketAmount':kind==='return'?'#casReturnAmount':'#casNewAmount').value),pending=funds(state.op).find(a=>a.id===f);if(!Number.isFinite(amount)||amount<=0){note('Indique un importe válido',true);return;}if(kind!=='delivery'&&(!pending||amount>Number(pending.pendiente))){note('El importe excede el fondo seleccionado',true);return;}if(!confirm('¿Confirmar '+(kind==='ticket'?'ticket':kind==='return'?'devolución de efectivo':'entrega')+' por '+money(amount)+'?'))return;
state.busy=true;note('Registrando movimiento…');
try{let payload;if(kind==='ticket'){payload={anticipoId:f,monto:amount,fecha:$('#casTicketDate').value,folioTicket:$('#casTicketFolio').value.trim(),plaza:$('#casTicketPlaza').value.trim(),carril:$('#casTicketLane').value.trim(),observaciones:$('#casTicketNotes').value.trim()};await rpc('cc_ant_casetas_ticket',payload);}
else if(kind==='delivery'){payload={operadorId:state.op,monto:amount,fecha:new Date().toISOString(),observaciones:$('#casNotes').value.trim()};await rpc('cc_ant_casetas_entregar',payload);}
else{payload={anticipoId:f,cuentaId:pending.cuentaId,tipo:'DEVOLUCION',monto:amount,fecha:new Date().toISOString(),referencia:pending.folio,observaciones:$('#casNotes').value.trim()};await rpc('cc_ant_add_cash_movement',payload);}
note('Movimiento registrado correctamente');for(let id of ['#casTicketAmount','#casReturnAmount','#casNewAmount'])$(id).value='';}catch(e){note(e.message||String(e),true)}finally{state.busy=false;}await load();}
function bind(){let root=$('#ccAntViewCasetasNuevo');root.addEventListener('click',e=>{let o=e.target.closest('[data-op]');if(o){state.op=o.dataset.op;render();document.getElementById('casOperatorSection')?.scrollIntoView({behavior:'smooth',block:'start'});}let k=e.target.closest('[data-cas-action]');if(k)act(k.dataset.casAction);});$('#casSearch').addEventListener('input',render);root.addEventListener('input',e=>{if(['casTicketAmount','casReturnAmount','casNewAmount','casCashDeclared'].includes(e.target.id))calc();});$('#casRefresh').onclick=load;}
window.ccCasetasNuevoOpen=open;
window.ccCasetasNuevoInit=function(){let el=$('#ccAntViewCasetasNuevo');if(el&&!el.dataset.bound){el.dataset.bound='1';bind();}};
})();
