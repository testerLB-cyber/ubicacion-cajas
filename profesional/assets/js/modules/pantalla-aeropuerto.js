(()=>{'use strict';
let TIMER=null,LAST=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.gmSupabase||null;
const tz='America/Hermosillo';

function css(){
  if($('airportCss'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="airportCss">
  .airSimple{--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}
  .airSimpleTop{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:10px}
  .airSimpleTop h2{margin:0;font-size:22px;color:var(--ink)}
  .airSimpleTop p{margin:3px 0 0;font-size:10px;color:var(--muted)}
  .airUpdated{font-size:9px;color:var(--muted);white-space:nowrap}
  .airUnits{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:10px}
  .airUnitCard{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
  .airUnitHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:11px 13px;background:#f8fafc;border-bottom:1px solid var(--line)}
  .airUnitName{font-size:19px;font-weight:950;color:var(--ink)}
  .airUnitMeta{font-size:9px;color:var(--muted);margin-top:2px}
  .airFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0}
  .airField{padding:8px 11px;border-bottom:1px solid #eef2f7;min-width:0}
  .airField:nth-child(odd){border-right:1px solid #eef2f7}
  .airField label{display:block;font-size:7px;font-weight:950;letter-spacing:.05em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px}
  .airField div{font-size:10px;font-weight:750;color:#1e293b;word-break:break-word}
  .airField.full{grid-column:1/-1;border-right:0}
  .airGeo{padding:8px 11px}
  .airGeoItem{font-size:9px;color:#334155;padding:5px 0;border-bottom:1px dashed #e2e8f0}
  .airGeoItem:last-child{border-bottom:0}
  .airEmpty{padding:36px;text-align:center;color:#64748b;background:#fff;border:1px solid var(--line);border-radius:14px}
  @media(max-width:700px){.airUnits{grid-template-columns:1fr}.airFields{grid-template-columns:1fr}.airField,.airField:nth-child(odd){border-right:0}.airField.full{grid-column:auto}}
  </style>`);
}
function val(v){
  if(v===null||v===undefined||v==='')return '—';
  return esc(v);
}
function geos(arr){
  if(!Array.isArray(arr)||!arr.length)return '—';
  return arr.map(g=>`<div class="airGeoItem"><b>${val(g.Geocerca||g.geocerca)}</b> · ${val(g.Evento||g.evento)} · ${val(g["Fecha Hora"]||g.fechaHora||g.fecha)}</div>`).join('');
}
function card(x){
  const fields=[
    ['Placa',x.placa],
    ['Tipo unidad',x.tipoUnidad],
    ['Descripción',x.descripcion],
    ['Código',x.codigo],
    ['Estatus',x.estatusGps],
    ['Evento GPS',x.evento],
    ['Ubicación GPS',x.ubicacion],
    ['Ubicación ERP',x.ubicacionErp],
    ['Latitud',x.latitud],
    ['Longitud',x.longitud],
    ['Velocidad',x.velocidadKmh!=null?x.velocidadKmh+' km/h':null],
    ['Odómetro',x.odometro],
    ['Voltaje',x.voltaje],
    ['Fecha / hora GPS',x.gpsAt],
    ['fhEstatus',x.fhEstatus],
    ['Número viaje',x.numeroViaje],
    ['Identificador viaje',x.identificadorViaje],
    ['Cliente',x.cliente],
    ['Estatus viaje',x.estatusViaje],
    ['Cargado / vacío',x.trayectoCargadoVacio],
    ['Operador',x.operador],
    ['Origen',x.origen],
    ['Destino',x.destino],
    ['Dirección cliente',x.direccionCliente],
    ['Peso',x.peso!=null?x.peso+(x.unidadPeso?' '+x.unidadPeso:''):null],
    ['Salida',x.salida],
    ['Fecha estimada llegada',x.eta],
    ['Remolque',x.remolque],
    ['Placas remolque',x.placasRemolque],
    ['Remolque 2',x.remolque2],
    ['Placas remolque 2',x.placasRemolque2],
    ['Descripción de la ruta',x.descripcionRuta],
    ['Google Maps',x.mapsUrl]
  ];
  return `<div class="airUnitCard">
    <div class="airUnitHead">
      <div><div class="airUnitName">${val(x.unidad)}</div><div class="airUnitMeta">Datos directos de Software GM</div></div>
    </div>
    <div class="airFields">
      ${fields.map(([k,v])=>`<div class="airField"><label>${esc(k)}</label><div>${val(v)}</div></div>`).join('')}
      <div class="airField full"><label>Geocercas</label><div class="airGeo">${geos(x.geocercas)}</div></div>
    </div>
  </div>`;
}
function render(){
  const box=$('airUnits'); if(!box)return;
  box.innerHTML=LAST.length?LAST.map(card).join(''):'<div class="airEmpty">La API no devolvió unidades.</div>';
}
async function load(){
  if(document.hidden||!$('ccPanelPantallaAeropuerto')?.classList.contains('active'))return;
  try{
    $('airUpdated').textContent='Consultando API…';
    const r=await sb().functions.invoke('gm-flota');
    if(r.error)throw r.error;
    const data=r.data||{};
    if(!data.ok)throw new Error(data.error||'No se pudo leer Software GM');
    LAST=Array.isArray(data.vehicles)?data.vehicles:[];
    render();
    const d=data.generatedAt?new Date(data.generatedAt):new Date();
    $('airUpdated').textContent='Actualizado '+d.toLocaleTimeString('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · '+LAST.length+' unidades de API';
    schedule(45);
  }catch(e){
    LAST=[];render();
    $('airUpdated').textContent='Error API: '+e.message;
    schedule(60);
  }
}
function schedule(sec){clearTimeout(TIMER);TIMER=setTimeout(load,Math.max(30,sec)*1000)}
function shell(){
  css();
  $('ccPantallaAeropuertoMount').innerHTML=`<div class="airSimple">
    <div class="airSimpleTop">
      <div><h2>Pantalla Aeropuerto</h2><p>Información directa de la API de Software GM.</p></div>
      <div id="airUpdated" class="airUpdated">Sin actualizar</div>
    </div>
    <div id="airUnits" class="airUnits"></div>
  </div>`;
  load();
}
window.ccOpenPantallaAeropuerto=btn=>{
  document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>{x.classList.remove('active');x.style.removeProperty('display')});
  document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));
  $('ccPanelPantallaAeropuerto')?.classList.add('active');
  btn?.classList.add('active');
  clearTimeout(TIMER);
  shell();
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('ccPanelPantallaAeropuerto')?.classList.contains('active'))load()});
})();