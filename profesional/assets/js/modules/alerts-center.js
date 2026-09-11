(function(){
let ccGlobalAlerts=[],ccAlertsTimer=null,ccAlertsLoading=false;

function ccAlertEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function ccAlertPerm(path){try{return typeof window.ccPerm==='function'&&window.ccPerm(path);}catch(_){return false;}}
function ccAlertAllowed(a){
  if(window.CC_ACCESS?.rol==='ADMIN')return true;
  switch(String(a.tipo||'').toUpperCase()){
    case 'MANTENIMIENTO':
    case 'EMAIL_MANTENIMIENTO':
      return ccAlertPerm('mantenimiento.ver')||ccAlertPerm('inventario.mantenimiento');
    case 'DOT':
      return ccAlertPerm('mantenimiento.ver_dot')||ccAlertPerm('mantenimiento.ver')||ccAlertPerm('inventario.dot');
    case 'RENTA_VENCIDA':
    case 'RENTA_POR_VENCER':
      return ccAlertPerm('rentas.ver')||ccAlertPerm('historial.ver')||ccAlertPerm('proforma.ver');
    case 'SIN_UBICACION':
      return ccAlertPerm('mapa.ver')||ccAlertPerm('inventario.ver');
    case 'SIN_DISPONIBILIDAD':
      return ccAlertPerm('control_cajas.ver');
    default:
      return ccAlertPerm('control_cajas.ver')||ccAlertPerm('dashboard.ver');
  }
}
function ccAlertDestinationPerm(dest){
  const d=String(dest||'').toLowerCase();
  if(d==='mantenimiento')return ccAlertPerm('mantenimiento.ver');
  if(d==='renta')return ccAlertPerm('rentas.ver');
  if(d==='mapa')return ccAlertPerm('mapa.ver');
  if(d==='inventario')return ccAlertPerm('inventario.ver');
  return ccAlertPerm('control_cajas.ver');
}
function ccAlertGo(dest){
  try{
    if(typeof window.gmMostrarControlCajas==='function')window.gmMostrarControlCajas();
    setTimeout(()=>{
      const d=String(dest||'').toLowerCase();
      const tab=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('"+d+"'"));
      if(tab&&typeof window.ccTab==='function')window.ccTab(d,tab);
    },80);
  }catch(e){console.warn('NAVEGACION ALERTA',e);}
  document.getElementById('ccGlobalAlertsModal')?.remove();
}
function ccLocalOperationalAlerts(){
  const out=[];
  try{
    if(!ccAlertPerm('control_cajas.ver'))return out;
    const units=(typeof cajas!=='undefined'&&Array.isArray(cajas))?cajas:[];
    const rents=(typeof rentas!=='undefined'&&Array.isArray(rentas))?rentas:[];
    if(!units.length)return out;
    const today=new Date().toISOString().slice(0,10);
    const active=units.filter(x=>String(x.estatus||'ACTIVO').toUpperCase()!=='INACTIVO');
    const maintenance=active.filter(x=>String(x.estatus||'').toUpperCase()==='MANTENIMIENTO');
    const rented=active.filter(x=>String(x.estatus||'').toUpperCase()!=='MANTENIMIENTO'&&rents.some(r=>{
      try{return typeof rentFor==='function'?rentFor(r.id,today):String(r.estatus||'ACTIVA').toUpperCase()==='ACTIVA';}catch(_){return false;}
    }));
    const available=Math.max(0,active.length-maintenance.length-rented.length);
    if(active.length&&available===0)out.push({tipo:'SIN_DISPONIBILIDAD',prioridad:3,unidad:'OPERACIÓN',titulo:'Sin unidades disponibles',detalle:'Todas las unidades activas están rentadas o en mantenimiento.',destino:'inventario'});
  }catch(_){}
  return out;
}
async function ccLoadGlobalAlerts(silent=true){
  if(ccAlertsLoading||!window.CC_AUTH_READY||!window.gmSupabase)return;
  ccAlertsLoading=true;
  try{
    const {data,error}=await window.gmSupabase.rpc('cc_alert_center');
    if(error)throw error;
    const server=(data?.ok&&Array.isArray(data.alertas)?data.alertas:[]);
    ccGlobalAlerts=[...server,...ccLocalOperationalAlerts()].filter(ccAlertAllowed);
    const btn=document.getElementById('ccGlobalAlertsBtn'),badge=document.getElementById('ccGlobalAlertsBadge');
    if(btn)btn.style.display='flex';
    if(badge){
      badge.textContent=ccGlobalAlerts.length>99?'99+':String(ccGlobalAlerts.length);
      badge.style.display=ccGlobalAlerts.length?'flex':'none';
    }
  }catch(e){
    if(!silent)alert('No se pudieron cargar las alertas. '+(e.message||e));
    console.warn('CENTRO DE ALERTAS:',e);
  }finally{ccAlertsLoading=false;}
}
window.ccOpenGlobalAlerts=async function(){
  await ccLoadGlobalAlerts(false);
  document.getElementById('ccGlobalAlertsModal')?.remove();
  const ov=document.createElement('div');ov.id='ccGlobalAlertsModal';ov.className='cc-alert-modal';
  const high=ccGlobalAlerts.filter(a=>Number(a.prioridad)>=3).length;
  const maint=ccGlobalAlerts.filter(a=>['MANTENIMIENTO','EMAIL_MANTENIMIENTO','DOT'].includes(String(a.tipo||'').toUpperCase())).length;
  const rent=ccGlobalAlerts.filter(a=>String(a.tipo||'').toUpperCase().startsWith('RENTA')).length;
  const location=ccGlobalAlerts.filter(a=>String(a.tipo||'').toUpperCase()==='SIN_UBICACION').length;
  ov.innerHTML='<div class="cc-alert-card"><div class="cc-alert-head"><div><b>CENTRO DE ALERTAS</b><div style="font-size:9px;color:#bfdbfe">Solo se muestran alertas de módulos permitidos para tu usuario</div></div><div style="display:flex;gap:7px"><button class="cc-btn cc-btn-light" data-refresh>Actualizar</button><button class="cc-btn cc-btn-light" data-close>Cerrar</button></div></div><div class="cc-alert-body">'+
    '<div class="cc-alert-summary"><div class="cc-alert-kpi"><small>Total visibles</small><strong>'+ccGlobalAlerts.length+'</strong></div><div class="cc-alert-kpi"><small>Prioridad alta</small><strong>'+high+'</strong></div><div class="cc-alert-kpi"><small>Mantenimiento / DOT</small><strong>'+maint+'</strong></div><div class="cc-alert-kpi"><small>Rentas / Ubicación</small><strong>'+(rent+location)+'</strong></div></div>'+
    (ccGlobalAlerts.length?ccGlobalAlerts.map(a=>'<div class="cc-alert-row '+(Number(a.prioridad)>=3?'high':Number(a.prioridad)<=1?'low':'')+'"><div><strong>'+ccAlertEsc(a.unidad||'GENERAL')+' · '+ccAlertEsc(a.titulo||a.tipo||'Alerta')+'</strong><span>'+ccAlertEsc(a.detalle||'')+'</span></div>'+(ccAlertDestinationPerm(a.destino)?'<button class="cc-btn cc-btn-light" data-dest="'+ccAlertEsc(a.destino||'')+'">Abrir</button>':'')+'</div>').join(''):'<div class="cc-note" style="padding:18px;text-align:center">✓ No hay alertas visibles para tu usuario en este momento.</div>')+
    '</div></div>';
  document.body.appendChild(ov);
  ov.querySelector('[data-close]').onclick=()=>ov.remove();
  ov.querySelector('[data-refresh]').onclick=async()=>{ov.remove();await window.ccOpenGlobalAlerts();};
  ov.querySelectorAll('[data-dest]').forEach(b=>b.onclick=()=>ccAlertGo(b.dataset.dest));
};
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('ccGlobalAlertsBtn');if(btn)btn.onclick=window.ccOpenGlobalAlerts;
  const boot=()=>{
    if(window.CC_AUTH_READY&&window.gmSupabase){
      ccLoadGlobalAlerts(true);
      if(!ccAlertsTimer)ccAlertsTimer=setInterval(()=>ccLoadGlobalAlerts(true),120000);
    }else setTimeout(boot,700);
  };
  setTimeout(boot,900);
});
})();
