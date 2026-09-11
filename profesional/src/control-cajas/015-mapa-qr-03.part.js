window.ccVerUbicacionesUnidad=async function(id){
 const u=cajas.find(x=>x.id===id);if(!u)return;
 try{
  showStatus?.('Consultando ubicación actual e historial...','info');
  await ccEnsureLeaflet();
  const {data,error}=await gmSupabase.rpc('cc_ultimas_ubicaciones',{p_unidad_id:id});
  if(error)throw error;
  const rows=(Array.isArray(data&&data.registros)?data.registros:[]).slice(0,5);
  document.getElementById('ccLocationHistoryModal')?.remove();
  const ov=document.createElement('div');ov.id='ccLocationHistoryModal';ov.className='cc-location-modal';
  const bodyRows=rows.map((r,i)=>{
   const lat=Number(r.latitud),lng=Number(r.longitud),g=ccGeocercaDePunto(lat,lng);
   const dir=String(r.direccion||r.address||r.displayName||'').trim()||ccLeerDireccionCache(lat,lng);
   const lugar=g?'<strong style="color:#166534"><i class="fa-solid fa-draw-polygon"></i> '+esc(g.nombre)+'</strong>':(dir?esc(dir):'<span data-cc-hist-dir="'+i+'" style="color:#64748b">Consultando dirección…</span>');
   return '<tr><td>'+(i+1)+'</td><td>'+esc(new Date(r.fechaHora).toLocaleString())+'</td><td style="min-width:240px;white-space:normal">'+lugar+'</td><td>'+(r.precisionMetros==null?'—':Math.round(Number(r.precisionMetros))+' m')+'</td><td>'+lat.toFixed(5)+', '+lng.toFixed(5)+'</td><td><a class="cc-btn cc-btn-light" target="_blank" rel="noopener" href="https://www.google.com/maps?q='+encodeURIComponent(lat+','+lng)+'">Ver mapa</a></td></tr>';
  }).join('');
  ov.innerHTML='<div class="cc-location-card" style="width:min(1050px,97vw);max-height:94vh;overflow:auto"><div class="cc-location-head"><strong>UBICACIÓN ACTUAL + ÚLTIMAS 5 · '+esc(u.numero||u.descripcion||'UNIDAD')+'</strong><button class="cc-location-close" type="button">×</button></div><div class="cc-location-body"><div class="cc-location-summary"><span class="cc-location-pill">'+rows.length+' ubicaciones disponibles</span>'+(rows[0]?'<span class="cc-location-pill"><b>Actual:</b> '+esc(new Date(rows[0].fechaHora).toLocaleString())+'</span>':'')+'</div><div id="ccUnitHistoryMap" style="height:360px;border:1px solid #dbe4ef;border-radius:12px;margin-bottom:12px"></div><div class="cc-inv-wrap"><table class="cc-location-history" style="min-width:900px"><thead><tr><th>#</th><th>Fecha / hora</th><th>Geocerca / Dirección</th><th>Precisión</th><th>Coordenadas</th><th>Mapa</th></tr></thead><tbody>'+(rows.length?bodyRows:'<tr><td colspan="6" style="padding:28px;text-align:center;color:#94a3b8">Esta unidad todavía no tiene ubicaciones registradas.</td></tr>')+'</tbody></table></div></div></div>';
  document.body.appendChild(ov);

  let map=null;
  if(rows.length){
   map=L.map('ccUnitHistoryMap',{preferCanvas:true,zoomControl:true});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
   const pts=[];
   rows.forEach((r,i)=>{
    const lat=Number(r.latitud),lng=Number(r.longitud);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
    pts.push([lat,lng]);
    const m=L.circleMarker([lat,lng],{radius:i===0?10:7,weight:i===0?4:2,fillOpacity:.8}).addTo(map);
    const g=ccGeocercaDePunto(lat,lng);
    m.bindPopup('<div style="font-family:Arial;font-size:12px"><b>'+(i===0?'UBICACIÓN ACTUAL':'UBICACIÓN #'+(i+1))+'</b><br>'+esc(new Date(r.fechaHora).toLocaleString())+'<br>'+(g?'<b>Geocerca:</b> '+esc(g.nombre):'Fuera de geocerca')+'</div>');
   });
   if(pts.length>1){L.polyline(pts,{weight:3,opacity:.55,dashArray:'6,6'}).addTo(map);map.fitBounds(pts,{padding:[30,30],maxZoom:16});}
   else if(pts.length===1)map.setView(pts[0],15);
   (configuracion.geocercas||[]).forEach((g,i)=>{if(g.activa===false)return;const lyr=ccGeocercaToLayer(g,i);if(lyr)lyr.addTo(map);});
   setTimeout(()=>map.invalidateSize(),120);
  }else{
   const me=document.getElementById('ccUnitHistoryMap');if(me)me.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8">Sin ubicaciones registradas</div>';
  }

  ov.querySelector('.cc-location-close').onclick=()=>{try{if(map)map.remove();}catch(_){}ov.remove();};

  rows.forEach(async(r,i)=>{
   const lat=Number(r.latitud),lng=Number(r.longitud);
   if(ccGeocercaDePunto(lat,lng))return;
   if(String(r.direccion||r.address||r.displayName||'').trim()||ccLeerDireccionCache(lat,lng))return;
   const dir=await ccReverseGeocode(lat,lng);
   const el=ov.querySelector('[data-cc-hist-dir="'+i+'"]');if(el)el.textContent=dir||'Dirección no disponible';
  });
  showStatus?.('Ubicación actual e historial cargados','success');
 }catch(err){
  console.error('ULTIMAS UBICACIONES:',err);
  alert('No se pudieron cargar las ubicaciones.\n\n'+(err.message||err));
 }
};


