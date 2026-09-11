window.ccRenderGeocercasLista=function(){
  const el=document.getElementById('ccGeocercasLista'),count=document.getElementById('ccGeoCount');const arr=configuracion.geocercas||[];if(count)count.textContent=arr.length;if(!el)return;
  el.innerHTML=arr.length?arr.map((g,i)=>`<div class="cc-geo-item"><div class="cc-geo-item-top"><div style="display:flex;align-items:center;gap:7px;min-width:0"><span class="cc-geo-dot" style="background:${esc(g.color||ccGeoColor(i))}"></span><span class="cc-geo-name" title="${esc(g.nombre)}">${esc(g.nombre||'Geocerca')}</span></div><div class="cc-geo-mini-actions"><button title="Ver" onclick="ccEnfocarGeocerca('${g.id}')"><i class="fa-solid fa-crosshairs"></i></button><button title="Editar" onclick="ccEditarGeocerca('${g.id}')"><i class="fa-solid fa-pen"></i></button><button title="Eliminar" onclick="ccEliminarGeocerca('${g.id}')"><i class="fa-solid fa-trash"></i></button></div></div><div class="cc-geo-type">${esc(g.tipo||'polygon')} · ${g.activa===false?'oculta':'activa'}</div></div>`).join(''):'<div class="cc-geo-empty"><i class="fa-solid fa-draw-polygon" style="font-size:24px;margin-bottom:8px"></i><br>No hay geocercas.<br>Dibuja una o importa KML/KMZ/GeoJSON.</div>';
};
window.ccToggleGeocercas=function(){
  ccGeocercasVisibles=!ccGeocercasVisibles;const map=ccMapaUnidadesInstance;if(map&&ccGeocercasLayerGroup){if(ccGeocercasVisibles)ccGeocercasLayerGroup.addTo(map);else map.removeLayer(ccGeocercasLayerGroup)}
  const b=document.getElementById('ccBtnToggleGeocercas');if(b)b.innerHTML=`<i class="fa-solid fa-layer-group mr-1"></i>${ccGeocercasVisibles?'Ocultar':'Mostrar'} geocercas`;
};
window.ccActivarDibujoGeocerca=async function(){
  if(!ccMapaUnidadesInstance){await ccCargarMapaUnidades();if(!ccMapaUnidadesInstance)return;}await ccEnsureGeoLibraries();
  if(ccLeafletDrawControl){try{ccMapaUnidadesInstance.removeControl(ccLeafletDrawControl)}catch(_){}}
  const drawn=new L.FeatureGroup().addTo(ccMapaUnidadesInstance);
  ccLeafletDrawControl=new L.Control.Draw({position:'topleft',edit:{featureGroup:drawn,edit:false,remove:false},draw:{polyline:false,marker:false,circlemarker:false,polygon:{showArea:true},rectangle:true,circle:true}});
  ccMapaUnidadesInstance.addControl(ccLeafletDrawControl);
  if(ccDrawCreatedHandler)ccMapaUnidadesInstance.off(L.Draw.Event.CREATED,ccDrawCreatedHandler);
  ccDrawCreatedHandler=async e=>{const layer=e.layer;drawn.addLayer(layer);let geo={id:uid(),nombre:'NUEVA GEOCERCA',activa:true,color:ccGeoColor((configuracion.geocercas||[]).length),creadaEn:new Date().toISOString()};if(e.layerType==='circle'){const c=layer.getLatLng();geo.tipo='circle';geo.centro=[c.lat,c.lng];geo.radio=layer.getRadius();}else{geo.tipo='polygon';const ll=layer.getLatLngs();const ring=(Array.isArray(ll[0]?.[0])?ll[0][0]:ll[0]).map(p=>[p.lat,p.lng]);if(ring.length&&String(ring[0])!==String(ring[ring.length-1]))ring.push([...ring[0]]);geo.coordenadas=[ring];}
    const nombre=prompt('Nombre de la geocerca:','Geocerca '+((configuracion.geocercas||[]).length+1));if(nombre===null){drawn.removeLayer(layer);return;}geo.nombre=String(nombre||'Geocerca').trim()||'Geocerca';configuracion.geocercas||(configuracion.geocercas=[]);configuracion.geocercas.push(geo);const r=await ccCloudSave('CREAR_GEOCERCA');if(!r?.ok){configuracion.geocercas=configuracion.geocercas.filter(x=>x.id!==geo.id);alert('No se pudo guardar la geocerca en Supabase.');return;}ccRenderGeocercasMapa();showStatus?.('GEOCERCA GUARDADA · '+geo.nombre,'success');};
  ccMapaUnidadesInstance.on(L.Draw.Event.CREATED,ccDrawCreatedHandler);
  showStatus?.('Selecciona polígono, rectángulo o círculo en las herramientas del mapa','info');
};
window.ccEnfocarGeocerca=function(id){const g=(configuracion.geocercas||[]).find(x=>x.id===id);if(!g||!ccMapaUnidadesInstance)return;const l=ccGeocercaToLayer(g);if(!l)return;if(g.tipo==='circle')ccMapaUnidadesInstance.fitBounds(l.getBounds(),{padding:[30,30]});else ccMapaUnidadesInstance.fitBounds(l.getBounds(),{padding:[30,30]});};
window.ccEditarGeocerca=function(id){const g=(configuracion.geocercas||[]).find(x=>x.id===id);if(!g)return;modal('Editar geocerca',`<div class="cc-grid"><div class="cc-field"><label>Nombre</label><input name="nombre" required value="${esc(g.nombre||'')}"></div><div class="cc-field"><label>Estatus</label><select name="activa"><option value="1" ${g.activa!==false?'selected':''}>ACTIVA</option><option value="0" ${g.activa===false?'selected':''}>OCULTA</option></select></div><div class="cc-field"><label>Color</label><input name="color" type="color" value="${esc(g.color||'#2563eb')}"></div></div>`,f=>{g.nombre=String(f.get('nombre')||'Geocerca').trim();g.activa=f.get('activa')==='1';g.color=String(f.get('color')||'#2563eb');return {}});};
window.ccEliminarGeocerca=async function(id){const g=(configuracion.geocercas||[]).find(x=>x.id===id);if(!g||!confirm(`¿Eliminar la geocerca ${g.nombre}?`))return;const prev=[...(configuracion.geocercas||[])];configuracion.geocercas=prev.filter(x=>x.id!==id);const r=await ccCloudSave('ELIMINAR_GEOCERCA');if(!r?.ok){configuracion.geocercas=prev;alert('No se pudo eliminar en Supabase.');return;}ccRenderGeocercasMapa();};
window.ccAbrirAdministradorGeocercas=function(){const arr=configuracion.geocercas||[];modal('Administrar geocercas',`<div style="display:grid;gap:8px">${arr.length?arr.map((g,i)=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>${esc(g.nombre)}</b><div style="font-size:10px;color:#64748b">${esc(g.tipo)} · ${g.activa===false?'OCULTA':'ACTIVA'}</div></div><div style="display:flex;gap:6px"><button type="button" class="cc-btn cc-btn-light" onclick="document.getElementById('ccFormModal').remove();ccEnfocarGeocerca('${g.id}')">Ver</button><button type="button" class="cc-btn cc-btn-light" onclick="document.getElementById('ccFormModal').remove();ccEditarGeocerca('${g.id}')">Editar</button></div></div>`).join(''):'<div class="cc-geo-empty">No hay geocercas registradas.</div>'}</div>`,()=>({skipCloudSave:true}));};
function ccGeoJSONFeaturesToGeocercas(obj){
  const feats=obj?.type==='FeatureCollection'?obj.features:obj?.type==='Feature'?[obj]:[];const out=[];
  const addPoly=(coords,props={})=>{if(!Array.isArray(coords?.[0]))return;out.push({id:uid(),nombre:String(props.name||props.nombre||props.Name||'Geocerca importada').trim(),tipo:'polygon',coordenadas:coords.map(r=>r.map(p=>[Number(p[1]),Number(p[0])])),activa:true,color:ccGeoColor((configuracion.geocercas||[]).length+out.length),importadaEn:new Date().toISOString()});};
  feats.forEach(f=>{const g=f.geometry||{},p=f.properties||{};if(g.type==='Polygon')addPoly(g.coordinates,p);else if(g.type==='MultiPolygon')g.coordinates.forEach((poly,j)=>addPoly(poly,{...p,name:(p.name||p.nombre||'Geocerca')+(g.coordinates.length>1?' '+(j+1):'')}));});return out;
}
window.ccImportarGeocercasArchivo=async function(file){
  if(!file)return;try{showStatus?.('Leyendo geocercas...','info');await ccEnsureGeoLibraries();const ext=(file.name.split('.').pop()||'').toLowerCase();let obj;
    if(ext==='geojson'||ext==='json'){obj=JSON.parse(await file.text());}
    else if(ext==='kml'){const xml=new DOMParser().parseFromString(await file.text(),'text/xml');obj=window.toGeoJSON.kml(xml);}
    else if(ext==='kmz'){const zip=await JSZip.loadAsync(await file.arrayBuffer());let entry=zip.file(/\.kml$/i)[0];if(!entry)throw new Error('El KMZ no contiene un archivo KML');const xml=new DOMParser().parseFromString(await entry.async('text'),'text/xml');obj=window.toGeoJSON.kml(xml);}
    else throw new Error('Formato no compatible. Usa KML, KMZ, GeoJSON o JSON.');
    const nuevas=ccGeoJSONFeaturesToGeocercas(obj);if(!nuevas.length)throw new Error('No se encontraron polígonos válidos en el archivo.');
    if(!confirm(`Se encontraron ${nuevas.length} geocercas. ¿Importarlas a Supabase?`))return;const prev=[...(configuracion.geocercas||[])];configuracion.geocercas=[...prev,...nuevas];const r=await ccCloudSave('IMPORTAR_GEOCERCAS');if(!r?.ok){configuracion.geocercas=prev;throw new Error(r?.error||'Supabase rechazó la importación');}ccRenderGeocercasMapa();if(ccMapaUnidadesInstance&&nuevas.length){const layers=nuevas.map((g,i)=>ccGeocercaToLayer(g,i)).filter(Boolean);const group=L.featureGroup(layers);if(group.getBounds().isValid())ccMapaUnidadesInstance.fitBounds(group.getBounds(),{padding:[25,25]});}showStatus?.(`${nuevas.length} GEOCERCAS IMPORTADAS`,'success');
  }catch(e){console.error('IMPORTAR GEOCERCAS:',e);alert('No se pudieron importar las geocercas.\n\n'+(e.message||e));showStatus?.('ERROR IMPORTANDO GEOCERCAS','error');}
};
window.ccExportarGeocercas=function(){const arr=configuracion.geocercas||[];if(!arr.length){alert('No hay geocercas para exportar.');return;}const features=[];arr.forEach(g=>{if(g.tipo==='circle'){const steps=64,coords=[];const lat=Number(g.centro?.[0]),lng=Number(g.centro?.[1]),rad=Number(g.radio||0),R=6378137;for(let i=0;i<=steps;i++){const a=2*Math.PI*i/steps;const dLat=(rad*Math.cos(a)/R)*180/Math.PI;const dLng=(rad*Math.sin(a)/(R*Math.cos(lat*Math.PI/180)))*180/Math.PI;coords.push([lng+dLng,lat+dLat]);}features.push({type:'Feature',properties:{name:g.nombre,tipo:'circle',radio:g.radio},geometry:{type:'Polygon',coordinates:[coords]}});}else{features.push({type:'Feature',properties:{name:g.nombre,tipo:g.tipo},geometry:{type:'Polygon',coordinates:(g.coordenadas||[]).map(r=>r.map(p=>[p[1],p[0]]))}});}});const blob=new Blob([JSON.stringify({type:'FeatureCollection',features},null,2)],{type:'application/geo+json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='geocercas_control_cajas.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);};

window.ccBuscarUnidadMapaDebounced=function(){
  clearTimeout(ccMapaSearchTimer);
  ccMapaSearchTimer=setTimeout(()=>ccBuscarUnidadMapa(),120);
};

window.ccBuscarUnidadMapa=function(){
  const q=String(document.getElementById('ccMapaUnidadBuscar')?.value||'').trim().toLowerCase();
  if(!ccMapaUnidadesInstance)return;
  if(!q){
    const pts=ccMapaUnidadesRows.map(r=>[Number(r.latitud),Number(r.longitud)]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
    if(pts.length)ccMapaUnidadesInstance.fitBounds(pts,{padding:[35,35],maxZoom:15});
    return;
  }
  const match=ccMapaUnidadesRows.find(r=>String(r.unidad||'').toLowerCase().includes(q));
  if(!match){
    showStatus?.('UNIDAD NO ENCONTRADA EN EL MAPA','error');
    return;
  }
  const lat=Number(match.latitud),lng=Number(match.longitud);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  ccMapaUnidadesInstance.setView([lat,lng],16,{animate:true});
  const mk=ccMapaUnidadesMarkers.get(match.unidadId);
  if(mk)mk.openPopup();
};

window.ccLimpiarBusquedaMapa=function(){
  const input=document.getElementById('ccMapaUnidadBuscar');
  if(input)input.value='';
  ccBuscarUnidadMapa();
};

let ccMapaUnidadesInstance=null;
window.ccCargarMapaUnidades=async function(force=false){
  const el=document.getElementById('ccMapaUnidadesContainer');
  const resumen=document.getElementById('ccMapaUnidadesResumen');
  if(!el)return;

  try{
    if(!force && ccMapaUnidadesInstance){
      setTimeout(()=>ccMapaUnidadesInstance.invalidateSize(),80);
      return;
    }
    showStatus?.('Cargando mapa de unidades...','info');
    el.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:800">Cargando mapa...</div>';

    const [{data,error}]=await Promise.all([
      gmSupabase.rpc('cc_ultima_ubicacion_todas'),
      ccEnsureGeoLibraries()
    ]);
    if(error)throw error;
    if(data?.ok===false)throw new Error(data.error||'No se pudieron consultar ubicaciones');

    const rows=Array.isArray(data?.registros)?data.registros:[];
    if(ccMapaUnidadesInstance){
      try{ccMapaUnidadesInstance.remove();}catch(_){}
      ccMapaUnidadesInstance=null;
    }
    el.innerHTML='';

    const map=L.map(el,{preferCanvas:true,zoomControl:true}).setView([29.0729,-110.9559],6);
    ccMapaUnidadesInstance=map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; OpenStreetMap'
    }).addTo(map);

