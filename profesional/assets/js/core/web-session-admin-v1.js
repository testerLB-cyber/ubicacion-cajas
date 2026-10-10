(()=>{'use strict';
const sb=()=>window.gmSupabase,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyName='cc_professional_web_session_key';let key=sessionStorage.getItem(keyName);if(!key){key=crypto.randomUUID();sessionStorage.setItem(keyName,key)}
let lastUid='',heartbeatBusy=false;
async function rpc(action,extra={}){const {data,error}=await sb().rpc('cc_web_session_control',{p_action:action,...extra});if(error)throw error;return data}
function has(which){const a=window.CC_ACCESS||{};return a.superAdmin===true||a.es_super_admin===true||a.permisos?.[which]?.[which==='sesiones_web'?'administrar':'enviar']===true}
async function tick(){
 if(heartbeatBusy||!sb()||!window.CC_AUTH_READY)return;
 heartbeatBusy=true;
 try{
  const {data:{session}}=await sb().auth.getSession();const user=session?.user;
  if(!user){lastUid='';return}
  lastUid=user.id;
  const state=await rpc('heartbeat',{p_client_key:key});
  if(state?.revoked){sessionStorage.removeItem(keyName);await sb().auth.signOut();window.CC_AUTH_READY=false;window.CC_ACCESS=null;document.body.classList.add('cc-auth-locked');document.getElementById('ccLoginGate')?.classList.remove('cc-hidden');alert('Esta sesión fue cerrada por el administrador. Inicia sesión nuevamente.');location.reload();}
 }catch(e){console.warn('SESSION_HEARTBEAT',e.message||e)}finally{heartbeatBusy=false}
}
const styles=document.createElement('style');styles.textContent=`
.cc-admin-modal{position:fixed;inset:0;background:#091728a8;z-index:2147482500;display:flex;align-items:center;justify-content:center;padding:16px}
.cc-admin-card{background:#fff;color:#17263e;border-radius:18px;width:min(900px,95vw);max-height:90vh;overflow:auto;box-shadow:0 25px 75px #0005;padding:22px}
.cc-admin-card h2{margin:0 0 4px;font-size:21px}.cc-admin-card p{font-size:13px;color:#64748b}
.cc-admin-action{border:0;background:#1d4ed8;color:#fff;border-radius:9px;padding:9px 14px;cursor:pointer;font-weight:700}
.cc-admin-action.danger{background:#b91c1c}.cc-admin-action.subtle{background:#f1f5f9;color:#334155}
.cc-admin-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:10px;font:inherit}
.cc-admin-user{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap}
`;document.head.appendChild(styles);
function modal(title){document.getElementById('ccWebAdminModal')?.remove();const root=document.createElement('div');root.id='ccWebAdminModal';root.className='cc-admin-modal';root.innerHTML='<div class="cc-admin-card"><div style="display:flex;justify-content:space-between;align-items:center"><h2>'+esc(title)+'</h2><button class="cc-admin-action subtle" id="ccWebClose">Cerrar ✕</button></div><div id="ccWebAdminContent">Cargando…</div></div>';document.body.appendChild(root);root.querySelector('#ccWebClose').onclick=()=>root.remove();root.addEventListener('click',e=>{if(e.target===root)root.remove()});return root.querySelector('#ccWebAdminContent')}
window.ccManageWebSessions=async()=>{
 if(!has('sesiones_web'))return alert('No tienes permiso para administrar sesiones');
 const body=modal('Sesiones activas · Web App');
 async function refresh(){
  body.innerHTML='Cargando sesiones…';
  try{const x=await rpc('list');const rows=x.sessions||[];
  body.innerHTML='<p>Actividad de los últimos 30 minutos. <b>En línea</b> significa actividad en los últimos 2 minutos. El cierre remoto se detecta durante la próxima comprobación del navegador.</p><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><b>'+rows.filter(r=>r.online).length+' en línea · '+rows.length+' recientes</b><button class="cc-admin-action subtle" id="ccWebRefresh">Actualizar</button></div><div id="ccWebSessionRows"></div>';
  body.querySelector('#ccWebRefresh').onclick=refresh;
  const list=body.querySelector('#ccWebSessionRows');
  rows.forEach(row=>{const div=document.createElement('div');div.className='cc-admin-user';const device=/Mobile|Android|iPhone/i.test(row.user_agent||'')?'Móvil':'Escritorio';div.innerHTML='<div><b>'+esc(row.nombre||row.email||'Usuario')+'</b> <span style="color:'+(row.online?'#15803d':'#b45309')+'">'+(row.online?'● En línea':'● Reciente')+'</span><div style="font-size:12px;color:#64748b">'+esc(row.email||'')+' · '+device+' · Última actividad '+esc(new Date(row.last_seen_at).toLocaleString('es-MX'))+'</div></div><button class="cc-admin-action danger">Cerrar sesión</button>';div.querySelector('button').onclick=async()=>{if(!confirm('¿Cerrar remotamente esta sesión de '+(row.nombre||'usuario')+'?'))return;try{await rpc('revoke',{p_session_id:row.id});await refresh()}catch(e){alert(e.message)}};list.appendChild(div)});
  }catch(e){body.textContent='Error: '+e.message}
 }
 await refresh();
};
window.ccSendWebNotifications=async()=>{
 if(!has('notificaciones_usuarios'))return alert('No tienes permiso para enviar notificaciones');
 const body=modal('Notificaciones · Usuarios Web');
 try{const x=await rpc('users');const users=x.users||[];
 body.innerHTML='<p>Envía un aviso a los usuarios de la aplicación web. Aparecerá mediante el sistema existente de notificaciones en tiempo real.</p><label style="display:block;margin:12px 0">Título<input id="ccWebNotifTitle" maxlength="120" class="cc-admin-input" placeholder="Aviso importante"></label><label style="display:block;margin:12px 0">Mensaje<textarea id="ccWebNotifMessage" maxlength="1000" rows="4" class="cc-admin-input" placeholder="Escribe tu notificación..."></textarea></label><label style="display:block;margin:12px 0"><input type="checkbox" id="ccWebSelectAll"> Seleccionar todos los usuarios web</label><input id="ccWebSearchUser" class="cc-admin-input" placeholder="Buscar usuario..."><div id="ccWebNotifUsers" style="max-height:240px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px;margin:12px 0"></div><button id="ccWebNotifSend" class="cc-admin-action">Enviar notificación</button><span id="ccWebNotifResult" style="margin-left:12px"></span>';
 const wrap=body.querySelector('#ccWebNotifUsers');
 users.forEach(u=>{const label=document.createElement('label');label.className='cc-admin-user';label.dataset.search=((u.nombre||'')+' '+(u.email||'')).toLowerCase();const c=document.createElement('input');c.type='checkbox';c.className='ccWebRecipient';c.value=u.id;label.append(c,document.createTextNode(' '+(u.nombre||'Usuario')+' · '+(u.email||'')));wrap.append(label)});
 body.querySelector('#ccWebSelectAll').onchange=e=>wrap.querySelectorAll('.ccWebRecipient').forEach(x=>x.checked=e.target.checked);
 body.querySelector('#ccWebSearchUser').oninput=e=>wrap.querySelectorAll('label').forEach(x=>x.style.display=x.dataset.search.includes(e.target.value.toLowerCase())?'':'none');
 body.querySelector('#ccWebNotifSend').onclick=async()=>{const title=body.querySelector('#ccWebNotifTitle').value.trim(),message=body.querySelector('#ccWebNotifMessage').value.trim(),ids=[...wrap.querySelectorAll('.ccWebRecipient:checked')].map(x=>x.value);if(!title||!message||!ids.length)return alert('Captura título, mensaje y destinatarios');if(!confirm('¿Enviar notificación a '+ids.length+' usuarios?'))return;const b=body.querySelector('#ccWebNotifSend');b.disabled=true;try{const r=await rpc('send',{p_user_ids:ids,p_title:title,p_message:message});body.querySelector('#ccWebNotifResult').textContent='Enviadas: '+r.sent}catch(e){alert(e.message)}finally{b.disabled=false}};
 }catch(e){body.textContent='Error: '+e.message}
};
function buttons(){const a=document.getElementById('gmSideOperatorNotifications');if(!a)return;const session=document.getElementById('gmSideWebSessions'),notify=document.getElementById('gmSideWebNotifs');if(session)session.style.display=has('sesiones_web')?'':'none';if(notify)notify.style.display=has('notificaciones_usuarios')?'':'none'}
setInterval(()=>{buttons();tick()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});setTimeout(()=>{buttons();tick()},2500);
window.addEventListener('beforeunload',()=>{});window.ccWebSessionEndSelf=async()=>{try{await rpc('end_self',{p_client_key:key})}catch(_){}finally{key=crypto.randomUUID();sessionStorage.setItem(keyName,key)}};
})();