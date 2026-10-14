(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let map=null,markers=null,rows=[];
const date=d=>{const p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
function inject(){
 const bar=$('airHistoryBtn')?.parentElement;if(!bar||bar.querySelector('#gmTripReportButton'))return;
 const btn=document.createElement('button');btn.type='button';btn.id='gmTripReportButton';btn.className='airFullBtn';btn.innerHTML='<i class="fa-solid fa-route"></i> Reporte de viajes';bar.insertBefore(btn,$('airHistoryBtn'));
 btn.onclick=open;
}
function open(){
 if(!$('gmTripReportModal')){
 const m=document.createElement('div');m.id='gmTripReportModal';m.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0f172acb;display:flex;justify-content:center;align-items:center;padding:12px';
 m.innerHTML='<section role="dialog" aria-modal="true" aria-label="Reporte de viajes" style="width:min(1100px,100%);height:min(90vh,800px);overflow:auto;background:#fff;border-radius:16px;padding:18px;color:#0f172a;box-shadow:0 22px 80px #0005">'+
 '<header style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><h2 style="font-size:20px;font-weight:800;margin:0">Reporte de viajes</h2><p style="margin:4px 0 0;color:#64748b;font-size:12px">Viajes registrados, eventos y posiciones GPS verificadas</p></div><button id="gmTripsClose" type="button" class="airFullBtn">✕ Cerrar</button></header>'+
 '<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:15px 0"><label>Desde <input id="gmTripsFrom" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Hasta <input id="gmTripsTo" type="date" style="display:block;padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label><button id="gmTripsSearch" type="button" class="airFullBtn" style="background:#0f766e;color:#fff">Consultar viajes</button></div>'+
 '<p id="gmTripsStatus" style="font-size:12px;color:#475569"></p><div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,1.6fr);gap:12px" id="gmTripsLayout"><div id="gmTripsResults" style="overflow:auto;max-height:470px;border:1px solid #e2e8f0;border-radius:10px"></div><div><div id="gmTripsMap" style="height:360px;border-radius:10px;background:#e2e8f0"></div><div id="gmTripsEvents" style="margin-top:10px;font-size:12px;color:#475569"></div></div></div>'+
 '<style>@media(max-width:740px){#gmTripsLayout{grid-template-columns:1fr!important}#gmTripsMap{height:300px!important}}</style></section>';
 document.body.appendChild(m);
 $('gmTripsClose').onclick=()=>{m.remove();if(map){map.remove();map=null}};
 $('gmTripsSearch').onclick=search;
 const end=new Date(),start=new Date(end);start.setDate(start.getDate()-6);$('gmTripsTo').value=date(end);$('gmTripsFrom').value=date(start);
 }
 search();
}
async function rpc(name,args){const s=window.gmSupabase;if(!s?.rpc)throw Error('Sesión requerida');const r=await s.rpc(name,args);if(r.error)throw r.error;return r.data;}
async function search(){
 const from=$('gmTripsFrom')?.value,to=$('gmTripsTo')?.value;
 if(!from||!to||from>to){$('gmTripsStatus').textContent='Selecciona un rango válido.';return}
 $('gmTripsStatus').textContent='Consultando viajes…';
 try{const data=await rpc('gm_reporte_viajes',{p_desde:from,p_hasta:to});rows=data?.viajes||[];
 $('gmTripsResults').innerHTML=rows.map(x=>'<button type="button" data-trip="'+x.id+'" style="display:block;width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid #e2e8f0;padding:12px;cursor:pointer"><b>'+esc(x.unidad)+'</b> · '+esc(x.numero_viaje||x.identificador_viaje||'Sin folio')+'<br><span style="font-size:11px;color:#64748b">'+esc(x.cliente||'')+' · '+esc(String(x.first_seen||'').slice(0,16).replace('T',' '))+'</span><br><span style="font-size:11px">'+esc(x.origen||'—')+' → '+esc(x.destino||'—')+'</span></button>').join('')||'<p style="padding:14px;color:#64748b">No se encontraron viajes para este período.</p>';
 $('gmTripsStatus').textContent=rows.length+' viajes encontrados';
 $('gmTripsResults').onclick=e=>{const b=e.target.closest('[data-trip]');if(b)trace(Number(b.dataset.trip))};
 }catch(e){$('gmTripsStatus').textContent='No fue posible consultar: '+(e.message||e)}
}
async function trace(id){
 $('gmTripsEvents').textContent='Consultando posiciones y eventos…';
 try{
 const data=await rpc('gm_reporte_trayecto',{p_viaje_id:id}),points=(data.puntos||[]).filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)),events=data.geocercas||[];
 if(typeof window.L==='undefined'){$('gmTripsEvents').textContent='Leaflet no está disponible para abrir el mapa.';return}
 if(!map){map=L.map('gmTripsMap').setView([29.1,-110.9],9);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map)}
 if(markers)markers.clearLayers();markers=L.featureGroup().addTo(map);
 points.forEach((p,i)=>L.circleMarker([p.lat,p.lon],{radius:i===0||i===points.length-1?6:3,color:i===0?'#16a34a':i===points.length-1?'#dc2626':'#0f766e',fillOpacity:.8}).bindPopup(esc(String(p.fecha||''))).addTo(markers));
 if(points.length)map.fitBounds(markers.getBounds().pad(.15));setTimeout(()=>map.invalidateSize(),70);
 $('gmTripsEvents').innerHTML='<b>'+points.length+' posiciones GPS almacenadas.</b> '+(points.length<2?'Aún no hay datos suficientes para reconstruir un recorrido.':'Se muestran puntos confirmados; la ruta por calles requiere validación mediante Map Matching.')+(events.length?'<div style="margin-top:8px"><b>Eventos de geocercas:</b>'+events.map(g=>'<div>'+esc(g.nombre)+' · '+esc(g.evento)+' · '+esc(g.fecha)+'</div>').join('')+'</div>':'<div style="margin-top:8px">Sin eventos de geocerca visibles para este acceso.</div>');
 }catch(e){$('gmTripsEvents').textContent='Error al consultar trayecto: '+(e.message||e)}
}
new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();