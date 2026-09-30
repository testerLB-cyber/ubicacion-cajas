(function(){
'use strict';
const ID='hsControlMejoraV1';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=n=>Number(n||0).toLocaleString('es-MX');
function sb(){return window.gmSupabase||window.supabaseClient||null}
async function data(){const s=sb();if(!s)throw new Error('Supabase no disponible');const r=await s.rpc('hs_list');if(r.error)throw r.error;return r.data||{}}
function status(x){
 const s=norm(x.estatus||x.status||x.tipo);
 if(s.includes('CANCEL'))return 'CANCELADA';
 if(s.includes('UTILIZ')||s.includes('COMPROB'))return 'COMPROBADA';
 if(s.includes('ASIGNADO_OPERADOR')||s.includes('OPERADOR'))return 'ASIGNADA';
 if(s.includes('CUSTOD')||s.includes('RESPONSABLE'))return 'CUSTODIA';
 if(s.includes('PENDIENTE_ACEPTACION'))return 'PEND. ACEPTACIÓN';
 if(s.includes('NUEV'))return 'DISPONIBLE';
 return s||'SIN ESTATUS';
}
function folio(x){return x.folio||x.folioCompleto||x.folio_completo||[x.serie,x.anio,x.consecutivo].filter(v=>v!==undefined&&v!==null&&v!=='').join('-')}
function person(x){return x.operadorNombre||x.operador||x.personaNombre||x.beneficiarioNombre||x.responsableNombre||x.responsable||''}
function badge(s){const map={'DISPONIBLE':'#166534','CUSTODIA':'#1d4ed8','ASIGNADA':'#7c3aed','COMPROBADA':'#047857','CANCELADA':'#b91c1c','PEND. ACEPTACIÓN':'#b45309'};return '<span style="display:inline-block;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:900;color:#fff;background:'+(map[s]||'#475569')+'">'+esc(s)+'</span>'}
function allRows(D){
 const base=(D.ultimosFolios||[]).map(x=>({...x,__source:'FOLIO'}));
 const comps=(D.comprobaciones||[]).map(x=>({...x,__source:'COMPROBACION'}));
 const by=new Map();
 [...base,...comps].forEach(x=>{const k=norm(folio(x));if(!k)return;by.set(k,{...(by.get(k)||{}),...x})});
 return [...by.values()];
}
function anomalies(D,rows){
 const out=[];
 rows.forEach(x=>{const st=status(x),f=folio(x);
   if(st==='COMPROBADA'&&!x.fotoUrl&&!x.foto_url&&!x.evidenciaUrl&&!x.evidencia_url)out.push({f,t:'Comprobada sin evidencia fotográfica'});
   if(st==='CANCELADA')out.push({f,t:'Hoja cancelada — revisar motivo y trazabilidad'});
   if(/^CFDI-/i.test(String(f))&&st==='COMPROBADA'&&!x.numeroFactura&&!x.numero_factura)out.push({f,t:'CFDI comprobada sin número de factura visible'});
 });
 return out;
}
function css(){
 if(document.getElementById(ID+'Style'))return;
 const s=document.createElement('style');s.id=ID+'Style';s.textContent=`
 #${ID}{margin:12px 0 16px}.hsm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.hsm-k{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;cursor:pointer}.hsm-k small{display:block;color:#64748b;font-size:9px;font-weight:900;text-transform:uppercase}.hsm-k strong{font-size:20px;color:#0f172a}.hsm-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-top:10px}.hsm-search{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.hsm-search input,.hsm-search select{border:1px solid #cbd5e1;border-radius:9px;padding:9px 10px;font-size:12px;min-width:150px}.hsm-results{margin-top:8px;max-height:310px;overflow:auto}.hsm-row{display:grid;grid-template-columns:minmax(145px,1.2fr) 110px minmax(140px,1fr) minmax(140px,1fr);gap:8px;align-items:center;padding:8px;border-bottom:1px solid #f1f5f9;font-size:11px}.hsm-alert{padding:7px 9px;border-left:3px solid #f59e0b;background:#fffbeb;margin:5px 0;border-radius:6px;font-size:11px}.hsm-title{font-weight:900;color:#0f172a}.hsm-note{font-size:10px;color:#64748b}.hsm-toggle{border:0;background:#0f172a;color:#fff;border-radius:8px;padding:8px 10px;font-weight:800;font-size:11px;cursor:pointer}@media(max-width:720px){.hsm-row{grid-template-columns:1fr 100px}.hsm-row>div:nth-child(3),.hsm-row>div:nth-child(4){grid-column:1/-1}.hsm-grid{grid-template-columns:repeat(2,1fr)}}`;document.head.appendChild(s);
}
async function render(){
 const panel=document.getElementById('ccPanelHojasServicio');if(!panel)return;
 let host=document.getElementById(ID);
 if(!host){host=document.createElement('div');host.id=ID;const k=document.getElementById('hs104Kpis');(k||panel.querySelector('.cc-toolbar'))?.after(host)}
 host.innerHTML='<div class="hsm-card"><div class="hsm-title">Centro de control documental</div><div class="hsm-note">Trazabilidad, búsqueda rápida, excepciones y cuadre de folios sin cambiar el flujo actual.</div><div style="padding:14px;text-align:center"><i class="fa-solid fa-spinner fa-spin"></i> Actualizando control…</div></div>';
 try{
  const D=await data(),rows=allRows(D),A=anomalies(D,rows);
  const counts={TOTAL:rows.length,DISPONIBLE:0,CUSTODIA:0,ASIGNADA:0,COMPROBADA:0,CANCELADA:0};
  rows.forEach(x=>{const s=status(x);if(counts[s]!==undefined)counts[s]++});
  host.innerHTML='<div class="hsm-grid">'+[
   ['Total',counts.TOTAL,''],['Disponibles',counts.DISPONIBLE,'DISPONIBLE'],['En custodia',counts.CUSTODIA,'CUSTODIA'],['Asignadas',counts.ASIGNADA,'ASIGNADA'],['Comprobadas',counts.COMPROBADA,'COMPROBADA'],['Canceladas',counts.CANCELADA,'CANCELADA'],['Requieren atención',A.length,'ALERTA']
  ].map(x=>'<div class="hsm-k" data-filter="'+x[2]+'"><small>'+x[0]+'</small><strong>'+fmt(x[1])+'</strong></div>').join('')+'</div>'+
  '<div class="hsm-card"><div class="hsm-search"><div style="flex:1;min-width:220px"><div class="hsm-title">Buscar cualquier hoja</div><div class="hsm-note">Puedes escribir solo el consecutivo, por ejemplo 12198.</div></div><input id="hsmQ" type="search" placeholder="Folio, operador, responsable…"><select id="hsmSerie"><option value="">Todas las series</option>'+[...new Set(rows.map(x=>x.serie).filter(Boolean))].sort().map(s=>'<option>'+esc(s)+'</option>').join('')+'</select><button class="hsm-toggle" id="hsmAlerts">Excepciones ('+A.length+')</button></div><div id="hsmResults" class="hsm-results"></div></div>'+
  '<div class="hsm-card"><div class="hsm-title">Cuadre de folios</div><div class="hsm-note">Generados → disponibles → custodia → asignados → comprobados → cancelados. Los totales se calculan con la información que ya devuelve Control de Hojas.</div><div class="hsm-grid" style="margin-top:8px">'+[['Generados',counts.TOTAL],['Disponibles',counts.DISPONIBLE],['Custodia',counts.CUSTODIA],['Asignados',counts.ASIGNADA],['Comprobados',counts.COMPROBADA],['Cancelados',counts.CANCELADA]].map(x=>'<div class="hsm-k"><small>'+x[0]+'</small><strong>'+fmt(x[1])+'</strong></div>').join('')+'</div></div>';
  let filter='',showAlerts=false;
  const draw=()=>{const q=norm(document.getElementById('hsmQ')?.value),ser=norm(document.getElementById('hsmSerie')?.value);let rr=rows.filter(x=>(!filter||status(x)===filter)&&(!ser||norm(x.serie)===ser)&&(!q||norm([folio(x),x.serie,x.anio,x.consecutivo,person(x),x.responsableNombre,x.clienteNombre,x.cliente].join(' ')).includes(q))).slice(0,100);const box=document.getElementById('hsmResults');if(!box)return;if(showAlerts){box.innerHTML=A.length?A.slice(0,100).map(a=>'<div class="hsm-alert"><b>'+esc(a.f)+'</b> · '+esc(a.t)+'</div>').join(''):'<div class="hsm-note" style="padding:10px">Sin excepciones detectadas.</div>';return}box.innerHTML=rr.length?rr.map(x=>'<div class="hsm-row"><div><b>'+esc(folio(x))+'</b><div class="hsm-note">'+esc([x.serie,x.anio].filter(Boolean).join(' · '))+'</div></div><div>'+badge(status(x))+'</div><div><b>Custodia / persona</b><div>'+esc(person(x)||x.responsableNombre||'—')+'</div></div><div><b>Cliente</b><div>'+esc(x.clienteNombre||x.cliente||'—')+'</div></div></div>').join(''):'<div class="hsm-note" style="padding:10px">No se encontraron hojas con ese filtro.</div>'};
  host.querySelectorAll('[data-filter]').forEach(el=>el.onclick=()=>{const f=el.dataset.filter;if(f==='ALERTA'){showAlerts=true}else{showAlerts=false;filter=f}draw()});
  document.getElementById('hsmQ').oninput=()=>{showAlerts=false;draw()};document.getElementById('hsmSerie').onchange=()=>{showAlerts=false;draw()};document.getElementById('hsmAlerts').onclick=()=>{showAlerts=!showAlerts;draw()};draw();
 }catch(e){host.innerHTML='<div class="hsm-card" style="color:#b91c1c"><b>No se pudo cargar el control documental.</b><div class="hsm-note">'+esc(e.message||e)+'</div></div>'}
}
function boot(){css();const obs=new MutationObserver(()=>{const p=document.getElementById('ccPanelHojasServicio');if(p&&!document.getElementById(ID)&&p.isConnected)render()});obs.observe(document.body,{childList:true,subtree:true});setInterval(()=>{const p=document.getElementById('ccPanelHojasServicio');if(p&&p.classList.contains('active')){const h=document.getElementById(ID);if(!h)render()}},2500);document.addEventListener('click',e=>{if(e.target?.id==='hs104Refresh')setTimeout(render,500)});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.hsControlMejoraRefresh=render;
})();