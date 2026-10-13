/* Tráfico App · Administración de usuarios externos por cliente. Sin invitaciones hasta habilitar acceso seguro. */
(function(){
const $=id=>document.getElementById(id), db=()=>window.gmSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const admin=()=>window.CC_ACCESS?.superAdmin===true;
let clients=[],accounts=[],filter='',editingId=null;
function close(){ $('esAccountsModal')?.remove() }
async function refresh(){
 const [c,u]=await Promise.all([db().from('cc_clientes').select('id,nombre,estatus').eq('estatus','ACTIVO').order('nombre'),db().from('cc_cuentas_espejo_usuarios').select('id,cliente_id,nombre,email,ver_aeropuerto,ver_cajas_renta,ver_mapa_unidades,vista_default,activo,auth_user_id,created_at').order('created_at',{ascending:false})]);
 if(c.error||u.error)throw c.error||u.error;
 clients=c.data||[];accounts=u.data||[];
 const select=$('esAccountsClient');if(!select)return;
 const formClient=$('esFormClient');const selectedFormClient=formClient?.value||'';
 if(formClient){formClient.innerHTML='<option value="">Seleccionar cliente…</option>'+clients.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');if(clients.some(c=>c.id===selectedFormClient))formClient.value=selectedFormClient;}
 const previous=filter;select.innerHTML='<option value="">Todos los clientes activos</option>'+clients.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
 if(clients.some(c=>c.id===previous))select.value=previous;else filter='';
 render();
}
function render(){
 const list=$('esAccountsList'),counter=$('esAccountsCount');if(!list)return;
 const rows=accounts.filter(x=>!filter||x.cliente_id===filter);
 if(counter)counter.textContent=rows.length+' usuarios registrados';
 const groups=[...new Set(rows.map(x=>x.cliente_id))];
 list.innerHTML=groups.length?groups.map(cid=>{
 const client=clients.find(c=>c.id===cid),items=rows.filter(x=>x.cliente_id===cid);
 return '<section style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:12px;background:#fff"><header style="background:#f1f5f9;padding:12px 14px;font-weight:800;color:#1e293b">'+esc(client?.nombre||cid)+' <span style="font-size:12px;font-weight:500;color:#64748b">('+items.length+')</span></header>'+items.map(x=>'<div style="padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #f1f5f9;flex-wrap:wrap"><div><strong>'+esc(x.nombre)+'</strong><div style="font-size:12px;color:#64748b">'+esc(x.email)+'</div><div style="font-size:11px;color:#64748b">'+[x.ver_aeropuerto?'Aeropuerto':'',x.ver_cajas_renta?'Cajas de renta':'',x.ver_mapa_unidades?'Mapa de unidades':''].filter(Boolean).join(' · ')+' · Inicio: '+esc(({aeropuerto:'Aeropuerto',cajas_renta:'Cajas de renta',mapa_unidades:'Mapa de unidades'})[x.vista_default]||x.vista_default)+'</div></div><span style="font-size:11px;padding:6px 9px;background:#fff7ed;border-radius:99px;color:#9a3412">'+(x.auth_user_id?(x.activo?'Acceso activo':'Pendiente de activación'):'Pendiente de invitación')+'</span><div style="display:flex;gap:6px"><button type="button" class="cc-btn cc-btn-light" data-es-preview="'+esc(x.id)+'">Vista del cliente</button><button type="button" class="cc-btn cc-btn-light" data-es-geo="'+esc(x.cliente_id)+'">Geocercas</button><button type="button" class="cc-btn cc-btn-light" data-es-edit="'+esc(x.id)+'">Editar</button><button type="button" class="cc-btn cc-btn-light" data-es-password="'+esc(x.id)+'">Contraseña</button><button type="button" class="cc-btn cc-btn-light" data-es-active="'+esc(x.id)+'">'+(x.activo?'Desactivar':'Activar')+'</button><button type="button" class="cc-btn cc-btn-primary" data-es-resend="'+esc(x.id)+'">Reenviar invitación</button><button type="button" class="cc-btn cc-btn-danger" data-es-delete="'+esc(x.id)+'">Eliminar</button></div></div>').join('')+'</section>'
 }).join(''):'<div style="padding:24px;text-align:center;color:#64748b">No hay usuarios registrados para este cliente.</div>';
 list.querySelectorAll('[data-es-preview]').forEach(btn=>btn.onclick=()=>previewAccount(btn.dataset.esPreview,btn));
 list.querySelectorAll('[data-es-geo]').forEach(btn=>btn.onclick=()=>editGeofences(btn.dataset.esGeo));
 list.querySelectorAll('[data-es-edit]').forEach(btn=>btn.onclick=()=>editAccount(btn.dataset.esEdit));
 list.querySelectorAll('[data-es-password]').forEach(btn=>btn.onclick=()=>setPassword(btn.dataset.esPassword));
 list.querySelectorAll('[data-es-active]').forEach(btn=>btn.onclick=()=>setActive(btn.dataset.esActive));
 list.querySelectorAll('[data-es-resend]').forEach(btn=>btn.onclick=()=>resendAccount(btn.dataset.esResend,btn));
 list.querySelectorAll('[data-es-delete]').forEach(btn=>btn.onclick=()=>deleteAccount(btn.dataset.esDelete,btn));

}


async function editGeofences(clientId){
 if(!admin())return;
 const c=clients.find(x=>String(x.id)===String(clientId));
 if(!c)return alert('Cliente no encontrado.');
 let d;
 try{const r=await db().functions.invoke('cc-portal-brand',{body:{action:'geofence_catalog',cliente_id:clientId}});if(r.error||!r.data?.ok)throw Error(r.data?.error||r.error?.message||'No se pudo consultar');d=r.data}
 catch(e){return alert('Error al consultar geocercas: '+e.message)}
 $('esGeofenceModal')?.remove();
 const ov=document.createElement('div');ov.id='esGeofenceModal';ov.style.cssText='position:fixed;inset:0;z-index:2147483450;background:#0f172acc;display:flex;align-items:center;justify-content:center;padding:14px';
 const areas=Array.isArray(d.areas)?d.areas:[],selected=new Set(d.selected||[]);
 ov.innerHTML='<div style="width:min(620px,96vw);max-height:88vh;overflow:auto;border-radius:16px;background:#fff;box-shadow:0 24px 60px #0004"><div style="padding:18px 20px;background:#0f172a;color:#fff"><strong>Geocercas visibles · '+esc(c.nombre)+'</strong><div style="font-size:12px;margin-top:5px;opacity:.85">Selecciona cuáles podrá consultar este cliente en Cuenta Espejo.</div></div><div style="padding:18px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:12px"><label style="font-size:12px;font-weight:700">Buscar geocerca<input type="search" data-geo-search placeholder="Nombre de la geocerca…" style="display:block;width:100%;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></label><label style="font-size:12px;font-weight:700">Copiar de otro cliente<select data-copy-client style="display:block;width:100%;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"><option value="">Selecciona un cliente…</option>'+clients.filter(x=>String(x.id)!==String(clientId)).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),'es')).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></label></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><button class="cc-btn cc-btn-light" data-copy type="button">Copiar geocercas</button><small data-selection-count style="color:#64748b"></small></div><div style="display:flex;gap:8px;margin-bottom:12px"><button class="cc-btn cc-btn-light" data-all>Seleccionar todas</button><button class="cc-btn cc-btn-light" data-none>Quitar todas</button></div><div style="display:grid;gap:7px;max-height:48vh;overflow:auto">'+(areas.length?areas.map(g=>'<label style="display:flex;gap:10px;align-items:center;padding:11px;border:1px solid #e2e8f0;border-radius:9px"><input type="checkbox" data-geo-id="'+esc(g.id)+'" '+(selected.has(g.id)?'checked':'')+'><span>'+esc(g.nombre)+'</span>'+(g.activa?'':' <span style="font-size:11px;color:#b45309">Inactiva</span>')+'</label>').join(''):'<p style="color:#64748b">No hay geocercas configuradas. Créalas primero desde Administrar geocercas en Pantalla Aeropuerto.</p>')+'</div><div style="display:flex;justify-content:flex-end;gap:9px;margin-top:18px"><button type="button" class="cc-btn cc-btn-light" data-close>Cancelar</button><button type="button" class="cc-btn cc-btn-primary" data-save>Guardar geocercas</button></div><p data-status style="font-size:12px;color:#b91c1c"></p></div></div>';
 document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-close]').onclick=close;
 ov.querySelector('[data-all]').onclick=()=>ov.querySelectorAll('[data-geo-id]').forEach(x=>x.checked=true);
 ov.querySelector('[data-none]').onclick=()=>ov.querySelectorAll('[data-geo-id]').forEach(x=>x.checked=false);
 const boxes=[...ov.querySelectorAll('[data-geo-id]')];
 const count=()=>{const el=ov.querySelector('[data-selection-count]');if(el)el.textContent=boxes.filter(x=>x.checked).length+' de '+boxes.length+' seleccionadas';};
 boxes.forEach(x=>x.addEventListener('change',count));count();
 ov.querySelector('[data-all]').addEventListener('click',count);
 ov.querySelector('[data-none]').addEventListener('click',count);
 ov.querySelector('[data-geo-search]').oninput=e=>{
  const q=String(e.target.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  boxes.forEach(x=>{const label=x.closest('label');const name=String(label?.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(label)label.style.display=name.includes(q)?'flex':'none';});
 };
 ov.querySelector('[data-copy]').onclick=async()=>{
  const source=ov.querySelector('[data-copy-client]').value;
  if(!source)return alert('Selecciona de qué cliente copiar las geocercas.');
  const dest=clients.find(x=>String(x.id)===String(source));
  const btn=ov.querySelector('[data-copy]');btn.disabled=true;
  try{
   const r=await db().functions.invoke('cc-portal-brand',{body:{action:'geofence_catalog',cliente_id:source}});
   if(r.error||!r.data?.ok)throw Error(r.data?.error||r.error?.message||'Error al leer el cliente de origen');
   const ids=new Set(Array.isArray(r.data.selected)?r.data.selected:[]);
   if(!ids.size){alert('El cliente seleccionado no tiene geocercas asignadas.');return}
   if(!confirm('¿Copiar '+ids.size+' geocercas de '+(dest?.nombre||'otro cliente')+' a '+c.nombre+'? Se sumarán a las ya marcadas, sin modificar al cliente de origen.'))return;
   boxes.forEach(x=>{if(ids.has(x.dataset.geoId))x.checked=true});
   count();
   ov.querySelector('[data-status]').textContent='Selección copiada al formulario. Presiona Guardar geocercas para confirmarla.';
  }catch(e){ov.querySelector('[data-status]').textContent='Error al copiar: '+e.message}
  finally{btn.disabled=false}
 };
 ov.querySelector('[data-save]').onclick=async()=>{
  const btn=ov.querySelector('[data-save]'),ids=[...ov.querySelectorAll('[data-geo-id]:checked')].map(x=>x.dataset.geoId);
  btn.disabled=true;ov.querySelector('[data-status]').textContent='Guardando selección…';
  try{const r=await db().functions.invoke('cc-portal-brand',{body:{action:'save_geofences',cliente_id:clientId,ids}});if(r.error||!r.data?.ok)throw Error(r.data?.error||r.error?.message||'No se confirmó el guardado');close();alert('Geocercas autorizadas para '+c.nombre+': '+ids.length+'. El cliente podrá mostrarlas u ocultarlas desde el mapa.')}
  catch(e){ov.querySelector('[data-status]').textContent='Error: '+e.message;btn.disabled=false}
 };
}

async function previewAccount(id,button){
 const account=accounts.find(x=>x.id===id);if(!account)return;
 const client=clients.find(x=>x.id===account.cliente_id);
 const existing=$('esAccountsPreview');if(existing)existing.remove();
 const host=$('esAccountsList');
 const panel=document.createElement('section');panel.id='esAccountsPreview';panel.style.cssText='background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:17px;margin:14px 0';
 panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><strong>Vista del cliente: '+esc(client?.nombre||account.cliente_id)+'</strong><button type="button" class="cc-btn cc-btn-light" id="esPreviewClose">Cerrar</button></div><div id="esPreviewContent" style="margin-top:12px">Consultando unidades autorizadas…</div>';
 host.before(panel);$('esPreviewClose').onclick=()=>panel.remove();button.disabled=true;
 try{
  const {data,error}=await db().functions.invoke('cc-mirror-airport',{body:{preview_cliente_id:account.cliente_id}});
  if(error)throw error;if(!data?.ok)throw Error(data?.error||'No se pudo verificar la cuenta');
  if(!$('esPreviewContent'))return;
  const vehicles=data.vehicles||[];
  $('esPreviewContent').innerHTML='<p style="margin:0 0 12px;font-size:12px;color:#475569">Información visible desde Pantalla Aeropuerto para este cliente. '+vehicles.length+' unidades asignadas. Esta vista es administrativa, no activa una cuenta externa.</p>'+(vehicles.length?'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">'+vehicles.map(x=>'<div style="background:white;border:1px solid #dbeafe;border-radius:10px;padding:12px"><strong>'+esc(x.unidad)+'</strong><span style="float:right;color:#64748b;font-size:11px">'+esc(x.asignacion==='VIAJE'?'Viaje activo':'Asignación manual')+'</span><div style="margin-top:8px;color:#475569;font-size:12px">'+esc(x.ubicacion||'Ubicación no disponible')+'</div><div style="font-size:12px;color:#64748b">'+esc(x.numeroViaje?'Viaje '+x.numeroViaje:'Sin viaje activo')+'</div></div>').join('')+'</div>':'<p>No hay unidades asignadas a este cliente.</p>');
 }catch(e){if($('esPreviewContent'))$('esPreviewContent').textContent='Error al consultar información autorizada: '+(e.message||e)}
 finally{button.disabled=false}
}
async function deleteAccount(id,button){
 const account=accounts.find(x=>x.id===id);if(!account)return;
 const client=clients.find(x=>x.id===account.cliente_id);
 if(!confirm('¿Eliminar definitivamente la Cuenta Espejo de '+account.nombre+' ('+account.email+') del cliente '+(client?.nombre||'')+'?\\n\\nNo se eliminará ni modificará ningún usuario de la web profesional.'))return;
 button.disabled=true;
 try{
  const {data,error}=await db().functions.invoke('cc-mirror-invite',{body:{action:'delete',id}});
  if(error||!data?.ok||!data.deleted){let detail=data;try{if(error?.context?.json)detail=await error.context.json()}catch(_){}throw Error(detail?.message||detail?.error||error?.message||'El servidor no confirmó la eliminación.');}
  if(editingId===id){editingId=null;form(false)}
  await refresh();alert('Cuenta Espejo eliminada. Los usuarios de la web profesional no se modificaron.');
 }catch(e){alert('Error al eliminar: '+e.message);button.disabled=false}
}

function editAccount(id){
 const x=accounts.find(a=>a.id===id);if(!x)return;
 editingId=id;form(true);$('esFormPassword').value='';
 $('esFormName').value=x.nombre||'';$('esFormEmail').value=x.email||'';$('esFormClient').value=x.cliente_id;$('esAccountsClient').value=x.cliente_id;filter=x.cliente_id;render();
 $('esFormEmail').readOnly=!!x.auth_user_id;$('esFormEmail').title=x.auth_user_id?'El correo ya está vinculado a Supabase Auth. Para cambiarlo, debe realizarse un proceso de seguridad separado.':'';$('esFormAirport').checked=!!x.ver_aeropuerto;$('esFormRent').checked=!!x.ver_cajas_renta;$('esFormMap').checked=!!x.ver_mapa_unidades;$('esFormDefault').value=x.vista_default;
 $('esAccountsForm').querySelector('h3').textContent='Editar usuario · '+x.nombre;
 $('esAccountsSave').textContent='Guardar cambios';
 $('esAccountsForm').scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function resendAccount(id,button){
 const x=accounts.find(a=>a.id===id);if(!x)return;
 if(!confirm('¿Enviar una invitación segura de acceso a '+x.email+'?'))return;
 button.disabled=true;const original=button.textContent;button.textContent='Enviando…';
 try{
  const {data,error}=await db().functions.invoke('cc-mirror-invite',{body:{action:'invite',id}});
  if(error){let info=data;try{if(error.context?.json)info=await error.context.json()}catch(_){}throw Error(info?.message||info?.error||error.message)}
  if(!data?.ok||!data?.emailSent)throw Error(data?.message||data?.error||'El correo no fue confirmado por SMTP.');
  await refresh();alert('Invitación enviada mediante correo configurado a '+data.to+'. Identificador SMTP: '+(data.messageId||'confirmado')+'.');
 }catch(e){alert('No se pudo enviar la invitación: '+(e.message||e))}
 finally{button.disabled=false;button.textContent=original}
}

async function setPassword(id){
 const account=accounts.find(x=>x.id===id);if(!account)return;
 const password=prompt('Establecer contraseña para '+account.email+' (mínimo 10 caracteres). No se mostrará ni guardará en el listado:');
 if(password===null)return;
 if(password.length<10){alert('La contraseña debe tener al menos 10 caracteres.');return}
 const confirmPass=prompt('Confirma la contraseña para '+account.email+':');
 if(confirmPass!==password){alert('Las contraseñas no coinciden.');return}
 const activate=confirm('¿Activar esta cuenta para que pueda ingresar inmediatamente con la nueva contraseña?');
 try{const {data,error}=await db().functions.invoke('cc-mirror-invite',{body:{action:'set_password',id,password,activate,sendEmail:true}});
 if(error||!data?.ok)throw Error(data?.message||data?.error||error?.message||'Error de autenticación');
 await refresh();alert('Contraseña actualizada en Supabase Auth.'+(activate?' Cuenta activada.':'')+(data.emailSent?' Correo de acceso enviado al cliente.':' ATENCIÓN: no se logró enviar el correo: '+(data.emailError||'Verifica SMTP')))}catch(e){alert('No se pudo configurar la contraseña: '+e.message)}
}
async function setActive(id){
 const account=accounts.find(x=>x.id===id);if(!account)return;
 const active=!account.activo;
 if(!confirm((active?'¿Activar':'¿Desactivar')+' el acceso de '+account.email+'?'))return;
 try{const {data,error}=await db().functions.invoke('cc-mirror-invite',{body:{action:'set_active',id,active}});
 if(error||!data?.ok)throw Error(data?.message||data?.error||error?.message||'No se pudo cambiar el estado');
 await refresh();alert(active?'Cuenta activada.':'Cuenta desactivada.')}catch(e){alert('No se pudo cambiar el estado: '+e.message)}
}
function form(show){
 const panel=$('esAccountsForm');if(!panel)return;
 panel.style.display=show?'block':'none';
 const topClient=$('esAccountsClient')?.closest('label');if(topClient)topClient.style.display=show?'none':'';
 const formClient=$('esFormClient');if(formClient&&!editingId)formClient.value=$('esAccountsClient')?.value||'';
 if(show){
  if(!editingId){$('esFormPassword').value='';$('esFormEmail').readOnly=false;$('esFormEmail').title='';$('esFormName').value='';$('esFormEmail').value='';$('esFormAirport').checked=true;$('esFormRent').checked=false;$('esFormMap').checked=false;$('esFormDefault').value='aeropuerto';$('esAccountsSave').textContent='Guardar configuración';$('esAccountsForm').querySelector('h3').textContent='Nuevo usuario del cliente'}
  if(editingId){const c=accounts.find(a=>a.id===editingId);if(c){$('esFormClient').value=c.cliente_id;}}
  if($('esPickedClient'))$('esPickedClient').textContent=editingId?'Puedes cambiar el cliente asignado a este usuario.':'Selecciona el cliente al que pertenecerá el usuario.';
  $('esAccountMsg').textContent='';
 }
}
function open(){
 if(!admin())return alert('Solo Super Admin puede administrar usuarios de Cuenta Espejo.');
 close();
 const d=document.createElement('div');d.id='esAccountsModal';d.style.cssText='position:fixed!important;inset:0!important;z-index:2147483400!important;background:rgba(15,23,42,.78)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;';
 d.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Crear cuentas espejo" style="background:#fff;width:min(1000px,98vw);max-height:92dvh;overflow:auto;border-radius:20px;position:relative;box-shadow:0 24px 90px #02061760">
 <header style="position:sticky;top:0;z-index:20;background:linear-gradient(110deg,#0f172a,#1d4ed8);color:white;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="font-size:20px;margin:0;color:white">Crear cuentas · Pantalla Aeropuerto</h2><p style="margin:5px 0 0;font-size:12px;opacity:.85">Usuarios externos organizados por cliente</p></div><button id="esAccountsClose" type="button" style="background:#ffffff20;border:1px solid #ffffff55;color:white;border-radius:9px;padding:9px 14px;cursor:pointer">← Regresar</button><button id="esAccountsExit" type="button" aria-label="Cerrar ventana" style="background:#ffffff20;border:1px solid #ffffff55;color:white;border-radius:9px;padding:9px 14px;cursor:pointer">✕ Cerrar</button></header>
 <div style="padding:22px"><div style="display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap"><label style="font-size:12px;font-weight:700;color:#334155">Cliente<br><select id="esAccountsClient" style="margin-top:5px;min-width:270px;max-width:85vw;padding:10px;border:1px solid #cbd5e1;border-radius:9px"><option>Cargando...</option></select></label><button type="button" id="esAccountsNew" class="cc-btn cc-btn-primary">+ Crear usuario</button></div>
 <div id="esAccountsForm" style="display:none;background:#f8fafc;border:1px solid #dbeafe;border-radius:13px;margin-top:18px;padding:17px"><h3 style="margin:0 0 8px;font-size:16px">Nuevo usuario del cliente</h3><p id="esPickedClient" style="margin:0 0 15px;font-size:12px;font-weight:700;color:#2563eb"></p><div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:700;color:#334155">Cliente asignado<select id="esFormClient" required style="display:block;width:100%;margin-top:6px;padding:11px;border:1px solid #94a3b8;border-radius:9px;background:white"><option value="">Seleccionar cliente…</option></select></label></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:13px"><label>Nombre completo<input id="esFormName" type="text" maxlength="160" style="display:block;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Correo electrónico<input id="esFormEmail" type="email" maxlength="260" style="display:block;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Contraseña inicial (opcional)<input id="esFormPassword" type="password" autocomplete="new-password" minlength="10" placeholder="Mínimo 10 caracteres" style="display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Vista inicial<select id="esFormDefault" style="display:block;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"><option value="aeropuerto">Pantalla Aeropuerto</option><option value="cajas_renta">Cajas de renta</option><option value="mapa_unidades">Mapa de unidades</option></select></label></div><div style="display:flex;gap:18px;flex-wrap:wrap;margin:18px 0 10px"><label><input id="esFormAirport" type="checkbox" checked> Pantalla Aeropuerto</label><label><input id="esFormRent" type="checkbox"> Cajas de renta</label><label><input id="esFormMap" type="checkbox"> Mapa de unidades</label></div><p style="font-size:12px;color:#64748b">Si asignas una contraseña, la cuenta se activará y se enviarán el acceso y la contraseña temporal por correo. Si dejas el campo vacío, se enviará una invitación de activación. Su acceso quedará limitado a su cliente.</p><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><button id="esAccountsSave" type="button" class="cc-btn cc-btn-primary">Guardar configuración</button><button id="esAccountsCancel" type="button" class="cc-btn cc-btn-light">Cancelar</button><span id="esAccountMsg" role="status" style="font-size:12px;color:#b91c1c"></span></div></div>
 <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px"><strong>Listado por cliente</strong><span id="esAccountsCount" style="font-size:12px;color:#64748b"></span></div><div id="esAccountsList"><p>Cargando listado...</p></div><div style="position:sticky;bottom:0;background:#fff;border-top:1px solid #e2e8f0;margin:15px -22px -22px;padding:12px 22px;display:flex;justify-content:flex-end"><button id="esAccountsBottomClose" type="button" class="cc-btn cc-btn-light">← Regresar / Cerrar</button></div></div></div>`;
 document.body.appendChild(d);
 $('esAccountsBottomClose').onclick=close;$('esAccountsClose').onclick=close;$('esAccountsExit').onclick=close;$('esAccountsNew').onclick=()=>{editingId=null;form(true)};$('esAccountsCancel').onclick=()=>{editingId=null;form(false)};
 $('esAccountsClient').onchange=e=>{filter=e.target.value;render()};
 $('esAccountsSave').onclick=async()=>{
  const nombre=$('esFormName').value.trim(),email=$('esFormEmail').value.trim().toLowerCase(),cliente_id=$('esFormClient').value,va=$('esFormAirport').checked,vr=$('esFormRent').checked,vm=$('esFormMap').checked,defaultView=$('esFormDefault').value,msg=$('esAccountMsg');
  if(nombre.length<2||!/^\S+@\S+\.\S+$/.test(email)||!clients.some(c=>c.id===cliente_id)||!(va||vr||vm)||!(defaultView==='aeropuerto'&&va||defaultView==='cajas_renta'&&vr||defaultView==='mapa_unidades'&&vm)){msg.textContent='Completa los campos y selecciona una vista predeterminada autorizada.';return}
  const initialPassword=$('esFormPassword').value;if(initialPassword&&initialPassword.length<10){msg.textContent='La contraseña debe tener mínimo 10 caracteres.';return}const existing=accounts.find(a=>a.email.toLowerCase()===email&&a.id!==editingId);
  if(existing){filter=existing.cliente_id;render();msg.textContent='Este correo YA está registrado en Cuentas Espejo. Selecciónalo en el listado para editarlo. Registrar otra vez no activará su acceso.';return}
  const original=editingId?accounts.find(a=>a.id===editingId):null;
  if(original&&original.cliente_id!==cliente_id&&!confirm('¿Cambiar el cliente asignado a '+original.nombre+'? Su acceso mostrará la información del nuevo cliente y dejará de mostrar la del anterior.'))return;
  const btn=$('esAccountsSave');btn.disabled=true;msg.textContent='Guardando cuenta...';
  try{const payload={nombre,email,cliente_id,ver_aeropuerto:va,ver_cajas_renta:vr,ver_mapa_unidades:vm,vista_default:defaultView};const query=editingId?db().from('cc_cuentas_espejo_usuarios').update(payload).eq('id',editingId):db().from('cc_cuentas_espejo_usuarios').insert({...payload,activo:false});const {data:saved,error}=await query.select('id,nombre,email,cliente_id');if(error)throw error;if(!saved?.length)throw Error('El servidor no confirmó el registro. No se ha guardado.');
   const wasEdit=!!editingId;editingId=null;filter=cliente_id;form(false);await refresh();$('esAccountsClient').value=filter;render();
   if(initialPassword){
    const {data:pwd,error:pe}=await db().functions.invoke('cc-mirror-invite',{body:{action:'set_password',id:saved[0].id,password:initialPassword,activate:true,sendEmail:true}});
    if(pe||!pwd?.ok)throw Error('La configuración se guardó, pero no se pudo establecer la contraseña: '+(pwd?.message||pwd?.error||pe?.message||'Error'));
    await refresh();
    alert('Cuenta '+(wasEdit?'actualizada':'creada')+' y activada con contraseña. '+(pwd.emailSent?'El cliente recibió por correo el usuario, contraseña y enlace del portal.':'ATENCIÓN: el correo no se pudo enviar ('+(pwd.emailError||'SMTP')+').'));
   }else if(wasEdit){alert('Cambios guardados. Utiliza Reenviar invitación si necesitas enviar un nuevo acceso.');}
   else {
    const {data:invite,error:inviteError}=await db().functions.invoke('cc-mirror-invite',{body:{action:'invite',id:saved[0].id}});
    if(inviteError||!invite?.ok||!invite.emailSent)alert('Cuenta registrada en Supabase, pero el correo NO se pudo enviar: '+(invite?.message||invite?.error||inviteError?.message||'Error de SMTP')+'. Puedes reintentar desde el listado.');
    else alert('Cuenta creada y correo de activación enviado a '+invite.to+'. Confirmación SMTP: '+(invite.messageId||'aceptado')+'.');
   }
  }catch(e){msg.textContent='Error al guardar: '+(String(e.message).includes('CORREO_RESERVADO_USUARIO_WEB_PROFESIONAL')?'El registro fue bloqueado por una posible coincidencia de correo o identidad de autenticación interna. No confirma que ese correo sea un usuario interno; es necesario revisar la vinculación existente antes de activarlo.':e.message)}finally{btn.disabled=false}
 };
 refresh().catch(e=>{if($('esAccountsList'))$('esAccountsList').textContent='Error al cargar cuentas: '+e.message});
}
document.addEventListener('click',e=>{if(e.target.closest('#airCreateAccounts')){e.preventDefault();open()}});
window.ccOpenMirrorAccounts=open;
})();
