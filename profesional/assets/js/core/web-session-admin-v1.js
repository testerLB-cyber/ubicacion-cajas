(()=>{'use strict';
const sb=()=>window.gmSupabase,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyName='cc_professional_web_session_key';let key=sessionStorage.getItem(keyName);if(!key){key=crypto.randomUUID();sessionStorage.setItem(keyName,key)}
let lastUid='',heartbeatBusy=false;
async function rpc(action,extra={}){const {data,error}=await sb().rpc('cc_web_session_control',{p_action:action,p_client_key:null,p_session_id:null,p_user_ids:null,p_title:null,p_message:null,p_image_path:null,...extra});if(error)throw error;return data}
function has(which){const a=window.CC_ACCESS||{};return a.superAdmin===true||a.es_super_admin===true||a.rol==='ADMIN'||a.permisos?.[which]?.[which==='sesiones_web'?'administrar':'enviar']===true}
function canViewNotificationCatalog(){const a=window.CC_ACCESS||{};return a.superAdmin===true||a.es_super_admin===true||a.permisos?.catalogo_notificaciones?.ver===true||a.permisos?.notificaciones_usuarios?.ver_confirmaciones===true}
async function forceFreshAppReload(){
 try{
  if('caches' in window){
   const keys=await caches.keys();
   await Promise.all(keys.filter(k=>k.startsWith('trafico-profesional-')).map(k=>caches.delete(k)));
  }
 }catch(e){console.warn('APP CACHE CLEANUP',e.message||e)}
 try{
  if('serviceWorker' in navigator){
   const reg=await navigator.serviceWorker.getRegistration('./');
   if(reg)await reg.unregister();
  }
 }catch(e){console.warn('SERVICE WORKER RESET',e.message||e)}
 const url=new URL(location.href);
 url.searchParams.set('_session_refresh',String(Date.now()));
 location.replace(url.toString());
}
async function tick(){
 if(heartbeatBusy||!sb()||!window.CC_AUTH_READY)return;
 heartbeatBusy=true;
 try{
  const {data:{session}}=await sb().auth.getSession();const user=session?.user;
  if(!user){lastUid='';return}
  lastUid=user.id;
  const state=await rpc('heartbeat',{p_client_key:key});
  if(state?.revoked){sessionStorage.removeItem(keyName);await sb().auth.signOut();window.CC_AUTH_READY=false;window.CC_ACCESS=null;document.body.classList.add('cc-auth-locked');document.getElementById('ccLoginGate')?.classList.remove('cc-hidden');alert('Tu sesión fue cerrada por el administrador. Se actualizará la aplicación; inicia sesión nuevamente.');await forceFreshAppReload();}
 }catch(e){console.warn('SESSION_HEARTBEAT',e.message||e)}finally{heartbeatBusy=false}
}
const styles=document.createElement('style');styles.textContent=`
.cc-admin-modal{position:fixed;inset:0;background:#091728a8;z-index:2147482500;display:flex;align-items:center;justify-content:center;padding:16px}
.cc-admin-card{background:#fff;color:#17263e;border-radius:18px;width:min(1440px,98vw);max-height:94vh;overflow:auto;box-shadow:0 25px 75px #0005;padding:22px}.cc-admin-card:has(.cc-notif-workspace){width:min(1600px,98vw)}
.cc-admin-card h2{margin:0 0 4px;font-size:21px}.cc-admin-card p{font-size:13px;color:#64748b}
.cc-admin-action{border:0;background:#1d4ed8;color:#fff;border-radius:9px;padding:9px 14px;cursor:pointer;font-weight:700}
.cc-admin-action.danger{background:#b91c1c}.cc-admin-action.subtle{background:#f1f5f9;color:#334155}
.cc-admin-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:10px;font:inherit}
.cc-admin-user{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap}.cc-notif-workspace{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:18px}.cc-notif-panel{border:1px solid #dbe4ef;border-radius:14px;padding:16px;background:#f8fafc}.cc-notif-preview{background:white;border:1px solid #dbe4ef;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px #0f172a0d}.cc-notif-preview-head{padding:16px 18px;background:#eff6ff;font-weight:800;color:#0f172a}.cc-notif-preview-body{padding:18px;color:#334155;white-space:pre-wrap;min-height:60px}.cc-notif-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}.cc-notif-toolbar button{background:#e2e8f0;color:#0f172a;padding:5px 9px}.cc-notif-preview img{display:block;max-width:100%;max-height:220px;object-fit:contain;margin:0 auto 12px}@media(max-width:760px){.cc-notif-workspace{grid-template-columns:1fr}}
.cc-admin-card.cc-notif-catalog-modal{width:min(1080px,96vw);max-height:92vh;padding:18px}
.cc-notif-catalog-root{display:flex;flex-direction:column;gap:12px;color:#17263e}
.cc-notif-catalog-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.cc-notif-catalog-stats{display:flex;gap:8px;flex-wrap:wrap}
.cc-notif-stat{font-size:12px;padding:6px 9px;border:1px solid #dbe4ef;background:#f8fafc;border-radius:9px;font-weight:800}
.cc-notif-batch-list{display:flex;flex-direction:column;gap:7px;max-height:59vh;overflow:auto;padding:2px}
.cc-notif-batch{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 13px;border:1px solid #dbe4ef;border-radius:11px;background:#fff;cursor:pointer;text-align:left;color:#17263e;width:100%;box-sizing:border-box}
.cc-notif-batch:hover{background:#f8fafc;border-color:#93c5fd}
.cc-notif-batch-main{min-width:0;flex:1}.cc-notif-batch-title{font-size:13px;font-weight:850;overflow-wrap:anywhere}
.cc-notif-batch-sub{font-size:11px;color:#64748b;margin-top:4px}.cc-notif-batch-preview{font-size:12px;color:#475569;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:760px}
.cc-notif-counts{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.cc-notif-pill{display:inline-block;font-size:10px;font-weight:850;padding:4px 7px;border-radius:99px;white-space:nowrap}
.cc-notif-pill.ok{background:#dcfce7;color:#166534}.cc-notif-pill.pending{background:#fef3c7;color:#92400e}.cc-notif-pill.neutral{background:#e2e8f0;color:#334155}
.cc-notif-detail-preview{border:1px solid #dbe4ef;border-radius:13px;overflow:hidden;background:#fff}
.cc-notif-detail-preview-head{padding:13px 15px;background:#eff6ff;border-bottom:1px solid #dbeafe}
.cc-notif-detail-title{font-size:16px;font-weight:900;color:#0f172a}.cc-notif-detail-meta{font-size:11px;color:#64748b;margin-top:5px}
.cc-notif-detail-body{padding:15px;font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;color:#334155}
.cc-notif-detail-image{display:block;max-width:100%;max-height:300px;object-fit:contain;margin:0 auto 14px;border-radius:9px}
.cc-notif-recipient-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cc-notif-recipient-panel{border:1px solid #dbe4ef;border-radius:11px;overflow:hidden;background:#fff;min-width:0}
.cc-notif-recipient-panel h4{margin:0;padding:10px 12px;font-size:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.cc-notif-recipient-list{max-height:32vh;overflow:auto}.cc-notif-recipient{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:9px 11px;border-bottom:1px solid #f1f5f9}
.cc-notif-recipient:last-child{border-bottom:0}.cc-notif-recipient-name{font-size:12px;font-weight:800;overflow-wrap:anywhere}.cc-notif-recipient-meta{font-size:10px;color:#64748b;margin-top:3px;overflow-wrap:anywhere}.cc-notif-empty{padding:18px;text-align:center;color:#64748b;font-size:12px}
@media(max-width:700px){.cc-notif-recipient-columns{grid-template-columns:1fr}.cc-notif-batch{align-items:flex-start;flex-direction:column}.cc-notif-counts{justify-content:flex-start}.cc-notif-batch-list{max-height:52vh}}
`;document.head.appendChild(styles);
function modal(title){document.getElementById('ccWebAdminModal')?.remove();const root=document.createElement('div');root.id='ccWebAdminModal';root.className='cc-admin-modal';root.innerHTML='<div class="cc-admin-card"><div style="display:flex;justify-content:space-between;align-items:center"><h2>'+esc(title)+'</h2><button class="cc-admin-action subtle" id="ccWebClose">Cerrar ✕</button></div><div id="ccWebAdminContent">Cargando…</div></div>';document.body.appendChild(root);root.querySelector('#ccWebClose').onclick=()=>root.remove();root.addEventListener('click',e=>{if(e.target===root)root.remove()});return root.querySelector('#ccWebAdminContent')}
window.ccManageMirrorSessions=async()=>{
 if(!has('sesiones_web'))return alert('No tienes permiso para administrar sesiones');
 const body=modal('Usuarios Cuenta Espejo · Sesiones');
 async function refresh(){
  body.innerHTML='Cargando sesiones…';
  try{
   const {data,error}=await sb().rpc('cc_mirror_session_control',{p_action:'list'});
   if(error)throw error;
   const rows=data?.sessions||[];
   body.innerHTML='<p>Sesiones de cuentas externas de Cuenta Espejo activas en los últimos 30 minutos. El cierre remoto se aplica en la siguiente comprobación (máximo aproximado 20 segundos).</p><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin:10px 0"><b>'+rows.filter(r=>r.online).length+' en línea · '+rows.length+' recientes</b><button class="cc-admin-action subtle" id="ccMirrorRefresh">Actualizar</button></div><div id="ccMirrorRows"></div>';
   body.querySelector('#ccMirrorRefresh').onclick=refresh;
   const list=body.querySelector('#ccMirrorRows');
   if(!rows.length){list.innerHTML='<div class="cc-admin-user">No hay sesiones recientes registradas. Al entrar al portal aparecerán aquí.</div>';return}
   rows.forEach(row=>{const div=document.createElement('div');div.className='cc-admin-user';const device=/Mobile|Android|iPhone/i.test(row.user_agent||'')?'Móvil':'Escritorio';div.innerHTML='<div style="min-width:0;flex:1"><b>'+esc(row.nombre||row.email||'Usuario')+'</b> <span style="color:'+(row.online?'#15803d':'#b45309')+'">'+(row.online?'● En línea':'● Reciente')+'</span><div style="font-size:12px;color:#64748b">'+esc(row.email||'')+' · Cliente: '+esc(row.cliente||'Sin cliente')+' · '+device+'<br>Última actividad: '+esc(new Date(row.last_seen_at).toLocaleString('es-MX'))+'</div></div><button class="cc-admin-action danger">Cerrar sesión</button>';div.querySelector('button').onclick=async()=>{if(!confirm('¿Cerrar remotamente la sesión de '+(row.nombre||row.email||'este usuario')+'?'))return;try{const r=await sb().rpc('cc_mirror_session_control',{p_action:'revoke',p_session_id:row.id});if(r.error)throw r.error;await refresh()}catch(e){alert('No se pudo cerrar la sesión: '+e.message)}};list.appendChild(div)});
  }catch(e){body.textContent='Error al consultar sesiones Cuenta Espejo: '+e.message}
 }
 await refresh();
};
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
window.ccSendOperatorNotifications=async()=>{
 const body=modal('Notificaciones · Operadores');
 body.innerHTML='<p>Envía avisos a uno, varios o todos los operadores de la aplicación móvil.</p><label style="display:block;margin:12px 0">Título<input id="ccOpNotifTitle" maxlength="120" class="cc-admin-input" placeholder="Aviso de operación"></label><label style="display:block;margin:12px 0">Prioridad / origen<select id="ccOpNotifSource" class="cc-admin-input"><option>OPERACION</option><option>TRAFICO</option><option>MANTENIMIENTO</option><option>ADMINISTRACION</option><option>URGENTE</option></select></label><label style="display:block;margin:12px 0">Mensaje<textarea id="ccOpNotifBody" maxlength="1200" rows="4" class="cc-admin-input" placeholder="Escribe el mensaje..."></textarea></label><div style="display:flex;gap:10px;align-items:center;justify-content:space-between"><label><input id="ccOpNotifAll" type="checkbox"> Seleccionar todos</label><span id="ccOpNotifCount">0 seleccionados</span></div><input id="ccOpNotifSearch" class="cc-admin-input" placeholder="Buscar operador..." style="margin-top:12px"><div id="ccOpNotifList" style="max-height:250px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px;margin:12px 0">Cargando operadores…</div><button id="ccOpNotifSend" class="cc-admin-action" disabled>Enviar notificación</button><span id="ccOpNotifStatus" style="margin-left:12px"></span>';
 const list=body.querySelector('#ccOpNotifList'),status=body.querySelector('#ccOpNotifStatus'),btn=body.querySelector('#ccOpNotifSend');
 try{
 const {data,error}=await sb().rpc('cc_operator_notification_directory');
 if(error)throw error;if(!data?.ok)throw Error('No tienes permiso para enviar notificaciones');
 const operators=data.operadores||[];
 list.innerHTML='';
 const count=()=>{body.querySelector('#ccOpNotifCount').textContent=list.querySelectorAll('input:checked').length+' seleccionados'};
 operators.forEach(u=>{const label=document.createElement('label');label.className='cc-admin-user';label.dataset.search=((u.operador_nombre||'')+' '+(u.nombre||'')).toLowerCase();const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='ccOpRecipient';checkbox.value=u.user_id;checkbox.onchange=count;const name=document.createElement('span');name.textContent=(u.operador_nombre||u.nombre||'Operador')+(u.nombre&&u.operador_nombre?' · '+u.nombre:'');label.append(checkbox,name);list.append(label)});
 body.querySelector('#ccOpNotifAll').onchange=e=>{list.querySelectorAll('input').forEach(c=>c.checked=e.target.checked);count()};
 body.querySelector('#ccOpNotifSearch').oninput=e=>list.querySelectorAll('label').forEach(el=>el.style.display=el.dataset.search.includes(e.target.value.toLowerCase())?'':'none');
 btn.disabled=false;
 btn.onclick=async()=>{const ids=[...list.querySelectorAll('input:checked')].map(c=>c.value),title=body.querySelector('#ccOpNotifTitle').value.trim(),message=body.querySelector('#ccOpNotifBody').value.trim(),source=body.querySelector('#ccOpNotifSource').value;if(!ids.length||!title||!message)return alert('Selecciona destinatarios y captura título y mensaje');if(!confirm('¿Enviar aviso a '+ids.length+' operadores?'))return;btn.disabled=true;status.textContent='Enviando…';try{const {data:result,error:sendError}=await sb().rpc('cc_send_operator_notification',{p_user_ids:ids,p_title:title,p_body:message,p_url:'/operador-v2/',p_source:source});if(sendError)throw sendError;const push=await sb().functions.invoke('operator-web-push',{body:{action:'send',userIds:ids,title,message,url:'/operador-v2/'}});if(push.error){status.textContent='Aviso guardado ('+(result?.enviadas||0)+'), pero Push falló: '+push.error.message;return}status.textContent='Avisos: '+(result?.enviadas||0)+' · Push enviados: '+(push.data?.sent||0);body.querySelector('#ccOpNotifBody').value=''}catch(e){status.textContent='Error: '+e.message}finally{btn.disabled=false}};
 }catch(e){list.textContent='No fue posible cargar operadores: '+e.message;status.textContent='Acceso restringido'}
};
window.ccSendWebNotifications=async()=>{
 if(!has('notificaciones_usuarios'))return alert('No tienes permiso para enviar notificaciones');
 const body=modal('Notificaciones · Usuarios Web');
 try{const x=await rpc('users');const users=x.users||[];
 body.innerHTML='<p>Centro de comunicación · redacta, revisa y envía avisos a usuarios web. La imagen es opcional.</p><div class="cc-notif-workspace"><section class="cc-notif-panel"><label style="display:block;margin:0 0 12px">Título<input id="ccWebNotifTitle" maxlength="120" class="cc-admin-input" placeholder="Aviso importante"></label><label style="display:block;margin:12px 0 6px">Mensaje</label><div class="cc-notif-toolbar"><button type="button" class="cc-admin-action" data-wrap="**">Negrita</button><button type="button" class="cc-admin-action" data-wrap="_">Cursiva</button><button type="button" class="cc-admin-action" data-wrap="\n• ">Viñeta</button></div><textarea id="ccWebNotifMessage" maxlength="1000" rows="5" class="cc-admin-input" placeholder="Escribe tu notificación..."></textarea><small style="color:#64748b">Usa los controles de formato y revisa la vista previa antes de enviar.</small><label style="display:block;margin:12px 0">Imagen opcional (JPG, PNG o WEBP · máximo 5 MB)<input id="ccWebNotifImage" type="file" accept="image/jpeg,image/png,image/webp" class="cc-admin-input"></label><div id="ccWebNotifImagePreview" style="display:none;margin:8px 0"><img alt="Vista previa de la imagen" style="display:block;max-width:100%;max-height:180px;object-fit:contain;border-radius:10px"><button type="button" id="ccWebNotifImageRemove" class="cc-admin-action subtle" style="margin-top:6px">Quitar imagen</button></div><label style="display:flex;gap:8px;align-items:center;margin:16px 0"><input type="checkbox" id="ccWebSelectAll"> Seleccionar todos los usuarios web</label><input id="ccWebSearchUser" class="cc-admin-input" placeholder="Buscar usuario..."><div id="ccWebNotifUsers" style="max-height:190px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px;margin:12px 0;background:white"></div><button id="ccWebNotifSend" class="cc-admin-action">Enviar notificación</button> <button id="ccWebNotifCatalog" class="cc-admin-action subtle" type="button">Ver confirmaciones</button><span id="ccWebNotifResult" style="display:block;margin-top:10px"></span></section><aside><div class="cc-notif-preview"><div class="cc-notif-preview-head">🔔 Vista previa de notificación</div><div id="ccWebPreviewTitle" style="font-weight:800;padding:14px 18px 0">Aviso importante</div><div id="ccWebPreviewBody" class="cc-notif-preview-body">Aquí aparecerá el mensaje tal como lo verá el usuario.</div><div id="ccWebPreviewImageWrap" style="display:none;padding:0 16px"><img id="ccWebPreviewImage" alt="Vista previa adjunta"></div><div style="padding:12px 18px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:right"><span style="display:inline-block;background:#0f172a;color:white;padding:8px 12px;border-radius:9px;font-size:12px;font-weight:800">Enterado</span></div></div></aside></div>';
 const wrap=body.querySelector('#ccWebNotifUsers');const titleInput=body.querySelector('#ccWebNotifTitle'),messageInput=body.querySelector('#ccWebNotifMessage');const updatePreview=()=>{body.querySelector('#ccWebPreviewTitle').textContent=titleInput.value||'Aviso importante';body.querySelector('#ccWebPreviewBody').textContent=messageInput.value||'Aquí aparecerá el mensaje tal como lo verá el usuario.'};titleInput.oninput=messageInput.oninput=updatePreview;body.querySelectorAll('[data-wrap]').forEach(btn=>btn.onclick=()=>{const mark=btn.dataset.wrap,start=messageInput.selectionStart,end=messageInput.selectionEnd,selected=messageInput.value.slice(start,end)||'texto';messageInput.setRangeText(mark==='\\n• '?'\\n• '+selected:mark+selected+mark,start,end,'select');messageInput.focus();updatePreview()});const imageInput=body.querySelector('#ccWebNotifImage'),preview=body.querySelector('#ccWebNotifImagePreview');let selectedImage=null,previewUrl=null;imageInput.onchange=()=>{const f=imageInput.files?.[0];if(!f){selectedImage=null;preview.style.display='none';return}if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){alert('La imagen debe ser JPG, PNG o WEBP y no superar 5 MB.');imageInput.value='';selectedImage=null;preview.style.display='none';return}selectedImage=f;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(f);preview.querySelector('img').src=previewUrl;preview.style.display='block';body.querySelector('#ccWebPreviewImage').src=previewUrl;body.querySelector('#ccWebPreviewImageWrap').style.display='block'};body.querySelector('#ccWebNotifImageRemove').onclick=()=>{imageInput.value='';selectedImage=null;preview.style.display='none';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;body.querySelector('#ccWebPreviewImageWrap').style.display='none';body.querySelector('#ccWebPreviewImage').removeAttribute('src')};
 users.forEach(u=>{const label=document.createElement('label');label.className='cc-admin-user';label.dataset.search=((u.nombre||'')+' '+(u.email||'')).toLowerCase();const c=document.createElement('input');c.type='checkbox';c.className='ccWebRecipient';c.value=u.id;label.append(c,document.createTextNode(' '+(u.nombre||'Usuario')+' · '+(u.email||'')));wrap.append(label)});
 body.querySelector('#ccWebSelectAll').onchange=e=>wrap.querySelectorAll('.ccWebRecipient').forEach(x=>x.checked=e.target.checked);
 body.querySelector('#ccWebSearchUser').oninput=e=>wrap.querySelectorAll('label').forEach(x=>x.style.display=x.dataset.search.includes(e.target.value.toLowerCase())?'':'none');
 body.querySelector('#ccWebNotifCatalog').style.display=canViewNotificationCatalog()?'':'none';body.querySelector('#ccWebNotifCatalog').onclick=()=>window.ccOpenWebNotificationCatalog?.(body);body.querySelector('#ccWebNotifSend').onclick=async()=>{const title=body.querySelector('#ccWebNotifTitle').value.trim(),message=body.querySelector('#ccWebNotifMessage').value.trim(),ids=[...wrap.querySelectorAll('.ccWebRecipient:checked')].map(x=>x.value);if(!title||!message||!ids.length)return alert('Captura título, mensaje y destinatarios');if(!confirm('¿Enviar notificación a '+ids.length+' usuarios?'))return;const b=body.querySelector('#ccWebNotifSend');b.disabled=true;try{let imagePath=null;if(selectedImage){const {data:{user},error:userError}=await sb().auth.getUser();if(userError||!user)throw userError||new Error('Sesión no disponible');const ext=selectedImage.type==='image/jpeg'?'jpg':selectedImage.type==='image/png'?'png':'webp';imagePath=user.id+'/'+crypto.randomUUID()+'.'+ext;const up=await sb().storage.from('cc-web-notifications').upload(imagePath,selectedImage,{contentType:selectedImage.type,upsert:false});if(up.error)throw up.error}const r=await rpc('send',{p_user_ids:ids,p_title:title,p_message:message,p_image_path:imagePath});body.querySelector('#ccWebNotifResult').textContent='Enviadas: '+r.sent}catch(e){alert(e.message)}finally{b.disabled=false}};
 }catch(e){body.textContent='Error: '+e.message}
};

window.ccOpenWebNotificationCatalog=async function(parentBody){
 if(!canViewNotificationCatalog())return alert('No tienes permiso para ver el Catálogo de notificaciones. Solicita el permiso en Usuarios → Permisos.');
 const returnHtml=parentBody?parentBody.innerHTML:null;
 const holder=parentBody||modal('Catálogo de notificaciones');
 if(!parentBody)holder.closest('.cc-admin-card')?.classList.add('cc-notif-catalog-modal');
 const fmt=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'})};
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
 const groupRows=rows=>{
  const map=new Map();
  rows.forEach(r=>{
   // El envío inserta todos los destinatarios en una sola transacción; created_at, título y contenido identifican el envío.
   const key=[r.created_at||'',r.title||'',r.body||'',r.image_path||''].join('\u001f');
   if(!map.has(key))map.set(key,{key,title:r.title||'Notificación sin título',body:r.body||'',image_path:r.image_path||null,created_at:r.created_at,users:[]});
   const g=map.get(key);
   if(!g.users.some(u=>String(u.user_id)===String(r.user_id)))g.users.push(r);
  });
  return [...map.values()].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
 };
 const statusStats=g=>({total:g.users.length,ok:g.users.filter(u=>u.acknowledged_at).length,pending:g.users.filter(u=>!u.acknowledged_at).length});
 const pill=(txt,kind)=>el('span','cc-notif-pill '+kind,txt);
 let batches=[];
 function showList(){
  holder.innerHTML='<div class="cc-notif-catalog-root"><div class="cc-notif-catalog-toolbar"><div><h3 style="margin:0">Catálogo de notificaciones</h3><p style="margin:4px 0 0">Selecciona una notificación para ver el mensaje enviado y sus confirmaciones.</p></div><button type="button" id="ccNotifCatalogRefresh" class="cc-admin-action subtle">Actualizar</button></div><input id="ccNotifCatalogSearch" class="cc-admin-input" placeholder="Buscar por título o contenido"><div id="ccNotifCatalogStats" class="cc-notif-catalog-stats"></div><div id="ccNotifCatalogRows" class="cc-notif-batch-list"><div class="cc-notif-empty">Cargando notificaciones…</div></div><div id="ccNotifCatalogFooter"></div></div>';
  const list=holder.querySelector('#ccNotifCatalogRows'),search=holder.querySelector('#ccNotifCatalogSearch'),stats=holder.querySelector('#ccNotifCatalogStats');
  if(parentBody){const back=el('button','cc-admin-action subtle','Volver al envío');back.type='button';back.style.alignSelf='flex-start';back.onclick=()=>{holder.innerHTML=returnHtml};holder.querySelector('#ccNotifCatalogFooter').append(back)}
  const render=()=>{
   const query=search.value.trim().toLocaleLowerCase('es-MX');
   const filtered=batches.filter(g=>[g.title,g.body].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(query)));
   list.replaceChildren();
   if(!filtered.length){list.append(el('div','cc-notif-empty',batches.length?'No hay notificaciones que coincidan con la búsqueda.':'No hay notificaciones en el periodo consultado.'));return}
   filtered.forEach(g=>{
    const st=statusStats(g),row=el('button','cc-notif-batch');row.type='button';
    const main=el('div','cc-notif-batch-main'),title=el('div','cc-notif-batch-title',g.title),sub=el('div','cc-notif-batch-sub','Enviada: '+fmt(g.created_at)),preview=el('div','cc-notif-batch-preview',g.body||'(Sin mensaje)');
    main.append(title,sub,preview);
    const counts=el('div','cc-notif-counts');counts.append(pill(st.total+' usuarios','neutral'),pill(st.ok+' Enterado','ok'),pill(st.pending+' pendiente'+(st.pending===1?'':'s'),'pending'));
    const arrow=el('span','cc-notif-pill neutral','Ver detalle ›');counts.append(arrow);row.append(main,counts);row.onclick=()=>showDetail(g);list.append(row);
   });
  };
  const total=batches.reduce((n,g)=>n+g.users.length,0),confirmed=batches.reduce((n,g)=>n+statusStats(g).ok,0),pending=total-confirmed;
  stats.replaceChildren(pill(batches.length+' notificaciones','neutral'),pill(total+' destinatarios','neutral'),pill(confirmed+' confirmados','ok'),pill(pending+' pendientes','pending'));
  search.oninput=render;
  holder.querySelector('#ccNotifCatalogRefresh').onclick=load;
  render();
 }
 async function showDetail(g){
  const st=statusStats(g),accepted=g.users.filter(u=>u.acknowledged_at).sort((a,b)=>String(a.user_name||a.email||'').localeCompare(String(b.user_name||b.email||''),'es')),pending=g.users.filter(u=>!u.acknowledged_at).sort((a,b)=>String(a.user_name||a.email||'').localeCompare(String(b.user_name||b.email||''),'es'));
  holder.innerHTML='<div class="cc-notif-catalog-root"><div class="cc-notif-catalog-toolbar"><div><h3 style="margin:0">Detalle de notificación</h3><p style="margin:4px 0 0">Mensaje original y estado individual de cada destinatario.</p></div><button type="button" id="ccNotifBackList" class="cc-admin-action subtle">← Todas las notificaciones</button></div><div id="ccNotifSentPreview" class="cc-notif-detail-preview"></div><div id="ccNotifDetailStats" class="cc-notif-catalog-stats"></div><input id="ccNotifRecipientSearch" class="cc-admin-input" placeholder="Buscar usuario o correo"><div class="cc-notif-recipient-columns"><section class="cc-notif-recipient-panel"><h4 id="ccNotifAcceptedHeading">✓ Confirmaron Enterado</h4><div id="ccNotifAcceptedList" class="cc-notif-recipient-list"></div></section><section class="cc-notif-recipient-panel"><h4 id="ccNotifPendingHeading">◷ Pendientes de confirmar</h4><div id="ccNotifPendingList" class="cc-notif-recipient-list"></div></section></div></div>';
  holder.querySelector('#ccNotifBackList').onclick=showList;
  const preview=holder.querySelector('#ccNotifSentPreview'),head=el('div','cc-notif-detail-preview-head'),title=el('div','cc-notif-detail-title',g.title),meta=el('div','cc-notif-detail-meta','Enviada: '+fmt(g.created_at)),body=el('div','cc-notif-detail-body',g.body||'(Sin mensaje)');
  head.append(title,meta);preview.append(head,body);
  const detailStats=holder.querySelector('#ccNotifDetailStats');detailStats.append(pill(st.total+' destinatarios','neutral'),pill(st.ok+' confirmaron','ok'),pill(st.pending+' pendientes','pending'));
  if(g.image_path){
   const wrap=el('div');wrap.style.cssText='padding:0 15px 14px;text-align:center';const img=el('img','cc-notif-detail-image');img.alt='Imagen adjunta de la notificación';img.style.display='none';const imageMsg=el('div','cc-notif-detail-meta','Cargando imagen adjunta…');wrap.append(img,imageMsg);preview.append(wrap);
   try{const {data,error}=await sb().storage.from('cc-web-notifications').createSignedUrl(g.image_path,3600);if(error)throw error;if(data?.signedUrl){img.src=data.signedUrl;img.style.display='block';imageMsg.remove()}else imageMsg.textContent='La imagen adjunta no está disponible.'}catch(e){imageMsg.textContent='No se pudo cargar la imagen adjunta.';console.warn('CATALOGO IMAGEN NOTIFICACION',e)}
  }
  const renderRecipients=()=>{
   const q=holder.querySelector('#ccNotifRecipientSearch').value.trim().toLocaleLowerCase('es-MX');
   const paint=(id,users,acceptedState)=>{
    const box=holder.querySelector(id);box.replaceChildren();
    const matches=users.filter(u=>[u.user_name,u.email].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(q)));
    if(!matches.length){box.append(el('div','cc-notif-empty',users.length?'Sin coincidencias.':'Ningún usuario en esta sección.'));return}
    matches.forEach(u=>{
     const row=el('div','cc-notif-recipient'),left=el('div'),name=el('div','cc-notif-recipient-name',u.user_name||'Usuario'),email=el('div','cc-notif-recipient-meta',u.email||'Sin correo');
     left.append(name,email);const state=el('div','cc-notif-recipient-meta',acceptedState?'Enterado: '+fmt(u.acknowledged_at):'Pendiente');state.style.cssText='text-align:right;white-space:nowrap;font-weight:800;color:'+(acceptedState?'#15803d':'#b45309');row.append(left,state);box.append(row);
    });
   };
   paint('#ccNotifAcceptedList',accepted,true);paint('#ccNotifPendingList',pending,false);
  };
  holder.querySelector('#ccNotifAcceptedHeading').textContent='✓ Confirmaron Enterado ('+accepted.length+')';
  holder.querySelector('#ccNotifPendingHeading').textContent='◷ Pendientes de confirmar ('+pending.length+')';
  holder.querySelector('#ccNotifRecipientSearch').oninput=renderRecipients;renderRecipients();
 }
 async function load(){
  const list=holder.querySelector('#ccNotifCatalogRows');if(list)list.innerHTML='<div class="cc-notif-empty">Cargando notificaciones…</div>';
  try{const {data,error}=await sb().rpc('cc_web_notification_catalog');if(error)throw error;batches=groupRows(Array.isArray(data)?data:[]);showList()}
  catch(e){if(list)list.textContent='No fue posible consultar el catálogo. '+(e.message||String(e));else alert('No fue posible consultar el catálogo. '+(e.message||String(e)))}
 }
 showList();await load();
};

function buttons(){const a=document.getElementById('gmSideOperatorNotifications');if(!a)return;const session=document.getElementById('gmSideWebSessions'),notify=document.getElementById('gmSideWebNotifs'),mirror=document.getElementById('gmSideMirrorSessions'),catalog=document.querySelector('#ccPanelConfiguracion [data-config="catalogoNotificaciones"]');if(session)session.style.display=has('sesiones_web')?'':'none';if(notify)notify.style.display=has('notificaciones_usuarios')?'':'none';if(mirror)mirror.style.display=has('sesiones_web')?'':'none';if(catalog)catalog.style.display=canViewNotificationCatalog()?'':'none'}window.ccSyncAdminMenu=buttons;buttons();setInterval(()=>{buttons();tick()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){buttons();tick()}});document.addEventListener('cc:access-ready',buttons);
window.addEventListener('beforeunload',()=>{});window.ccWebSessionEndSelf=async()=>{try{await rpc('end_self',{p_client_key:key})}catch(_){}finally{key=crypto.randomUUID();sessionStorage.setItem(keyName,key)}};
})();