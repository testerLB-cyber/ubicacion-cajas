(function(){
'use strict';
if(window.__ccCommissionsLiquidations)return;window.__ccCommissionsLiquidations=true;
const sb=()=>window.gmSupabase;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));
const canSheets=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('hojas_servicio.ver'));
const canLiquidationEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&(window.ccPerm('hojas_servicio.comprobar')||window.ccPerm('configuracion.editar')));
let C={tiposUnidad:[],tiposMovimiento:[],clasificaciones:[],tarifas:[]};
async function rpc(name,args={}){const c=sb();if(!c)throw Error('Supabase no está disponible.');const r=await c.rpc(name,args);if(r.error)throw r.error;if(r.data?.ok===false)throw Error(r.data.error||'Operación no disponible');return r.data;}
function styles(){if(document.getElementById('ccCommissionStyles'))return;const s=document.createElement('style');s.id='ccCommissionStyles';s.textContent=`
.cc-com-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px}.cc-com-table{width:100%;border-collapse:collapse}.cc-com-table th,.cc-com-table td{padding:9px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:left}.cc-com-table th{background:#f1f5f9;color:#475569}.cc-com-modal{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100800;display:flex;align-items:center;justify-content:center;padding:14px}.cc-com-card{width:min(1540px,99vw);max-height:97vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px #0f172a55}.cc-com-head{background:#0f172a;color:#fff;padding:14px 17px;display:flex;justify-content:space-between;align-items:center;gap:10px}.cc-com-body{padding:15px}.cc-com-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px;margin:12px 0}.cc-com-kpi{border:1px solid #e2e8f0;border-radius:12px;padding:11px;background:#f8fafc}.cc-com-kpi small{display:block;color:#64748b}.cc-com-kpi strong{font-size:18px}.cc-com-warn{color:#b45309;font-weight:900}.cc-com-ok{color:#166534;font-weight:900}@media(max-width:700px){.cc-com-table{min-width:760px}.cc-com-scroll{overflow:auto}}
`;document.head.appendChild(s);}
async function loadCatalog(){C=await rpc('cc_commission_catalog');return C;}
function options(xs,selected=''){return '<option value="">Seleccionar…</option>'+xs.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('');}
function configPanel(){return document.getElementById('ccPanelConfiguracion');}
function configNav(){const p=configPanel();return p?.querySelector('.cc-config-nav')||p?.querySelector('.cc-config-sidebar')||p?.querySelector('.cc-config-menu')||p?.querySelector('.cc-config-nav-btn')?.parentElement;}
function showConfigSection(sec,btn){const p=configPanel();if(!p)return;p.querySelectorAll('.cc-config-section').forEach(x=>{x.classList.remove('active');x.style.removeProperty('display')});p.querySelectorAll('.cc-config-nav-btn').forEach(x=>x.classList.remove('active'));sec.classList.add('active');sec.style.display='block';btn?.classList.add('active');}
async function renderTariffs(){const sec=document.getElementById('ccConfigTarifasComisiones');if(!sec)return;await loadCatalog();sec.innerHTML='<div class="cc-config-card"><div class="cc-toolbar"><div><strong>Matriz de comisiones</strong><div class="cc-note">Selecciona el tipo de unidad. Se precargan todos los tipos de viaje y clasificaciones activos.</div></div></div><div class="cc-field" style="max-width:520px;margin:10px 0 14px"><label>TIPO DE UNIDAD</label><select id="ccComMatrixUnit">'+options(C.tiposUnidad||[])+'</select></div><div id="ccComMatrixSummary" class="cc-note" style="margin:8px 0 12px"></div><div class="cc-com-scroll"><table class="cc-com-table"><thead><tr><th>Tipo de viaje</th><th>Clasificación</th><th>Comisión operador</th><th>N/A</th><th>Acción</th></tr></thead><tbody id="ccComMatrixBody"><tr><td colspan="5" style="text-align:center;padding:24px">Selecciona un tipo de unidad para mostrar la matriz.</td></tr></tbody></table></div></div>';const sel=sec.querySelector('#ccComMatrixUnit');sel.onchange=renderCommissionMatrix;}
function commissionServices(){const out=[];(C.tiposMovimiento||[]).filter(t=>String(t.nombre||'').trim().toUpperCase()!=='RESGUARDO').forEach(t=>{if(t.clasificacion_manual){out.push({tipo:t,cl:null,nombre:'CANTIDAD DE HORAS'});}else{(C.clasificaciones||[]).filter(z=>String(z.tipo_viaje_id)===String(t.id)).forEach(cl=>out.push({tipo:t,cl,nombre:cl.nombre}));}});return out;}
function existingCommission(uid,s){return (C.tarifas||[]).find(x=>String(x.tipo_unidad_id)===String(uid)&&String(x.tipo_movimiento_id)===String(s.tipo.id)&&((!s.cl&&(!x.clasificacion_id||String(x.clasificacion_nombre)===String(s.nombre)))||(s.cl&&String(x.clasificacion_id)===String(s.cl.id))));}
function renderCommissionMatrix(){const uid=document.getElementById('ccComMatrixUnit')?.value,body=document.getElementById('ccComMatrixBody'),sum=document.getElementById('ccComMatrixSummary');if(!body)return;if(!uid){body.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px">Selecciona un tipo de unidad para mostrar la matriz.</td></tr>';if(sum)sum.textContent='';return;}const xs=commissionServices();let configured=0,na=0;body.innerHTML=xs.map((s,i)=>{const x=existingCommission(uid,s),aplica=x?.aplica!==false;if(x&&aplica)configured++;if(x&&!aplica)na++;return '<tr data-com-row="'+i+'"><td><strong>'+esc(s.tipo.nombre)+'</strong></td><td>'+esc(s.nombre)+'</td><td><div style="display:flex;gap:6px;align-items:center"><span>$</span><input data-com-price type="number" min="0" step="0.01" value="'+(x&&aplica?Number(x.tarifa).toFixed(2):'')+'" placeholder="0.00" '+(!aplica?'disabled':'')+' style="width:145px"></div></td><td><label style="display:inline-flex;gap:6px;align-items:center;font-weight:800"><input data-com-na type="checkbox" '+(!aplica?'checked':'')+'> N/A</label></td><td><button class="cc-btn cc-btn-primary" data-com-save '+(canEdit()?'':'disabled')+'>Guardar</button></td></tr>'}).join('');if(sum)sum.textContent=xs.length+' combinaciones precargadas · '+configured+' con comisión · '+na+' marcadas N/A';body.querySelectorAll('tr[data-com-row]').forEach(tr=>{const nax=tr.querySelector('[data-com-na]'),inp=tr.querySelector('[data-com-price]');nax.onchange=()=>{inp.disabled=nax.checked;if(nax.checked)inp.value=''};tr.querySelector('[data-com-save]').onclick=()=>saveCommissionMatrixRow(tr,xs[Number(tr.dataset.comRow)],uid);});}
async function saveCommissionMatrixRow(tr,s,uid){if(!canEdit())return alert('Sin permiso para modificar comisiones.');const na=tr.querySelector('[data-com-na]').checked,inp=tr.querySelector('[data-com-price]'),tarifa=na?0:Number(inp.value),btn=tr.querySelector('[data-com-save]');if(!na&&(inp.value===''||!Number.isFinite(tarifa)||tarifa<0))return alert('Captura la comisión o marca N/A.');const old=existingCommission(uid,s);btn.disabled=true;btn.textContent='Guardando…';try{await rpc('cc_commission_save',{p_item:{id:old?.id||'',tipoUnidadId:uid,tipoMovimientoId:s.tipo.id,clasificacionId:s.cl?.id||'',tarifa,aplica:!na,estatus:'ACTIVO'}});await loadCatalog();btn.textContent='Guardado ✓';renderCommissionMatrix();window.ccLogActivity?.('MODIFICACION','Configuración','Matriz de comisión actualizada',old?.id||null,'Matriz de comisiones');}catch(e){alert(e.message||e);btn.disabled=false;btn.textContent='Guardar';}}
function installConfig(){const p=configPanel(),n=configNav();if(!p||!n)return;let btn=n.querySelector('[data-cc-commission-nav]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='cc-config-nav-btn';btn.setAttribute('data-cc-commission-nav','1');btn.innerHTML='<i class="fa-solid fa-money-bill-transfer"></i><span>Matriz de comisiones</span><small>Por tipo de unidad</small>';n.appendChild(btn);}else{btn.innerHTML='<i class="fa-solid fa-money-bill-transfer"></i><span>Matriz de comisiones</span><small>Por tipo de unidad</small>';}let sec=document.getElementById('ccConfigTarifasComisiones');if(!sec){sec=document.createElement('div');sec.id='ccConfigTarifasComisiones';sec.className='cc-config-section';p.appendChild(sec);}btn.onclick=async()=>{showConfigSection(sec,btn);try{await renderTariffs();window.ccLogActivity?.('CONSULTA','Configuración','Consultó Matriz de comisiones',null,'Matriz de comisiones')}catch(e){sec.innerHTML='<div class="cc-note">'+esc(e.message||e)+'</div>';}};}
function dateStartMonth(){const d=new Date();return d.toISOString().slice(0,8)+'01';}
function today(){return new Date().toISOString().slice(0,10);}

let LIQ_HISTORY=[];
function liqDate(v){if(!v)return'—';const s=String(v).slice(0,10).split('-');return s.length===3?s[2]+'/'+s[1]+'/'+s[0]:String(v)}
function liqDateTime(v){if(!v)return'—';try{return new Date(v).toLocaleString('es-MX')}catch{return String(v)}}
function liqStyles(){
  if(document.getElementById('ccLiqPageStyles'))return;
  const s=document.createElement('style');s.id='ccLiqPageStyles';s.textContent=
  '#ccLiquidationsPage{font-size:11px}#ccLiquidationsPage .liq-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px}'+
  '#ccLiquidationsPage .liq-tabs{display:flex;gap:6px;flex-wrap:wrap}#ccLiquidationsPage .liq-filter{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:7px;align-items:end}'+
  '#ccLiquidationsPage .liq-filter .cc-field label{font-size:9px}#ccLiquidationsPage .cc-field input,#ccLiquidationsPage .cc-field select{min-height:34px;padding:6px 8px;font-size:11px}'+
  '#ccLiquidationsPage .liq-summary{display:grid;grid-template-columns:repeat(3,minmax(125px,1fr));gap:7px;margin:8px 0}'+
  '#ccLiquidationsPage .liq-kpi{padding:8px 10px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc}#ccLiquidationsPage .liq-kpi small{display:block;color:#64748b;font-size:9px}#ccLiquidationsPage .liq-kpi strong{font-size:15px}'+
  '#ccLiquidationsPage .liq-group{border:1px solid #e2e8f0;border-radius:10px;margin-top:8px;overflow:hidden}#ccLiquidationsPage .liq-group-head{padding:8px 10px;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;align-items:center}'+
  '#ccLiquidationsPage .cc-com-table th,#ccLiquidationsPage .cc-com-table td{padding:6px 7px;font-size:10px}#ccLiquidationsPage .cc-com-table th{white-space:nowrap}'+
  '#ccLiquidationsPage .liq-tarifa{width:92px!important;min-height:28px!important;padding:4px 6px!important;font-size:10px!important}#ccLiquidationsPage .liq-dirty{background:#fff7ed!important;border-color:#fb923c!important}'+
  '#ccLiquidationsPage .liq-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}#ccLiquidationsPage .liq-actions .cc-btn{padding:6px 8px;font-size:10px}'+
  '#ccLiquidationsPage .liq-hist-filters{display:grid;grid-template-columns:1.3fr repeat(4,minmax(130px,.8fr));gap:7px;align-items:end}'+
  '#ccLiquidationsPage .liq-detail{margin-top:10px;border:1px solid #cbd5e1;border-radius:11px;overflow:hidden}'+
  '@media(max-width:800px){#ccLiquidationsPage .liq-summary{grid-template-columns:1fr 1fr}#ccLiquidationsPage .liq-hist-filters{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(s);
}
async function openLiquidations(){
  if(!canSheets())return alert('Sin permiso para Control de Hojas de Servicio.');
  styles();liqStyles();
  const host=document.getElementById('hs104View');if(!host)return;
  host.innerHTML='<div id="ccLiquidationsPage">'+
    '<div class="hs104-card">'+
      '<div class="liq-head"><div><strong style="font-size:15px">Liquidaciones de operadores</strong><div class="hs104-note">Edición compacta de tarifas, generación y consulta histórica.</div></div>'+
      '<div class="liq-tabs"><button class="cc-btn cc-btn-primary" id="ccLiqTabPending"><i class="fa-solid fa-list-check"></i> Pendientes</button><button class="cc-btn cc-btn-light" id="ccLiqTabHistory"><i class="fa-solid fa-clock-rotate-left"></i> Historial</button></div></div>'+
      '<div id="ccLiqPendingPane">'+
        '<div class="liq-filter">'+
          '<div class="cc-field"><label>Desde</label><input id="ccLiqDesde" type="date" value="'+dateStartMonth()+'"></div>'+
          '<div class="cc-field"><label>Hasta</label><input id="ccLiqHasta" type="date" value="'+today()+'"></div>'+
          '<div class="cc-field"><label>Operador</label><select id="ccLiqOper"><option value="">Todos</option></select></div>'+
          '<div><button id="ccLiqCalc" class="cc-btn cc-btn-primary" style="width:100%"><i class="fa-solid fa-calculator"></i> Calcular</button></div>'+
        '</div>'+
        '<div id="ccLiqResult" style="margin-top:9px"></div>'+
      '</div>'+
      '<div id="ccLiqHistoryPane" style="display:none">'+
        '<div class="liq-hist-filters">'+
          '<div class="cc-field"><label>Buscar</label><input id="ccLiqHistSearch" type="search" placeholder="Número u operador"></div>'+
          '<div class="cc-field"><label>Operador</label><select id="ccLiqHistOper"><option value="">Todos</option></select></div>'+
          '<div class="cc-field"><label>Periodo desde</label><input id="ccLiqHistDesde" type="date"></div>'+
          '<div class="cc-field"><label>Periodo hasta</label><input id="ccLiqHistHasta" type="date"></div>'+
          '<div class="cc-field"><label>Estatus</label><select id="ccLiqHistStatus"><option value="">Todos</option></select></div>'+
        '</div>'+
        '<div id="ccLiqHistory" style="margin-top:10px"></div><div id="ccLiqHistDetail"></div>'+
      '</div>'+
    '</div>'+
  '</div>';
  const page=document.getElementById('ccLiquidationsPage');
  const showPane=hist=>{
    page.querySelector('#ccLiqPendingPane').style.display=hist?'none':'';
    page.querySelector('#ccLiqHistoryPane').style.display=hist?'':'none';
    page.querySelector('#ccLiqTabPending').className='cc-btn '+(hist?'cc-btn-light':'cc-btn-primary');
    page.querySelector('#ccLiqTabHistory').className='cc-btn '+(hist?'cc-btn-primary':'cc-btn-light');
    if(hist)history();
  };
  page.querySelector('#ccLiqTabPending').onclick=()=>showPane(false);
  page.querySelector('#ccLiqTabHistory').onclick=()=>showPane(true);
  page.querySelector('#ccLiqCalc').onclick=calculate;
  await calculate();
  window.ccLogActivity?.('CONSULTA','Control de Hojas de Servicio','Consultó Liquidaciones',null,'Liquidaciones');
}
function liqDirtyRows(root){
  return [...root.querySelectorAll('[data-liq-tarifa]')].filter(inp=>String(inp.value).trim()!==String(inp.dataset.orig??'').trim());
}
function liqUpdateSaveState(){
  const root=document.getElementById('ccLiqResult');if(!root)return;
  const dirty=liqDirtyRows(root),b=root.querySelector('#ccLiqSaveAll');
  if(b){b.disabled=!dirty.length||!canLiquidationEdit();b.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar tarifas'+(dirty.length?' ('+dirty.length+')':'');}
  root.querySelectorAll('[data-gen]').forEach(x=>x.disabled=x.dataset.baseDisabled==='1'||dirty.length>0);
}
async function saveLiquidationTariffs(){
  if(!canLiquidationEdit())return alert('Sin permiso para editar tarifas de liquidación.');
  const root=document.getElementById('ccLiqResult');if(!root)return;
  const dirty=liqDirtyRows(root);if(!dirty.length)return;
  const items=[];
  for(const inp of dirty){
    const raw=String(inp.value||'').trim();
    if(raw==='')continue;
    const tarifa=Number(raw);
    if(!Number.isFinite(tarifa)||tarifa<0)return alert('Hay una tarifa inválida. Corrígela antes de guardar.');
    items.push({comprobacionId:inp.closest('[data-liq-row]')?.dataset.liqRow,tarifa});
  }
  if(!items.length)return alert('No hay tarifas capturadas para guardar.');
  const b=root.querySelector('#ccLiqSaveAll'),old=b?.innerHTML;if(b){b.disabled=true;b.textContent='Guardando…'}
  try{
    const d=await rpc('hs_liquidacion_tarifa_override_save_batch',{p_items:items});
    alert('Tarifas guardadas: '+Number(d.guardadas||items.length));
    await calculate();
  }catch(e){alert(e.message||e);if(b){b.disabled=false;b.innerHTML=old}}
}
async function calculate(){
  const page=document.getElementById('ccLiquidationsPage');if(!page)return;
  const desde=page.querySelector('#ccLiqDesde').value,hasta=page.querySelector('#ccLiqHasta').value,oper=page.querySelector('#ccLiqOper').value||null,res=page.querySelector('#ccLiqResult');
  res.innerHTML='<div class="cc-note">Calculando…</div>';
  try{
    const d=await rpc('hs_liquidaciones_preview',{p_desde:desde,p_hasta:hasta,p_operador_id:oper}),rows=d.rows||[];
    const sel=page.querySelector('#ccLiqOper'),current=sel.value;
    const ops=[...new Map(rows.filter(x=>x.operador_id).map(x=>[x.operador_id,x.operador_nombre])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'es'));
    sel.innerHTML='<option value="">Todos</option>'+ops.map(x=>'<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>').join('');sel.value=current;
    const groups={};
    rows.forEach(r=>{const k=r.operador_id||'SIN';(groups[k]??={id:r.operador_id,nombre:r.operador_nombre||'Sin operador',rows:[],total:0,sin:0,con:0}).rows.push(r);if(r.tarifa!=null){groups[k].total+=Number(r.tarifa);groups[k].con++;}else groups[k].sin++;});
    const gs=Object.values(groups),total=gs.reduce((s,g)=>s+g.total,0),hojas=rows.filter(r=>r.tarifa!=null).length,sin=rows.length-hojas;
    res.innerHTML=
      '<div class="liq-actions" style="justify-content:space-between;margin-bottom:7px"><div class="hs104-note">'+(sin?'<span class="cc-com-warn">'+sin+' viaje(s) sin tarifa se ignorarán al liquidar.</span>':'Tarifas completas para el rango seleccionado.')+'</div>'+
      '<button id="ccLiqSaveAll" class="cc-btn cc-btn-primary" '+(canLiquidationEdit()?'':'disabled')+'><i class="fa-solid fa-floppy-disk"></i> Guardar tarifas</button></div>'+
      '<div class="liq-summary"><div class="liq-kpi"><small>Viajes incluidos</small><strong>'+hojas+'</strong></div><div class="liq-kpi"><small>Sin tarifa</small><strong>'+sin+'</strong></div><div class="liq-kpi"><small>Total comisión</small><strong>'+money(total)+'</strong></div></div>'+
      (!gs.length?'<div class="cc-note" style="padding:14px;text-align:center">No hay viajes pendientes de liquidar en este rango.</div>':
       gs.map(g=>'<div class="liq-group"><div class="liq-group-head"><div><strong>'+esc(g.nombre)+'</strong><div class="hs104-note">'+g.con+' incluidos'+(g.sin?' · '+g.sin+' sin tarifa':'')+'</div></div><div style="text-align:right"><strong>'+money(g.total)+'</strong><div><button class="cc-btn cc-btn-primary" data-gen="'+esc(g.id)+'" data-base-disabled="'+(g.con<=0?'1':'0')+'" '+(g.con<=0?'disabled':'')+'>Generar liquidación</button></div></div></div>'+
       '<div class="cc-com-scroll"><table class="cc-com-table" style="min-width:900px"><thead><tr><th>Folio</th><th>Fecha</th><th>Unidad</th><th>Tipo</th><th>Movimiento</th><th>Clasificación</th><th>Tarifa</th></tr></thead><tbody>'+
       g.rows.map(r=>'<tr data-liq-row="'+esc(r.comprobacion_id)+'"><td><strong>'+esc(r.folio||'—')+'</strong></td><td>'+esc(liqDate(r.fecha_servicio))+'</td><td>'+esc(r.unidad_numero||'—')+'</td><td>'+esc(r.tipo_unidad||'—')+'</td><td>'+esc(r.tipo_movimiento||'—')+'</td><td>'+esc(r.clasificacion||'—')+'</td><td><div style="display:flex;align-items:center;gap:4px"><span>$</span><input class="liq-tarifa" data-liq-tarifa type="number" min="0" step="0.01" value="'+(r.tarifa==null?'':Number(r.tarifa).toFixed(2))+'" data-orig="'+(r.tarifa==null?'':Number(r.tarifa).toFixed(2))+'" placeholder="Sin tarifa" '+(canLiquidationEdit()?'':'disabled')+'></div>'+(r.tarifa==null?'<span class="cc-com-warn" style="font-size:9px">Se ignora si queda vacío</span>':'')+'</td></tr>').join('')+
       '</tbody></table></div></div>').join(''));
    res.querySelector('#ccLiqSaveAll')?.addEventListener('click',saveLiquidationTariffs);
    res.querySelectorAll('[data-liq-tarifa]').forEach(inp=>inp.addEventListener('input',()=>{inp.classList.toggle('liq-dirty',String(inp.value).trim()!==String(inp.dataset.orig??'').trim());liqUpdateSaveState()}));
    res.querySelectorAll('[data-gen]').forEach(b=>b.onclick=()=>{if(liqDirtyRows(res).length)return alert('Guarda primero los cambios de tarifa.');generateLiquidation(b.dataset.gen,desde,hasta)});
    liqUpdateSaveState();
  }catch(e){res.innerHTML='<div class="cc-com-warn">'+esc(e.message||e)+'</div>'}
}
async function generateLiquidation(op,desde,hasta){
  if(!confirm('¿Generar la liquidación de este operador? Los viajes con tarifa quedarán cerrados; los que sigan sin tarifa permanecerán pendientes.'))return;
  try{
    const d=await rpc('hs_liquidacion_generar',{p_desde:desde,p_hasta:hasta,p_operador_id:op});
    alert((d.numero?d.numero+'\\n':'')+'Liquidación generada.\\nViajes incluidos: '+d.totalHojas+'\\nSin tarifa ignorados: '+Number(d.ignoradasSinTarifa||0)+'\\nTotal: '+money(d.totalComision));
    window.ccLogActivity?.('ALTA','Control de Hojas de Servicio','Generó liquidación '+(d.numero||'')+' por '+money(d.totalComision),d.liquidacionId,'Liquidaciones');
    await calculate();
  }catch(e){alert(e.message||e)}
}
async function history(){
  const page=document.getElementById('ccLiquidationsPage'),el=page?.querySelector('#ccLiqHistory');if(!el)return;
  el.innerHTML='<div class="cc-note">Cargando historial…</div>';
  try{
    const d=await rpc('hs_liquidaciones_list',{p_limit:500});LIQ_HISTORY=d.liquidaciones||[];
    const opSel=page.querySelector('#ccLiqHistOper'),statusSel=page.querySelector('#ccLiqHistStatus');
    const ops=[...new Set(LIQ_HISTORY.map(x=>x.operador_nombre).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    const sts=[...new Set(LIQ_HISTORY.map(x=>x.estatus).filter(Boolean))].sort();
    opSel.innerHTML='<option value="">Todos</option>'+ops.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
    statusSel.innerHTML='<option value="">Todos</option>'+sts.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
    ['ccLiqHistSearch','ccLiqHistOper','ccLiqHistDesde','ccLiqHistHasta','ccLiqHistStatus'].forEach(id=>page.querySelector('#'+id)?.addEventListener(id==='ccLiqHistSearch'?'input':'change',drawHistory));
    drawHistory();
  }catch(e){el.innerHTML='<div class="cc-com-warn">'+esc(e.message||e)+'</div>'}
}
function drawHistory(){
  const page=document.getElementById('ccLiquidationsPage'),el=page?.querySelector('#ccLiqHistory');if(!el)return;
  const q=String(page.querySelector('#ccLiqHistSearch')?.value||'').trim().toUpperCase(),op=page.querySelector('#ccLiqHistOper')?.value||'',de=page.querySelector('#ccLiqHistDesde')?.value||'',ha=page.querySelector('#ccLiqHistHasta')?.value||'',st=page.querySelector('#ccLiqHistStatus')?.value||'';
  const xs=LIQ_HISTORY.filter(x=>{
    if(q&&!String((x.numero||'')+' '+(x.operador_nombre||'')).toUpperCase().includes(q))return false;
    if(op&&x.operador_nombre!==op)return false;if(st&&x.estatus!==st)return false;
    if(de&&String(x.fecha_hasta||'')<de)return false;if(ha&&String(x.fecha_desde||'')>ha)return false;
    return true;
  });
  const total=xs.reduce((s,x)=>s+Number(x.total_comision||0),0);
  el.innerHTML='<div class="liq-summary"><div class="liq-kpi"><small>Liquidaciones</small><strong>'+xs.length+'</strong></div><div class="liq-kpi"><small>Viajes liquidados</small><strong>'+xs.reduce((s,x)=>s+Number(x.total_hojas||0),0)+'</strong></div><div class="liq-kpi"><small>Total histórico filtrado</small><strong>'+money(total)+'</strong></div></div>'+
    '<div class="cc-com-scroll"><table class="cc-com-table" style="min-width:980px"><thead><tr><th>Liquidación</th><th>Generada</th><th>Operador</th><th>Periodo</th><th>Viajes</th><th>Total</th><th>Estatus</th><th>Acciones</th></tr></thead><tbody>'+
    (xs.length?xs.map(x=>'<tr><td><strong>'+esc(x.numero||x.id)+'</strong></td><td>'+esc(liqDateTime(x.created_at))+'</td><td>'+esc(x.operador_nombre||'—')+'</td><td>'+esc(liqDate(x.fecha_desde))+' → '+esc(liqDate(x.fecha_hasta))+'</td><td>'+esc(x.total_hojas||0)+'</td><td><strong>'+money(x.total_comision||0)+'</strong></td><td>'+esc(x.estatus||'—')+'</td><td class="liq-actions"><button class="cc-btn cc-btn-light" data-liq-view="'+esc(x.id)+'"><i class="fa-solid fa-eye"></i> Ver</button><button class="cc-btn cc-btn-light" data-liq-pdf="'+esc(x.id)+'"><i class="fa-solid fa-file-pdf"></i> PDF</button></td></tr>').join(''):'<tr><td colspan="8" style="text-align:center;padding:16px">Sin liquidaciones con estos filtros.</td></tr>')+
    '</tbody></table></div>';
  el.querySelectorAll('[data-liq-view]').forEach(b=>b.onclick=()=>viewLiquidation(b.dataset.liqView));
  el.querySelectorAll('[data-liq-pdf]').forEach(b=>b.onclick=()=>pdfLiquidation(b.dataset.liqPdf));
}
async function viewLiquidation(id){
  const page=document.getElementById('ccLiquidationsPage'),el=page?.querySelector('#ccLiqHistDetail');if(!el)return;
  el.innerHTML='<div class="cc-note" style="margin-top:10px">Cargando detalle…</div>';
  try{
    const d=await rpc('hs_liquidacion_detail',{p_liquidacion_id:id}),l=d.liquidacion||{},xs=d.detalles||[];
    el.innerHTML='<div class="liq-detail"><div class="liq-group-head"><div><strong>Detalle · '+esc(l.numero||l.id)+'</strong><div class="hs104-note">'+esc(l.operador_nombre||'—')+' · '+esc(liqDate(l.fecha_desde))+' → '+esc(liqDate(l.fecha_hasta))+'</div></div><div class="liq-actions"><strong>'+money(l.total_comision||0)+'</strong><button class="cc-btn cc-btn-light" data-detail-pdf><i class="fa-solid fa-file-pdf"></i> PDF</button><button class="cc-btn cc-btn-light" data-detail-close>Cerrar detalle</button></div></div>'+
      '<div class="cc-com-scroll"><table class="cc-com-table" style="min-width:1050px"><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Unidad</th><th>Remolque</th><th>Movimiento</th><th>Clasificación</th><th>Tarifa</th></tr></thead><tbody>'+
      xs.map(x=>'<tr><td><strong>'+esc(x.folio||'—')+'</strong></td><td>'+esc(liqDate(x.fecha_servicio))+'</td><td>'+esc(x.cliente_nombre||'—')+'</td><td>'+esc(x.unidad_numero||'—')+'</td><td>'+esc(x.remolque_numero||'—')+'</td><td>'+esc(x.tipo_movimiento||'—')+'</td><td>'+esc(x.clasificacion||'—')+'</td><td><strong>'+money(x.importe||x.tarifa||0)+'</strong></td></tr>').join('')+
      '</tbody></table></div><div class="hs104-note" style="padding:8px 10px">Las liquidaciones generadas son de solo lectura para preservar su integridad. Las correcciones de tarifa se realizan antes de generar.</div></div>';
    el.querySelector('[data-detail-close]').onclick=()=>{el.innerHTML=''};
    el.querySelector('[data-detail-pdf]').onclick=()=>pdfLiquidation(id);
  }catch(e){el.innerHTML='<div class="cc-com-warn" style="margin-top:10px">'+esc(e.message||e)+'</div>'}
}
async function liqJsPDF(){
  if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
  await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  return window.jspdf.jsPDF;
}
async function pdfLiquidation(id){
  try{
    const d=await rpc('hs_liquidacion_detail',{p_liquidacion_id:id}),l=d.liquidacion||{},xs=d.detalles||[],J=await liqJsPDF(),doc=new J({unit:'mm',format:'a4'});
    const W=210,H=297,ml=12,mr=12,cw=W-ml-mr,num=l.numero||l.id||'LIQUIDACION';
    const footer=()=>{
      doc.setDrawColor(226,232,240);doc.line(ml,286,W-mr,286);doc.setFont('helvetica','normal');doc.setFontSize(7.3);doc.setTextColor(100,116,139);
      doc.text('Liquidación de operador · '+String(num),ml,291);doc.text('Generado '+new Date().toLocaleString('es-MX'),W-mr,291,{align:'right'});doc.setTextColor(15,23,42);
    };
    const header=(title,sub)=>{
      doc.setFillColor(15,23,42);doc.rect(0,0,W,27,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(title,ml,11);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(String(sub||num),ml,18);doc.setTextColor(15,23,42);
    };
    header('LIQUIDACIÓN DE OPERADOR',num);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(100,116,139);
    doc.text('OPERADOR',ml,38);doc.text('PERIODO',92,38);doc.text('GENERADA',153,38);
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(15,23,42);
    doc.text(String(l.operador_nombre||'—').slice(0,42),ml,44);doc.text(liqDate(l.fecha_desde)+' → '+liqDate(l.fecha_hasta),92,44);doc.text(liqDate(l.created_at),153,44);
    doc.setFillColor(248,250,252);doc.roundedRect(ml,52,cw,22,3,3,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(100,116,139);doc.text('VIAJES LIQUIDADOS',ml+5,60);doc.text('TOTAL A LIQUIDAR',W-mr-5,60,{align:'right'});
    doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(15,23,42);doc.text(String(xs.length),ml+5,69);doc.text(money(l.total_comision||0),W-mr-5,69,{align:'right'});
    let y=84;
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('Resumen por movimiento',ml,y);y+=6;
    doc.setFillColor(241,245,249);doc.rect(ml,y,cw,8,'F');doc.setFontSize(7.5);doc.text('Movimiento',ml+3,y+5.5);doc.text('Viajes',145,y+5.5,{align:'right'});doc.text('Total',W-mr-3,y+5.5,{align:'right'});y+=12;
    const g={};xs.forEach(x=>{const k=x.tipo_movimiento||'SIN TIPO';if(!g[k])g[k]={n:0,t:0};g[k].n++;g[k].t+=Number(x.importe||0)});
    doc.setFont('helvetica','normal');doc.setFontSize(8);
    Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0],'es')).forEach(([k,v])=>{doc.text(String(k).slice(0,64),ml+3,y);doc.text(String(v.n),145,y,{align:'right'});doc.text(money(v.t),W-mr-3,y,{align:'right'});y+=6;});
    footer();

    doc.addPage();header('DETALLE DE LIQUIDACIÓN',num);y=37;
    const cols=[['Folio',42],['Fecha',20],['Unidad',19],['Movimiento',39],['Clasificación',43],['Tarifa',23]],xs0=ml;
    doc.setFillColor(241,245,249);doc.rect(ml,y,cw,8,'F');doc.setFont('helvetica','bold');doc.setFontSize(7);
    let x=xs0;cols.forEach(z=>{doc.text(z[0],x+2,y+5.5);x+=z[1]});y+=11;
    doc.setFont('helvetica','normal');doc.setFontSize(7.2);
    for(const r of xs){
      if(y>278){footer();doc.addPage();header('DETALLE DE LIQUIDACIÓN',num);y=37;doc.setFillColor(241,245,249);doc.rect(ml,y,cw,8,'F');doc.setFont('helvetica','bold');doc.setFontSize(7);x=xs0;cols.forEach(z=>{doc.text(z[0],x+2,y+5.5);x+=z[1]});y+=11;doc.setFont('helvetica','normal');doc.setFontSize(7.2)}
      x=xs0;
      const vals=[r.folio||'—',liqDate(r.fecha_servicio),r.unidad_numero||'—',r.tipo_movimiento||'—',r.clasificacion||'—',money(r.importe||r.tarifa||0)];
      vals.forEach((v,i)=>{const max=cols[i][1]-4;const a=doc.splitTextToSize(String(v),max);doc.text(a.slice(0,2),x+2,y);x+=cols[i][1]});
      y+=9;doc.setDrawColor(226,232,240);doc.line(ml,y-4,W-mr,y-4);
    }
    y+=2;doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('TOTAL',ml,y);doc.text(money(l.total_comision||0),W-mr,y,{align:'right'});footer();
    const safeName=String(l.operador_nombre||'OPERADOR').replace(/[^a-zA-Z0-9ÁÉÍÓÚÑáéíóúñ_-]+/g,'_');
    doc.save('Liquidacion_'+String(num).replace(/[^a-zA-Z0-9_-]+/g,'_')+'_'+safeName+'.pdf');
  }catch(e){alert(e.message||e)}
}
window.ccOpenLiquidaciones=openLiquidations;
function installLiquidButton(){const nav=document.getElementById('hs104Nav');if(!nav||nav.querySelector('[data-cc-liquidaciones]')||!canSheets())return;const b=document.createElement('button');b.type='button';b.className='cc-btn cc-btn-light';b.setAttribute('data-cc-liquidaciones','1');b.innerHTML='<i class="fa-solid fa-money-check-dollar mr-1"></i>Liquidaciones';b.onclick=openLiquidations;nav.appendChild(b);}
function boot(){styles();installConfig();installLiquidButton();setTimeout(()=>{installConfig();installLiquidButton()},1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
