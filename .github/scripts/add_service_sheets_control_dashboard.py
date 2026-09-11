from pathlib import Path

P=Path('profesional/assets/js/modules/service-sheets.js')
if not P.exists(): raise SystemExit('No existe service-sheets.js')
text=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Hojas de Servicio v3 · tablero de control */'
if marker in text:
    print('Tablero v3 ya integrado')
    raise SystemExit(0)

extra=r'''

/* Tráfico App Profesional · Hojas de Servicio v3 · tablero de control */
(function(){
 if(window.__ccServiceSheetsV3)return;window.__ccServiceSheetsV3=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const d=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
 let all=[];
 const statusMeta={
  NUEVO:['Nuevo','Disponible sin asignar','background:#e0f2fe;color:#075985'],
  PENDIENTE_ACEPTACION:['Pend. aceptación','Pendiente del responsable','background:#fef3c7;color:#92400e'],
  EN_CUSTODIA:['Con responsable','Disponible con responsable','background:#ede9fe;color:#5b21b6'],
  ASIGNADO_OPERADOR:['Pendiente comprobar','Con operador','background:#fee2e2;color:#991b1b'],
  UTILIZADO:['Comprobada','Utilizada','background:#dcfce7;color:#166534']
 };
 function view(){return document.getElementById('hsViewControl');}
 async function load(){
  const fd=document.getElementById('hsCtlDesde')?.value||'',fh=document.getElementById('hsCtlHasta')?.value||'';
  const r=await sb().rpc('hs_control_folios',{p_filters:{fechaDesde:fd,fechaHasta:fh}});
  if(r.error)throw r.error; if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo cargar el control');
  all=r.data.folios||[]; renderKpis(r.data.resumen||{}); fillSelects(); renderRows();
 }
 function selectedStatuses(){return [...document.querySelectorAll('#hsCtlChecks input[data-st]:checked')].map(x=>x.dataset.st);}
 function filtered(){
  const q=(document.getElementById('hsCtlBuscar')?.value||'').trim().toLowerCase();
  const rs=document.getElementById('hsCtlResp')?.value||'',op=document.getElementById('hsCtlOp')?.value||'';
  const sts=selectedStatuses();
  return all.filter(x=>(!sts.length||sts.includes(x.estatus))&&(!rs||x.responsable===rs)&&(!op||x.operador===op)&&(!q||[x.folio,x.responsable,x.operador,x.servicio,x.creadoPor].some(v=>String(v||'').toLowerCase().includes(q))));
 }
 function renderKpis(r){
  const k=document.getElementById('hsCtlKpis');if(!k)return;
  const items=[['Total',r.total||0,''],['Pendientes de comprobar',r.pendientesComprobar||0,'ASIGNADO_OPERADOR'],['Comprobadas',r.utilizados||0,'UTILIZADO'],['Con responsable',r.disponiblesResponsable||0,'EN_CUSTODIA'],['Nuevas',r.nuevos||0,'NUEVO']];
  k.innerHTML=items.map(x=>'<button type="button" class="cc-ant-kpi" data-k="'+x[2]+'" style="text-align:left;border:1px solid #e2e8f0;cursor:pointer"><small>'+x[0]+'</small><strong>'+Number(x[1]).toLocaleString('es-MX')+'</strong></button>').join('');
  k.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{document.querySelectorAll('#hsCtlChecks input[data-st]').forEach(x=>x.checked=!b.dataset.k||x.dataset.st===b.dataset.k);renderRows()});
 }
 function fillSelects(){
  const set=(id,vals)=>{const s=document.getElementById(id);if(!s)return;const old=s.value;s.innerHTML='<option value="">Todos</option>'+[...new Set(vals.filter(Boolean))].sort().map(v=>'<option>'+esc(v)+'</option>').join('');s.value=old};
  set('hsCtlResp',all.map(x=>x.responsable));set('hsCtlOp',all.map(x=>x.operador));
 }
 function renderRows(){
  const xs=filtered(),b=document.getElementById('hsCtlBody'),n=document.getElementById('hsCtlCount');if(n)n.textContent=xs.length.toLocaleString('es-MX')+' hoja(s)';if(!b)return;
  b.innerHTML=xs.length?xs.map(x=>{const m=statusMeta[x.estatus]||[x.estatus,x.ubicacion||'', 'background:#e2e8f0;color:#334155'];return '<tr><td><strong>'+esc(x.folio)+'</strong><div style="font-size:9px;color:#64748b">Creada '+d(x.createdAt)+'</div></td><td><span style="display:inline-block;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;'+m[2]+'">'+m[0]+'</span><div style="font-size:9px;color:#64748b;margin-top:4px">'+esc(x.ubicacion||m[1])+'</div></td><td>'+esc(x.responsable||'—')+'</td><td>'+esc(x.operador||'—')+'</td><td>'+esc(x.servicio||'—')+'<div style="font-size:9px;color:#64748b">'+(x.usadoAt?d(x.usadoAt):'')+'</div></td><td><strong>'+esc(x.creadoPor||'Sin registro histórico')+'</strong><div style="font-size:9px;color:#64748b">'+esc(x.creadoPorEmail||'')+'</div></td></tr>'}).join(''):'<tr><td colspan="6" style="text-align:center;padding:28px;color:#64748b">No hay hojas que coincidan con los filtros.</td></tr>';
 }
 function install(){
  const panel=document.getElementById('ccPanelHojasServicio');if(!panel)return false;
  const nav=[...panel.querySelectorAll('[data-hsv]')].map(x=>x.parentElement).find(x=>x&&x.querySelector('[data-hsv="Folios"]'));
  if(!nav)return false;
  let btn=nav.querySelector('[data-hsv="Control"]');
  if(!btn){btn=document.createElement('button');btn.className='cc-btn cc-btn-light';btn.dataset.hsv='Control';btn.innerHTML='<i class="fa-solid fa-location-crosshairs mr-1"></i>Control / rastreo';nav.insertBefore(btn,nav.firstChild)}
  let v=view();if(!v){v=document.createElement('div');v.id='hsViewControl';v.className='hs-view';v.style.display='none';v.innerHTML='<div style="background:linear-gradient(135deg,#0f172a,#1e3a8a);color:white;border-radius:16px;padding:16px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><div style="font-size:18px;font-weight:900">Rastreo de Hojas de Servicio</div><div style="font-size:11px;color:#bfdbfe">Ubica cada hoja, detecta pendientes y revisa quién la generó.</div></div><button class="cc-btn cc-btn-light" id="hsCtlRefresh">Actualizar</button></div></div><div id="hsCtlKpis" class="cc-ant-kpis"></div><div class="cc-config-card" style="margin-top:12px"><div class="cc-grid"><div class="cc-field"><label>Buscar</label><input id="hsCtlBuscar" placeholder="Folio, responsable, operador, servicio o creador"></div><div class="cc-field"><label>Responsable</label><select id="hsCtlResp"><option value="">Todos</option></select></div><div class="cc-field"><label>Operador</label><select id="hsCtlOp"><option value="">Todos</option></select></div><div class="cc-field"><label>Desde creación</label><input id="hsCtlDesde" type="date"></div><div class="cc-field"><label>Hasta creación</label><input id="hsCtlHasta" type="date"></div></div><div id="hsCtlChecks" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><label class="cc-perm-check"><input type="checkbox" data-st="ASIGNADO_OPERADOR" checked> Pendientes de comprobar</label><label class="cc-perm-check"><input type="checkbox" data-st="UTILIZADO" checked> Comprobadas</label><label class="cc-perm-check"><input type="checkbox" data-st="EN_CUSTODIA" checked> Con responsable</label><label class="cc-perm-check"><input type="checkbox" data-st="PENDIENTE_ACEPTACION" checked> Pend. aceptación</label><label class="cc-perm-check"><input type="checkbox" data-st="NUEVO" checked> Nuevas</label></div></div><div class="cc-config-card" style="margin-top:12px"><div class="cc-toolbar"><div><strong>Listado general</strong><div id="hsCtlCount" class="cc-note"></div></div><button class="cc-btn cc-btn-light" id="hsCtlPend">Solo pendientes</button></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>ESTADO / UBICACIÓN</th><th>RESPONSABLE</th><th>OPERADOR</th><th>SERVICIO / FECHA</th><th>CREADO POR</th></tr></thead><tbody id="hsCtlBody"></tbody></table></div></div>';panel.appendChild(v)}
  const open=()=>{panel.querySelectorAll('.hs-view').forEach(x=>x.style.display='none');v.style.display='block';panel.querySelectorAll('[data-hsv]').forEach(x=>x.className='cc-btn cc-btn-light');btn.className='cc-btn cc-btn-primary';load().catch(e=>alert(e.message||e))};btn.onclick=open;
  ['hsCtlBuscar','hsCtlResp','hsCtlOp'].forEach(id=>document.getElementById(id)?.addEventListener(id==='hsCtlBuscar'?'input':'change',renderRows));
  document.querySelectorAll('#hsCtlChecks input').forEach(x=>x.onchange=renderRows);
  document.getElementById('hsCtlRefresh').onclick=()=>load().catch(e=>alert(e.message||e));
  document.getElementById('hsCtlDesde').onchange=()=>load().catch(e=>alert(e.message||e));document.getElementById('hsCtlHasta').onchange=()=>load().catch(e=>alert(e.message||e));
  document.getElementById('hsCtlPend').onclick=()=>{document.querySelectorAll('#hsCtlChecks input[data-st]').forEach(x=>x.checked=x.dataset.st==='ASIGNADO_OPERADOR');renderRows()};
  return true;
 }
 function boot(){if(!install())setTimeout(boot,500)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900));else setTimeout(boot,900);
})();
'''
P.write_text(text+extra,encoding='utf-8')
print('Tablero de control de hojas v3 agregado')
