    ccMapaUnidadesRows=rows;
    ccMapaUnidadesMarkers.clear();
    ccRenderGeocercasMapa();

    const bounds=[];
    const now=Date.now();

    // Separa visualmente marcadores con coordenadas idénticas, sin cambiar el GPS guardado.
    const ccCoordCounts=new Map();
    for(const x of rows){
      const xLat=Number(x.latitud),xLng=Number(x.longitud);
      if(!Number.isFinite(xLat)||!Number.isFinite(xLng))continue;
      const key=xLat.toFixed(7)+','+xLng.toFixed(7);
      ccCoordCounts.set(key,(ccCoordCounts.get(key)||0)+1);
    }
    const ccCoordSeen=new Map();

    for(const r of rows){
      const lat=Number(r.latitud),lng=Number(r.longitud);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
      const fecha=new Date(r.fechaHora);
      const geocercaActual=ccGeocercaDePunto(lat,lng);
      const ageDays=Math.max(0,(now-fecha.getTime())/86400000);
      const color=ageDays<=1?'#16a34a':ageDays<=7?'#f59e0b':'#dc2626';

      const ageClass=ageDays<=1?'cc-trailer-age-green':ageDays<=7?'cc-trailer-age-yellow':'cc-trailer-age-red';
      const icon=L.divIcon({
        className:'cc-trailer-marker',
        html:`<div class="cc-trailer-wrap ${ageClass}"><div class="cc-trailer-label">${esc(r.unidad||'—')}</div><div class="cc-trailer-icon"></div></div>`,
        iconSize:[42,34],
        iconAnchor:[21,24],
        popupAnchor:[0,-26]
      });
      const coordKey=lat.toFixed(7)+','+lng.toFixed(7);
      const sameTotal=ccCoordCounts.get(coordKey)||1;
      const sameIndex=ccCoordSeen.get(coordKey)||0;
      ccCoordSeen.set(coordKey,sameIndex+1);
      let markerLat=lat,markerLng=lng;
      if(sameTotal>1){
        const angle=(Math.PI*2*sameIndex)/sameTotal;
        const offsetMeters=10+Math.min(sameTotal,8);
        markerLat=lat+(offsetMeters/111320)*Math.sin(angle);
        const lngScale=111320*Math.max(.2,Math.cos(lat*Math.PI/180));
        markerLng=lng+(offsetMeters/lngScale)*Math.cos(angle);
      }
      const marker=L.marker([markerLat,markerLng],{icon}).addTo(map);
      ccMapaUnidadesMarkers.set(r.unidadId,marker);

      marker.bindPopup(`<div style="font-family:Arial,sans-serif;font-size:12px;min-width:210px">
        <div style="font-weight:900;font-size:14px;margin-bottom:5px">${esc(r.unidad||'—')}</div>
        <div>${esc(r.descripcion||'')}</div>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:7px 0">
        <div><b>Última ubicación:</b><br>${esc(fecha.toLocaleString())}</div>
        <div style="margin-top:4px"><b>Precisión:</b> ${r.precisionMetros==null?'—':Math.round(Number(r.precisionMetros))+' m'}</div>
        <div style="margin-top:4px"><b>Ubicación:</b> ${geocercaActual?'<span style="color:#16a34a;font-weight:900">'+esc(geocercaActual.nombre)+'</span>':'Fuera de geocerca'}</div>
        <div style="margin-top:4px"><b>Coordenadas:</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        <div style="margin-top:8px"><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}">Abrir en Google Maps</a></div>
      </div>`);
      bounds.push([lat,lng]);
    }

    if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:15});
    else map.setView([29.0729,-110.9559],6);

    if(resumen){
      resumen.innerHTML=`
        <span class="cc-location-pill">${rows.length} unidades con ubicación</span>
        <span class="cc-location-pill">${Math.max(0,cajas.length-rows.length)} sin ubicación</span>
        <span class="cc-location-pill"><i class="fa-solid fa-draw-polygon"></i> ${(configuracion.geocercas||[]).length} geocercas</span>
        <span class="cc-location-pill"><i class="fa-solid fa-location-dot"></i> ${rows.filter(r=>ccGeocercaDePunto(Number(r.latitud),Number(r.longitud))).length} dentro de geocerca</span>
        <span class="cc-location-pill"><span style="color:#16a34a">●</span> Últimas 24 h</span>
        <span class="cc-location-pill"><span style="color:#f59e0b">●</span> 2–7 días</span>
        <span class="cc-location-pill"><span style="color:#dc2626">●</span> Más de 7 días</span>`;
    }

    setTimeout(()=>map.invalidateSize(),120);
    showStatus?.('MAPA DE UNIDADES ACTUALIZADO','success');
  }catch(err){
    console.error('MAPA DE UNIDADES:',err);
    el.innerHTML=`<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#b91c1c;font-weight:800;padding:20px;text-align:center">No se pudo cargar el mapa.<br>${esc(err.message||err)}</div>`;
    showStatus?.('ERROR MAPA UNIDADES · '+(err.message||err),'error');
  }
};

window.ccAbrirMapaUbicaciones=async function(){
  try{
    showStatus?.('Cargando mapa de últimas ubicaciones...','info');
    const [{data,error}]=await Promise.all([
      gmSupabase.rpc('cc_ultima_ubicacion_todas'),
      ccEnsureLeaflet()
    ]);
    if(error)throw error;
    const rows=Array.isArray(data?.registros)?data.registros:[];
    document.getElementById('ccLocationMapModal')?.remove();
    const ov=document.createElement('div');
    ov.id='ccLocationMapModal';ov.className='cc-location-modal';
    ov.innerHTML=`<div class="cc-location-card">
      <div class="cc-location-head"><strong>MAPA · ÚLTIMA UBICACIÓN DE UNIDADES</strong><button class="cc-location-close" type="button">×</button></div>
      <div class="cc-location-body">
        <div class="cc-location-summary"><span class="cc-location-pill">${rows.length} unidades con ubicación</span><span class="cc-location-pill">${Math.max(0,cajas.length-rows.length)} sin ubicación</span></div>
        <div id="ccLocationMap" class="cc-location-map"></div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('.cc-location-close').onclick=()=>{try{map.remove();}catch(_){}ov.remove();};

    const map=L.map('ccLocationMap',{preferCanvas:true}).setView([29.0729,-110.9559],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);

