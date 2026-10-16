(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let map=null,markers=null,rows=[],playTimer=null,playPath=[],playIndex=0,playMarker=null,playLine=null,traceVersion=0,selectedTrip=null,activeTraceData=null,activeTraceGps=[],activeTraceGeofences=[],geofenceFocusMarker=null;
const date=d=>{const p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
function inject(){
 const bar=$('airHistoryBtn')?.parentElement;if(!bar||bar.querySelector('#gmTripReportButton'))return;
 const btn=document.createElement('button');btn.type='button';btn.id='gmTripReportButton';btn.className='airFullBtn';btn.innerHTML='<i class="fa-solid fa-route"></i> Reporte de viajes';bar.insertBefore(btn,$('airHistoryBtn'));
 btn.onclick=open;
 if(window.CC_MIRROR_EXTERNAL&&window.CC_MIRROR_PERMISSIONS?.mapa_unidades&&!window.CC_MIRROR_PERMISSIONS?.aeropuerto&&!window.CC_MIRROR_PERMISSIONS?.cajas_renta){
  const mapControls=$('airFleetMapControls');
  if(mapControls){btn.className='airFleetMapAction';btn.style.cssText='background:#0f766e;color:#fff;border-color:#0f766e;font-weight:800;white-space:nowrap';mapControls.prepend(btn)}
 }
}
function open(){
 if(window.CC_MIRROR_EXTERNAL&&!window.CC_MIRROR_PERMISSIONS?.reporte_viajes)return;
 if(!$('gmTripReportModal')){
 const m=document.createElement('div');m.id='gmTripReportModal';m.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0f172acb;display:flex;justify-content:center;align-items:center;padding:12px';
 m.innerHTML='<section id="gmTripsModalPanel" role="dialog" aria-modal="true" aria-label="Reporte de viajes" style="width:min(1800px,99vw);height:96vh;overflow:hidden;background:#fff;border-radius:16px;padding:12px 14px;color:#0f172a;box-shadow:0 22px 80px #0005;display:flex;flex-direction:column;min-height:0">'+
 '<header id="gmTripsModalHeader" style="flex-shrink:0;z-index:900;background:#fff;padding:5px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0"><div><h2 style="font-size:20px;font-weight:800;margin:0">Reporte de viajes</h2><p style="margin:4px 0 0;color:#64748b;font-size:12px">Viajes registrados, eventos y posiciones GPS verificadas</p></div><button id="gmTripsClose" type="button" aria-label="Cerrar reporte de viajes" style="display:inline-flex;align-items:center;gap:7px;border:0;border-radius:10px;background:#dc2626;color:white;padding:11px 18px;font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0">✕ Cerrar</button></header>'+
 '<div id="gmTripsTripFilters" style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:15px 0"><label>Desde <input id="gmTripsFrom" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Hasta <input id="gmTripsTo" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Cliente <select id="gmTripsClient" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;max-width:260px"><option value="">Todos los clientes</option></select></label><button id="gmTripsSearch" type="button" class="airFullBtn" style="background:#0f766e;color:#fff">Consultar viajes</button></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-bottom:12px"><label style="display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc;font-weight:700"><input id="gmTripsShowTransit" type="checkbox" style="accent-color:#0f766e"> Mostrar viajes en tránsito</label><label id="gmTripsFindWrap">Buscar número de viaje <input id="gmTripsFind" type="search" placeholder="Ej. 80564" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;width:180px"></label><label>Consultar por <select id="gmTripsMode" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"><option value="VIAJES">Viajes</option><option value="HORAS">Unidad y horario</option></select></label><div id="gmTripsHours" style="display:none;gap:7px;flex-wrap:wrap;align-items:end;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc"><label>Unidad <input id="gmTripsUnit" placeholder="Ej. LB14" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;width:110px"></label><label>Desde <input type="datetime-local" id="gmTripsHourFrom" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Hasta <input type="datetime-local" id="gmTripsHourTo" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"></label><button id="gmTripsHoursGo" type="button" class="airFullBtn">Ver recorrido por horas</button></div></div>'+ '<p id="gmTripsStatus" style="font-size:12px;color:#475569"></p><div style="display:grid;grid-template-columns:minmax(230px,0.82fr) minmax(360px,1.2fr) minmax(360px,1.15fr);gap:10px;flex:1;min-height:0;overflow:hidden" id="gmTripsLayout"><div id="gmTripsResults" style="overflow:auto;min-height:0;border:1px solid #e2e8f0;border-radius:10px"></div><div id="gmTripsMap" style="height:100%;min-height:0;border-radius:10px;background:#e2e8f0"></div><div id="gmTripsEvents" style="overflow-y:auto;overflow-x:hidden;min-height:0;border:1px solid #e2e8f0;border-radius:10px;padding:8px;font-size:12px;color:#475569;overscroll-behavior:contain">Selecciona un viaje para ver su cronología completa.</div></div>'+
 '<div id="gmTripsPlayback" style="display:none;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;flex-shrink:0"><button type="button" id="gmTripsPlay" style="border:0;border-radius:8px;background:#0f766e;color:white;padding:9px 15px;font-weight:700;cursor:pointer">▶ Reproducir</button><button type="button" id="gmTripsPause" class="airFullBtn">⏸ Pausar</button><button type="button" id="gmTripsReset" class="airFullBtn">↺ Reiniciar</button><label style="font-size:12px">Velocidad <select id="gmTripsSpeed"><option value="1">1×</option><option value="2">2×</option><option value="5" selected>5×</option><option value="10">10×</option></select></label><label style="font-size:12px;display:inline-flex;align-items:center;gap:5px"><input id="gmTripsFollow" type="checkbox" checked> Seguir unidad</label><button type="button" id="gmTripsMp4" class="airFullBtn">🎞 Descargar animación GIF</button><input type="range" id="gmTripsProgress" value="0" min="0" max="100" style="flex:1;min-width:120px" aria-label="Posición del recorrido"><span id="gmTripsTime" style="font-size:11px;color:#475569"></span></div>'+ '<footer style="flex-shrink:0;border-top:1px solid #e2e8f0;padding:7px 0 0;margin-top:7px;display:flex;justify-content:flex-end"><button type="button" id="gmTripsCloseBottom" style="background:#0f172a;color:white;padding:11px 22px;border:0;border-radius:9px;font-weight:800;cursor:pointer">Cerrar reporte</button></footer>'+ '<style>#gmTripsTripFilters{flex-shrink:0;margin:8px 0!important}#gmTripsLayout{flex:1;min-height:0}#gmTripsMap{height:100%!important}@media(max-width:1000px){#gmTripsLayout{grid-template-columns:minmax(180px,.7fr) minmax(280px,1fr)!important}#gmTripsEvents{grid-column:1/-1;max-height:220px}#gmTripsMap{min-height:360px!important}}@media(max-width:650px){#gmTripsLayout{grid-template-columns:1fr!important;overflow:auto!important}#gmTripsResults{max-height:180px}#gmTripsMap{height:300px!important;min-height:300px!important}#gmTripsEvents{max-height:300px}}</style></section>';
 document.body.appendChild(m);
 const eventsPanel=$('gmTripsEvents');
 if(eventsPanel&&!eventsPanel.dataset.geofenceClickBound){
  eventsPanel.dataset.geofenceClickBound='1';
  eventsPanel.addEventListener('click',ev=>{
   const card=ev.target.closest('[data-geofence-index]');
   if(!card)return;
   focusGeofenceAtTime(Number(card.dataset.geofenceIndex));
  });
 }
 if(window.CC_MIRROR_EXTERNAL){
  const clientFilter=$('gmTripsClient')?.closest('label');if(clientFilter)clientFilter.style.display='none';
  const scope=document.createElement('div');scope.id='gmTripsMirrorScope';scope.style.cssText='padding:8px 11px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e40af;border-radius:9px;font-size:12px;font-weight:700;margin:8px 0';scope.textContent='Cuenta espejo · Reporte limitado automáticamente a los viajes del cliente asignado.';
  $('gmTripsTripFilters')?.after(scope);
  const heading=$('gmTripsModalHeader')?.querySelector('p');if(heading)heading.textContent='Viajes del cliente asignado · eventos y posiciones GPS verificadas';
 }
 const closeReport=()=>{stopPlayback();traceVersion++;if(map){map.remove();map=null}markers=null;m.remove()};$('gmTripsClose').onclick=closeReport;$('gmTripsCloseBottom').onclick=closeReport;m.addEventListener('click',e=>{if(e.target===m)closeReport()});
 $('gmTripsSearch').onclick=search;$('gmTripsFind').oninput=renderTrips;$('gmTripsShowTransit').onchange=renderTrips;$('gmTripsMode').onchange=syncMode;$('gmTripsClient').onchange=renderTrips;$('gmTripsHoursGo').onclick=traceHours;$('gmTripsPlay').onclick=startPlayback;$('gmTripsPause').onclick=stopPlayback;$('gmTripsReset').onclick=()=>{stopPlayback();seekPlayback(0)};if(window.CC_MIRROR_EXTERNAL){$('gmTripsMp4').style.display='none';$('gmTripsMp4').setAttribute('aria-hidden','true');}$('gmTripsMp4').onclick=exportTripMp4;$('gmTripsProgress').oninput=e=>{stopPlayback();seekPlayback(Number(e.target.value)/100)};
 const end=new Date(),today=date(end);const local=d=>date(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');$('gmTripsHourTo').value=local(end);const before=new Date(end.getTime()-2*3600000);$('gmTripsHourFrom').value=local(before);const weekStart=new Date(end);weekStart.setDate(weekStart.getDate()-6);$('gmTripsTo').value=today;$('gmTripsFrom').value=date(weekStart);
 }
 syncMode();
}
function syncMode(){
 if(window.CC_MIRROR_EXTERNAL){const hoursOption=$('gmTripsMode')?.querySelector('option[value="HORAS"]');hoursOption?.remove();if($('gmTripsMode')?.value==='HORAS')$('gmTripsMode').value='VIAJES';}
 const hourly=$('gmTripsMode')?.value==='HORAS';
 $('gmTripsHours').style.display=hourly?'flex':'none';
 $('gmTripsTripFilters').style.display=hourly?'none':'flex';
 $('gmTripsFindWrap').style.display=hourly?'none':'';
 $('gmTripsResults').style.display=hourly?'none':'block';
 $('gmTripsLayout').style.gridTemplateColumns=hourly?'minmax(0,1.15fr) minmax(320px,0.85fr)':'minmax(230px,0.82fr) minmax(360px,1.2fr) minmax(360px,1.15fr)';
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
 $('gmTripsResults').onclick=e=>{const b=e.target.closest('[data-trip]');if(b){selectedTrip=rows.find(x=>Number(x.id)===Number(b.dataset.trip))||null;trace(Number(b.dataset.trip))}};
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
 const q=String($('gmTripsFind')?.value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^MA0+(?=\d)/,'MA');
 const showTransit=!!$('gmTripsShowTransit')?.checked;
 const filtered=rows.filter(x=>{const finished=!!x.ended_at;const inTransit=!x.ended_at;return (finished||(showTransit&&inTransit))&&(!client||String(x.cliente||'').trim()===client)&&(!q||[x.numero_viaje,x.identificador_viaje,x.unidad,x.cliente].some(v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^MA0+(?=\d)/,'MA').includes(q)))});
 $('gmTripsResults').innerHTML=filtered.map(x=>'<button type="button" data-trip="'+x.id+'" style="display:block;width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid #e2e8f0;padding:9px 10px;cursor:pointer"><b>'+esc(x.unidad)+'</b> · '+esc(x.numero_viaje||x.identificador_viaje||'Sin folio')+'<br><span style="font-size:10px;color:#64748b">'+esc(x.cliente||'')+'</span><br><span style="font-size:10px;color:#334155">'+esc(x.origen||'—')+' → '+esc(x.destino||'—')+'</span></button>').join('')||'<p style="padding:14px;color:#64748b">No se encontraron viajes para este período.</p>';
 $('gmTripsStatus').textContent=filtered.length+' viajes '+(showTransit?'(finalizados y en tránsito)':'finalizados con cierre registrado');
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
 const p=playPath[playIndex];if(playMarker)playMarker.setLatLng(p);if(playLine)playLine.setLatLngs(playPath.slice(0,playIndex+1));if(map&&$('gmTripsFollow')?.checked)map.panTo(p,{animate:false});
 if($('gmTripsProgress'))$('gmTripsProgress').value=String(Math.round(100*playIndex/Math.max(1,playPath.length-1)));
 if(playMarker)playMarker.setLatLng(p);if(playIndex===0)map.setView(p,Math.max(map.getZoom(),12),{animate:false});
 if($('gmTripsTime'))$('gmTripsTime').textContent=(p.time?new Date(p.time).toLocaleString('es-MX'):'')+' · '+(playIndex+1)+'/'+playPath.length;
}
function startPlayback(){stopPlayback();if(playPath.length<2)return;if(playIndex>=playPath.length-1)seekPlayback(0);playTimer=setInterval(()=>{if(!map||!$('gmTripReportModal')){stopPlayback();return}if(playIndex>=playPath.length-1){stopPlayback();return}const speed=Number($('gmTripsSpeed')?.value||5);seekPlayback((Math.min(playPath.length-1,playIndex+speed))/(playPath.length-1))},180)}
async function loadScriptOnce(src,test){
 if(test())return;
 await new Promise((resolve,reject)=>{
  const existing=[...document.scripts].find(s=>s.src===src);
  if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(Error('No se pudo cargar el componente de exportación.')),{once:true});return}
  const script=document.createElement('script');script.src=src;script.async=true;
  script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar el componente de exportación.'));document.head.appendChild(script);
 });
 if(!test())throw Error('El componente de exportación no se inicializó.');
}
let lastTripDownloadUrl=null;
function sanitizeTripClone(doc){
  // html2canvas no entiende la función CSS color() (por ejemplo color(srgb ...)).
  // Normalizamos todos los estilos computados del clon, no solo una lista parcial
  // de propiedades: el color problemático puede venir de estilos globales o SVG.
  const win=doc.defaultView;
  doc.querySelectorAll('*').forEach(el=>{
    try{
      const computed=win.getComputedStyle(el);
      for(let i=0;i<computed.length;i++){
        const prop=computed[i],value=computed.getPropertyValue(prop);
        if(!value||!/\bcolor\s*\(/i.test(value))continue;
        let fallback='transparent';
        if(prop==='color'||prop.endsWith('-color')||prop==='fill'||prop==='stroke')fallback=prop==='color'?'#1f2937':'transparent';
        else if(prop.includes('shadow'))fallback='none';
        else if(prop.includes('background'))fallback='transparent';
        el.style.setProperty(prop,fallback,'important');
      }
      // También sanea estilos escritos directamente en el atributo style.
      const inline=el.getAttribute('style');
      if(inline&&/\bcolor\s*\(/i.test(inline)){
        el.setAttribute('style',inline.replace(/color\s*\([^)]*\)/gi,'rgb(31, 41, 55)'));
      }
    }catch(e){}
  });
  // Pseudo-elementos no se pueden corregir desde JS y también pueden contener color().
  const style=doc.createElement('style');
  style.textContent='*::before,*::after{color:#1f2937!important;text-shadow:none!important;box-shadow:none!important}';
  (doc.head||doc.documentElement).appendChild(style);
}
function downloadTripFile(blob,filename){
 if(!(blob instanceof Blob)||!blob.size)throw Error('El archivo generado está vacío.');
 // Después de procesar el mapa durante varios segundos, Chrome puede bloquear
 // una descarga automática porque ya no existe activación directa del usuario.
 // Dejamos un enlace visible que el usuario pulsa explícitamente.
 if(lastTripDownloadUrl){try{URL.revokeObjectURL(lastTripDownloadUrl)}catch(e){}}
 lastTripDownloadUrl=URL.createObjectURL(blob);
 return {url:lastTripDownloadUrl,size:blob.size,name:filename};
}
function showTripDownload(file,kind){
 const status=$('gmTripsStatus');
 status.innerHTML='<b style="color:#166534">Archivo listo ('+Math.ceil(file.size/1024)+' KB).</b> <a href="'+file.url+'" download="'+esc(file.name)+'" style="display:inline-block;margin:6px 0;padding:10px 14px;border-radius:9px;background:#0f766e;color:#fff;font-weight:800;text-decoration:none">⬇ Descargar '+esc(kind)+'</a><div style="font-size:11px;color:#475569">Pulsa el botón verde para guardar el archivo en tu equipo.</div>';
}
function tripGifPalette(){
 const p=new Uint8Array(768);
 for(let i=0;i<256;i++){p[i*3]=Math.round(((i>>5)&7)*255/7);p[i*3+1]=Math.round(((i>>2)&7)*255/7);p[i*3+2]=Math.round((i&3)*255/3)}
 return p;
}
function tripGifLzw(indices){
 const CLEAR=256,END=257;let codeSize=9,nextCode=258,dict=new Map(),bits=0,bitCount=0,out=[];
 const emit=code=>{bits|=code<<bitCount;bitCount+=codeSize;while(bitCount>=8){out.push(bits&255);bits>>>=8;bitCount-=8}};
 emit(CLEAR);
 if(indices.length){
  let prefix=indices[0];
  for(let i=1;i<indices.length;i++){
   const k=indices[i],key=prefix*256+k,found=dict.get(key);
   if(found!==undefined){prefix=found;continue}
   emit(prefix);
   if(nextCode<4096){
    dict.set(key,nextCode++);
    if(nextCode>=(1<<codeSize)&&codeSize<12)codeSize++;
   }else{emit(CLEAR);dict=new Map();codeSize=9;nextCode=258}
   prefix=k;
  }
  emit(prefix);
 }
 emit(END);if(bitCount)out.push(bits&255);
 const blocks=[];for(let i=0;i<out.length;i+=255){const n=Math.min(255,out.length-i);blocks.push(n,...out.slice(i,i+n))}
 blocks.push(0);return blocks;
}
function tripGifEncode(width,height,frames,delayCs){
 const parts=[];let total=0;
 const add=part=>{const u=part instanceof Uint8Array?part:Uint8Array.from(part);parts.push(u);total+=u.length};
 const word=v=>[v&255,(v>>8)&255];
 add([71,73,70,56,57,97,...word(width),...word(height),0xF7,0,0]);
 add(tripGifPalette());
 for(const frame of frames){
  add([0x21,0xF9,4,0x04,...word(delayCs),0,0]);
  add([0x2C,...word(0),...word(0),...word(width),...word(height),0,8]);
  add(Uint8Array.from(tripGifLzw(frame)));
 }
 add([0x3B]);
 const output=new Uint8Array(total);let offset=0;
 for(const part of parts){output.set(part,offset);offset+=part.length}
 return output;
}
function tripGifFrame(canvas,width,height){
 const c=document.createElement('canvas');c.width=width;c.height=height;
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,width,height);
 const rgba=ctx.getImageData(0,0,width,height).data,indices=new Uint8Array(width*height);
 for(let i=0,j=0;i<rgba.length;i+=4,j++){
  const r=rgba[i],g=rgba[i+1],b=rgba[i+2];
  indices[j]=(r>>5)<<5|(g>>5)<<2|(b>>6);
 }
 return indices;
}
async function exportTripMp4(){
 if(!map||playPath.length<2){$('gmTripsStatus').textContent='Selecciona un viaje con al menos dos posiciones GPS.';return}
 const btn=$('gmTripsMp4');if(btn.disabled)return;
 btn.disabled=true;const oldLabel=btn.textContent;btn.textContent='Preparando GIF…';
 const oldIndex=playIndex,oldCenter=map.getCenter(),oldZoom=map.getZoom(),oldFollow=$('gmTripsFollow')?.checked;
 const frames=[];let captureCount=0;
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 try{
  $('gmTripsStatus').textContent='Preparando la captura local del mapa…';
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',()=>typeof window.html2canvas==='function');
  const target=$('gmTripsMap');if(!target)throw Error('No se encontró el área del mapa.');
  const rect=target.getBoundingClientRect();
  const scale=Math.min(1,480/Math.max(1,rect.width),360/Math.max(1,rect.height));
  const width=Math.max(1,Math.round(rect.width*scale)),height=Math.max(1,Math.round(rect.height*scale));
  const speed=Math.max(1,Number($('gmTripsSpeed')?.value||5));
  const estimatedMs=Math.max(180,Math.ceil((playPath.length-1)/speed)*180);
  const frameInterval=Math.max(180,Math.ceil(estimatedMs/220));
  if($('gmTripsFollow'))$('gmTripsFollow').checked=true;
  seekPlayback(0);await wait(250);
  $('gmTripsStatus').textContent='Reproduciendo y generando GIF del mapa en este navegador…';
  btn.textContent='Generando GIF…';
  startPlayback();
  while(map&&playIndex<playPath.length-1&&playTimer){
   const canvas=await window.html2canvas(target,{backgroundColor:'#e2e8f0',scale:scale,useCORS:true,allowTaint:false,logging:false,onclone:function(doc){sanitizeTripClone(doc)}});
   if(!canvas.width||!canvas.height)throw Error('No se pudo capturar el mapa.');
   if(frames.length<230)frames.push(tripGifFrame(canvas,width,height));
   captureCount++;
   if(frames.length%10===0){$('gmTripsStatus').textContent='Generando GIF local… '+frames.length+' fotogramas';}
   if(frames.length>=230)break;
   await wait(frameInterval);
  }
  stopPlayback();
  if(!frames.length){
   const canvas=await window.html2canvas(target,{backgroundColor:'#e2e8f0',scale:scale,useCORS:true,allowTaint:false,logging:false,onclone:function(doc){sanitizeTripClone(doc)}});
   frames.push(tripGifFrame(canvas,width,height));
  }
  $('gmTripsStatus').textContent='Comprimiendo '+frames.length+' fotogramas del mapa en un GIF…';
  const delayCs=Math.max(2,Math.round(frameInterval/10));
  const bytes=tripGifEncode(width,height,frames,delayCs);
  const blob=new Blob([bytes],{type:'image/gif'});
  const trip=String(selectedTrip?.numero_viaje||selectedTrip?.identificador_viaje||selectedTrip?.unidad||'unidad').replace(/[^a-z0-9_-]/gi,'_');
  const file=downloadTripFile(blob,'recorrido-'+trip+'.gif');
  showTripDownload(file,'GIF del mapa');
  $('gmTripsStatus').innerHTML='<b style="color:#166534">GIF del mapa listo.</b> '+frames.length+' fotogramas · '+width+' × '+height+' px. <a href="'+file.url+'" download="'+esc(file.name)+'" style="display:inline-block;margin:6px 0;padding:10px 14px;border-radius:9px;background:#0f766e;color:#fff;font-weight:800;text-decoration:none">⬇ Descargar GIF</a><div style="font-size:11px;color:#475569">Generado localmente; contiene solamente el área del mapa.</div>';
 }catch(e){
  console.error('Generación local de GIF:',e);
  $('gmTripsStatus').textContent='No se pudo generar el GIF: '+(e?.message||String(e))+'. El reporte sigue disponible; intenta nuevamente.';
 }finally{
  stopPlayback();
  if(map){map.setView(oldCenter,oldZoom,{animate:false});map.invalidateSize({animate:false})}
  if($('gmTripsFollow')&&oldFollow!=null)$('gmTripsFollow').checked=oldFollow;
  if(oldIndex>=0)seekPlayback(oldIndex/Math.max(1,playPath.length-1));
  btn.disabled=false;btn.textContent=oldLabel;
 }
}
async function exportTripPdf(){
 if(!map||playPath.length<2){$('gmTripsStatus').textContent='Selecciona un viaje con al menos dos posiciones GPS antes de guardar la imagen.';return}
 const btn=$('gmTripsPdf');if(btn.disabled)return;
 btn.disabled=true;const oldLabel=btn.textContent;btn.textContent='Guardando imagen…';
 try{
  $('gmTripsStatus').textContent='Capturando el mapa tal como se muestra…';
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',()=>typeof window.html2canvas==='function');
  const target=$('gmTripsMap');
  if(!target)throw Error('No se encontró el mapa del recorrido.');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const canvas=await window.html2canvas(target,{useCORS:true,allowTaint:false,backgroundColor:'#f3f0e8',scale:1.5,logging:false,onclone:function(doc){
    sanitizeTripClone(doc);
    const mapClone=doc.getElementById('gmTripsMap');
    if(mapClone){
      mapClone.querySelectorAll('.leaflet-control-container,.leaflet-popup,.leaflet-tooltip,.gm-trip-direction-wrap').forEach(el=>el.style.display='none');
      // Ocultar el icono de la unidad/animación y conservar solamente los marcadores de inicio (S) y final (F).
      mapClone.querySelectorAll('.leaflet-marker-icon').forEach(el=>{
        const label=(el.textContent||'').trim();
        if(!el.querySelector('div')||!(/^[SF]$/.test(label)))el.style.display='none';
      });
    }
  }});
  if(!canvas.width||!canvas.height)throw Error('La imagen del mapa quedó vacía.');
  const trip=String(selectedTrip?.numero_viaje||selectedTrip?.identificador_viaje||'recorrido').replace(/[^a-z0-9_-]/gi,'_');
  const file=downloadTripFile(canvas.toDataURL('image/png'),'recorrido-'+trip+'.png');
  showTripDownload(file,'imagen del mapa PNG');
  $('gmTripsStatus').textContent='Imagen guardada con la vista actual del mapa, el recorrido y sus puntos de inicio y fin.';
 }catch(e){
  console.error('Captura del mapa:',e);
  $('gmTripsStatus').textContent='No se pudo guardar la imagen: '+(e?.message||String(e))+'. El reporte sigue disponible; intenta nuevamente.';
 }finally{
  btn.disabled=false;btn.textContent=oldLabel;
 }
}
function distanceMeters(a,b){const d=Math.PI/180,R=6371000,dlat=(b.lat-a.lat)*d,dlon=(b.lng-a.lng)*d;const x=Math.sin(dlat/2)**2+Math.cos(a.lat*d)*Math.cos(b.lat*d)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)))}
async function matchRoads(points){
 // Ajusta la trayectoria GPS grabada a la red vial; no calcula una ruta nueva origen-destino.
 if(!Array.isArray(points)||points.length<2)return null;
 // Separar segmentos con saltos o pausas: nunca unirlos artificialmente con una recta.
 const groups=[];let group=[points[0]];
 for(let i=1;i<points.length;i++){
  const prev=points[i-1],cur=points[i];
  const t0=Date.parse(prev.time),t1=Date.parse(cur.time),dt=(t1-t0)/1000;
  if(!Number.isFinite(dt)||dt<0||dt>300||distanceMeters(prev,cur)>5000){
   if(group.length>=2)groups.push(group);
   group=[cur];
  }else group.push(cur);
 }
 if(group.length>=2)groups.push(group);
 // La función de dibujo espera una sola línea. Si la trayectoria tiene cortes,
 // no sustituirla por una unión recta: se conserva el GPS original en ese caso.
 if(groups.length!==1)return null;
 const source=groups[0],chunks=[];let start=0;
 while(start<source.length-1){const end=Math.min(source.length,start+20);chunks.push(source.slice(start,end));if(end===source.length)break;start=end-1}
 const matched=[];
 for(const chunk of chunks){
  try{
   const coordinates=chunk.map(p=>p.lng+','+p.lat).join(';');
   const timestamps=chunk.map(p=>Math.floor(Date.parse(p.time)/1000)).join(';');
   // Radios tolerantes al error GPS, con marcas de tiempo para mejorar la correspondencia.
   const radiuses=chunk.map(()=> '35').join(';');
   const url='https://router.project-osrm.org/match/v1/driving/'+coordinates+
    '?overview=full&geometries=geojson&gaps=split&tidy=false&timestamps='+timestamps+'&radiuses='+radiuses;
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),15000);
   let response;try{response=await fetch(url,{signal:ctrl.signal})}finally{clearTimeout(timeout)}
   if(!response.ok)return null;const data=await response.json();
   if(data.code!=='Ok'||!Array.isArray(data.matchings)||!data.matchings.length)return null;
   // Combinar todas las coincidencias solo si son contiguas; no descartar tramos
   // válidos por el hecho de que OSRM entregue más de una coincidencia.
   const ordered=data.matchings.slice().sort((a,b)=>(a.tracepoints?.[0]?.waypoint_index??0)-(b.tracepoints?.[0]?.waypoint_index??0));
   const coords=[];
   for(const item of ordered){
    const part=(item.geometry?.coordinates||[]).map(x=>({lat:x[1],lng:x[0]}));
    if(part.length<2)continue;
    if(coords.length){
     if(distanceMeters(coords[coords.length-1],part[0])>100)return null;
     part.shift();
    }
    coords.push(...part);
   }
   if(coords.length<2)return null;
   // Evitar ajustes que se alejen demasiado del trayecto registrado en sus extremos.
   if(distanceMeters(coords[0],chunk[0])>800||distanceMeters(coords[coords.length-1],chunk[chunk.length-1])>800)return null;
   if(matched.length){
    if(distanceMeters(matched[matched.length-1],coords[0])>100)return null;
    coords.shift();
   }
   matched.push(...coords);
  }catch(e){console.warn('Ajuste a calles no disponible:',e);return null}
 }
 return matched.length>1?matched:null;
}
function bearingDegrees(a,b){
 const rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad,dlon=(b.lng-a.lng)*rad;
 const y=Math.sin(dlon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dlon);
 return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function addDirectionArrows(path){
 if(!markers||path.length<3)return 0;
 let placed=0,last=path[0],acc=0;
 for(let i=1;i<path.length-1;i++){
  acc+=distanceMeters(path[i-1],path[i]);
  if(acc<1800)continue;
  const angle=bearingDegrees(path[i],path[i+1]);
  const icon=L.divIcon({className:'gm-trip-direction-wrap',html:'<span style="display:flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:50%;background:#fff;border:2px solid #0f766e;color:#0f766e;box-shadow:0 2px 7px #0f172a55;font-size:16px;font-weight:900;transform:rotate('+(angle-90)+'deg)">➤</span>',iconSize:[23,23],iconAnchor:[11,11]});
  L.marker(path[i],{icon,interactive:false,zIndexOffset:500}).addTo(markers);placed++;acc=0;last=path[i];
 }
 return placed;
}
async function addPostTripLocation(data,gps,version){
 const p=data?.ubicacion_posterior;
 if(!p||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lon))||!markers||version!==traceVersion)return;
 const next={lat:Number(p.lat),lng:Number(p.lon),time:p.fecha};
 const end=gps.length?gps[gps.length-1]:null;
 const icon=L.divIcon({className:'',html:'<div style="width:34px;height:34px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 10px #0006;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:900">F</div>',iconSize:[34,34],iconAnchor:[17,17]});
 L.marker(next,{icon,zIndexOffset:1200}).bindPopup('<b>F · Fin del recorrido</b><br>'+esc(fmtChrono(next.time))+'<br><span style="font-size:11px">Último evento GPS agregado; aquí termina el recorrido mostrado.</span>').addTo(markers);
 if(!end)return;
 // Mantener el trazado por calles hacia la ubicación posterior; no unir los puntos con una recta.
 try{
  const coords=end.lng+','+end.lat+';'+next.lng+','+next.lat;
  const url='https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=full&geometries=geojson&steps=false';
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
  let response;try{response=await fetch(url,{signal:ctrl.signal})}finally{clearTimeout(timeout)}
  if(!response.ok)throw Error('Servicio de rutas no disponible');
  const result=await response.json();
  if(result.code!=='Ok'||!result.routes?.[0]?.geometry?.coordinates?.length)throw Error('No se encontró una ruta vial');
  if(version!==traceVersion||!markers)return;
  const road=result.routes[0].geometry.coordinates.map(c=>({lat:c[1],lng:c[0]}));
  L.polyline(road,{color:'#ffffff',weight:9,opacity:0.96,lineJoin:'round',lineCap:'round'}).addTo(markers);
  L.polyline(road,{color:'#087f8c',weight:6,opacity:0.99,lineJoin:'round',lineCap:'round'}).bindPopup('Recorrido por calles hasta el último evento GPS; fin del recorrido').addTo(markers);
  const bounds=L.latLngBounds([...gps.map(x=>[x.lat,x.lng]),...road.map(x=>[x.lat,x.lng]),[next.lat,next.lng]]);
  map.fitBounds(bounds,{padding:[28,28],maxZoom:13,animate:false});
 }catch(e){console.warn('No se pudo dibujar la continuación por calles; se conserva el marcador F sin dibujar una recta:',e)}
}
async function trace(id){
 stopPlayback();const version=++traceVersion;
 $('gmTripsEvents').textContent='Consultando trayectoria del viaje…';$('gmTripsPlayback').style.display='none';
 try{
 const data=await rpc('gm_reporte_trayecto',{p_viaje_id:id});
 // La ubicación posterior se consulta por separado y solo se agrega a la capa visual del mapa.
 try{const follow=await rpc('gm_reporte_ubicacion_posterior',{p_viaje_id:id});data.ubicacion_posterior=follow?.ubicacion_posterior||null;data.fin_viaje_mapa=follow?.fin_viaje||null;}catch(e){console.warn('Ubicación posterior no disponible:',e)}
 if(version!==traceVersion)return;
 await showTrace(data,version);
 }catch(e){if(version===traceVersion&&$('gmTripsEvents'))$('gmTripsEvents').textContent='Error de recorrido: '+(e.message||e)}
}
function parseGMDate(v){if(!v)return null;const s=String(v).trim();const d=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(s)?new Date(s+'Z'):new Date(s);return Number.isNaN(d.getTime())?null:d}
function fmtChrono(v){if(!v)return 'Hora no disponible';const d=parseGMDate(v);return !d?String(v):d.toLocaleString('es-MX',{timeZone:'America/Hermosillo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})}
function renderGeofencesPanel(data,gps,events){
  const trip=selectedTrip||{};
  const start=data.salida_viaje||trip.salida||data.inicio_viaje||trip.first_seen||(gps[0]&&gps[0].time)||null;
  const end=data.fin_viaje||trip.ended_at||(gps.length?gps[gps.length-1].time:null);
  const startDate=start?parseGMDate(start):null,endDate=end?parseGMDate(end):null;
  // El RPC ya entrega los eventos de historial acotados al intervalo real del viaje.
  // No volver a filtrarlos con las horas resumidas del viaje: puede ocultar salidas válidas.
  const eventTime=e=>e.fecha||e.gpsAt||e.time||e.fecha_hora||null;
  const ordered=(events||[]).filter(e=>!!parseGMDate(eventTime(e))).slice().sort((a,b)=>(parseGMDate(eventTime(a))?.getTime()||0)-(parseGMDate(eventTime(b))?.getTime()||0));
  const tripName=trip.numero_viaje||trip.identificador_viaje||data.numero_viaje||data.identificador_viaje||'Viaje seleccionado';
  const range=startDate&&endDate?fmtChrono(start)+' — '+fmtChrono(end):'Intervalo registrado del recorrido';
  activeTraceGeofences=ordered;
  const nearestBoundaryGeo=(target)=>{
   if(!target)return null;
   const t=target.getTime();
   let best=null,delta=Infinity;
   ordered.forEach(e=>{
    const d=parseGMDate(eventTime(e));
    if(!d)return;
    const gap=Math.abs(d.getTime()-t);
    if(gap<delta){delta=gap;best=e}
   });
   // Solo asociar una geocerca cercana al inicio/cierre; no atribuir una de mucho antes o después.
   return delta<=15*60*1000?best:null;
  };
  const startGeo=ordered[0]||nearestBoundaryGeo(startDate);
  // Para el cierre: ubicar el evento más cercano a la hora de fin. Si el siguiente
  // evento de geocerca ocurre en menos de 2 minutos, usar ese; de lo contrario,
  // conservar la última geocerca registrada en el intervalo del recorrido.
  let endGeo=ordered[ordered.length-1]||nearestBoundaryGeo(endDate);
  if(endDate&&ordered.length){
   let closestIndex=0,closestGap=Infinity;
   ordered.forEach((e,i)=>{const d=parseGMDate(eventTime(e));if(!d)return;const gap=Math.abs(d.getTime()-endDate.getTime());if(gap<closestGap){closestGap=gap;closestIndex=i}});
   const candidate=ordered[closestIndex],next=ordered[closestIndex+1];
   const candidateTime=candidate&&parseGMDate(eventTime(candidate)),nextTime=next&&parseGMDate(eventTime(next));
   if(nextTime&&candidateTime&&nextTime.getTime()>=candidateTime.getTime()&&nextTime.getTime()-candidateTime.getTime()<120000)endGeo=next;
   else endGeo=ordered[ordered.length-1];
  }
  const geoName=e=>e?(e.nombre||e.geocerca||e.nombre_geocerca||'Geocerca registrada'):'Sin geocerca registrada';
  const boundaryTimes='<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;min-width:96px;text-align:right;font-size:9px;line-height:1.25;color:#e2e8f0;white-space:nowrap"><span><b style="color:#bbf7d0">Inicio</b> '+esc(start?fmtChrono(start):'—')+'</span><span><b style="color:#fecaca">Fin</b> '+esc(end?fmtChrono(end):'—')+'</span></div>';
  const boundaryGeofences='<div style="display:grid;grid-template-columns:minmax(0,1fr);gap:3px;margin-top:5px;font-size:9px;line-height:1.25"><div><b style="color:#bbf7d0">Geocerca inicial:</b> '+esc(geoName(startGeo))+'</div><div><b style="color:#fecaca">Geocerca final:</b> '+esc(geoName(endGeo))+'</div></div>';
  const cards=ordered.map((e,i)=>{
   const name=e.nombre||e.geocerca||e.nombre_geocerca||'Geocerca registrada';
   const event=e.evento||e.tipo_evento||e.tipo||'Registro de historial';
   const time=eventTime(e);
   return '<button type="button" data-geofence-index="'+i+'" title="Mostrar ubicación de la unidad a esta hora en el mapa" style="display:grid;grid-template-columns:24px minmax(0,1fr);gap:7px;align-items:start;padding:6px 7px;border:1px solid #dbe3ec;border-radius:7px;background:#fff;margin-top:5px;width:100%;text-align:left;cursor:pointer;color:inherit"><div style="width:23px;height:23px;border-radius:6px;background:#e6f4f1;color:#0f766e;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">'+(i+1)+'</div><div style="min-width:0"><div style="font-size:11px;font-weight:800;color:#0f172a;line-height:1.25;overflow-wrap:anywhere">'+esc(name)+'</div><div style="margin-top:2px;font-size:10px;color:#0f766e;font-weight:700;line-height:1.25">'+esc(event)+'</div><div style="margin-top:2px;font-size:9px;color:#64748b;line-height:1.2">'+esc(fmtChrono(time))+'</div></div></button>';
  }).join('');
  return '<section style="height:100%;min-height:0;display:flex;flex-direction:column;background:#f8fafc;border-radius:8px;padding:6px"><header style="padding:7px 8px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#115e59);color:#fff"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div style="min-width:0"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:800;opacity:.85">Historial del recorrido</div><div style="font-size:12px;font-weight:800;margin-top:3px;line-height:1.25">'+esc(tripName)+'</div></div>'+boundaryTimes+'</div>'+boundaryGeofences+'<div style="display:flex;align-items:baseline;gap:6px;margin-top:6px"><strong style="font-size:20px;line-height:1">'+ordered.length+'</strong><span style="font-size:11px;font-weight:700">geocercas registradas</span></div><div style="font-size:9px;line-height:1.3;opacity:.9;margin-top:4px">'+esc(range)+'</div></header><div style="font-size:9px;color:#64748b;line-height:1.3;margin:5px 2px 2px">Geocercas del historial dentro del intervalo del viaje.</div><div style="overflow:auto;min-height:0;flex:1;padding:0 1px 4px">'+(ordered.length?cards:'<div style="margin-top:10px;padding:18px 12px;text-align:center;border:1px dashed #cbd5e1;border-radius:12px;background:#fff"><div style="font-size:22px;color:#94a3b8">◎</div><div style="font-size:12px;font-weight:800;color:#334155;margin-top:6px">Sin geocercas en este intervalo</div><div style="font-size:11px;color:#64748b;margin-top:4px">No se encontraron registros de historial dentro del lapso del viaje.</div></div>')+'</div></section>';
}
function focusGeofenceAtTime(index){
 const event=activeTraceGeofences[index];
 if(!event||!map||!markers)return;
 const time=event.fecha||event.gpsAt||event.time,at=parseGMDate(time);
 if(!at||!activeTraceGps.length){
  if($('gmTripsStatus'))$('gmTripsStatus').textContent='No hay posiciones GPS del recorrido para ubicar la unidad a la hora de esta geocerca.';
  return;
 }
 let nearest=null,delta=Infinity;
 for(const p of activeTraceGps){const d=parseGMDate(p.time);if(!d)continue;const diff=Math.abs(d.getTime()-at.getTime());if(diff<delta){delta=diff;nearest=p}}
 if(!nearest){
  if($('gmTripsStatus'))$('gmTripsStatus').textContent='No se encontró una posición GPS con hora válida para esta geocerca.';
  return;
 }
 if(geofenceFocusMarker){markers.removeLayer(geofenceFocusMarker);geofenceFocusMarker=null}
 const name=event.nombre||event.geocerca||event.nombre_geocerca||'Geocerca registrada';
 const ev=event.evento||event.tipo_evento||event.tipo||'Evento';
 const seconds=Math.round(delta/1000);
 const deltaText=seconds<60?seconds+' s':Math.round(seconds/60)+' min';
 const icon=vehicleIcon(activeTraceData||{});
 geofenceFocusMarker=L.marker([nearest.lat,nearest.lng],{icon,zIndexOffset:2500})
  .bindPopup('<b>'+esc((activeTraceData&&activeTraceData.unidad)||'Unidad')+'</b><br>'+esc(name)+' · '+esc(ev)+'<br>Hora de geocerca: '+esc(fmtChrono(time))+'<br>GPS utilizado: '+esc(fmtChrono(nearest.time))+(seconds?' <br><small>Diferencia entre evento y GPS: '+esc(deltaText)+'</small>':''))
  .addTo(markers);
 map.setView([nearest.lat,nearest.lng],Math.max(map.getZoom(),14),{animate:false});
 geofenceFocusMarker.openPopup();
 if($('gmTripsStatus'))$('gmTripsStatus').textContent='Unidad ubicada en la posición GPS más cercana al evento de geocerca: '+fmtChrono(time)+'.';
}
function buildChronology(data,gps,events,statusRows){
 const trip=selectedTrip||{};
 const originIsFreig=String(trip.origen||data.origen||'').toUpperCase().includes('FREIG CARRILLO');
 const departure=data.salida_viaje||trip.salida||data.inicio_viaje||trip.first_seen||(gps[0]&&gps[0].time)||null;
 const arrival=data.fin_viaje||trip.ended_at||(gps.length?gps[gps.length-1].time:null);
 const startDate=departure?parseGMDate(departure):null,endDate=arrival?parseGMDate(arrival):null;
 // Los eventos ya vienen limitados por el historial persistido en gm_reporte_trayecto.
 // Mostrar Entrada y Salida tal como están registradas, sin descartar salidas por otro límite de hora.
 const eventTime=e=>e.fecha||e.gpsAt||e.time||e.fecha_hora||null;
 const ordered=(events||[]).filter(e=>!!parseGMDate(eventTime(e))).slice().sort((a,b)=>(parseGMDate(eventTime(a))?.getTime()||0)-(parseGMDate(eventTime(b))?.getTime()||0));
 const items=[];
 if(departure)items.push({time:departure,kind:'SALIDA',name:'Salida',detail:trip.origen||data.origen||''});
 ordered.forEach(e=>{const raw=String(e.evento||e.tipo_evento||e.tipo||'').trim();const isExit=/salida|exit|out|fuera/i.test(raw);const isEntry=/entrada|entry|enter|ingreso/i.test(raw);items.push({time:eventTime(e),kind:isExit?'GEOFENCE_EXIT':isEntry?'GEOFENCE_ENTRY':'GEOCERCA',name:(isExit?'Salida de geocerca: ':isEntry?'Entrada a geocerca: ':'')+(e.nombre||e.geocerca||e.nombre_geocerca||'Geocerca registrada'),detail:raw||'Evento registrado'});});
 if(arrival)items.push({time:arrival,kind:data.perdido_api?'API_FIN':'ULTIMO_GPS',name:'Finalización / último registro del viaje',detail:'Cierre del ciclo de seguimiento; la hora de llegada real solo se considera confirmada si GM la proporcionó'});
 items.sort((a,b)=>(parseGMDate(a.time)?.getTime()||0)-(parseGMDate(b.time)?.getTime()||0));
 if(!items.length)return '<div style="padding:8px;color:#64748b">No hay horas ni geocercas registradas para este viaje.</div>';
 const elapsed=startDate&&endDate?Math.max(0,Math.round((endDate-startDate)/60000)):null;
 const duration=elapsed==null?'':(' · '+Math.floor(elapsed/60)+' h '+String(elapsed%60).padStart(2,'0')+' min');
 return '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin:2px 0 6px"><b style="font-size:13px">Viaje '+esc(trip.numero_viaje||trip.identificador_viaje||'')+'</b><span style="font-size:10px;color:#64748b">'+Math.max(0,items.length-(departure?1:0)-(arrival?1:0))+' geocercas'+esc(duration)+'</span></div>'+
 items.map(e=>'<div style="display:grid;grid-template-columns:65px 7px minmax(0,1fr);gap:6px;align-items:start;padding:4px 0;border-bottom:1px solid #edf2f7"><span style="font-size:10px;font-weight:800;color:'+(e.kind==='SALIDA'?'#15803d':e.kind==='API_FIN'||e.kind==='GEOFENCE_EXIT'?'#b91c1c':e.kind==='GEOFENCE_ENTRY'?'#047857':'#0369a1')+'">'+esc((parseGMDate(e.time)||new Date(e.time)).toLocaleTimeString('es-MX',{timeZone:'America/Hermosillo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}))+'</span><span style="width:7px;height:7px;margin-top:4px;border-radius:50%;background:'+(e.kind==='SALIDA'?'#16a34a':e.kind==='API_FIN'||e.kind==='GEOFENCE_EXIT'?'#dc2626':e.kind==='GEOFENCE_ENTRY'?'#059669':'#0284c7')+'"></span><div><b style="font-size:11px">'+esc(e.name)+'</b>'+(e.detail?'<div style="font-size:10px;color:#64748b">'+esc(e.detail)+'</div>':'')+'</div></div>').join('');
}
async function showTrace(data,version){
 try{
 activeTraceData=data;geofenceFocusMarker=null;
 const allGps=(data.puntos||[]).filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)).map(x=>({lat:Number(x.lat),lng:Number(x.lon),time:x.fecha})).sort((a,b)=>new Date(a.time)-new Date(b.time));const gps=allGps,events=(data.geocercas||[]),statusRows=(data.estatus_unidad||[]);activeTraceGps=gps;
  const geosHtml=renderGeofencesPanel(data,gps,events);
 await ensureTripsLeaflet();if(version!==traceVersion||!$('gmTripsMap'))return;
 if(!map){map=L.map('gmTripsMap').setView([29.1,-110.9],9);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19,crossOrigin:'anonymous'}).addTo(map)}
 if(window.CC_MIRROR_EXTERNAL&&!map._ccMirrorFullscreenControl){
  const fullControl=L.control({position:'topright'});
  fullControl.onAdd=function(){
   const wrap=L.DomUtil.create('div','leaflet-bar cc-mirror-map-fullscreen');
   const btn=L.DomUtil.create('button','',wrap);
   btn.type='button';btn.title='Ver trayecto en pantalla completa';btn.setAttribute('aria-label','Ver trayecto en pantalla completa');btn.textContent='⛶ Pantalla completa';
   btn.style.cssText='padding:9px 12px;border:0;background:#fff;color:#0f172a;font:700 12px Arial,sans-serif;cursor:pointer;white-space:nowrap;box-shadow:0 1px 5px #0002';
   L.DomEvent.disableClickPropagation(wrap);L.DomEvent.on(btn,'click',async function(ev){
    L.DomEvent.stop(ev);
    const el=map&&map.getContainer();if(!el)return;
    try{if(el._ccFallbackFullscreen){el.style.position='';el.style.inset='';el.style.width='';el.style.height='';el.style.zIndex='';el._ccFallbackFullscreen=false;btn.textContent='⛶ Pantalla completa';}else if(!document.fullscreenElement){if(el.requestFullscreen)await el.requestFullscreen();else {el.style.position='fixed';el.style.inset='0';el.style.width='100vw';el.style.height='100vh';el.style.zIndex='2147483647';el._ccFallbackFullscreen=true;btn.textContent='✕ Salir pantalla completa';}}else if(document.exitFullscreen)await document.exitFullscreen();}
    catch(err){console.warn('Pantalla completa del mapa no disponible:',err)}
    setTimeout(()=>{if(map)map.invalidateSize({animate:false})},120);
   });
   return wrap;
  };
  fullControl.addTo(map);map._ccMirrorFullscreenControl=fullControl;
  document.addEventListener('fullscreenchange',()=>{if(map)setTimeout(()=>map.invalidateSize({animate:false}),120)});
 }
 if(markers)markers.clearLayers();markers=L.featureGroup().addTo(map);playPath=[];playIndex=0;playLine=null;playMarker=null;
 if(gps.length){
  let detectedGaps=0,reconstructedGaps=0;
  const updateRouteCoverage=()=>{const el=$('gmTripsRouteCoverage');if(!el)return;const complete=reconstructedGaps>=detectedGaps;el.innerHTML=complete?'<b style="color:#166534">Recorrido completo visualmente</b> · '+detectedGaps+' interrupciones revisadas. Los tramos discontinuos se distinguen como estimados.':'<b style="color:#b45309">Recorrido incompleto</b> · '+reconstructedGaps+' de '+detectedGaps+' interrupciones pudieron reconstruirse por calles. No se inventa la parte faltante.';};
  const segments=[];let current=[gps[0]];
  for(let i=1;i<gps.length;i++){
   let gap=(new Date(gps[i].time)-new Date(gps[i-1].time))/1000;
   // Conservar los saltos razonables para que OSRM pueda reconstruirlos por calles. Separar solo interrupciones largas o saltos GPS grandes.
   const gapDistance=distanceMeters(gps[i-1],gps[i]);
   if(gap>300||gapDistance>5000){if((gap>300&&gapDistance>=150)||gapDistance>5000)detectedGaps++;if(current.length)segments.push(current);current=[gps[i]]}
   else current.push(gps[i]);
  }if(current.length)segments.push(current);
  // Dibujar la trayectoria GPS de inmediato. No esperar al servicio externo de ajuste a calles:
  // al seleccionar varios viajes, las solicitudes OSRM acumuladas dejaban el mapa sin pintar durante demasiado tiempo.
  const displaySegments=segments.map(seg=>({points:seg,matched:false}));
  const routeLayers=[];
  for(const item of displaySegments){
   const segment=item.points;
   if(segment.length===1){L.circleMarker(segment[0],{radius:4,color:'#075985',weight:2,fillColor:'#22d3ee',fillOpacity:1}).bindPopup('Posición GPS registrada: '+esc(segment[0].time||'Hora no disponible')).addTo(markers);routeLayers.push(null);continue;}
   // Dibujar todos los tramos GPS guardados sin esperar a servicios externos.
   const halo=L.polyline(segment,{color:'#ffffff',weight:9,opacity:0.96,lineJoin:'round',lineCap:'round'}).addTo(markers);
   const line=L.polyline(segment,{color:'#087f8c',weight:6,opacity:0.98,lineJoin:'round',lineCap:'round'}).addTo(markers);
   routeLayers.push({halo,line});
   addDirectionArrows(segment);
  }
  // Recuperar visualmente huecos razonables de telemetría mediante la red vial entre los GPS contiguos.
  // No se dibujan puentes para saltos imposibles o excesivamente largos.
  void (async()=>{
   for(let i=1;i<gps.length;i++){
    const a=gps[i-1],b=gps[i],dt=(Date.parse(b.time)-Date.parse(a.time))/1000,dist=distanceMeters(a,b),speed=dt>0?dist/dt*3.6:Infinity;
    if(!((dt>300||dist>5000)&&dist>=150&&dist<=15000&&speed>=2&&speed<=120))continue;
    try{
     const coords=a.lng+','+a.lat+';'+b.lng+','+b.lat;
     const response=await fetch('https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=full&geometries=geojson&steps=false');
     if(!response.ok)continue;const result=await response.json();
     if(version!==traceVersion||!markers)return;
     const line=result.routes?.[0]?.geometry?.coordinates;
     if(result.code!=='Ok'||!Array.isArray(line)||line.length<2)continue;
     const road=line.map(p=>[p[1],p[0]]);
     L.polyline(road,{color:'#ffffff',weight:9,opacity:.96,lineJoin:'round',lineCap:'round',dashArray:'7 5'}).bindPopup('Tramo estimado por calles entre dos registros GPS; hubo una interrupción de señal.').addTo(markers);
     L.polyline(road,{color:'#087f8c',weight:6,opacity:.98,lineJoin:'round',lineCap:'round',dashArray:'7 5'}).bindPopup('Tramo estimado por calles entre dos registros GPS; no es una lectura GPS continua.').addTo(markers);
     if((dt>300&&dist>=150)||dist>5000)reconstructedGaps++;updateRouteCoverage();
    }catch(e){console.warn('No se pudo reconstruir un hueco GPS por calles:',e)}
   }
  })();
  // Ajustar cada tramo a la red vial en segundo plano, sin bloquear el mapa ni el resto del reporte.
  void (async()=>{
   for(let idx=0;idx<displaySegments.length;idx++){
    const item=displaySegments[idx];
    if(item.points.length<2)continue;
    const snapped=await matchRoads(item.points);
    if(version!==traceVersion||!markers)return;
    if(!snapped||snapped.length<2)continue; // Si no hay coincidencia fiable, conserva el trazado GPS previo.
    item.points=snapped;item.matched=true;
    const layer=routeLayers[idx];
    if(layer){markers.removeLayer(layer.halo);markers.removeLayer(layer.line);}
    const halo=L.polyline(snapped,{color:'#ffffff',weight:9,opacity:0.96,lineJoin:'round',lineCap:'round'}).addTo(markers);
    const line=L.polyline(snapped,{color:'#087f8c',weight:6,opacity:0.99,lineJoin:'round',lineCap:'round'}).addTo(markers);
    routeLayers[idx]={halo,line};
    addDirectionArrows(snapped);
   }
   if(version!==traceVersion||!displaySegments.length)return;
   // Mantener la animación sobre la geometría vial cuando solo existe un tramo continuo.
   if(displaySegments.length===1&&displaySegments[0].matched){
    playPath=displaySegments[0].points.map((p,i,arr)=>({...p,time:segments[0][Math.round(i*(segments[0].length-1)/Math.max(1,arr.length-1))]?.time}));
    if(playLine)playLine.setLatLngs([]);
    if(playMarker&&playPath[0])playMarker.setLatLng(playPath[0]);
    if($('gmTripsEvents'))$('gmTripsEvents').textContent+=' · Ruta ajustada a calles';
   }
  })().catch(e=>console.warn('No se pudo ajustar la ruta a calles; se conserva el GPS:',e));
  const startIcon=L.divIcon({className:'',html:'<div style="width:28px;height:28px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 10px #0005;display:flex;align-items:center;justify-content:center;color:white;font-weight:900">S</div>',iconSize:[28,28],iconAnchor:[14,14]});
  const endIcon=L.divIcon({className:'',html:'<div style="width:28px;height:28px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 10px #0005;display:flex;align-items:center;justify-content:center;color:white;font-weight:900">F</div>',iconSize:[28,28],iconAnchor:[14,14]});
  L.marker(gps[0],{icon:startIcon}).bindPopup('Inicio GPS del recorrido: '+esc(gps[0].time)).addTo(markers);
  if(gps.length>1&&!data?.ubicacion_posterior)L.marker(gps[gps.length-1],{icon:endIcon}).bindPopup('Última posición GPS del intervalo: '+esc(gps[gps.length-1].time)).addTo(markers);
  if(gps.length>1){
   playPath=(displaySegments.length===1&&displaySegments[0].matched?displaySegments[0].points.map((p,i,arr)=>({...p,time:gps[Math.round(i*(gps.length-1)/Math.max(1,arr.length-1))]?.time})):gps);playLine=L.polyline([],{color:'#eab308',weight:5,opacity:.9}).addTo(markers);
   playMarker=L.marker(playPath[0]||gps[0],{icon:vehicleIcon(data),zIndexOffset:1000}).addTo(markers);
   $('gmTripsPlayback').style.display='flex';seekPlayback(0);
  }
  // La ubicación posterior se agrega exclusivamente al mapa, fuera del trayecto GPS del viaje.
  void addPostTripLocation(data,gps,version);
  // El reporte abre en el punto inicial del intervalo, no en la última ubicación actual.
  map.invalidateSize({animate:false});const routeBounds=L.latLngBounds(gps.map(p=>[p.lat,p.lng]));if(routeBounds.isValid()){if(gps.length>1)map.fitBounds(routeBounds,{padding:[28,28],maxZoom:13,animate:false});else map.setView(gps[0],13,{animate:false})}setTimeout(()=>{if(map&&$('gmTripsMap')){map.invalidateSize({animate:false});if(routeBounds.isValid()&&gps.length>1)map.fitBounds(routeBounds,{padding:[28,28],maxZoom:13,animate:false})}},120);
  const km=segments.reduce((total,seg)=>total+seg.slice(1).reduce((sum,p,i)=>sum+distanceMeters(seg[i],p)/1000,0),0);
  const startTime=gps[0]?.time?new Date(gps[0].time).toLocaleString('es-MX',{timeZone:'America/Hermosillo'}):'—';
  const endTime=gps[gps.length-1]?.time?new Date(gps[gps.length-1].time).toLocaleString('es-MX',{timeZone:'America/Hermosillo'}):'—';
  $('gmTripsEvents').innerHTML='<div style="display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin:8px 0 12px">'+
  '<div style="padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc"><div style="font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase">Distancia GPS Recorrida aprox.</div><b style="font-size:20px">'+km.toFixed(1)+' km</b></div></div>'+
  '<div id="gmTripsRouteCoverage" style="font-size:11px;padding:8px;margin:7px 0;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0">Verificando continuidad del recorrido…</div>'+geosHtml;
  updateRouteCoverage();
 }else{
 // Sin puntos dentro del período solicitado no mostramos la ubicación actual como si perteneciera al reporte.
 const last=data.ultimo_gps_unidad?new Date(data.ultimo_gps_unidad):null;
 const start=data.inicio_viaje?new Date(data.inicio_viaje):null;
 const hh=d=>d.toLocaleString('es-MX',{timeZone:'America/Hermosillo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true});
 const before=last&&start&&last<start;
 $('gmTripsEvents').innerHTML='<b>Cronología del viaje</b><div style="margin-top:8px">El reporte todavía no tiene posiciones GPS suficientes para dibujar el recorrido. '+(last?'Último GPS conocido: <b>'+esc(hh(last))+'</b>. ':'')+(before?'Esta lectura es anterior al inicio del viaje ('+esc(hh(start))+').':'Se necesitan nuevas coordenadas GPS para reconstruir el trayecto.')+'</div>'+renderGeofencesPanel(data,gps,events);
}
 }catch(e){if(version===traceVersion&&$('gmTripsEvents'))$('gmTripsEvents').textContent='Error de recorrido: '+(e.message||e)}
}

window.gmTripReportOpen=open;
new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();