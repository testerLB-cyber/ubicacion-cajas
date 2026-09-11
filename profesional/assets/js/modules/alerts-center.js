(function(){
let ccGlobalAlerts=[],ccAlertsTimer=null,ccAlertsLoading=false;

function ccAlertEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function ccAlertPerm(path){try{return typeof window.ccPerm==='function'&&window.ccPerm(path);}catch(_){return false;}}
function ccAlertAllowed(a){
  if(window.CC_ACCESS?.rol==='ADMIN')return true;
  if(!ccAlertPerm('notificaciones.ver'))return false;
  const nt=String(a.tipo||'').toUpperCase();
  if(['MANTENIMIENTO','EMAIL_MANTENIMIENTO'].includes(nt)&&!ccAlertPerm('notificaciones.mantenimiento'))return false;
  if(nt==='DOT'&&!ccAlertPerm('notificaciones.dot'))return false;
  if(nt.startsWith('RENTA')&&!ccAlertPerm('notificaciones.rentas'))return false;
  if(nt==='SIN_UBICACION'&&!ccAlertPerm('notificaciones.ubicacion'))return false;
  if(['SIN_DISPONIBILIDAD'].includes(nt)&&!ccAlertPerm('notificaciones.disponibilidad'))return false;
  if(nt==='COMPROBACION_ENLACE'&&!ccAlertPerm('notificaciones.comprobacion_enlace'))return false;
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


/* Tráfico App Profesional · Notificaciones por usuario + comprobaciones por enlace */
(function(){
  if(window.__ccUserNotificationsV1)return;
  window.__ccUserNotificationsV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const userKey=()=>String(window.CC_ACCESS?.email||window.CC_ACCESS?.nombre||window.CC_ACCESS?.rol||'usuario').toLowerCase();
  const key=s=>'cc_notifications_'+userKey()+'_'+s;
  const getJson=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch(_){return d}};
  const setJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const allowed=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('notificaciones.ver')&&window.ccPerm('notificaciones.comprobacion_enlace')&&window.ccPerm('anticipos.ver'));
  const activeSystem=()=>getJson(key('system'),false)===true;
  let timer=null,loading=false,bootstrapped=false;

  function localItems(){return getJson(key('items'),[])}
  function saveItems(v){setJson(key('items'),v.slice(0,100))}
  function attended(){return new Set(getJson(key('attended'),[]))}
  function markAttended(id){const s=attended();s.add(id);setJson(key('attended'),[...s].slice(-500));saveItems(localItems().map(x=>x.id===id?Object.assign({},x,{atendidaAt:new Date().toISOString()}):x));}
  function seen(){return new Set(getJson(key('seen'),[]))}
  function saveSeen(s){setJson(key('seen'),[...s].slice(-1000))}

  function toast(n){
    document.getElementById('ccNotifToast')?.remove();
    const d=document.createElement('div');d.id='ccNotifToast';d.style='position:fixed;right:18px;bottom:22px;z-index:100020;width:min(390px,calc(100vw - 36px));background:#111827;color:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 20px 50px rgba(0,0,0,.3);border-left:5px solid #f59e0b';
    d.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px"><div><div style="font-size:10px;font-weight:900;color:#fbbf24;text-transform:uppercase">Nueva notificación</div><strong style="display:block;margin-top:3px">'+esc(n.titulo)+'</strong><div style="font-size:11px;color:#d1d5db;margin-top:5px">'+esc(n.detalle)+'</div></div><button style="background:none;border:0;color:#fff;font-size:18px" aria-label="Cerrar">×</button></div>';
    d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);setTimeout(()=>d.remove(),10000);
  }
  function systemNotify(n){
    if(!activeSystem()||!('Notification' in window)||Notification.permission!=='granted')return;
    try{const x=new Notification(n.titulo,{body:n.detalle,tag:'trafico-'+n.id,renotify:true});x.onclick=()=>{window.focus();if(typeof window.ccOpenGlobalAlerts==='function')window.ccOpenGlobalAlerts();x.close()}}catch(_){}
  }
  async function requestSystem(){
    if(!('Notification' in window)){alert('Este navegador no admite notificaciones del sistema.');return}
    const p=await Notification.requestPermission();setJson(key('system'),p==='granted');
    alert(p==='granted'?'Notificaciones del sistema activadas para este usuario en este dispositivo.':'No se autorizaron las notificaciones del sistema.');
  }
  window.ccEnableSystemNotifications=requestSystem;

  async function pollLinkProofs(){
    if(loading||!window.CC_AUTH_READY||!sb()||!allowed())return;
    loading=true;
    try{
      const r=await sb().rpc('cc_ant_list');if(r.error)throw r.error;if(!r.data?.ok)return;
      const comps=(r.data.comprobaciones||[]).filter(c=>['ENLACE','LINK','PUBLICO','QR'].includes(String(c.origen||'').toUpperCase())&&String(c.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
      const ants=r.data.anticipos||[];const s=seen();
      if(!bootstrapped){comps.forEach(c=>s.add(c.id));saveSeen(s);bootstrapped=true;return}
      const fresh=comps.filter(c=>!s.has(c.id));
      fresh.forEach(c=>{
        s.add(c.id);const a=ants.find(x=>x.id===c.anticipo_id)||{};
        const n={id:'link-'+c.id,tipo:'COMPROBACION_ENLACE',titulo:'Comprobación recibida por enlace',detalle:(a.folio||'Anticipo')+' · '+(a.operador||a.responsable||'')+' · '+(c.concepto||'Comprobante')+' · '+money(c.monto),anticipoId:c.anticipo_id,createdAt:c.created_at||c.fecha||new Date().toISOString(),atendidaAt:null};
        const items=localItems();items.unshift(n);saveItems(items);toast(n);systemNotify(n);
      });saveSeen(s);
      if(fresh.length)updateBadge();
    }catch(e){console.warn('NOTIFICACIONES COMPROBACION ENLACE',e)}finally{loading=false}
  }
  function updateBadge(){
    const a=attended(),pending=localItems().filter(x=>!a.has(x.id)&&!x.atendidaAt).length,b=document.getElementById('ccGlobalAlertsBadge');
    if(b&&pending){const current=parseInt(b.textContent||'0',10)||0;b.textContent=String(Math.min(99,current+pending));b.style.display='flex'}
  }
  function augmentModal(){
    const modal=document.getElementById('ccGlobalAlertsModal');if(!modal)return;
    const head=modal.querySelector('.cc-alert-head > div:last-child');
    if(head&&!head.querySelector('[data-system-notif]')){const b=document.createElement('button');b.className='cc-btn cc-btn-light';b.dataset.systemNotif='1';b.textContent=('Notification' in window&&Notification.permission==='granted'?'Avisos del sistema ✓':'Activar avisos');b.onclick=requestSystem;head.prepend(b)}
    const body=modal.querySelector('.cc-alert-body');if(!body)return;
    const a=attended();
    if(!body.querySelector('#ccLinkNotifSection')){
      const items=localItems().filter(x=>!a.has(x.id)&&!x.atendidaAt);
      const box=document.createElement('div');box.id='ccLinkNotifSection';box.innerHTML=items.length?'<div style="font-size:10px;font-weight:900;color:#7c3aed;margin:14px 0 7px">COMPROBACIONES POR ENLACE</div>'+items.map(n=>'<div class="cc-alert-row high" data-local-notif="'+esc(n.id)+'"><div><strong>ANTICIPOS · '+esc(n.titulo)+'</strong><span>'+esc(n.detalle)+'</span></div><button class="cc-btn cc-btn-primary" data-attend-local="'+esc(n.id)+'">Atendida</button></div>').join(''):'';
      body.prepend(box);box.querySelectorAll('[data-attend-local]').forEach(b=>b.onclick=()=>{markAttended(b.dataset.attendLocal);b.closest('.cc-alert-row')?.remove();updateBadge()});
    }
    modal.querySelectorAll('.cc-alert-row:not([data-local-notif])').forEach((row,i)=>{
      if(row.querySelector('[data-attend-generic]'))return;
      const sig='generic-'+btoa(unescape(encodeURIComponent(row.innerText||('alert-'+i)))).replace(/[^a-z0-9]/gi,'').slice(0,60);
      if(a.has(sig)){row.remove();return}
      const b=document.createElement('button');b.className='cc-btn cc-btn-primary';b.dataset.attendGeneric=sig;b.textContent='Atendida';b.onclick=()=>{markAttended(sig);row.remove()};row.appendChild(b);
    });
  }
  function wrapOpen(){
    if(typeof window.ccOpenGlobalAlerts!=='function'||window.ccOpenGlobalAlerts.__notifUserV1)return;
    const o=window.ccOpenGlobalAlerts;const w=async function(){const r=await o.apply(this,arguments);setTimeout(augmentModal,0);return r};w.__notifUserV1=true;window.ccOpenGlobalAlerts=w;
  }
  function boot(){
    if(window.CC_AUTH_READY&&sb()){wrapOpen();pollLinkProofs();if(!timer)timer=setInterval(pollLinkProofs,15000)}else setTimeout(boot,700)
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900));else setTimeout(boot,900);
})();
