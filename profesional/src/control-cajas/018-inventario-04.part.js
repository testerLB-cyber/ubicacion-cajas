    const bounds=[];
    const now=Date.now();
    for(const r of rows){
      const lat=Number(r.latitud),lng=Number(r.longitud);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
      const ageDays=Math.max(0,(now-new Date(r.fechaHora).getTime())/86400000);
      const color=ageDays<=1?'#16a34a':ageDays<=7?'#f59e0b':'#dc2626';
      const marker=L.circleMarker([lat,lng],{radius:8,color,weight:2,fillColor:color,fillOpacity:.72}).addTo(map);
      marker.bindPopup(`<div style="font-family:Arial;font-size:12px"><b>${esc(r.unidad||'—')}</b><br>${esc(r.descripcion||'')}<br><b>Última ubicación:</b> ${esc(new Date(r.fechaHora).toLocaleString())}<br><b>Precisión:</b> ${r.precisionMetros==null?'—':Math.round(Number(r.precisionMetros))+' m'}<br><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}">Abrir en Google Maps</a></div>`);
      bounds.push([lat,lng]);
    }
    if(bounds.length)map.fitBounds(bounds,{padding:[30,30],maxZoom:15});
    else map.setView([29.0729,-110.9559],6);

    setTimeout(()=>map.invalidateSize(),80);
    showStatus?.('Mapa de ubicaciones cargado','success');
  }catch(err){
    console.error('MAPA UBICACIONES:',err);
    alert('No se pudo cargar el mapa.\\n\\n'+(err.message||err));
  }
};


