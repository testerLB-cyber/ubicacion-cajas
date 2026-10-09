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
 return '<section style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:12px;background:#fff"><header style="background:#f1f5f9;padding:12px 14px;font-weight:800;color:#1e293b">'+esc(client?.nombre||cid)+' <span style="font-size:12px;font-weight:500;color:#64748b">('+items.length+')</span></header>'+items.map(x=>'<div style="padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #f1f5f9;flex-wrap:wrap"><div><strong>'+esc(x.nombre)+'</strong><div style="font-size:12px;color:#64748b">'+esc(x.email)+'</div><div style="font-size:11px;color:#64748b">'+[x.ver_aeropuerto?'Aeropuerto':'',x.ver_cajas_renta?'Cajas de renta':'',x.ver_mapa_unidades?'Mapa de unidades':''].filter(Boolean).join(' · ')+' · Inicio: '+esc(({aeropuerto:'Aeropuerto',cajas_renta:'Cajas de renta',mapa_unidades:'Mapa de unidades'})[x.vista_default]||x.vista_default)+'</div></div><span style="font-size:11px;padding:6px 9px;background:#fff7ed;border-radius:99px;color:#9a3412">'+(x.auth_user_id?(x.activo?'Acceso activo':'Pendiente de activación'):'Pendiente de invitación')+'</span><div style="display:flex;gap:6px"><button type="button" class="cc-btn cc-btn-light" data-es-preview="'+esc(x.id)+'">Vista del cliente</button><button type="button" class="cc-btn cc-btn-light" data-es-edit="'+esc(x.id)+'">Editar</button><button type="button" class="cc-btn cc-btn-primary" data-es-resend="'+esc(x.id)+'">Reenviar invitación</button><button type="button" class="cc-btn cc-btn-danger" data-es-delete="'+esc(x.id)+'">Eliminar</button></div></div>').join('')+'</section>'
 }).join(''):'<div style="padding:24px;text-align:center;color:#64748b">No hay usuarios registrados para este cliente.</div>';
 list.querySelectorAll('[data-es-preview]').forEach(btn=>btn.onclick=()=>previewAccount(btn.dataset.esPreview,btn));
 list.querySelectorAll('[data-es-edit]').forEach(btn=>btn.onclick=()=>editAccount(btn.dataset.esEdit));
 list.querySelectorAll('[data-es-resend]').forEach(btn=>btn.onclick=()=>resendAccount(btn.dataset.esResend,btn));
 list.querySelectorAll('[data-es-delete]').forEach(btn=>btn.onclick=()=>deleteAccount(btn.dataset.esDelete,btn));

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
 if(!confirm('¿Eliminar definitivamente la Cuenta Espejo de '+account.nombre+' ('+account.email+') del cliente '+(client?.nombre||'')+'?\\n\\nSe revocará también su acceso de autenticación, si existe. No se elimina el cliente ni sus operaciones.'))return;
 button.disabled=true;
 try{
  const {data,error}=await db().functions.invoke('cc-mirror-invite',{body:{action:'delete',id}});
  if(error||!data?.ok||!data.deleted)throw Error(data?.message||data?.error||error?.message||'El servidor no confirmó la eliminación.');
  if(editingId===id){editingId=null;form(false)}
  await refresh();alert('Cuenta eliminada y acceso de autenticación revocado correctamente.');
 }catch(e){alert('Error al eliminar: '+e.message);button.disabled=false}
}

function editAccount(id){
 const x=accounts.find(a=>a.id===id);if(!x)return;
 editingId=id;form(true);
 $('esFormName').value=x.nombre||'';$('esFormEmail').value=x.email||'';$('esFormClient').value=x.cliente_id;
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
  if(error)throw Error(data?.message||data?.error||error.message);
  if(!data?.ok||!data?.emailSent)throw Error(data?.message||data?.error||'El correo no fue confirmado por SMTP.');
  await refresh();alert('Invitación enviada mediante correo configurado a '+data.to+'. Identificador SMTP: '+(data.messageId||'confirmado')+'.');
 }catch(e){alert('No se pudo enviar la invitación: '+(e.message||e))}
 finally{button.disabled=false;button.textContent=original}
}

