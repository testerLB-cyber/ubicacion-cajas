(()=>{'use strict';
let TIMER=null,LAST=[];
const POS_KEY='gm_airport_prev_positions_v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.gmSupabase||null;
const tz='America/Hermosillo';

function css(){
  if($('airportCss'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="airportCss">
  .air{--ink:#0f172a;--muted:#64748b;--line:#d8dee8}
  .airTop{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:8px}
  .airTop h2{margin:0;font-size:22px;color:var(--ink)}.airTop p{margin:3px 0 0;font-size:10px;color:var(--muted)}
  .airUpdated{font-size:9px;color:var(--muted);white-space:nowrap}
  .airFilters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:8px}
  .airFilters label{font-size:9px;font-weight:900;color:#475569;text-transform:uppercase}.airSelect{min-width:230px;border:1px solid #cbd5e1;border-radius:8px;padding:7px 9px;background:#fff;font-size:11px}
  .airCheck{display:flex;gap:6px;align-items:center;font-size:10px;font-weight:800;color:#334155;text-transform:none!important;cursor:pointer}
  .airCount{margin-left:auto;font-size:9px;color:#64748b}
  .airBoard{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}
  .airHead,.airRow{display:grid;grid-template-columns:115px minmax(260px,1.8fr) minmax(170px,1.1fr) 105px 130px 105px minmax(170px,1.1fr) minmax(230px,1.5fr) 145px;gap:0;align-items:stretch}
  .airHead{background:#475569;color:#fff;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.03em;position:sticky;top:0;z-index:2}
  .airHead>div,.airRow>div{padding:7px 7px;border-right:1px solid #d9dee6}.airHead>div:last-child,.airRow>div:last-child{border-right:0}
  .airList{max-height:74vh;overflow:auto}.airRow{border-bottom:1px solid #e5e7eb;min-height:58px}.airRow:last-child{border-bottom:0}.airRow:hover{background:#f8fafc}
  .airGpsCell{text-align:center}.airArrow{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 3px;background:#fff7ed;border:2px solid #fb923c;font-size:18px;font-weight:950;color:#ea580c}
  .airMain{font-size:10px;font-weight:800;color:#1e293b;line-height:1.2}.airSub{font-size:8px;color:#64748b;margin-top:2px;line-height:1.2}.airUnit{font-size:12px;font-weight:950;color:#0f172a}
  .airStatus{display:inline-block;padding:3px 5px;border-radius:2px;font-size:8px;font-weight:950;text-transform:uppercase;margin:1px 0}.airStatus.green{background:#22c55e;color:#052e16}.airStatus.yellow{background:#facc15;color:#422006}.airStatus.red{background:#ef4444;color:#fff}.airStatus.gray{background:#e2e8f0;color:#334155}
  .airGeoBtn{margin-top:4px;border:0;background:#e0f2fe;color:#075985;border-radius:6px;padding:4px 6px;font-size:8px;font-weight:900;cursor:pointer}.airGeoBtn:hover{background:#bae6fd}
  .airEmpty{padding:36px;text-align:center;color:#64748b}.airFoot{padding:7px 10px;background:#f8fafc;border-top:1px solid var(--line);font-size:9px;color:#64748b}
  .airModal{position:fixed;inset:0;z-index:140000;background:rgba(15,23,42,.58);display:none;align-items:center;justify-content:center;padding:20px}.airModal.on{display:flex}.airModalCard{width:min(780px,96vw);max-height:82vh;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25)}
  .airModalHead{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#0f172a;color:#fff}.airModalHead h3{margin:0;font-size:16px}.airModalClose{border:0;background:#fff;color:#0f172a;border-radius:7px;padding:6px 9px;font-weight:900;cursor:pointer}
  .airGeoList{padding:10px 14px;overflow:auto;max-height:68vh}.airGeoRow{display:grid;grid-template-columns:130px 1fr 160px;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:10px}.airGeoRow:last-child{border-bottom:0}.airGeoEvent{font-weight:900}
  @media(max-width:1200px){.airHead,.airRow{grid-template-columns:95px minmax(220px,1.7fr) minmax(150px,1fr) 90px 120px 100px minmax(170px,1.1fr)}.airHead>div:nth-child(8),.airHead>div:nth-child(9),.airRow>div:nth-child(8),.airRow>div:nth-child(9){display:none}}
  </style>`);
}
function toRad(d){return d*Math.PI/180}
function distanceM(a,b){
  if(!a||!b)return null;
  const R=6371000,p1=toRad(a.lat),p2=toRad(b.lat),dp=toRad(b.lat-a.lat),dl=toRad(b.lng-a.lng);
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function bearing(a,b){
  if(!a||!b)return null;
  const p1=toRad(a.lat),p2=toRad(b.lat),dl=toRad(b.lng-a.lng);
  const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function dirFromDeg(deg){
  if(deg===null||deg===undefined||!Number.isFinite(Number(deg)))return {arrow:'•',label:'Sin rumbo'};
  const n=((Number(deg)%360)+360)%360,arrows=['↑','↗','→','↘','↓','↙','←','↖'],names=['N','NE','E','SE','S','SO','O','NO'],i=Math.round(n/45)%8;
  return {arrow:arrows[i],label:names[i]+' '+Math.round(n)+'°'};
}
function readPrev(){try{return JSON.parse(localStorage.getItem(POS_KEY)||'{}')||{}}catch{return{}}}
function savePrev(map){try{localStorage.setItem(POS_KEY,JSON.stringify(map))}catch{}}
function movementInfo(x,prev){
  const lat=Number(x.latitud),lng=Number(x.longitud),cur=Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null,old=prev?.[String(x.unidad||'')];
  const d=cur&&old?distanceM({lat:Number(old.lat),lng:Number(old.lng)},cur):null,deg=cur&&old&&d!=null&&d>=25?bearing({lat:Number(old.lat),lng:Number(old.lng)},cur):null;
  const evt=String(x.evento||'').trim(),driving=/conduc|driv/i.test(evt)||Number(x.velocidadKmh)>5,moving=d!=null&&d>=25;
  return {state:driving?'Conduciendo':(evt||(!moving?'Detenido':'En movimiento')),dir:dirFromDeg(deg)};
}
function fmt(v){
  if(!v)return '—';
  const d=new Date(v);
  return Number.isNaN(d.getTime())?String(v):d.toLocaleString('es-MX',{timeZone:tz,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function statusClass(s){
  const v=String(s||'').toUpperCase();
  if(/TRANS|RUTA|ACTIVO|EN CURSO/.test(v))return 'green';
  if(/SITIO|ORIGEN|ESPER|DEMOR/.test(v))return 'yellow';
  if(/FUERA|CANCEL|ERROR|BLOQ/.test(v))return 'red';
  return 'gray';
}
function selectedClient(){return $('airClient')?.value||''}
function onlyTrips(){return $('airOnlyTrips')?.checked!==false}
function filtered(){
  const c=selectedClient();
  return LAST.filter(x=>(!c||String(x.cliente||'')===c)&&(!onlyTrips()||String(x.numeroViaje||'').trim()));
}
function updateClientFilter(){
  const sel=$('airClient');if(!sel)return;
  const current=sel.value;
  const clients=[...new Set(LAST.map(x=>String(x.cliente||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  sel.innerHTML='<option value="">Todos los clientes</option>'+clients.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  if(clients.includes(current))sel.value=current;
}
function showGeos(index){
  const x=LAST[index];if(!x)return;
  $('airGeoTitle').textContent='Geocercas · '+(x.unidad||'Unidad');
  const arr=Array.isArray(x.geocercas)?x.geocercas:[];
  $('airGeoList').innerHTML=arr.length?arr.map(g=>`<div class="airGeoRow"><div class="airGeoEvent">${esc(g.Evento||g.evento||'Evento')}</div><div>${esc(g.Geocerca||g.geocerca||'—')}</div><div>${esc(fmt(g["Fecha Hora"]||g.fechaHora||g.fecha))}</div></div>`).join(''):'<div class="airEmpty">La API no devolvió historial de geocercas para esta unidad.</div>';
  $('airGeoModal').classList.add('on');
}
function render(){
  const box=$('airList');if(!box)return;
  const prev=readPrev(),arr=filtered();
  $('airVisibleCount').textContent=arr.length+' de '+LAST.length+' unidades';
  box.innerHTML=arr.length?arr.map(x=>{
    const idx=LAST.indexOf(x),mi=movementInfo(x,prev),d=mi.dir,geoCount=Array.isArray(x.geocercas)?x.geocercas.length:0;
    return `<div class="airRow">
      <div class="airGpsCell"><div class="airArrow">${esc(d.arrow)}</div><div class="airMain">${esc(mi.state)}</div><div class="airSub">${esc(d.label)} · ${esc(fmt(x.gpsAt))}</div></div>
      <div><div class="airMain">${esc(x.ubicacion||x.ubicacionErp||'—')}</div><div class="airSub">${x.latitud!=null&&x.longitud!=null?esc(x.latitud+', '+x.longitud):''}</div>${geoCount?'<button class="airGeoBtn" data-geo="'+idx+'">Geocercas ('+geoCount+')</button>':''}</div>
      <div><div class="airUnit">${esc(x.unidad||'—')}</div><div class="airMain">${esc(x.operador||'—')}</div><div class="airSub">${esc(x.placa||'')}</div></div>
      <div><div class="airMain">${esc(x.remolque||'—')}</div><div class="airSub">${esc(x.remolque2||'')}</div></div>
      <div><span class="airStatus ${statusClass(x.estatusViaje)}">${esc(x.estatusViaje||'Sin estatus')}</span><div class="airSub">${esc(x.trayectoCargadoVacio||'')}</div></div>
      <div><div class="airMain">${esc(x.numeroViaje||'—')}</div><div class="airSub">${esc(x.identificadorViaje||'')}</div></div>
      <div><div class="airMain">${esc(x.cliente||'—')}</div></div>
      <div><div class="airMain">${esc(x.origen||'—')}</div><div class="airSub">${esc(x.destino||'—')}</div></div>
      <div><div class="airMain">${esc(fmt(x.salida))}</div><div class="airSub">${esc(fmt(x.eta))}</div></div>
    </div>`;
  }).join(''):'<div class="airEmpty">No hay unidades que coincidan con los filtros.</div>';
  document.querySelectorAll('[data-geo]').forEach(b=>b.onclick=()=>showGeos(Number(b.dataset.geo)));
}
async function load(){
  if(document.hidden||!$('ccPanelPantallaAeropuerto')?.classList.contains('active'))return;
  try{
    $('airUpdated').textContent='Actualizando…';
    const r=await sb().functions.invoke('gm-flota');
    if(r.error)throw r.error;
    const data=r.data||{};if(!data.ok)throw new Error(data.error||'No se pudo leer Software GM');
    LAST=Array.isArray(data.vehicles)?data.vehicles:[];
    updateClientFilter();render();
    const pos={};LAST.forEach(x=>{const lat=Number(x.latitud),lng=Number(x.longitud);if(Number.isFinite(lat)&&Number.isFinite(lng))pos[String(x.unidad||'')]={lat,lng,ts:Date.now()};});savePrev(pos);
    const d=data.generatedAt?new Date(data.generatedAt):new Date();
    $('airUpdated').textContent='Actualizado '+d.toLocaleTimeString('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · siguiente actualización en 60 s';
    schedule();
  }catch(e){
    LAST=[];updateClientFilter();render();$('airUpdated').textContent='Error API: '+e.message+' · reintento en 60 s';schedule();
  }
}
function schedule(){clearTimeout(TIMER);TIMER=setTimeout(load,60000)}
function shell(){
  css();
  $('ccPantallaAeropuertoMount').innerHTML=`<div class="air">
    <div class="airTop"><div><h2>Pantalla Aeropuerto</h2><p>Flota directa de Software GM · refresco automático cada minuto.</p></div><div id="airUpdated" class="airUpdated">Sin actualizar</div></div>
    <div class="airFilters">
      <label>Cliente</label><select id="airClient" class="airSelect"><option value="">Todos los clientes</option></select>
      <label class="airCheck"><input id="airOnlyTrips" type="checkbox" checked> Solo unidades con número de viaje</label>
      <span id="airVisibleCount" class="airCount">0 unidades</span>
    </div>
    <div class="airBoard">
      <div class="airHead"><div>GPS / Evento</div><div>Ubicación</div><div>Unidad / Operador</div><div>Remolques</div><div>Estatus viaje</div><div>Viaje</div><div>Cliente</div><div>Origen / Destino</div><div>Salida / Entrega</div></div>
      <div id="airList" class="airList"></div>
      <div class="airFoot">Estatus tomado directamente de EstatusViaje. Solo se muestran unidades devueltas por la API de Software GM.</div>
    </div>
    <div id="airGeoModal" class="airModal"><div class="airModalCard"><div class="airModalHead"><h3 id="airGeoTitle">Geocercas</h3><button id="airGeoClose" class="airModalClose">Cerrar</button></div><div id="airGeoList" class="airGeoList"></div></div></div>
  </div>`;
  $('airClient').onchange=render;$('airOnlyTrips').onchange=render;$('airGeoClose').onclick=()=>$('airGeoModal').classList.remove('on');
  $('airGeoModal').onclick=e=>{if(e.target===$('airGeoModal'))$('airGeoModal').classList.remove('on')};
  load();
}
window.ccOpenPantallaAeropuerto=btn=>{
  document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>{x.classList.remove('active');x.style.removeProperty('display')});
  document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));
  $('ccPanelPantallaAeropuerto')?.classList.add('active');btn?.classList.add('active');clearTimeout(TIMER);shell();
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(TIMER)}else if($('ccPanelPantallaAeropuerto')?.classList.contains('active'))load()});
})();