let ccInventarioUbicaciones=new Map();
let ccInventarioUbicacionesCargadasEn=0;
let ccInventarioUbicacionesLoading=false;
const ccReverseGeoCache=new Map();
let ccReverseGeoLastRequest=0;
function ccDireccionCacheKey(lat,lng){return Number(lat).toFixed(5)+','+Number(lng).toFixed(5);}
function ccLeerDireccionCache(lat,lng){
 const k=ccDireccionCacheKey(lat,lng);
 if(ccReverseGeoCache.has(k))return ccReverseGeoCache.get(k);
 try{const v=localStorage.getItem('cc_geo_'+k);if(v){ccReverseGeoCache.set(k,v);return v;}}catch(_){}
 return '';
}
async function ccReverseGeocode(lat,lng){
 const cached=ccLeerDireccionCache(lat,lng);if(cached)return cached;
 const wait=Math.max(0,1050-(Date.now()-ccReverseGeoLastRequest));
 if(wait)await new Promise(r=>setTimeout(r,wait));
 ccReverseGeoLastRequest=Date.now();
 try{
  const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng)+'&zoom=18&addressdetails=1&accept-language=es';
  const r=await fetch(url,{headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json(),dir=String(j&&j.display_name||'').trim();
  if(dir){const k=ccDireccionCacheKey(lat,lng);ccReverseGeoCache.set(k,dir);try{localStorage.setItem('cc_geo_'+k,dir);}catch(_){}}
  return dir;
 }catch(e){console.warn('GEOCODIFICACION INVERSA:',e);return '';}
}
function ccEtiquetaUbicacion(r){
 if(!r)return {texto:'Sin ubicación',geocerca:false};
 const lat=Number(r.latitud),lng=Number(r.longitud);
 if(!Number.isFinite(lat)||!Number.isFinite(lng))return {texto:'Sin ubicación',geocerca:false};
 const g=ccGeocercaDePunto(lat,lng);
 if(g)return {texto:g.nombre||'Geocerca',geocerca:true};
 const directa=String(r.direccion||r.address||r.displayName||'').trim();
 return {texto:directa||ccLeerDireccionCache(lat,lng)||'Consultando dirección…',geocerca:false};
}
async function ccActualizarDireccionCelda(r){
 if(!r)return;
 const lat=Number(r.latitud),lng=Number(r.longitud);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||ccGeocercaDePunto(lat,lng))return;
 const dir=String(r.direccion||r.address||r.displayName||'').trim()||await ccReverseGeocode(lat,lng);
 const el=document.querySelector('[data-cc-location-unit="'+String(r.unidadId||'').replace(/"/g,'')+'"]');
 if(el&&dir){const id=String(r.unidadId||'');el.innerHTML='<button type="button" onclick="ccVerUbicacionesUnidad(\''+esc(id)+'\')" style="all:unset;cursor:pointer;display:block;width:100%" title="Ver ubicación actual y últimas 5"><i class="fa-solid fa-location-dot" style="color:#2563eb;margin-right:5px"></i><span>'+esc(dir)+'</span><div style="font-size:9px;color:#94a3b8;margin-top:3px">'+esc(new Date(r.fechaHora).toLocaleString())+'</div><div style="font-size:9px;color:#2563eb;font-weight:800;margin-top:3px">Toca para ver historial</div></button>';}
}
async function ccCargarUbicacionesInventario(force=false){
 if(ccInventarioUbicacionesLoading)return;
 if(!force&&Date.now()-ccInventarioUbicacionesCargadasEn<30000&&ccInventarioUbicaciones.size)return;
 ccInventarioUbicacionesLoading=true;
 try{
  const {data,error}=await gmSupabase.rpc('cc_ultima_ubicacion_todas');
  if(error)throw error;
  const rows=Array.isArray(data&&data.registros)?data.registros:[];
  ccInventarioUbicaciones=new Map(rows.map(r=>[String(r.unidadId),r]));
  ccInventarioUbicacionesCargadasEn=Date.now();
  if(document.getElementById('ccPanelInventario')?.classList.contains('active'))ccRenderInventario();
 }catch(e){console.warn('UBICACIONES INVENTARIO:',e);}
 finally{ccInventarioUbicacionesLoading=false;}
}
window.ccCargarUbicacionesInventario=ccCargarUbicacionesInventario;

let ccInventarioSearchTimer=null;
window.ccInventarioSearchDebounced=function(){
  clearTimeout(ccInventarioSearchTimer);
  ccInventarioSearchTimer=setTimeout(()=>ccRenderInventario(),140);
};
window.ccRenderInventario=function(){ccCargarUbicacionesInventario(false);const tipoInv=window.ccInventarioTipoActual||'TODOS';const body=document.getElementById('ccInventarioBody'),kpis=document.getElementById('ccInventarioKpis');if(!body)return;const q=(document.getElementById('ccInventarioSearch')?.value||'').toLowerCase();const hoy=iso(new Date());const clienteMap=new Map(clientes.map(c=>[c.id,c.nombre]));const rentaActivaMap=new Map();for(const r of rentas){if(r.cajaId&&rentFor(r.id,hoy))rentaActivaMap.set(r.cajaId,r);}const data=cajas.filter(x=>ccTipoMatches(x,tipoInv)&&[x.tipoUnidadNombre,x.numero,x.descripcion,x.tamano,x.tipo,x.origen,x.placas,x.capacidad,x.observaciones,clientes.find(c=>c.id===x.clienteId)?.nombre||''].join(' ').toLowerCase().includes(q));const activos=cajas.filter(x=>ccTipoMatches(x,tipoInv)&&x.estatus!=='INACTIVO').length,rentadas=cajas.filter(x=>ccTipoMatches(x,tipoInv)&&rentas.some(r=>r.cajaId===x.id&&rentFor(r.id,hoy))).length,disponibles=Math.max(0,activos-rentadas),carros=cajas.filter(x=>String(x.categoriaUnidad||x.tipoUnidadNombre||'CAJA').toUpperCase()==='CARRO').length;kpis.innerHTML=`<div class="cc-inv-kpi"><small>Total unidades</small><strong>${cajas.filter(x=>ccTipoMatches(x,tipoInv)).length}</strong></div><div class="cc-inv-kpi"><small>Activas</small><strong>${activos}</strong></div><div class="cc-inv-kpi"><small>Cajas rentadas hoy</small><strong>${rentadas}</strong></div><div class="cc-inv-kpi"><small>Disponibles</small><strong>${disponibles}</strong></div><div class="cc-inv-kpi"><small>Carros</small><strong>${cajas.filter(x=>ccTipoMatches(x,'CARRO')).length}</strong></div>`;body.innerHTML=data.length?data.map((x,i)=>{const esCaja=String(x.categoriaUnidad||x.tipoUnidadNombre||'CAJA').toUpperCase()==='CAJA';const esCarro=[x.categoriaUnidad,x.tipoUnidadNombre,x.tipo].some(v=>String(v||'').trim().toUpperCase().includes('CARRO'));const renta=esCaja?(rentaActivaMap.get(x.id)||null):null;const cliente=clienteMap.get(x.clienteId)||clienteMap.get(renta?.clienteId)||'—';const est=x.estatus==='MANTENIMIENTO'?'MANTENIMIENTO':x.estatus==='INACTIVO'?'INACTIVO':renta?'RENTADA':'DISPONIBLE';const cls=est==='MANTENIMIENTO'?'cc-status-mant':est==='INACTIVO'?'cc-inv-inactivo':est==='RENTADA'?'cc-inv-renta':'cc-inv-disponible';const esStorage=esCaja&&String(x.tipoUsoCaja||'').trim().toUpperCase()==='STORAGE';return `<tr class="${esStorage?'cc-storage-row':''}"><td>${i+1}</td><td><span class="cc-unit-type-badge">${esc(x.tipoUnidadNombre||'CAJA')}</span></td><td><button type="button" class="cc-link" title="Ver dimensiones de la unidad" onclick="ccMostrarMedidasUnidad('${x.id}')"><strong>${esc(x.numero||'—')}</strong></button></td><td>${esc(x.descripcion||'—')}</td><td>${esc(x.tamano||'—')}</td><td>${esc(x.tipo||'—')}${esCaja&&x.tipoUsoCaja?`<div style="font-size:9px;color:#7c3aed;font-weight:800;margin-top:3px">Uso: ${esc(x.tipoUsoCaja)}</div>`:''}</td><td><button type="button" class="cc-link" onclick="ccMostrarMedidasUnidad('${x.id}')">${(x.largoFt||x.anchoFt||x.altoFt||x.largo||x.ancho||x.alto)?`${(Number(x.largoFt||0)||Number(x.largo||0)/0.3048).toFixed(2)} × ${(Number(x.anchoFt||0)||Number(x.ancho||0)/0.3048).toFixed(2)} × ${(Number(x.altoFt||0)||Number(x.alto||0)/0.3048).toFixed(2)} ft`:'Ver dimensiones'}</button></td><td>${esc(x.origen||'—')}</td><td><div><b>MX:</b> ${esc(x.placasMx||x.placas||'—')}</div><div style="font-size:9px;color:#64748b"><b>USA:</b> ${esc(x.placasUsa||'—')}</div></td><td><span class="cc-client-badge">${esc(cliente)}</span></td><td><span class="cc-inv-badge ${cls}">${est}</span></td><td>${esc(x.capacidad||'—')}</td><td data-cc-location-unit="${esc(x.id)}" style="min-width:220px;max-width:340px;white-space:normal;line-height:1.35">${(()=>{const r=ccInventarioUbicaciones.get(String(x.id));const e=ccEtiquetaUbicacion(r);if(r&&!e.geocerca&&!String(r.direccion||r.address||r.displayName||'').trim()&&!ccLeerDireccionCache(Number(r.latitud),Number(r.longitud)))setTimeout(()=>ccActualizarDireccionCelda(r),0);if(!r)return '<span style="color:#94a3b8">Sin ubicación</span>';const contenido=(e.geocerca?'<i class="fa-solid fa-draw-polygon" style="color:#16a34a;margin-right:5px"></i><strong style="color:#166534">'+esc(e.texto)+'</strong>':'<i class="fa-solid fa-location-dot" style="color:#2563eb;margin-right:5px"></i><span>'+esc(e.texto)+'</span>')+'<div style="font-size:9px;color:#94a3b8;margin-top:3px">'+esc(new Date(r.fechaHora).toLocaleString())+'</div><div style="font-size:9px;color:#2563eb;font-weight:800;margin-top:3px">Toca para ver historial</div>';return '<button type="button" onclick="ccVerUbicacionesUnidad(\''+esc(x.id)+'\')" style="all:unset;cursor:pointer;display:block;width:100%" title="Ver ubicación actual y últimas 5">'+contenido+'</button>'})()}</td><td>${esc(x.observaciones||'—')}</td><td><button class="cc-btn cc-btn-light" onclick="ccEditarUnidadDirecto('${x.id}')">Editar</button>${x.estatus==='MANTENIMIENTO'?`<button class="cc-btn cc-btn-primary" onclick="ccLiberarMantenimiento('${x.id}')">Liberar</button>`:`<button class="cc-btn cc-btn-maintenance" title="Poner unidad fuera de servicio" onclick="ccPonerMantenimiento('${x.id}')"><i class="fa-solid fa-triangle-exclamation mr-1"></i>FUERA DE SERVICIO</button>`}<button class="cc-btn cc-btn-dot" title="Registrar entrada de la unidad a revisión DOT" onclick="ccAbrirDotRegistro('${x.id}')"><i class="fa-solid fa-clipboard-check mr-1"></i>DOT</button><button class="cc-btn cc-btn-light" title="Generar QR de ubicación" onclick="ccMostrarQrUnidad('${x.id}')"><i class="fa-solid fa-qrcode mr-1"></i>QR</button></td></tr>`}).join(''):`<tr><td colspan="15" style="padding:35px;text-align:center;color:#94a3b8">No hay unidades registradas.</td></tr>`;};
window.ccRenderClientes=function(){const el=document.getElementById('ccClientesList');if(!el)return;el.innerHTML=clientes.length?clientes.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td>${esc(x.contacto||'—')}</td><td>${esc(x.telefono||'—')}</td><td>${esc(x.correo||'—')}</td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus)}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoCliente('${x.id}')">Editar</button><button class="cc-btn cc-btn-danger" onclick="ccDeleteCliente('${x.id}')">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8">No hay clientes registrados.</td></tr>';};
window.ccRenderResponsables=function(){const el=document.getElementById('ccResponsablesList');if(!el)return;el.innerHTML=responsables.length?responsables.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td>${esc(x.puesto||'—')}</td><td>${esc(x.telefono||'—')}</td><td>${esc(x.correo||'—')}</td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus)}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoResponsable('${x.id}')">Editar</button><button class="cc-btn cc-btn-danger" onclick="ccDeleteResponsable('${x.id}')">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8">No hay responsables registrados.</td></tr>';};
window.ccActualizarTarifaRenta=function(){const metodo=document.getElementById('ccMetodoCobro')?.value||'DIARIO',sel=document.getElementById('ccTarifaRenta'),total=document.getElementById('ccTotalTarifaRenta'),cliente=document.querySelector('#ccForm [name="clienteId"]')?.value;if(!sel||!total)return;const t=Object.assign({diario:0,semanal:0,mensual:0},(configuracion.tarifasRenta||{})[cliente]||{});const valor=Number(t[metodo.toLowerCase()]||0);const etiqueta=metodo==='MENSUAL'?'Tarifa mensual':metodo==='SEMANAL'?'Tarifa semanal':'Tarifa diaria';sel.innerHTML=`<option value="tarifa_${esc(cliente||'general')}" data-total="${valor}">${etiqueta} — $${valor.toFixed(2)}</option>`;total.value=valor.toFixed(2);};
window.ccRenderRenta=function(){
  const head=document.getElementById('ccMatrixHead'),body=document.getElementById('ccMatrixBody');
  if(!head||!body)return;
  const selResp=document.getElementById('ccRentaResponsableFilter'),selCli=document.getElementById('ccRentaClienteFilter');
  const curResp=selResp?.value||'',curCli=selCli?.value||'';
  if(selResp){selResp.innerHTML='<option value="">Todos los responsables</option>'+responsables.filter(x=>x.estatus!=='INACTIVO').map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');selResp.value=curResp;}
  if(selCli){selCli.innerHTML='<option value="">Todos los clientes</option>'+clientes.filter(x=>x.estatus!=='INACTIVO').map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');selCli.value=curCli;}
  const responsableId=selResp?.value||'',clienteId=selCli?.value||'',tipoUnidad=window.ccRentaTipoFiltroActual||'CAJA',hoy=iso(new Date());
  const cajaMap=new Map(cajas.map(x=>[x.id,x])),cliMap=new Map(clientes.map(x=>[x.id,x])),respMap=new Map(responsables.map(x=>[x.id,x]));
  let rows=rentas.filter(r=>{
    if(r.estatus==='CANCELADA')return false;
    const unidad=cajaMap.get(r.cajaId);
    const coincideTipo=tipoUnidad==='TODOS'||String(unidad?.categoriaUnidad||unidad?.tipoUnidadNombre||'CAJA').toUpperCase()===String(tipoUnidad).toUpperCase();
    if(!coincideTipo)return false;
    if(responsableId&&r.responsableId!==responsableId)return false;
    if(clienteId&&r.clienteId!==clienteId)return false;
    const activa=r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA';
    return activa;
  }).sort((a,b)=>{
    const aa=(a.estatus!=='FINALIZADA'&&a.estatus!=='CANCELADA')?1:0,bb=(b.estatus!=='FINALIZADA'&&b.estatus!=='CANCELADA')?1:0;
    if(aa!==bb)return bb-aa;
    return String(b.fechaInicio||'').localeCompare(String(a.fechaInicio||''));
  });