function form(show){
 const panel=$('esAccountsForm');if(!panel)return;
 panel.style.display=show?'block':'none';
 if(show){
  if(!editingId){$('esFormEmail').readOnly=false;$('esFormEmail').title='';$('esFormName').value='';$('esFormEmail').value='';$('esFormAirport').checked=true;$('esFormRent').checked=false;$('esFormMap').checked=false;$('esFormDefault').value='aeropuerto';$('esAccountsSave').textContent='Guardar configuración';$('esAccountsForm').querySelector('h3').textContent='Nuevo usuario del cliente'}
  const select=$('esFormClient');select.innerHTML='<option value="">Selecciona el cliente</option>'+clients.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');select.value=editingId?(accounts.find(a=>a.id===editingId)?.cliente_id||''):(filter||'');
  $('esAccountMsg').textContent='';
 }
}
function open(){
 if(!admin())return alert('Solo Super Admin puede administrar usuarios de Cuenta Espejo.');
 close();
 const d=document.createElement('div');d.id='esAccountsModal';d.style.cssText='position:fixed!important;inset:0!important;z-index:2147483400!important;background:rgba(15,23,42,.78)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;';
 d.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Crear cuentas espejo" style="background:#fff;width:min(1000px,98vw);max-height:92dvh;overflow:auto;border-radius:20px;box-shadow:0 24px 90px #02061760">
 <header style="background:linear-gradient(110deg,#0f172a,#1d4ed8);color:white;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px"><div><h2 style="font-size:20px;margin:0;color:white">Crear cuentas · Pantalla Aeropuerto</h2><p style="margin:5px 0 0;font-size:12px;opacity:.85">Usuarios externos organizados por cliente</p></div><button id="esAccountsClose" type="button" style="background:#ffffff20;border:1px solid #ffffff55;color:white;border-radius:9px;padding:9px 14px;cursor:pointer">Cerrar ×</button></header>
 <div style="padding:22px"><div style="display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap"><label style="font-size:12px;font-weight:700;color:#334155">Cliente<br><select id="esAccountsClient" style="margin-top:5px;min-width:270px;max-width:85vw;padding:10px;border:1px solid #cbd5e1;border-radius:9px"><option>Cargando...</option></select></label><button type="button" id="esAccountsNew" class="cc-btn cc-btn-primary">+ Crear usuario</button></div>
 <div id="esAccountsForm" style="display:none;background:#f8fafc;border:1px solid #dbeafe;border-radius:13px;margin-top:18px;padding:17px"><h3 style="margin:0 0 15px;font-size:16px">Nuevo usuario del cliente</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:13px"><label>Nombre completo<input id="esFormName" type="text" maxlength="160" style="display:block;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Correo electrónico<input id="esFormEmail" type="email" maxlength="260" style="display:block;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"></label><label>Cliente<select id="esFormClient" style="display:block;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"></select></label><label>Vista inicial<select id="esFormDefault" style="display:block;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"><option value="aeropuerto">Pantalla Aeropuerto</option><option value="cajas_renta">Cajas de renta</option><option value="mapa_unidades">Mapa de unidades</option></select></label></div><div style="display:flex;gap:18px;flex-wrap:wrap;margin:18px 0 10px"><label><input id="esFormAirport" type="checkbox" checked> Pantalla Aeropuerto</label><label><input id="esFormRent" type="checkbox"> Cajas de renta</label><label><input id="esFormMap" type="checkbox"> Mapa de unidades</label></div><p style="font-size:12px;color:#64748b">Al crear el usuario, se enviará automáticamente una invitación segura desde el correo configurado. Su acceso quedará limitado a su cliente.</p><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><button id="esAccountsSave" type="button" class="cc-btn cc-btn-primary">Guardar configuración</button><button id="esAccountsCancel" type="button" class="cc-btn cc-btn-light">Cancelar</button><span id="esAccountMsg" role="status" style="font-size:12px;color:#b91c1c"></span></div></div>
 <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px"><strong>Listado por cliente</strong><span id="esAccountsCount" style="font-size:12px;color:#64748b"></span></div><div id="esAccountsList"><p>Cargando listado...</p></div></div></div>`;
 document.body.appendChild(d);
 $('esAccountsClose').onclick=close;$('esAccountsNew').onclick=()=>{editingId=null;form(true)};$('esAccountsCancel').onclick=()=>{editingId=null;form(false)};
 $('esAccountsClient').onchange=e=>{filter=e.target.value;render()};
 $('esAccountsSave').onclick=async()=>{
  const nombre=$('esFormName').value.trim(),email=$('esFormEmail').value.trim().toLowerCase(),cliente_id=$('esFormClient').value,va=$('esFormAirport').checked,vr=$('esFormRent').checked,vm=$('esFormMap').checked,defaultView=$('esFormDefault').value,msg=$('esAccountMsg');
  if(nombre.length<2||!/^\S+@\S+\.\S+$/.test(email)||!clients.some(c=>c.id===cliente_id)||!(va||vr||vm)||!(defaultView==='aeropuerto'&&va||defaultView==='cajas_renta'&&vr||defaultView==='mapa_unidades'&&vm)){msg.textContent='Completa los campos y selecciona una vista predeterminada autorizada.';return}
  const existing=accounts.find(a=>a.email.toLowerCase()===email&&a.id!==editingId);
  if(existing){filter=existing.cliente_id;render();msg.textContent='Este correo YA está registrado en Cuentas Espejo. Selecciónalo en el listado para editarlo. Registrar otra vez no activará su acceso.';return}
  const btn=$('esAccountsSave');btn.disabled=true;msg.textContent='Registrando cuenta...';
  try{const payload={nombre,email,cliente_id,ver_aeropuerto:va,ver_cajas_renta:vr,ver_mapa_unidades:vm,vista_default:defaultView};const query=editingId?db().from('cc_cuentas_espejo_usuarios').update(payload).eq('id',editingId):db().from('cc_cuentas_espejo_usuarios').insert({...payload,activo:false});const {data:saved,error}=await query.select('id,nombre,email,cliente_id');if(error)throw error;if(!saved?.length)throw Error('El servidor no confirmó el registro. No se ha guardado.');
   const wasEdit=!!editingId;editingId=null;filter=cliente_id;form(false);await refresh();$('esAccountsClient').value=filter;render();
   if(wasEdit){alert('Cambios guardados. Utiliza Reenviar invitación si necesitas enviar un nuevo acceso.');}
   else {
    const {data:invite,error:inviteError}=await db().functions.invoke('cc-mirror-invite',{body:{action:'invite',id:saved[0].id}});
    if(inviteError||!invite?.ok||!invite.emailSent)alert('Cuenta registrada en Supabase, pero el correo NO se pudo enviar: '+(invite?.message||invite?.error||inviteError?.message||'Error de SMTP')+'. Puedes reintentar desde el listado.');
    else alert('Cuenta creada y correo de activación enviado a '+invite.to+'. Confirmación SMTP: '+(invite.messageId||'aceptado')+'.');
   }
  }catch(e){msg.textContent='Error al guardar: '+e.message}finally{btn.disabled=false}
 };
 refresh().catch(e=>{if($('esAccountsList'))$('esAccountsList').textContent='Error al cargar cuentas: '+e.message});
}
document.addEventListener('click',e=>{if(e.target.closest('#airCreateAccounts')){e.preventDefault();open()}});
window.ccOpenMirrorAccounts=open;
})();
