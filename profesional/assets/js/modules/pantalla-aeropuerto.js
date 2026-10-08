(()=>{'use strict';
let TIMER=null,LAST=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.gmSupabase||null;
const tz='America/Hermosillo';

function css(){
  if($('airportCss'))return;
  document.head.insertAdjacentHTML('beforeend',`<style id="airportCss">
  .air{--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}.airTop{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:10px}.airTop h2{margin:0;font-size:22px;color:var(--ink)}.airTop p{margin:3px 0 0;font-size:10px;color:var(--muted)}.airUpdated{font-size:9px;color:var(--muted);white-space:nowrap}
  .airBoard{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}.airHead,.airRow{display:grid;grid-template-columns:72px 105px minmax(150px,1fr) minmax(150px,1fr) minmax(210px,1.5fr) 78px 120px 150px 150px 108px;gap:8px;align-items:center}.airHead{padding:9px 10px;background:#0f172a;color:#fff;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.04em;position:sticky;top:0;z-index:2}.airList{max-height:72vh;overflow:auto}.airRow{padding:8px 10px;border-bottom:1px solid #edf2f7;min-height:48px}.airRow:last-child{border-bottom:0}.airRow:hover{background:#f8fafc}.airUnit{font-size:14px;font-weight:950;color:#0f172a}.airMain{font-size:10px;font-weight:800;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.airSub{font-size:8px;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.airDir{display:flex;align-items:center;gap:6px}.airArrow{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e2e8f0;font-size:17px;font-weight:950;color:#0f172a}.airFoot{padding:7px 10px;background:#f8fafc;border-top:1px solid var(--line);font-size:9px;color:#64748b}.airEmpty{padding:36px;text-align:center;color:#64748b}
  @media(max-width:1200px){.airHead,.airRow{grid-template-columns:65px 90px minmax(130px,1fr) minmax(130px,1fr) minmax(180px,1.4fr) 70px 110px 120px}.airHead>div:nth-child(9),.airHead>div:nth-child(10),.airRow>div:nth-child(9),.airRow>div:nth-child(10){display:none}}
  @media(max-width:800px){.airHead,.airRow{grid-template-columns:60px 85px 1fr 1.2fr}.airHead>div:nth-child(n+5),.airRow>div:nth-child(n+5){display:none}}
  </style>`);
}
function dir(v){
  if(v===null||v===undefined||v==='')return {arrow:'↑',label:'—'};
  const num=Number(v);
  if(Number.isFinite(num)){
    const deg=((num%360)+360)%360;
    const arrows=['↑','↗','→','↘','↓','↙','←','↖'];
    const names=['N','NE','E','SE','S','SO','O','NO'];
    const i=Math.round(deg/45)%8;
    return {arrow:arrows[i],label:names[i]+' '+Math.round(deg)+'°'};
  }
  const s=String(v).trim();
  return {arrow:'↑',label:s};
}
function fmtTime(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}
function render(){
  const box=$('airList');if(!box)return;
  box.innerHTML=LAST.length?LAST.map(x=>{
    const d=dir(x.orientacionGps);
    return `<div class="airRow">
      <div class="airDir"><div class="airArrow">${esc(d.arrow)}</div><div><div class="airMain">${esc(d.label)}</div><div class="airSub">Rumbo GPS</div></div></div>
      <div><div class="airUnit">${esc(x.unidad||'—')}</div><div class="airSub">${esc(x.placa||x.tipoUnidad||'')}</div></div>
      <div><div class="airMain">${esc(x.operador||'—')}</div><div class="airSub">${esc(x.evento||'')}</div></div>
      <div><div class="airMain">${esc(x.cliente||'—')}</div><div class="airSub">${esc(x.estatusViaje||'')}</div></div>
      <div><div class="airMain">${esc(x.ubicacion||x.ubicacionErp||'—')}</div><div class="airSub">${x.latitud!=null&&x.longitud!=null?esc(x.latitud+', '+x.longitud):''}</div></div>
      <div><div class="airMain">${x.velocidadKmh!=null?esc(Math.round(x.velocidadKmh)+' km/h'):'—'}</div><div class="airSub">${x.odometro!=null?esc(x.odometro+' km'):''}</div></div>
      <div><div class="airMain">${esc(x.numeroViaje||'—')}</div><div class="airSub">${esc(x.trayectoCargadoVacio||'')}</div></div>
      <div><div class="airMain">${esc(x.origen||'—')}</div><div class="airSub">Origen</div></div>
      <div><div class="airMain">${esc(x.destino||'—')}</div><div class="airSub">Destino</div></div>
      <div><div class="airMain">${esc(fmtTime(x.gpsAt))}</div><div class="airSub">${esc(x.remolque||'')}</div></div>
    </div>`;
  }).join(''):'<div class="airEmpty">La API no devolvió unidades.</div>';
}
async function load(){
  if(document.hidden||!$('ccPanelPantallaAeropuerto')?.classList.contains('active'))return;
  try{
    $('airUpdated').textContent='Actualizando…';
    const r=await sb().functions.invoke('gm-flota');
    if(r.error)throw r.error;
    const data=r.data||{};
    if(!data.ok)throw new Error(data.error||'No se pudo leer Software GM');
    LAST=Array.isArray(data.vehicles)?data.vehicles:[];
    render();
    const d=data.generatedAt?new Date(data.generatedAt):new Date();
    $('airUpdated').textContent='Actualizado '+d.toLocaleTimeString('es-MX',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · '+LAST.length+' unidades · siguiente actualización en 60 s';
    schedule();
  }catch(e){
    LAST=[];render();
    $('airUpdated').textContent='Error API: '+e.message+' · reintento en 60 s';
    schedule();
  }
}
function schedule(){clearTimeout(TIMER);TIMER=setTimeout(load,60000)}
function shell(){
  css();
  $('ccPantallaAeropuertoMount').innerHTML=`<div class="air">
    <div class="airTop"><div><h2>Pantalla Aeropuerto</h2><p>Flota directa de Software GM · actualización automática cada 60 segundos.</p></div><div id="airUpdated" class="airUpdated">Sin actualizar</div></div>
    <div class="airBoard">
      <div class="airHead"><div>Rumbo</div><div>Unidad</div><div>Operador</div><div>Cliente</div><div>Ubicación GPS</div><div>Velocidad</div><div>Viaje</div><div>Origen</div><div>Destino</div><div>GPS</div></div>
      <div id="airList" class="airList"></div>
      <div class="airFoot">Solo unidades devueltas por la API de Software GM. El refresco se pausa cuando esta pantalla no está visible.</div>
    </div>
  </div>`;
  load();
}
window.ccOpenPantallaAeropuerto=btn=>{
  document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>{x.classList.remove('active');x.style.removeProperty('display')});
  document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));
  $('ccPanelPantallaAeropuerto')?.classList.add('active');btn?.classList.add('active');clearTimeout(TIMER);shell();
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(TIMER)}else if($('ccPanelPantallaAeropuerto')?.classList.contains('active'))load()});
})();