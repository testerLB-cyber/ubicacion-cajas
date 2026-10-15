(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let map=null,markers=null,rows=[],playTimer=null,playPath=[],playIndex=0,playMarker=null,playLine=null,traceVersion=0,selectedTrip=null;
const date=d=>{const p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
function inject(){
 const bar=$('airHistoryBtn')?.parentElement;if(!bar||bar.querySelector('#gmTripReportButton'))return;
 const btn=document.createElement('button');btn.type='button';btn.id='gmTripReportButton';btn.className='airFullBtn';btn.innerHTML='<i class="fa-solid fa-route"></i> Reporte de viajes';bar.insertBefore(btn,$('airHistoryBtn'));
 btn.onclick=open;
}
function open(){
 if(window.CC_MIRROR_EXTERNAL&&!window.CC_MIRROR_PERMISSIONS?.reporte_viajes)return;
 if(!$('gmTripReportModal')){
 const m=document.createElement('div');m.id='gmTripReportModal';m.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0f172acb;display:flex;justify-content:center;align-items:center;padding:12px';
 m.innerHTML='<section id="gmTripsModalPanel" role="dialog" aria-modal="true" aria-label="Reporte de viajes" style="width:min(1800px,99vw);height:96vh;overflow:hidden;background:#fff;border-radius:16px;padding:12px 14px;color:#0f172a;box-shadow:0 22px 80px #0005;display:flex;flex-direction:column;min-height:0">'+
 '<header id="gmTripsModalHeader" style="flex-shrink:0;z-index:900;background:#fff;padding:5px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0"><div><h2 style="font-size:20px;font-weight:800;margin:0">Reporte de viajes</h2><p style="margin:4px 0 0;color:#64748b;font-size:12px">Viajes registrados, eventos y posiciones GPS verificadas</p></div><button id="gmTripsClose" type="button" aria-label="Cerrar reporte de viajes" style="display:inline-flex;align-items:center;gap:7px;border:0;border-radius:10px;background:#dc2626;color:white;padding:11px 18px;font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0">✕ Cerrar</button></header>'+
 '<div id="gmTripsTripFilters" style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:15px 0"><label>Desde <input id="gmTripsFrom" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Hasta <input id="gmTripsTo" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Cliente <select id="gmTripsClient" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;max-width:260px"><option value="">Todos los clientes</option></select></label><button id="gmTripsSearch" type="button" class="airFullBtn" style="background:#0f766e;color:#fff">Consultar viajes</button></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-bottom:12px"><label style="display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc;font-weight:700"><input id="gmTripsShowTransit" type="checkbox" style="accent-color:#0f766e"> Mostrar viajes en tránsito</label><label id="gmTripsFindWrap">Buscar número de viaje <input id="gmTripsFind" type="search" placeholder="Ej. 80564" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;width:180px"></label><label>Consultar por <select id="gmTripsMode" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"><option value="VIAJES">Viajes</option><option value="HORAS">Unidad y horario</option></select></label><div id="gmTripsHours" style="display:none;gap:7px;flex-wrap:wrap;align-items:end;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc"><label>Unidad <input id="gmTripsUnit" placeholder="Ej. LB14" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px;width:110px"></label><label>Desde <input type="datetime-local" id="gmTripsHourFrom" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Hasta <input type="datetime-local" id="gmTripsHourTo" style="display:block;padding:9px;border:1px solid #cbd5e1;border-radius:8px"></label><button id="gmTripsHoursGo" type="button" class="airFullBtn">Ver recorrido por horas</button></div></div>'+ '<p id="gmTripsStatus" style="font-size:12px;color:#475569"></p><div style="display:grid;grid-template-columns:minmax(230px,0.82fr) minmax(360px,1.2fr) minmax(360px,1.15fr);gap:10px;flex:1;min-height:0;overflow:hidden" id="gmTripsLayout"><div id="gmTripsResults" style="overflow:auto;min-height:0;border:1px solid #e2e8f0;border-radius:10px"></div><div id="gmTripsMap" style="height:100%;min-height:0;border-radius:10px;background:#e2e8f0"></div><div id="gmTripsEvents" style="overflow:hidden;min-height:0;border:1px solid #e2e8f0;border-radius:10px;padding:8px;font-size:12px;color:#475569">Selecciona un viaje para ver su cronología completa.</div></div>'+
 '<div id="gmTripsPlayback" style="display:none;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;flex-shrink:0"><button type="button" id="gmTripsPlay" style="border:0;border-radius:8px;background:#0f766e;color:white;padding:9px 15px;font-weight:700;cursor:pointer">▶ Reproducir</button><button type="button" id="gmTripsPause" class="airFullBtn">⏸ Pausar</button><button type="button" id="gmTripsReset" class="airFullBtn">↺ Reiniciar</button><label style="font-size:12px">Velocidad <select id="gmTripsSpeed"><option value="1">1×</option><option value="2">2×</option><option value="5" selected>5×</option><option value="10">10×</option></select></label><label style="font-size:12px;display:inline-flex;align-items:center;gap:5px"><input id="gmTripsFollow" type="checkbox" checked> Seguir unidad</label><button type="button" id="gmTripsMp4" class="airFullBtn">🎞 Descargar animación GIF</button><input type="range" id="gmTripsProgress" value="0" min="0" max="100" style="flex:1;min-width:120px" aria-label="Posición del recorrido"><span id="gmTripsTime" style="font-size:11px;color:#475569"></span></div>'+ '<footer style="flex-shrink:0;border-top:1px solid #e2e8f0;padding:7px 0 0;margin-top:7px;display:flex;justify-content:flex-end"><button type="button" id="gmTripsCloseBottom" style="background:#0f172a;color:white;padding:11px 22px;border:0;border-radius:9px;font-weight:800;cursor:pointer">Cerrar reporte</button></footer>'+ '<style>#gmTripsTripFilters{flex-shrink:0;margin:8px 0!important}#gmTripsLayout{flex:1;min-height:0}#gmTripsMap{height:100%!important}@media(max-width:1000px){#gmTripsLayout{grid-template-columns:minmax(180px,.7fr) minmax(280px,1fr)!important}#gmTripsEvents{grid-column:1/-1;max-height:220px}#gmTripsMap{min-height:360px!important}}@media(max-width:650px){#gmTripsLayout{grid-template-columns:1fr!important;overflow:auto!important}#gmTripsResults{max-height:180px}#gmTripsMap{height:300px!important;min-height:300px!important}#gmTripsEvents{max-height:300px}}</style></section>';
 document.body.appendChild(m);
 if(window.CC_MIRROR_EXTERNAL){
  const clientFilter=$('gmTripsClient')?.closest('label');if(clientFilter)clientFilter.style.display='none';
  const scope=document.createElement('div');scope.id='gmTripsMirrorScope';scope.style.cssText='padding:8px 11px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e40af;border-radius:9px;font-size:12px;font-weight:700;margin:8px 0';scope.textContent='Cuenta espejo · Reporte limitado automáticamente a los viajes del cliente asignado.';
  $('gmTripsTripFilters')?.after(scope);
  const heading=$('gmTripsModalHeader')?.querySelector('p');if(heading)heading.textContent='Viajes del cliente asignado · eventos y posiciones GPS verificadas';
 }
 const closeReport=()=>{stopPlayback();traceVersion++;if(map){map.remove();map=null}markers=null;m.remove()};$('gmTripsClose').onclick=closeReport;$('gmTripsCloseBottom').onclick=closeReport;m.addEventListener('click',e=>{if(e.target===m)closeReport()});
 $('gmTripsSearch').onclick=search;$('gmTripsFind').oninput=renderTrips;$('gmTripsShowTransit').onchange=renderTrips;$('gmTripsMode').onchange=syncMode;$('gmTripsClient').onchange=renderTrips;$('gmTripsHoursGo').onclick=traceHours;$('gmTripsPlay').onclick=startPlayback;$('gmTripsPause').onclick=stopPlayback;$('gmTripsReset').onclick=()=>{stopPlayback();seekPlayback(0)};$('gmTripsMp4').onclick=exportTripMp4;$('gmTripsProgress').oninput=e=>{stopPlayback();seekPlayback(Number(e.target.value)/100)};
 const end=new Date(),today=date(end);const local=d=>date(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');$('gmTripsHourTo').value=local(end);const before=new Date(end.getTime()-2*3600000);$('gmTripsHourFrom').value=local(before);$('gmTripsTo').value=today;$('gmTripsFrom').value=today;
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
 $('gmTripsLayout').style.gridTemplateColumns=hourly?'minmax(0,1fr)':'minmax(230px,0.82fr) minmax(360px,1.2fr) minmax(360px,1.15fr)';
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
 const q=String($('gmTripsFind')?.value||'').trim().toLowerCase();
 const showTransit=!!$('gmTripsShowTransit')?.checked;
 const filtered=rows.filter(x=>{const finished=!!x.ended_at;const inTransit=!x.ended_at;return (finished||(showTransit&&inTransit))&&(!client||String(x.cliente||'').trim()===client)&&(!q||[x.numero_viaje,x.identificador_viaje,x.unidad,x.cliente].some(v=>String(v||'').toLowerCase().includes(q)))});
 $('gmTripsResults').innerHTML=filtered.map(x=>'<button type="button" data-trip="'+x.id+'" style="display:block;width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid #e2e8f0;padding:12px;cursor:pointer"><b>'+esc(x.unidad)+'</b> · '+esc(x.numero_viaje||x.identificador_viaje||'Sin folio')+'<br><span style="font-size:11px;color:#64748b">'+esc(x.cliente||'')+'</span><br><span style="font-size:11px">'+esc(x.origen||'—')+' → '+esc(x.destino||'—')+'</span><br><span style="font-size:11px;color:#475569">Estado: '+(x.ended_at?'FINALIZADO':'EN SEGUIMIENTO')+' · Inicio: '+esc(String(x.salida||x.first_seen||'').slice(0,16).replace('T',' '))+'</span></button>').join('')||'<p style="padding:14px;color:#64748b">No se encontraron viajes para este período.</p>';
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
function buildChronology(data,gps,events,statusRows){
 const trip=selectedTrip||{};
 const originIsFreig=String(trip.origen||data.origen||'').toUpperCase().includes('FREIG CARRILLO');
 const departure=data.salida_viaje||trip.salida||data.inicio_viaje||trip.first_seen||(gps[0]&&gps[0].time)||null;
 const arrival=data.fin_viaje||trip.ended_at||(gps.length?gps[gps.length-1].time:null);
 const startDate=departure?parseGMDate(departure):null,endDate=arrival?parseGMDate(arrival):null;
 const within=(e)=>{const d=parseGMDate(e.fecha||e.gpsAt||e.time);return !!d&&(!startDate||d>=startDate)&&(!endDate||d<=endDate)};
 const ordered=(events||[]).filter(within).slice().sort((a,b)=>(parseGMDate(a.fecha)?.getTime()||0)-(parseGMDate(b.fecha)?.getTime()||0));
 const items=[];
 if(departure)items.push({time:departure,kind:'SALIDA',name:'Salida',detail:trip.origen||data.origen||''});
 ordered.forEach(e=>items.push({time:e.fecha,kind:'GEOCERCA',name:e.nombre||e.geocerca||'Geocerca registrada',detail:e.evento||e.tipo_evento||'Paso registrado'}));
 if(arrival)items.push({time:arrival,kind:data.perdido_api?'API_FIN':'ULTIMO_GPS',name:'Finalización / último registro del viaje',detail:'Cierre del ciclo de seguimiento; la hora de llegada real solo se considera confirmada si GM la proporcionó'});
 items.sort((a,b)=>(parseGMDate(a.time)?.getTime()||0)-(parseGMDate(b.time)?.getTime()||0));
 if(!items.length)return '<div style="padding:8px;color:#64748b">No hay horas ni geocercas registradas para este viaje.</div>';
 const elapsed=startDate&&endDate?Math.max(0,Math.round((endDate-startDate)/60000)):null;
 const duration=elapsed==null?'':(' · '+Math.floor(elapsed/60)+' h '+String(elapsed%60).padStart(2,'0')+' min');
 return '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin:2px 0 6px"><b style="font-size:13px">Viaje '+esc(trip.numero_viaje||trip.identificador_viaje||'')+'</b><span style="font-size:10px;color:#64748b">'+Math.max(0,items.length-(departure?1:0)-(arrival?1:0))+' geocercas'+esc(duration)+'</span></div>'+
 items.map(e=>'<div style="display:grid;grid-template-columns:65px 7px minmax(0,1fr);gap:6px;align-items:start;padding:4px 0;border-bottom:1px solid #edf2f7"><span style="font-size:10px;font-weight:800;color:'+(e.kind==='SALIDA'?'#15803d':e.kind==='API_FIN'?'#b91c1c':'#0369a1')+'">'+esc((parseGMDate(e.time)||new Date(e.time)).toLocaleTimeString('es-MX',{timeZone:'America/Hermosillo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}))+'</span><span style="width:7px;height:7px;margin-top:4px;border-radius:50%;background:'+(e.kind==='SALIDA'?'#16a34a':e.kind==='API_FIN'?'#dc2626':'#0284c7')+'"></span><div><b style="font-size:11px">'+esc(e.name)+'</b>'+(e.detail?'<div style="font-size:10px;color:#64748b">'+esc(e.detail)+'</div>':'')+'</div></div>').join('');
}
async function showTrace(data,version){
 try{
 const allGps=(data.puntos||[]).filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)).map(x=>({lat:Number(x.lat),lng:Number(x.lon),time:x.fecha})).sort((a,b)=>new Date(a.time)-new Date(b.time));const gps=allGps,events=(data.geocercas||[]),statusRows=(data.estatus_unidad||[]);
 const geosHtml=(events.length?'<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px"><b>Geocercas registradas por GM ('+events.length+'):</b>'+events.map(e=>'<div style="padding:5px 0;border-bottom:1px solid #f1f5f9">'+esc(e.nombre)+' · '+esc(e.evento)+' · '+esc(e.fecha)+'</div>').join('')+'</div>':'<div style="margin-top:10px;color:#64748b">No hay eventos de geocercas registrados para este intervalo.</div>')+(statusRows.length?'<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px"><b>Historial de estatus de la unidad ('+statusRows.length+'):</b>'+statusRows.slice(-80).reverse().map(e=>'<div style="display:grid;grid-template-columns:150px minmax(90px,1fr) minmax(90px,1fr);gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9"><span>'+esc(String(e.fecha||e.gpsAt||'').slice(0,19).replace('T',' '))+'</span><span>'+esc(e.estatusGps||'Sin estatus GPS')+(e.estatusViaje?' · '+esc(e.estatusViaje):'')+'</span><span>'+esc(e.evento||'Sin evento')+'</span></div>').join('')+'</div>':'<div style="margin-top:10px;color:#64748b">Aún no hay lecturas de estatus guardadas para este intervalo.</div>');
 await ensureTripsLeaflet();if(version!==traceVersion||!$('gmTripsMap'))return;
 if(!map){map=L.map('gmTripsMap').setView([29.1,-110.9],9);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19,crossOrigin:'anonymous'}).addTo(map)}
 if(markers)markers.clearLayers();markers=L.featureGroup().addTo(map);playPath=[];playIndex=0;playLine=null;playMarker=null;
 if(gps.length){
  const segments=[];let current=[gps[0]];
  for(let i=1;i<gps.length;i++){
   let gap=(new Date(gps[i].time)-new Date(gps[i-1].time))/1000;
   if(gap>90||distanceMeters(gps[i-1],gps[i])>1800){if(current.length>1)segments.push(current);current=[gps[i]]}
   else current.push(gps[i]);
  }if(current.length>1)segments.push(current);
  // Dibujar la trayectoria GPS de inmediato. No esperar al servicio externo de ajuste a calles:
  // al seleccionar varios viajes, las solicitudes OSRM acumuladas dejaban el mapa sin pintar durante demasiado tiempo.
  const displaySegments=segments.map(seg=>({points:seg,matched:false}));
  const routeLayers=[];
  for(const item of displaySegments){
   const segment=item.points;
   // Primero mostramos GPS al instante; luego sustituimos por geometría ajustada a calles reales.
   const halo=L.polyline(segment,{color:'#ffffff',weight:9,opacity:0.96,lineJoin:'round',lineCap:'round'}).addTo(markers);
   const line=L.polyline(segment,{color:'#087f8c',weight:6,opacity:0.98,lineJoin:'round',lineCap:'round'}).addTo(markers);
   routeLayers.push({halo,line});
   addDirectionArrows(segment);
  }
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
  map.invalidateSize({animate:false});map.setView(gps[0],13,{animate:false});setTimeout(()=>{if(map&&$('gmTripsMap'))map.invalidateSize({animate:false})},80);
  const km=segments.reduce((total,seg)=>total+seg.slice(1).reduce((sum,p,i)=>sum+distanceMeters(seg[i],p)/1000,0),0);
  const startTime=gps[0]?.time?new Date(gps[0].time).toLocaleString('es-MX',{timeZone:'America/Hermosillo'}):'—';
  const endTime=gps[gps.length-1]?.time?new Date(gps[gps.length-1].time).toLocaleString('es-MX',{timeZone:'America/Hermosillo'}):'—';
  $('gmTripsEvents').innerHTML='<div style="display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin:8px 0 12px">'+
  '<div style="padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc"><div style="font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase">Distancia GPS Recorrida aprox.</div><b style="font-size:20px">'+km.toFixed(1)+' km</b></div></div>'+
  '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:8px 0 12px;font-size:11px"><span><i style="display:inline-block;width:18px;border-top:3px dashed #64748b;margin-right:5px"></i>Trayectoria GPS registrada</span><span style="color:#0f766e;font-weight:800">➤ Dirección de avance</span></div>'+
  '<div style="font-size:10px;color:#64748b;margin-bottom:5px">Trayecto considerado: desde la salida registrada en GM hasta que el viaje desapareció de la API; si sigue activo, hasta el último GPS disponible. Distancia calculada a partir de posiciones GPS registradas · '+km.toFixed(1)+' km aprox.</div>'+buildChronology(data,gps,events,statusRows);
 }else{
 // Sin puntos dentro del período solicitado no mostramos la ubicación actual como si perteneciera al reporte.
 const last=data.ultimo_gps_unidad?new Date(data.ultimo_gps_unidad):null;
 const start=data.inicio_viaje?new Date(data.inicio_viaje):null;
 const hh=d=>d.toLocaleString('es-MX',{timeZone:'America/Hermosillo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true});
 const before=last&&start&&last<start;
 $('gmTripsEvents').innerHTML='<b>Cronología del viaje</b><div style="margin-top:8px">El reporte todavía no tiene posiciones GPS suficientes para dibujar el recorrido. '+(last?'Último GPS conocido: <b>'+esc(hh(last))+'</b>. ':'')+(before?'Esta lectura es anterior al inicio del viaje ('+esc(hh(start))+').':'Se necesitan nuevas coordenadas GPS para reconstruir el trayecto.')+'</div>'+buildChronology(data,gps,events,statusRows);
}
 }catch(e){if(version===traceVersion&&$('gmTripsEvents'))$('gmTripsEvents').textContent='Error de recorrido: '+(e.message||e)}
}

window.gmTripReportOpen=open;
new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();