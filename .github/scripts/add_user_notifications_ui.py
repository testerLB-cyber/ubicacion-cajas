from pathlib import Path

AUTH=Path('profesional/assets/js/security/auth-permissions.js')
ALERTS=Path('profesional/assets/js/modules/alerts-center.js')
if not AUTH.exists() or not ALERTS.exists():
    raise SystemExit('Faltan archivos profesionales de auth/alertas')

auth=AUTH.read_text(encoding='utf-8')
marker=" ['notificaciones','Notificaciones'"
if marker not in auth:
    needle=" ['usuarios','Usuarios',[['ver','Ver'],['administrar','Administrar']]]"
    repl=" ['notificaciones','Notificaciones',[['ver','Ver centro de notificaciones'],['comprobacion_enlace','Comprobaciones por enlace'],['mantenimiento','Mantenimiento'],['dot','DOT'],['rentas','Rentas'],['ubicacion','Ubicación'],['disponibilidad','Disponibilidad operativa']]],\n"+needle
    if needle not in auth:
        raise SystemExit('No se encontró PERM_SCHEMA para insertar notificaciones')
    auth=auth.replace(needle,repl,1)
    AUTH.write_text(auth,encoding='utf-8')

alerts=ALERTS.read_text(encoding='utf-8')
# Endurecer filtrado por permiso de notificación específico para usuarios no ADMIN.
needle="function ccAlertAllowed(a){\n  if(window.CC_ACCESS?.rol==='ADMIN')return true;"
if needle in alerts and "notificaciones.comprobacion_enlace" not in alerts:
    repl="""function ccAlertAllowed(a){
  if(window.CC_ACCESS?.rol==='ADMIN')return true;
  if(!ccAlertPerm('notificaciones.ver'))return false;
  const nt=String(a.tipo||'').toUpperCase();
  if(['MANTENIMIENTO','EMAIL_MANTENIMIENTO'].includes(nt)&&!ccAlertPerm('notificaciones.mantenimiento'))return false;
  if(nt==='DOT'&&!ccAlertPerm('notificaciones.dot'))return false;
  if(nt.startsWith('RENTA')&&!ccAlertPerm('notificaciones.rentas'))return false;
  if(nt==='SIN_UBICACION'&&!ccAlertPerm('notificaciones.ubicacion'))return false;
  if(['SIN_DISPONIBILIDAD'].includes(nt)&&!ccAlertPerm('notificaciones.disponibilidad'))return false;
  if(nt==='COMPROBACION_ENLACE'&&!ccAlertPerm('notificaciones.comprobacion_enlace'))return false;"""
    alerts=alerts.replace(needle,repl,1)

extra=r'''

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
'''
marker2='/* Tráfico App Profesional · Notificaciones por usuario + comprobaciones por enlace */'
if marker2 not in alerts:
    alerts += extra
ALERTS.write_text(alerts,encoding='utf-8')
print('Notificaciones por usuario integradas en version profesional')
