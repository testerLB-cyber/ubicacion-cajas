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
  .air{--ink:#0f172a;--muted:#64748b;--line:#e6ebf2;--panel:#ffffff;--soft:#f6f8fb}
  .airTop{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:14px 16px;margin-bottom:10px;border-radius:16px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;box-shadow:0 12px 30px rgba(15,23,42,.16)}
  .airTop h2{margin:0;font-size:22px;letter-spacing:-.02em}.airTop p{margin:4px 0 0;font-size:10px;color:#cbd5e1}.airUpdated{font-size:9px;color:#cbd5e1;white-space:nowrap;text-align:right}
  .airFilters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin-bottom:10px;box-shadow:0 4px 16px rgba(15,23,42,.04)}
  .airFilters label{font-size:8px;font-weight:950;color:#64748b;text-transform:uppercase;letter-spacing:.08em}.airSelect{min-width:240px;border:1px solid #dbe3ee;border-radius:10px;padding:8px 10px;background:#f8fafc;font-size:11px;color:#0f172a;outline:none}.airSelect:focus{border-color:#94a3b8;background:#fff}
  .airCheck{display:flex;gap:7px;align-items:center;font-size:10px;font-weight:800;color:#334155;text-transform:none!important;cursor:pointer}.airCheck input{accent-color:#0f172a}.airCount{margin-left:auto;font-size:9px;font-weight:800;color:#64748b;background:#f8fafc;padding:6px 9px;border-radius:999px}
  .airBoard{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.06)}
  .airHead,.airRow{display:grid;grid-template-columns:122px minmax(210px,1.45fr) minmax(180px,1.15fr) 96px 132px 104px minmax(155px,1fr) minmax(150px,1fr) minmax(150px,1fr) 138px;gap:0;align-items:stretch}
  .airHead{background:#f1f5f9;color:#475569;font-size:7px;font-weight:950;text-transform:uppercase;letter-spacing:.09em;position:sticky;top:0;z-index:2;border-bottom:1px solid #dbe3ee}
  .airHead>div{padding:9px 9px}.airRow>div{padding:10px 9px;border-right:1px solid #eef2f7}.airRow>div:last-child,.airHead>div:last-child{border-right:0}
  .airList{max-height:74vh;overflow:auto;background:#fbfcfe}.airRow{background:#fff;border-bottom:1px solid #edf1f5;min-height:68px;transition:background .2s ease,transform .2s ease,box-shadow .2s ease}.airRow:hover{background:#fbfdff;box-shadow:inset 3px 0 0 #94a3b8}.airRow.moved{animation:airPulse 1.6s ease}.airRow:last-child{border-bottom:0}
  @keyframes airPulse{0%{background:#ecfdf5}100%{background:#fff}}
  .airGpsCell{display:flex!important;align-items:center;gap:9px;text-align:left}.airArrow{width:36px;height:36px;min-width:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff7ed;border:1px solid #fed7aa;font-size:20px;font-weight:950;color:#ea580c;box-shadow:0 3px 10px rgba(234,88,12,.08)}
  .airMain{font-size:10px;font-weight:800;color:#1e293b;line-height:1.25}.airSub{font-size:8px;color:#94a3b8;margin-top:3px;line-height:1.2}.airUnit{font-size:15px;font-weight:950;color:#0f172a;letter-spacing:-.01em}
  .airLabel{display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:3px 6px;border-radius:999px;background:#f1f5f9;color:#64748b;font-size:8px;font-weight:800}
  .airStatus{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}.airStatus.green{background:#dcfce7;color:#166534}.airStatus.yellow{background:#fef3c7;color:#92400e}.airStatus.red{background:#fee2e2;color:#991b1b}.airStatus.gray{background:#e2e8f0;color:#475569}
  .airGeoBtn,.airMapBtn{margin-top:6px;border:0;border-radius:8px;padding:5px 8px;font-size:8px;font-weight:900;cursor:pointer;transition:transform .15s ease,background .15s ease}.airGeoBtn:hover,.airMapBtn:hover{transform:translateY(-1px)}.airGeoBtn{background:#eef2ff;color:#4338ca}.airGeoBtn:hover{background:#e0e7ff}.airMapBtn{background:#ecfdf5;color:#166534;margin-right:5px}.airMapBtn:hover{background:#d1fae5}
  .airRoute{display:flex;align-items:center;gap:6px}.airRouteIcon{width:20px;height:20px;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:10px}.airRouteText{min-width:0}.airRouteText .airMain{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .airTimeMain{font-size:10px;font-weight:900;color:#0f172a}.airTimeSub{font-size:8px;color:#94a3b8;margin-top:3px}
  .airMapRow{grid-column:1/-1!important;padding:0!important;border-right:0!important;background:#f8fafc}.airMiniMapWrap{display:flex;gap:12px;align-items:stretch;padding:12px;border-top:1px solid #e2e8f0}.airMiniMap{width:100%;height:190px;border:0;border-radius:12px;background:#e2e8f0}.airMapMeta{width:230px;min-width:230px;padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:12px}.airMapMeta b{display:block;font-size:14px;margin-bottom:6px;color:#0f172a}.airMapMeta span{display:block;font-size:9px;color:#64748b;line-height:1.5}.airMapClose{margin-top:10px;border:0;background:#0f172a;color:#fff;border-radius:8px;padding:6px 9px;font-size:8px;font-weight:900;cursor:pointer}
  .airEmpty{padding:42px;text-align:center;color:#64748b}.airFoot{padding:8px 11px;background:#f8fafc;border-top:1px solid var(--line);font-size:8px;color:#94a3b8}
  .airModal{position:fixed;inset:0;z-index:140000;background:rgba(15,23,42,.62);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}.airModal.on{display:flex}.airModalCard{width:min(760px,96vw);max-height:82vh;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.28)}
  .airModalHead{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:#0f172a;color:#fff}.airModalHead h3{margin:0;font-size:16px}.airModalClose{border:0;background:#fff;color:#0f172a;border-radius:8px;padding:6px 10px;font-weight:900;cursor:pointer}
  .airGeoList{padding:14px 18px;overflow:auto;max-height:68vh}.airGeoTimeline{position:relative;padding-left:24px}.airGeoTimeline:before{content:'';position:absolute;left:8px;top:6px;bottom:6px;width:2px;background:#dbe3ee}.airGeoItem{position:relative;padding:0 0 16px 10px}.airGeoDot{position:absolute;left:-21px;top:3px;width:11px;height:11px;border-radius:50%;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 0 3px #e0f2fe}.airGeoEvent{font-size:10px;font-weight:950;color:#0f172a}.airGeoName{font-size:11px;font-weight:800;color:#334155;margin-top:2px}.airGeoTime{font-size:8px;color:#94a3b8;margin-top:3px}
  @media(max-width:1200px){.airHead,.airRow{grid-template-columns:105px minmax(190px,1.4fr) minmax(155px,1fr) 90px 120px 95px minmax(145px,1fr) minmax(145px,1fr)}.airHead>div:nth-child(9),.airHead>div:nth-child(10),.airRow>div:nth-child(9),.airRow>div:nth-child(10){display:none}.airMiniMapWrap{flex-direction:column}.airMapMeta{width:auto;min-width:0}}
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
  return {state:driving?'Conduciendo':(evt||(!moving?'Detenido':'En movimiento')),dir:dirFromDeg(deg),moved:moving};
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
  $('airGeoTitle').textContent='Recorrido por geocercas · '+(x.unidad||'Unidad');
  const arr=(Array.isArray(x.geocercas)?x.geocercas:[]).slice().sort((a,b)=>{
    const da=new Date(a["Fecha Hora"]||a.fechaHora||a.fecha||0).getTime()||0;
    const db=new Date(b["Fecha Hora"]||b.fechaHora||b.fecha||0).getTime()||0;
    return da-db;
  });
  $('airGeoList').innerHTML=arr.length?'<div class="airGeoTimeline">'+arr.map(g=>`<div class="airGeoItem"><span class="airGeoDot"></span><div class="airGeoEvent">${esc(g.Evento||g.evento||'Evento')}</div><div class="airGeoName">${esc(g.Geocerca||g.geocerca||'—')}</div><div class="airGeoTime">${esc(fmt(g["Fecha Hora"]||g.fechaHora||g.fecha))}</div></div>`).join('')+'</div>':'<div class="airEmpty">La API no devolvió historial de geocercas para esta unidad.</div>';
  $('airGeoModal').classList.add('on');
}
function mapEmbedUrl(lat,lng){
  const la=Number(lat),lo=Number(lng);if(!Number.isFinite(la)||!Number.isFinite(lo))return'';
  const dLat=.012,dLng=.018;
  return 'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent((lo-dLng)+','+(la-dLat)+','+(lo+dLng)+','+(la+dLat))+'&layer=mapnik&marker='+encodeURIComponent(la+','+lo);
}
function toggleMap(index){
  const row=$('airMap_'+index),x=LAST[index];if(!row||!x)return;
  if(row.dataset.open==='1'){row.innerHTML='';row.dataset.open='0';return;}
  const src=mapEmbedUrl(x.latitud,x.longitud);
  row.dataset.open='1';
  row.innerHTML=src?`<div class="airMiniMapWrap"><div style="flex:1"><iframe class="airMiniMap" loading="lazy" src="${esc(src)}"></iframe></div><div class="airMapMeta"><b>${esc(x.unidad||'Unidad')}</b><span>${esc(x.ubicacion||x.ubicacionErp||'Ubicación GPS')}</span><span>${esc(x.latitud+', '+x.longitud)}</span><span>Actualización GPS: ${esc(fmt(x.gpsAt))}</span><button class="airMapClose" data-map-close="${index}">Cerrar mapa</button></div></div>`:'<div class="airEmpty">Esta unidad no trae coordenadas válidas.</div>';
  row.querySelector('[data-map-close]')?.addEventListener('click',()=>toggleMap(index));
}
function render(){
  const box=$('airList');if(!box)return;
  const prev=readPrev(),arr=filtered();
  $('airVisibleCount').textContent=arr.length+' de '+LAST.length+' unidades';
  box.innerHTML=arr.length?arr.map(x=>{
    const idx=LAST.indexOf(x),mi=movementInfo(x,prev),d=mi.dir,geoCount=Array.isArray(x.geocercas)?x.geocercas.length:0;
    return `<div class="airRow ${mi.moved?'moved':''}">
      <div class="airGpsCell"><div class="airArrow">${esc(d.arrow)}</div><div><div class="airMain">${esc(mi.state)}</div><div class="airSub">${esc(d.label)} · ${esc(fmt(x.gpsAt))}</div></div></div>
      <div><div class="airMain">${esc(x.ubicacion||x.ubicacionErp||'—')}</div><div class="airSub">${x.latitud!=null&&x.longitud!=null?esc(x.latitud+', '+x.longitud):''}</div><button class="airMapBtn" data-map="${idx}">Mapa</button>${geoCount?'<button class="airGeoBtn" data-geo="'+idx+'">Recorrido ('+geoCount+')</button>':''}</div>
      <div><div class="airUnit">${esc(x.unidad||'—')}</div><div class="airMain">${esc(x.operador||'—')}</div><span class="airLabel">${esc(x.placa||'Sin placa')}</span></div>
      <div><div class="airMain">${esc(x.remolque||'—')}</div><div class="airSub">${esc(x.remolque2||'')}</div></div>
      <div><span class="airStatus ${statusClass(x.estatusViaje)}">${esc(x.estatusViaje||'Sin estatus')}</span><div class="airSub">${esc(x.trayectoCargadoVacio||'')}</div></div>
      <div><div class="airMain">${esc(x.numeroViaje||'—')}</div><div class="airSub">${esc(x.identificadorViaje||'')}</div></div>
      <div><div class="airMain">${esc(x.cliente||'—')}</div></div>
      <div><div class="airRoute"><span class="airRouteIcon">A</span><div class="airRouteText"><div class="airMain">${esc(x.origen||'—')}</div><div class="airSub">Origen</div></div></div></div>
      <div><div class="airRoute"><span class="airRouteIcon">B</span><div class="airRouteText"><div class="airMain">${esc(x.destino||'—')}</div><div class="airSub">Destino</div></div></div></div>
      <div><div class="airTimeMain">${esc(fmt(x.salida))}</div><div class="airTimeSub">ETA ${esc(fmt(x.eta))}</div></div>
    </div><div id="airMap_${idx}" class="airMapRow" data-open="0"></div>`;
  }).join(''):'<div class="airEmpty">No hay unidades que coincidan con los filtros.</div>';
  document.querySelectorAll('[data-geo]').forEach(b=>b.onclick=()=>showGeos(Number(b.dataset.geo)));
  document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>toggleMap(Number(b.dataset.map)));
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
      <div class="airHead"><div>GPS / Evento</div><div>Ubicación</div><div>Unidad / Operador</div><div>Remolques</div><div>Estatus viaje</div><div>Viaje</div><div>Cliente</div><div>Origen</div><div>Destino</div><div>Salida / Entrega</div></div>
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