let ccMapaUnidadesRows=[];
let ccMapaUnidadesMarkers=new Map();
let ccMapaSearchTimer=null;
let ccGeocercasLayerGroup=null;
let ccGeocercasVisibles=true;
let ccLeafletDrawControl=null;
let ccDrawCreatedHandler=null;

window.ccEnsureGeoLibraries=async function(){
  await ccEnsureLeaflet();
  const loadCss=(href,id)=>new Promise((resolve,reject)=>{if(document.getElementById(id))return resolve();const e=document.createElement('link');e.id=id;e.rel='stylesheet';e.href=href;e.onload=resolve;e.onerror=reject;document.head.appendChild(e)});
  const loadJs=(src,id)=>new Promise((resolve,reject)=>{if(document.getElementById(id))return resolve();const e=document.createElement('script');e.id=id;e.src=src;e.onload=resolve;e.onerror=reject;document.head.appendChild(e)});
  if(!window.L?.Control?.Draw){await loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css','ccLeafletDrawCss');await loadJs('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js','ccLeafletDrawJs');}
  if(!window.toGeoJSON)await loadJs('https://cdn.jsdelivr.net/npm/@tmcw/togeojson@6.0.1/dist/togeojson.umd.js','ccToGeoJSON');
  if(!window.JSZip)await loadJs('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','ccJSZip');
};

function ccGeoPointInRing(lat,lng,ring){
  if(!Array.isArray(ring)||ring.length<3)return false;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j]; const xi=Number(a[1]),yi=Number(a[0]),xj=Number(b[1]),yj=Number(b[0]);
    const intersect=((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/((yj-yi)||1e-15)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}
function ccGeoDistMeters(lat1,lng1,lat2,lng2){const R=6371000,toRad=x=>x*Math.PI/180;const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function ccGeocercaContiene(g,lat,lng){
  if(g.tipo==='circle')return ccGeoDistMeters(lat,lng,Number(g.centro?.[0]),Number(g.centro?.[1]))<=Number(g.radio||0);
  const rings=g.coordenadas||[]; if(!rings.length)return false;
  if(!ccGeoPointInRing(lat,lng,rings[0]))return false;
  for(let i=1;i<rings.length;i++)if(ccGeoPointInRing(lat,lng,rings[i]))return false;
  return true;
}
function ccGeocercaDePunto(lat,lng){return (configuracion.geocercas||[]).find(g=>g.activa!==false&&ccGeocercaContiene(g,lat,lng))||null;}
function ccGeoColor(i){const c=['#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#db2777','#4f46e5','#65a30d'];return c[i%c.length];}
function ccGeocercaToLayer(g,i=0){
  if(!window.L)return null;const color=g.color||ccGeoColor(i),opt={color,weight:2,fillColor:color,fillOpacity:.12};let layer=null;
  if(g.tipo==='circle')layer=L.circle([Number(g.centro?.[0]),Number(g.centro?.[1])],{...opt,radius:Number(g.radio||100)});
  else if(Array.isArray(g.coordenadas?.[0]))layer=L.polygon(g.coordenadas,opt);
  if(layer){layer.bindPopup(`<div style="font-family:Arial;font-size:12px"><b>${esc(g.nombre||'Geocerca')}</b><br><span style="color:#64748b">${esc(g.tipo||'polígono')}</span></div>`);layer.ccGeocercaId=g.id;}
  return layer;
}
function ccRenderGeocercasMapa(){
  const map=ccMapaUnidadesInstance;if(!map)return;
  if(ccGeocercasLayerGroup){try{map.removeLayer(ccGeocercasLayerGroup)}catch(_){}}
  ccGeocercasLayerGroup=L.layerGroup();
  (configuracion.geocercas||[]).forEach((g,i)=>{if(g.activa===false)return;const layer=ccGeocercaToLayer(g,i);if(layer)layer.addTo(ccGeocercasLayerGroup)});
  if(ccGeocercasVisibles)ccGeocercasLayerGroup.addTo(map);
  ccRenderGeocercasLista();
}
