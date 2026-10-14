(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let map=null,markers=null,rows=[],playTimer=null,playPath=[],playIndex=0,playMarker=null,playLine=null,traceVersion=0;
const date=d=>{const p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
function inject(){
 const bar=$('airHistoryBtn')?.parentElement;if(!bar||bar.querySelector('#gmTripReportButton'))return;
 const btn=document.createElement('button');btn.type='button';btn.id='gmTripReportButton';btn.className='airFullBtn';btn.innerHTML='<i class="fa-solid fa-route"></i> Reporte de viajes';bar.insertBefore(btn,$('airHistoryBtn'));
 btn.onclick=open;
}
function open(){
 if(!$('gmTripReportModal')){
 const m=document.createElement('div');m.id='gmTripReportModal';m.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0f172acb;display:flex;justify-content:center;align-items:center;padding:12px';
 m.innerHTML='<section role="dialog" aria-modal="true" aria-label="Reporte de viajes" style="width:min(1480px,98vw);height:min(96vh,950px);overflow:auto;background:#fff;border-radius:16px;padding:18px;color:#0f172a;box-shadow:0 22px 80px #0005">'+
 '<header style="position:sticky;top:-18px;z-index:900;background:#fff;padding:12px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0"><div><h2 style="font-size:20px;font-weight:800;margin:0">Reporte de viajes</h2><p style="margin:4px 0 0;color:#64748b;font-size:12px">Viajes registrados, eventos y posiciones GPS verificadas</p></div><button id="gmTripsClose" type="button" aria-label="Cerrar reporte de viajes" style="display:inline-flex;align-items:center;gap:7px;border:0;border-radius:10px;background:#dc2626;color:white;padding:11px 18px;font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0">✕ Cerrar</button></header>'+
 '<div id="gmTripsTripFilters" style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:15px 0"><label>Desde <input id="gmTripsFrom" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Hasta <input id="gmTripsTo" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Cliente <select id="gmTripsClient" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;max-width:260px"><option value="">Todos los clientes</option></select></label><button id="gmTripsSearch" type="button" class="airFullBtn" style="background:#0f766e;color:#fff">Consultar viajes</button></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-bottom:12px"><label id="gmTripsFindWrap">Buscar número de viaje <input id="gmTripsFind" type="search" placeholder="Ej. 80564" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;width:180px"></label><label>Consultar por <select id="gmTripsMode" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"><option value="VIAJES">Viajes</option><option value="HORAS">Unidad y horario</option></select></label><div id="gmTripsHours" style="display:none;gap:7px;flex-wrap:wrap;align-items:end;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc"><label>Unidad <input id="gmTripsUnit" placeholder="Ej. LB14" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;width:110px"></label><label>Desde <input type="datetime-local" id="gmTripsHourFrom" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Hasta <input type="datetime-local" id="gmTripsHourTo" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"></label><button id="gmTripsHoursGo" type="button" class="airFullBtn">Ver recorrido por horas</button></div></div>'+ '<p id="gmTripsStatus" style="font-size:12px;color:#475569"></p><div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,1.6fr);gap:12px" id="gmTripsLayout"><div id="gmTripsResults" style="overflow:auto;max-height:650px;border:1px solid #e2e8f0;border-radius:10px"></div><div><div id="gmTripsMap" style="height:530px;border-radius:10px;background:#e2e8f0"></div><div id="gmTripsEvents" style="margin-top:10px;font-size:12px;color:#475569"></div></div></div>'+
 '<div id="gmTripsPlayback" style="display:none;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0"><button type="button" id="gmTripsPlay" style="border:0;border-radius:8px;background:#0f766e;color:white;padding:9px 15px;font-weight:700;cursor:pointer">▶ Reproducir</button><button type="button" id="gmTripsPause" class="airFullBtn">⏸ Pausar</button><button type="button" id="gmTripsReset" class="airFullBtn">↺ Reiniciar</button><label style="font-size:12px">Velocidad <select id="gmTripsSpeed"><option value="1">1×</option><option value="2">2×</option><option value="5" selected>5×</option><option value="10">10×</option></select></label><input type="range" id="gmTripsProgress" value="0" min="0" max="100" style="flex:1;min-width:120px" aria-label="Posición del recorrido"><span id="gmTripsTime" style="font-size:11px;color:#475569"></span></div>'+ '<footer style="position:sticky;bottom:-18px;background:#fff;border-top:1px solid #e2e8f0;padding:12px 0;margin-top:14px;display:flex;justify-content:flex-end"><button type="button" id="gmTripsCloseBottom" style="background:#0f172a;color:white;padding:11px 22px;border:0;border-radius:9px;font-weight:800;cursor:pointer">Cerrar reporte</button></footer>'+ '<style>@media(max-width:740px){#gmTripsLayout{grid-template-columns:1fr!important}#gmTripsMap{height:300px!important}}</style></section>';
 document.body.appendChild(m);
 const closeReport=()=>{stopPlayback();traceVersion++;if(map){map.remove();map=null}markers=null;m.remove()};$('gmTripsClose').onclick=closeReport;$('gmTripsCloseBottom').onclick=closeReport;m.addEventListener('click',e=>{if(e.target===m)closeReport()});
 $('gmTripsSearch').onclick=search;$('gmTripsFind').oninput=renderTrips;$('gmTripsMode').onchange=syncMode;$('gmTripsClient').onchange=renderTrips;$('gmTripsHoursGo').onclick=traceHours;$('gmTripsPlay').onclick=startPlayback;$('gmTripsPause').onclick=stopPlayback;$('gmTripsReset').onclick=()=>{stopPlayback();seekPlayback(0)};$('gmTripsProgress').oninput=e=>{stopPlayback();seekPlayback(Number(e.target.value)/100)};
 const end=new Date(),start=new Date(end);start.setDate(start.getDate()-6);const local=d=>date(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');$('gmTripsHourTo').value=local(end);const before=new Date(end.getTime()-2*3600000);$('gmTripsHourFrom').value=local(before);$('gmTripsTo').value=date(end);$('gmTripsFrom').value=date(start);
 }
 syncMode();
}
function syncMode(){
 const hourly=$('gmTripsMode')?.value==='HORAS';
 $('gmTripsHours').style.display=hourly?'flex':'none';
 $('gmTripsTripFilters').style.display=hourly?'none':'flex';
 $('gmTripsFindWrap').style.display=hourly?'none':'';
 $('gmTripsResults').style.display=hourly?'none':'block';
 $('gmTripsLayout').style.gridTemplateColumns=hourly?'minmax(0,1fr)':'minmax(220px,1fr) minmax(0,1.6fr)';
 $('gmTripsStatus').textContent=hourly?'Selecciona unidad y rango de horas para consultar únicamente sus posiciones GPS.':'Selecciona fechas y cliente para consultar viajes.';
 stopPlayback();traceVersion++;$('gmTripsPlayback').style.display='none';$('gmTripsEvents').textContent='';
 if(hourly){$('gmTripsUnit').focus();}else{search();}
 if(map)setTimeout(()=>map?.invalidateSize(),100);
}
async function rpc(name,args){const s=window.gmSupabase;if(!s?.rpc)throw Error('Sesión requerida');const r=await s.rpc(name,args);if(r.error)throw r.error;return r.data;}
async function search(){
 if($('gmTripsMode')?.value!=='VIAJES')return;
 const from=$('gmTripsFrom')?.value,to=$('gmTripsTo')?.value;
 if(!from||!to||from>to){$('gmTripsStatus').textContent='Selecciona un rango válido.';return}
 $('gmTripsStatus').textContent='Consultando viajes…';
 try{const data=await rpc('gm_reporte_viajes',{p_desde:from,p_hasta:to});rows=data?.viajes||[];
 updateClientOptions();renderTrips();
 $('gmTripsResults').onclick=e=>{const b=e.target.closest('[data-trip]');if(b)trace(Number(b.dataset.trip))};
 }catch(e){$('gmTripsStatus').textContent='No fue posible consultar: '+(e.message||e)}
}
function updateClientOptions(){
 const el=$('gmTripsClient');if(!el)return;const current=el.value;
 const clients=[...new Set(rows.map(x=>String(x.cliente||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 el.innerHTML='<option value="">Todos los clientes</option>'+clients.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');el.value=clients.includes(current)?current:'';
}
function renderTrips(){
 if($('gmTripsMode')?.value!=='VIAJES')return;
 const client=$('gmTripsClient')?.value||'';
 const q=String($('gmTripsFind')?.value||'').trim().toLowerCase();
 const filtered=rows.filter(x=>(!client||String(x.cliente||'').trim()===client)&&(!q||[x.numero_viaje,x.identificador_viaje,x.unidad,x.cliente].some(v=>String(v||'').toLowerCase().includes(q))));
 $('gmTripsResults').innerHTML=filtered.map(x=>'<button type="button" data-trip="'+x.id+'" style="display:block;width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid #e2e8f0;padding:12px;cursor:pointer"><b>'+esc(x.unidad)+'</b> · '+esc(x.numero_viaje||x.identificador_viaje||'Sin folio')+'<br><span style="font-size:11px;color:#64748b">'+esc(x.cliente||'')+' · '+esc(String(x.first_seen||'').slice(0,16).replace('T',' '))+'</span><br><span style="font-size:11px">'+esc(x.origen||'—')+' → '+esc(x.destino||'—')+'</span></button>').join('')||'<p style="padding:14px;color:#64748b">No se encontraron viajes para este período.</p>';
 $('gmTripsStatus').textContent=filtered.length+' viajes encontrados';
}
async function traceHours(){
 const unit=String($('gmTripsUnit').value||'').trim().toUpperCase(),from=$('gmTripsHourFrom').value,to=$('gmTripsHourTo').value;
 if(!unit||!from||!to||from>=to){$('gmTripsStatus').textContent='Selecciona unidad y horario válido.';return}
 const version=++traceVersion;stopPlayback();$('gmTripsPlayback').style.display='none';$('gmTripsEvents').textContent='Consultando posiciones de '+unit+'…';$('gmTripsStatus').textContent='Consultando trayectoria GPS por horario, sin vincularla a viajes…';
 try{const data=await rpc('gm_reporte_unidad_horas',{p_unidad:unit,p_desde:new Date(from).toISOString(),p_hasta:new Date(to).toISOString()});if(version!==traceVersion)return;$('gmTripsStatus').textContent='Recorrido de '+unit+' por horario seleccionado';await showTrace(data,version)}
 catch(e){$('gmTripsEvents').textContent='No se pudo consultar por horarios: '+(e.message||e)}
}
async function ensureTripsLeaflet(){
 if(window.L?.map)return;
 if(typeof window.ccEnsureLeaflet==='function'){
  try{await window.ccEnsureLeaflet()}catch(e){console.warn('Carga Leaflet del mapa principal:',e)}
  if(window.L?.map)return;
 }
 const styles=['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'];
 if(!document.querySelector('link[data-gm-trips-leaflet]')){let css=document.createElement('link');css.rel='stylesheet';css.href=styles[0];css.dataset.gmTripsLeaflet='1';document.head.appendChild(css)}
 if(!window.__gmTripsLeafletPromise){
  window.__gmTripsLeafletPromise=(async()=>{
   const urls=['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
   for(const url of urls){
    if(window.L?.map)return;
    try{
     await new Promise((resolve,reject)=>{
      const el=document.createElement('script');el.src=url;el.async=true;
      el.onload=()=>window.L?.map?resolve():reject(Error('Leaflet sin inicializar'));
      el.onerror=()=>reject(Error('No se pudo cargar '+url));
      document.head.appendChild(el);
     });
     if(window.L?.map)return;
    }catch(err){console.warn('Proveedor Leaflet:',err)}
   }
   throw Error('No fue posible cargar el mapa Leaflet. Revisa la conexión o el bloqueo de CDN.');
  })().catch(err=>{window.__gmTripsLeafletPromise=null;throw err});
 }
 await window.__gmTripsLeafletPromise;
}
function vehicleIcon(data){
 const x={unidad:data.unidad||'Unidad',remolque:data.remolque||'',numeroViaje:data.numero_viaje||'',cliente:data.cliente||'',operador:data.operador||'',destino:data.destino||''};
 const html=typeof window.gmAirportVehicleMarkerHtml==='function'?window.gmAirportVehicleMarkerHtml(x,'#0f766e'):'<div style="background:#0f766e;color:#fff;padding:7px 11px;border-radius:10px;white-space:nowrap;font-weight:800;box-shadow:0 3px 12px #0003"><i class="fa-solid fa-truck-front"></i> '+esc(x.unidad)+(x.remolque?' <i class="fa-solid fa-trailer"></i> '+esc(x.remolque):'')+'</div>';
 return L.divIcon({className:'',html,iconSize:null,iconAnchor:[28,15]});
}
function stopPlayback(){if(playTimer){clearInterval(playTimer);playTimer=null}}
function seekPlayback(fraction){
 if(!playPath.length||!map)return;
 playIndex=Math.min(playPath.length-1,Math.max(0,Math.round(fraction*(playPath.length-1))));
 const p=playPath[playIndex];if(playMarker)playMarker.setLatLng(p);if(playLine)playLine.setLatLngs(playPath.slice(0,playIndex+1));
 if($('gmTripsProgress'))$('gmTripsProgress').value=String(Math.round(100*playIndex/Math.max(1,playPath.length-1)));
 if($('gmTripsTime'))$('gmTripsTime').textContent=(p.time?new Date(p.time).toLocaleString('es-MX'):'')+' · '+(playIndex+1)+'/'+playPath.length;
}
function startPlayback(){stopPlayback();if(playPath.length<2)return;if(playIndex>=playPath.length-1)seekPlayback(0);playTimer=setInterval(()=>{if(!map||!$('gmTripReportModal')){stopPlayback();return}if(playIndex>=playPath.length-1){stopPlayback();return}const speed=Number($('gmTripsSpeed')?.value||5);seekPlayback((Math.min(playPath.length-1,playIndex+speed))/(playPath.length-1))},180)}
function distanceMeters(a,b){const d=Math.PI/180,R=6371000,dlat=(b.lat-a.lat)*d,dlon=(b.lng-a.lng)*d;const x=Math.sin(dlat/2)**2+Math.cos(a.lat*d)*Math.cos(b.lat*d)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)))}
async function matchRoads(points){
 // Map Matching is an optional visual estimate only; do not connect large GPS gaps.
 if(points.length<2||points.length>100)return null;
 const maxGap=1000;for(let i=1;i<points.length;i++){let dt=(new Date(points[i].time)-new Date(points[i-1].time))/1000;if(dt>180||dt<0||distanceMeters(points[i-1],points[i])>maxGap)return null}
 try{
  const coordinates=points.map(p=>p.lng+','+p.lat).join(';');
  const url='https://router.project-osrm.org/match/v1/driving/'+coordinates+'?overview=full&geometries=geojson&gaps=split';
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),6500);
  let response;try{response=await fetch(url,{signal:ctrl.signal})}finally{clearTimeout(timeout)}
  if(!response.ok)return null;const data=await response.json();
  if(data.code!=='Ok'||!Array.isArray(data.matchings)||data.matchings.length!==1)return null;
  const coords=data.matchings[0].geometry?.coordinates||[];
  if(coords.length<2)return null;return coords.map(x=>({lat:x[1],lng:x[0]}));
 }catch(e){console.warn('Map Matching no disponible:',e);return null}
}
async function trace(id){
 stopPlayback();const version=++traceVersion;
 $('gmTripsEvents').textContent='Consultando trayectoria del viaje…';$('gmTripsPlayback').style.display='none';
 try{
 const data=await rpc('gm_reporte_trayecto',{p_viaje_id:id});
 await showTrace(data,version);
 }catch(e){if(version===traceVersion&&$('gmTripsEvents'))$('gmTripsEvents').textContent='Error de recorrido: '+(e.message||e)}
}
async function showTrace(data,version){
 try{
 const geosHtml=events.length?'<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px"><b>Geocercas registradas por GM ('+events.length+'):</b>'+events.map(e=>'<div style="padding:5px 0;border-bottom:1px solid #f1f5f9">'+esc(e.nombre)+' · '+esc(e.evento)+' · '+esc(e.fecha)+'</div>').join('')+'</div>':'<div style="margin-top:10px;color:#64748b">No hay eventos de geocercas registrados para este intervalo.</div>';
 const gps=(data.puntos||[]).filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)).map(x=>({lat:Number(x.lat),lng:Number(x.lon),time:x.fecha})).sort((a,b)=>new Date(a.time)-new Date(b.time)),events=data.geocercas||[];
 await ensureTripsLeaflet();if(version!==traceVersion||!$('gmTripsMap'))return;
 if(!map){map=L.map('gmTripsMap').setView([29.1,-110.9],9);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map)}
 if(markers)markers.clearLayers();markers=L.featureGroup().addTo(map);playPath=[];playIndex=0;playLine=null;playMarker=null;
 if(gps.length){
  const segments=[];let current=[gps[0]];
  for(let i=1;i<gps.length;i++){
   let gap=(new Date(gps[i].time)-new Date(gps[i-1].time))/1000;
   if(gap>180||distanceMeters(gps[i-1],gps[i])>1000){if(current.length>1)segments.push(current);current=[gps[i]]}
   else current.push(gps[i]);
  }if(current.length>1)segments.push(current);
  let displaySegments=[],matched=0;
  for(const seg of segments.slice(0,30)){const adjusted=await matchRoads(seg);if(version!==traceVersion||!$('gmTripsMap'))return;if(adjusted){displaySegments.push(adjusted);matched++}else displaySegments.push(seg)}
  for(const segment of displaySegments)L.polyline(segment,{color:'#0f766e',weight:5,opacity:.9,lineJoin:'round'}).addTo(markers);
  L.marker(gps[0],{icon:vehicleIcon(data)}).bindPopup('Inicio del recorrido registrado: '+esc(gps[0].time)).addTo(markers);
  if(gps.length>1){
   playPath=(displaySegments.length===1&&matched===1?displaySegments[0].map((p,i,arr)=>({...p,time:gps[Math.round(i*(gps.length-1)/Math.max(1,arr.length-1))]?.time})):gps);playLine=L.polyline([],{color:'#eab308',weight:5,opacity:.9}).addTo(markers);
   playMarker=L.marker(gps[0],{icon:vehicleIcon(data),zIndexOffset:1000}).addTo(markers);
   $('gmTripsPlayback').style.display='flex';seekPlayback(0);
  }
  map.fitBounds(markers.getBounds().pad(.16));setTimeout(()=>map?.invalidateSize(),80);
  $('gmTripsEvents').innerHTML='<b>'+gps.length+' posiciones GPS disponibles.</b> '+(matched?'Tramos ajustados a calles: '+matched+'. ':'')+(segments.length>matched?'Los demás tramos muestran el trayecto entre lecturas cercanas; ':'')+'Los intervalos sin GPS no se dibujan como recorrido confirmado.'+geosHtml;
 }else{
 const lastPos=data.ultima_posicion;
 if(lastPos&&Number.isFinite(Number(lastPos.lat))&&Number.isFinite(Number(lastPos.lon))){
 const loc=[Number(lastPos.lat),Number(lastPos.lon)];
 L.marker(loc,{icon:vehicleIcon(data)}).bindPopup('Última ubicación GPS disponible: '+esc(lastPos.fecha)).addTo(markers);
 map.setView(loc,14);setTimeout(()=>map?.invalidateSize(),80);
 }
 const last=data.ultimo_gps_unidad?new Date(data.ultimo_gps_unidad):null;
 const start=data.inicio_viaje?new Date(data.inicio_viaje):null;
 const hh=d=>d.toLocaleString('es-MX',{timeZone:'America/Hermosillo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true});
 const before=last&&start&&last<start;
 $('gmTripsEvents').innerHTML='<b>Ubicación GPS más reciente disponible de la unidad.</b> El recorrido aún no tiene posiciones GPS posteriores a su inicio. '+(last?'Última posición conocida de la unidad: <b>'+esc(hh(last))+'</b>. ':'')+(before?'Esta lectura es anterior al inicio del viaje ('+esc(hh(start))+'). GM todavía no entrega coordenadas nuevas para reconstruir su trayecto.':'Se requieren nuevas coordenadas GPS del viaje para dibujar el recorrido.')+'<div style="margin-top:8px;color:#64748b">Las actualizaciones de pantalla no equivalen a posiciones GPS nuevas: no se crea una trayectoria con lecturas repetidas.</div>'+geosHtml;
}
 }catch(e){if(version===traceVersion&&$('gmTripsEvents'))$('gmTripsEvents').textContent='Error de recorrido: '+(e.message||e)}
}

window.gmTripReportOpen=open;
new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();