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
  .airHead,.airRow{display:grid;grid-template-columns:115px minmax(210px,1.45fr) minmax(170px,1.1fr) 95px 125px 100px minmax(155px,1fr) minmax(155px,1fr) minmax(155px,1fr) 135px;gap:0;align-items:stretch}
  .airHead{background:#475569;color:#fff;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.03em;position:sticky;top:0;z-index:2}
  .airHead>div,.airRow>div{padding:7px 7px;border-right:1px solid #d9dee6}.airHead>div:last-child,.airRow>div:last-child{border-right:0}
  .airList{max-height:74vh;overflow:auto}.airRow{border-bottom:1px solid #e5e7eb;min-height:58px}.airRow:last-child{border-bottom:0}.airRow:hover{background:#f8fafc}
  .airGpsCell{text-align:center}.airArrow{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 3px;background:#fff7ed;border:2px solid #fb923c;font-size:18px;font-weight:950;color:#ea580c}
  .airMain{font-size:10px;font-weight:800;color:#1e293b;line-height:1.2}.airSub{font-size:8px;color:#64748b;margin-top:2px;line-height:1.2}.airUnit{font-size:12px;font-weight:950;color:#0f172a}
  .airStatus{display:inline-block;padding:3px 5px;border-radius:2px;font-size:8px;font-weight:950;text-transform:uppercase;margin:1px 0}.airStatus.green{background:#22c55e;color:#052e16}.airStatus.yellow{background:#facc15;color:#422006}.airStatus.red{background:#ef4444;color:#fff}.airStatus.gray{background:#e2e8f0;color:#334155}
  .airGeoBtn,.airMapBtn{margin-top:4px;border:0;border-radius:7px;padding:4px 7px;font-size:8px;font-weight:900;cursor:pointer}.airGeoBtn{background:#e0f2fe;color:#075985}.airGeoBtn:hover{background:#bae6fd}.airMapBtn{background:#ecfdf5;color:#166534;margin-right:4px}.airMapBtn:hover{background:#d1fae5}.airMapRow{grid-column:1/-1!important;padding:0!important;border-right:0!important;background:#f8fafc}.airMiniMapWrap{display:flex;gap:10px;align-items:stretch;padding:10px}.airMiniMap{width:100%;height:180px;border:0;border-radius:10px;background:#e2e8f0}.airMapMeta{width:220px;min-width:220px;padding:10px;background:#fff;border:1px solid #e2e8f0;border-radius:10px}.airMapMeta b{display:block;font-size:13px;margin-bottom:6px;color:#0f172a}.airMapMeta span{display:block;font-size:9px;color:#64748b;line-height:1.45}.airMapClose{margin-top:8px;border:0;background:#0f172a;color:#fff;border-radius:7px;padding:5px 8px;font-size:8px;font-weight:900;cursor:pointer}
  .airEmpty{padding:36px;text-align:center;color:#64748b}.airFoot{padding:7px 10px;background:#f8fafc;border-top:1px solid var(--line);font-size:9px;color:#64748b}
  .airModal{position:fixed;inset:0;z-index:140000;background:rgba(15,23,42,.58);display:none;align-items:center;justify-content:center;padding:20px}.airModal.on{display:flex}.airModalCard{width:min(780px,96vw);max-height:82vh;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25)}
  .airModalHead{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#0f172a;color:#fff}.airModalHead h3{margin:0;font-size:16px}.airModalClose{border:0;background:#fff;color:#0f172a;border-radius:7px;padding:6px 9px;font-weight:900;cursor:pointer}
  .airGeoList{padding:12px 16px;overflow:auto;max-height:68vh}.airGeoTimeline{position:relative;padding-left:22px}.airGeoTimeline:before{content:'';position:absolute;left:8px;top:5px;bottom:5px;width:2px;background:#cbd5e1}.airGeoItem{position:relative;padding:0 0 14px 8px}.airGeoDot{position:absolute;left:-19px;top:3px;width:10px;height:10px;border-radius:50%;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 0 2px #bae6fd}.airGeoEvent{font-size:10px;font-weight:950;color:#0f172a}.airGeoName{font-size:11px;font-weight:800;color:#334155;margin-top:2px}.airGeoTime{font-size:8px;color:#64748b;margin-top:2px}
  @media(max-width:1200px){.airHead,.airRow{grid-template-columns:95px minmax(190px,1.5fr) minmax(150px,1fr) 90px 115px 95px minmax(145px,1fr) minmax(145px,1fr)}.airHead>div:nth-child(9),.airHead>div:nth-child(10),.airRow>div:nth-child(9),.airRow>div:nth-child(10){display:none}.airMiniMapWrap{flex-direction:column}.airMapMeta{width:auto;min-width:0}}
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
    return `<div class="airRow">
      <div class="airGpsCell"><div class="airArrow">${esc(d.arrow)}</div><div class="airMain">${esc(mi.state)}</div><div class="airSub">${esc(d.label)} · ${esc(fmt(x.gpsAt))}</div></div>
      <div><div class="airMain">${esc(x.ubicacion||x.ubicacionErp||'—')}</div><div class="airSub">${x.latitud!=null&&x.longitud!=null?esc(x.latitud+', '+x.longitud):''}</div><button class="airMapBtn" data-map="${idx}">Ver mapa</button>${geoCount?'<button class="airGeoBtn" data-geo="'+idx+'">Geocercas ('+geoCount+')</button>':''}</div>
      <div><div class="airUnit">${esc(x.unidad||'—')}</div><div class="airMain">${esc(x.operador||'—')}</div><div class="airSub">${esc(x.placa||'')}</div></div>
      <div><div class="airMain">${esc(x.remolque||'—')}</div><div class="airSub">${esc(x.remolque2||'')}</div></div>
      <div><span class="airStatus ${statusClass(x.estatusViaje)}">${esc(x.estatusViaje||'Sin estatus')}</span><div class="airSub">${esc(x.trayectoCargadoVacio||'')}</div></div>
      <div><div class="airMain">${esc(x.numeroViaje||'—')}</div><div class="airSub">${esc(x.identificadorViaje||'')}</div></div>
      <div><div class="airMain">${esc(x.cliente||'—')}</div></div>
      <div><div class="airMain">${esc(x.origen||'—')}</div><div class="airSub">Origen</div></div>
      <div><div class="airMain">${esc(x.destino||'—')}</div><div class="airSub">Destino</div></div>
      <div><div class="airMain">${esc(fmt(x.salida))}</div><div class="airSub">${esc(fmt(x.eta))}</div></div>
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