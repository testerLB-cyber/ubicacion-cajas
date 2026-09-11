(function(){
let sb=window.gmSupabase;
if(!sb && window.supabase && typeof window.supabase.createClient==='function' && window.GM_SUPABASE_URL && window.GM_SUPABASE_ANON_KEY){
  try{
    sb=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    window.gmSupabase=sb;
  }catch(err){console.error('RECUPERACION SUPABASE:',err);}
}
window.CC_ACCESS=null;
window.CC_AUTH_READY=false;

const PERM_SCHEMA=[
 ['dashboard','Dashboard',[['ver','Ver Dashboard']]],
 ['control_cajas','Control de Cajas',[['ver','Entrar a Control de Cajas']]],
 ['anticipos','Control de Anticipos',[['ver','Ver módulo'],['crear','Crear anticipos'],['comprobar','Comprobar'],['reabrir','Reabrir anticipos'],['caja','Movimientos de caja'],['editar_caja','Editar movimientos de caja'],['reportes','Reportes'],['catalogos','Catálogos'],['editar','Editar'],['cancelar','Cancelar']]],
 ['inventario','Inventario',[['ver','Ver'],['crear','Agregar / importar'],['editar','Editar'],['mantenimiento','Fuera de servicio'],['dot','DOT'],['qr','QR']]],
 ['rentas','Control de renta',[['ver','Ver'],['crear','Crear'],['editar','Editar'],['finalizar','Finalizar']]],
 ['historial','Historial',[['ver','Ver'],['exportar','Exportar']]],
 ['proforma','Proforma',[['ver','Ver'],['generar_pdf','Generar PDF']]],
 ['mantenimiento','Mantenimiento',[['ver','Ver mantenimiento'],['editar_registros','Editar registros'],['ver_dot','Ver Control DOT'],['editar_dot','Editar registros DOT']]],
 ['mapa','Mapa de cajas',[['ver','Ver'],['geocercas','Crear / editar geocercas']]],
 ['configuracion','Configuración',[['ver','Ver'],['editar','Modificar']]],
 ['hojas_servicio','Control de Hojas de Servicio',[['ver','Ver módulo'],['generar','Generar folios'],['asignar_responsable','Asignar a responsable'],['asignar_operador','Asignar a operadores'],['catalogos','Catálogos']]],
 ['notificaciones','Notificaciones',[['ver','Ver centro de notificaciones'],['comprobacion_enlace','Comprobaciones por enlace'],['mantenimiento','Mantenimiento'],['dot','DOT'],['rentas','Rentas'],['ubicacion','Ubicación'],['disponibilidad','Disponibilidad operativa']]],
 ['usuarios','Usuarios',[['ver','Ver'],['administrar','Administrar']]]
];
function getPath(obj,path){return String(path).split('.').reduce((a,k)=>a&&a[k],obj);}
window.ccPerm=function(path){return window.CC_ACCESS?.rol==='ADMIN'||getPath(window.CC_ACCESS?.permisos||{},path)===true;};
function msg(text,type='info'){const el=document.getElementById('ccLoginMsg');if(!el)return;el.className='cc-login-msg show '+type;el.textContent=text;}
function setBusy(b){const el=document.getElementById('ccLoginBtn');if(el)el.disabled=b;}
async function bootstrapStatus(){
 try{
  const {data}=await sb.rpc('cc_admin_bootstrap_status');
  const show=data?.ok&&data.adminExiste===false;
  const t=document.getElementById('ccBootstrapToggle');if(t)t.style.display=show?'block':'none';
  if(!show)document.getElementById('ccBootstrapBox')?.classList.remove('open');
 }catch(e){console.warn('BOOTSTRAP STATUS',e);}
}
async function loadAccess(){
 const {data,error}=await sb.rpc('cc_my_access');
 if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo leer el perfil');
 if(data.activo!==true)throw new Error('Tu usuario está desactivado. Contacta al administrador.');
 window.CC_ACCESS=data;
 window.CC_AUTH_READY=true;
 document.body.classList.remove('cc-auth-locked');
 document.getElementById('ccLoginGate')?.classList.add('cc-hidden');
 applyAccess();
 if(typeof window.ccInitCloud==='function')await window.ccInitCloud();
}
async function login(email,password){
 setBusy(true);msg('Validando acceso…','info');
 try{
  const {error}=await sb.auth.signInWithPassword({email:String(email||'').trim(),password:String(password||'')});
  if(error)throw error;
  await loadAccess();
 }catch(e){
  await sb.auth.signOut().catch(()=>{});
  window.CC_AUTH_READY=false;msg(e.message||String(e),'error');
 }finally{setBusy(false);}
}
window.ccLogout=async function(){
 await sb.auth.signOut();
 window.CC_AUTH_READY=false;window.CC_ACCESS=null;
 document.body.classList.add('cc-auth-locked');
 document.getElementById('ccLoginGate')?.classList.remove('cc-hidden');
 document.getElementById('ccLoginPassword').value='';
 msg('Sesión cerrada.','info');
 await bootstrapStatus();
};
function tabVisible(tab,visible){
 const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('"+tab+"'"));
 if(b)b.style.display=visible?'':'none';
 const p=document.getElementById('ccPanel'+tab.charAt(0).toUpperCase()+tab.slice(1));if(p&&!visible)p.classList.remove('active');
}
function protect(name,path){
 const fn=window[name];if(typeof fn!=='function'||fn.__ccProtected)return;
 const wrapped=function(...args){if(!ccPerm(path)){alert('Tu usuario no tiene permiso para esta acción.');return;}return fn.apply(this,args);};
 wrapped.__ccProtected=true;window[name]=wrapped;
}
function protectTabs(){
 const original=window.ccTab;if(typeof original==='function'&&!original.__ccProtected){
  const map={anticipos:'anticipos.ver',inventario:'inventario.ver',renta:'rentas.ver',historial:'historial.ver',proforma:'proforma.ver',mantenimiento:'mantenimiento.ver',mapa:'mapa.ver',configuracion:'configuracion.ver',dashboard:'control_cajas.ver'};
  const w=function(tab,btn){const p=map[tab]||'control_cajas.ver';if(!ccPerm(p)){alert('Tu usuario no tiene permiso para este módulo.');return;}return original(tab,btn);};w.__ccProtected=true;window.ccTab=w;
 }
}
function firstControlTab(){
 const order=[['anticipos','anticipos.ver'],['dashboard','control_cajas.ver'],['inventario','inventario.ver'],['renta','rentas.ver'],['historial','historial.ver'],['proforma','proforma.ver'],['mantenimiento','mantenimiento.ver'],['mapa','mapa.ver'],['configuracion','configuracion.ver']];
 for(const [tab,p] of order){if(ccPerm(p)){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('"+tab+"'"));if(b){document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('ccPanel'+tab.charAt(0).toUpperCase()+tab.slice(1))?.classList.add('active');break;}}}
}
function applyAccess(){
 const a=window.CC_ACCESS||{};
 const dashboard=ccPerm('dashboard.ver'),control=ccPerm('control_cajas.ver');
 const sd=document.getElementById('gmSideDashboard'),sc=document.getElementById('gmSideCajas');
 if(sd)sd.style.display=dashboard?'':'none';if(sc)sc.style.display=control?'':'none';
 const back=document.getElementById('ccBackDashboard');if(back)back.style.display=dashboard?'':'none';
 const isAdmin=a.rol==='ADMIN';
 document.getElementById('ccAdminSideSection').style.display=isAdmin?'':'none';
 document.getElementById('gmSideUsers').style.display=isAdmin?'':'none';
 const session=document.getElementById('ccSessionBox');if(session)session.style.display='block';
 document.getElementById('ccSessionName').textContent=a.nombre||a.email||'Usuario';
 document.getElementById('ccSessionRole').textContent=a.rol+(a.activo?' · ACTIVO':' · INACTIVO');

 tabVisible('anticipos',control&&ccPerm('anticipos.ver'));
 tabVisible('dashboard',control);
 tabVisible('inventario',control&&ccPerm('inventario.ver'));
 tabVisible('renta',control&&ccPerm('rentas.ver'));
 tabVisible('historial',control&&ccPerm('historial.ver'));
 tabVisible('proforma',control&&ccPerm('proforma.ver'));
 tabVisible('mantenimiento',control&&ccPerm('mantenimiento.ver'));
 tabVisible('mapa',control&&ccPerm('mapa.ver'));
 tabVisible('configuracion',control&&ccPerm('configuracion.ver'));

 protectTabs();
 [
  ['ccNuevaCaja','inventario.crear'],['ccAbrirImportarUnidades','inventario.crear'],['ccEditarUnidadDirecto','inventario.editar'],
  ['ccPonerMantenimiento','inventario.mantenimiento'],['ccLiberarMantenimiento','inventario.mantenimiento'],
  ['ccAbrirDotRegistro','inventario.dot'],['ccMostrarQrUnidad','inventario.qr'],
  ['ccNuevaRenta','rentas.crear'],['ccGenerarPDFHistorial','historial.exportar'],['ccExportarExcelHistorial','historial.exportar'],
  ['ccGenerarPDFProforma','proforma.generar_pdf'],['ccEditarMantenimientoRegistro','mantenimiento.editar_registros'],['ccEditarDot','mantenimiento.editar_dot'],['ccMostrarDotControl','mantenimiento.ver_dot'],['ccActivarDibujoGeocerca','mapa.geocercas'],
  ['ccImportarGeocercasArchivo','mapa.geocercas'],['ccEliminarGeocerca','mapa.geocercas'],['ccEditarGeocerca','mapa.geocercas'],
  ['ccGuardarTarifa','configuracion.editar'],['ccNuevoCliente','configuracion.editar'],['ccNuevoResponsable','configuracion.editar']
 ].forEach(x=>protect(x[0],x[1]));

 if(!dashboard&&control){gmMostrarControlCajas();firstControlTab();}
 else if(dashboard){gmMostrarDashboard();}
 else if(!control){document.body.classList.add('gm-control-mode');alert('Tu usuario no tiene módulos habilitados.');}
}
window.ccApplyAccess=applyAccess;

function permissionsHtml(perms={}){
 return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button type="button" class="cc-btn cc-btn-light" onclick="ccToggleAllPermissions(this,true)"><i class="fa-solid fa-square-check"></i> Habilitar todo</button><button type="button" class="cc-btn cc-btn-light" onclick="ccToggleAllPermissions(this,false)">Quitar todo</button></div><div class="cc-perm-grid">'+PERM_SCHEMA.map(([module,label,items])=>'<div class="cc-perm-group" data-perm-group="'+module+'"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong>'+label+'</strong><label class="cc-perm-check" style="font-weight:900"><input type="checkbox" data-perm-all="'+module+'" onchange="ccTogglePermissionGroup(this)"> Todo</label></div>'+items.map(([key,txt])=>'<label class="cc-perm-check"><input type="checkbox" data-perm="'+module+'.'+key+'" onchange="ccSyncPermissionGroup(this)" '+(getPath(perms,module+'.'+key)?'checked':'')+'> '+txt+'</label>').join('')+'</div>').join('')+'</div>';
}
window.ccTogglePermissionGroup=function(el){const g=el.closest('[data-perm-group]');if(g)g.querySelectorAll('[data-perm]').forEach(x=>x.checked=el.checked);};
window.ccSyncPermissionGroup=function(el){const g=el.closest('[data-perm-group]');if(!g)return;const all=g.querySelector('[data-perm-all]'),items=[...g.querySelectorAll('[data-perm]')];if(all)all.checked=items.length>0&&items.every(x=>x.checked);};
window.ccToggleAllPermissions=function(btn,on){const root=btn.closest('.cc-user-body')||document;root.querySelectorAll('[data-perm],[data-perm-all]').forEach(x=>x.checked=on);};
function ccSyncAllPermissionGroups(root){(root||document).querySelectorAll('[data-perm-group]').forEach(g=>{const all=g.querySelector('[data-perm-all]'),items=[...g.querySelectorAll('[data-perm]')];if(all)all.checked=items.length>0&&items.every(x=>x.checked);});}
function readPermissions(root){
 const out={};PERM_SCHEMA.forEach(([m,,items])=>{out[m]={};items.forEach(([k])=>{out[m][k]=!!root.querySelector('[data-perm="'+m+'.'+k+'"]')?.checked;});});return out;
}
function closeUserModal(){document.getElementById('ccUserAdminModal')?.remove();}
window.ccOpenUserAdmin=async function(){
 if(window.CC_ACCESS?.rol!=='ADMIN'){alert('Solo ADMIN puede administrar usuarios.');return;}
 const {data,error}=await sb.rpc('cc_admin_list_users');if(error||!data?.ok){alert(error?.message||data?.error||'No se pudieron cargar usuarios');return;}
 closeUserModal();
 const ov=document.createElement('div');ov.id='ccUserAdminModal';ov.className='cc-user-modal';
 const users=data.usuarios||[];
 const escU=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 ov.innerHTML='<div class="cc-user-card"><div class="cc-user-head"><div><b>Usuarios y permisos</b><div style="font-size:10px;color:#bfdbfe">'+users.length+' usuario(s) registrado(s)</div></div><div style="display:flex;gap:7px"><button class="cc-btn cc-btn-primary" onclick="ccCreateUserModal()"><i class="fa-solid fa-user-plus"></i> Nuevo usuario</button><button class="cc-btn cc-btn-light" onclick="document.getElementById(\'ccUserAdminModal\').remove()">Cerrar</button></div></div><div class="cc-user-body"><div style="overflow:auto"><table style="width:100%;min-width:760px;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden"><thead><tr style="background:#e2e8f0;color:#334155;text-align:left"><th style="padding:10px">Nombre</th><th style="padding:10px">Correo</th><th style="padding:10px">Rol</th><th style="padding:10px">Estatus</th><th style="padding:10px">Acciones</th></tr></thead><tbody>'+users.map(u=>'<tr style="border-top:1px solid #e2e8f0"><td style="padding:10px;font-weight:900">'+escU(u.nombre||'—')+'</td><td style="padding:10px">'+escU(u.email)+'</td><td style="padding:10px">'+(u.rol==='ADMIN'?'<span class="cc-badge cc-ok">ADMIN</span>':'USUARIO')+'</td><td style="padding:10px">'+(u.activo?'<span class="cc-badge cc-ok">ACTIVO</span>':'<span class="cc-badge" style="background:#fee2e2;color:#991b1b">INHABILITADO</span>')+'</td><td style="padding:10px"><div class="cc-user-actions">'+(u.rol==='ADMIN'?'<span style="font-size:10px;color:#64748b">Usuario maestro protegido</span>':'<button class="cc-btn cc-btn-light" onclick=\'ccEditUserModal('+JSON.stringify(JSON.stringify(u))+')\'><i class="fa-solid fa-pen"></i> Editar</button><button class="cc-btn cc-btn-light" onclick=\'ccToggleUserActive('+JSON.stringify(u.userId)+','+JSON.stringify(u.nombre||u.email)+','+JSON.stringify(!u.activo)+')\'>'+(u.activo?'<i class="fa-solid fa-user-slash"></i> Inhabilitar':'<i class="fa-solid fa-user-check"></i> Habilitar')+'</button><button class="cc-btn cc-btn-light" onclick=\'ccSetUserPassword('+JSON.stringify(u.userId)+')\'><i class="fa-solid fa-key"></i> Contraseña</button><button class="cc-btn cc-btn-danger" onclick=\'ccDeleteAppUser('+JSON.stringify(u.userId)+','+JSON.stringify(u.email)+')\'><i class="fa-solid fa-trash"></i> Eliminar</button>')+'</div></td></tr>').join('')+'</tbody></table></div></div></div>';
 document.body.appendChild(ov);
};
window.ccToggleUserActive=async function(userId,nombre,activar){
 const accion=activar?'habilitar':'inhabilitar';
 if(!confirm('¿Deseas '+accion+' al usuario '+nombre+'?'))return;
 const {data:list,error:listErr}=await sb.rpc('cc_admin_list_users');if(listErr||!list?.ok){alert('No se pudo leer el usuario.');return;}
 const u=(list.usuarios||[]).find(x=>x.userId===userId);if(!u){alert('Usuario no encontrado.');return;}
 const {data,error}=await sb.rpc('cc_admin_update_user',{p_user_id:userId,p_nombre:u.nombre||'',p_activo:activar,p_permisos:u.permisos||{}});
 if(error||!data?.ok){alert(error?.message||data?.error||'No se pudo cambiar el estatus.');return;}
 await ccOpenUserAdmin();
};
window.ccCreateUserModal=function(){
 document.getElementById('ccUserEditModal')?.remove();
 const ov=document.createElement('div');ov.id='ccUserEditModal';ov.className='cc-user-modal';
 ov.innerHTML='<div class="cc-user-card" style="width:min(820px,98vw)"><div class="cc-user-head"><b>Nuevo usuario</b><button class="cc-btn cc-btn-light" onclick="this.closest(\'.cc-user-modal\').remove()">Cerrar</button></div><div class="cc-user-body"><div class="cc-grid"><div class="cc-field"><label>Nombre</label><input id="ccNewUserName"></div><div class="cc-field"><label>Correo</label><input id="ccNewUserEmail" type="email"></div><div class="cc-field"><label>Contraseña inicial</label><input id="ccNewUserPassword" type="password" minlength="8"></div></div><div style="margin:14px 0 8px;font-weight:900">Permisos</div><div id="ccNewPerms">'+permissionsHtml({})+'</div><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="cc-btn cc-btn-primary" onclick="ccSaveNewUser()">Crear usuario</button></div></div></div>';
 document.body.appendChild(ov);ccSyncAllPermissionGroups(ov);
};
window.ccSaveNewUser=async function(){
 const root=document.getElementById('ccUserEditModal'),email=document.getElementById('ccNewUserEmail')?.value.trim(),password=document.getElementById('ccNewUserPassword')?.value||'',nombre=document.getElementById('ccNewUserName')?.value.trim()||'';
 if(!email||password.length<8){alert('Captura correo y una contraseña de mínimo 8 caracteres.');return;}
 const permisos=readPermissions(document.getElementById('ccNewPerms'));
 const {data,error}=await sb.functions.invoke('cc-admin-users',{body:{action:'create_user',email,password,nombre,activo:true,permisos}});
 if(error||!data?.ok){alert(error?.message||data?.error||'No se pudo crear el usuario');return;}
 root?.remove();await ccOpenUserAdmin();
};
window.ccEditUserModal=function(json){
 const u=typeof json==='string'?JSON.parse(json):json;document.getElementById('ccUserEditModal')?.remove();
 const ov=document.createElement('div');ov.id='ccUserEditModal';ov.className='cc-user-modal';
 ov.innerHTML='<div class="cc-user-card" style="width:min(820px,98vw)"><div class="cc-user-head"><b>Permisos · '+(u.email||'')+'</b><button class="cc-btn cc-btn-light" onclick="this.closest(\'.cc-user-modal\').remove()">Cerrar</button></div><div class="cc-user-body"><div class="cc-grid"><div class="cc-field"><label>Nombre</label><input id="ccEditUserName" value="'+String(u.nombre||'').replace(/"/g,'&quot;')+'"></div><div class="cc-field"><label>Estatus</label><select id="ccEditUserActive"><option value="1" '+(u.activo?'selected':'')+'>ACTIVO</option><option value="0" '+(!u.activo?'selected':'')+'>DESACTIVADO</option></select></div></div><div style="margin:14px 0 8px;font-weight:900">Permisos</div><div id="ccEditPerms">'+permissionsHtml(u.permisos||{})+'</div><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="cc-btn cc-btn-primary" onclick=\'ccSaveEditedUser('+JSON.stringify(u.userId)+')\'>Guardar permisos</button></div></div></div>';
 document.body.appendChild(ov);ccSyncAllPermissionGroups(ov);
};
window.ccSaveEditedUser=async function(userId){
 const nombre=document.getElementById('ccEditUserName')?.value.trim()||'',activo=document.getElementById('ccEditUserActive')?.value==='1',permisos=readPermissions(document.getElementById('ccEditPerms'));
 const {data,error}=await sb.rpc('cc_admin_update_user',{p_user_id:userId,p_nombre:nombre,p_activo:activo,p_permisos:permisos});
 if(error||!data?.ok){alert(error?.message||data?.error||'No se pudo guardar');return;}
 document.getElementById('ccUserEditModal')?.remove();await ccOpenUserAdmin();
};
window.ccSetUserPassword=async function(userId){
 const password=prompt('Nueva contraseña (mínimo 8 caracteres):');if(password===null)return;if(password.length<8){alert('Mínimo 8 caracteres.');return;}
 const {data,error}=await sb.functions.invoke('cc-admin-users',{body:{action:'set_password',userId,password}});
 if(error||!data?.ok)alert(error?.message||data?.error||'No se pudo cambiar la contraseña');else alert('Contraseña actualizada.');
};
window.ccDeleteAppUser=async function(userId,email){
 if(!confirm('¿Eliminar el usuario '+email+'?'))return;
 const {data,error}=await sb.functions.invoke('cc-admin-users',{body:{action:'delete_user',userId}});
 if(error||!data?.ok){alert(error?.message||data?.error||'No se pudo eliminar');return;}await ccOpenUserAdmin();
};

document.addEventListener('DOMContentLoaded',async()=>{
 if(!sb){msg('Supabase no está disponible.','error');return;}
 await bootstrapStatus();
 document.getElementById('ccRememberSession').checked=localStorage.getItem('cc_remember_session')!=='0';
 document.getElementById('ccLoginForm').addEventListener('submit',e=>{e.preventDefault();const remember=document.getElementById('ccRememberSession').checked;localStorage.setItem('cc_remember_session',remember?'1':'0');if(remember)sessionStorage.setItem('cc_session_current','1');login(document.getElementById('ccLoginEmail').value,document.getElementById('ccLoginPassword').value);});
 document.getElementById('ccBootstrapForm').addEventListener('submit',async e=>{
  e.preventDefault();const nombre=document.getElementById('ccBootstrapName').value.trim(),email=document.getElementById('ccBootstrapEmail').value.trim(),password=document.getElementById('ccBootstrapPassword').value;
  msg('Activando usuario maestro…','info');
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{nombre}}});
  if(error){msg(error.message,'error');return;}
  if(data?.session){try{await loadAccess();}catch(err){msg(err.message,'error');}}
  else msg('Cuenta creada. Revisa el correo de confirmación y después inicia sesión.','ok');
  await bootstrapStatus();
 });
 const remember=localStorage.getItem('cc_remember_session')!=='0';
 if(!remember&&!sessionStorage.getItem('cc_session_current')){await sb.auth.signOut().catch(()=>{});}
 const {data}=await sb.auth.getSession();
 if(data?.session){sessionStorage.setItem('cc_session_current','1');try{await loadAccess();}catch(e){await sb.auth.signOut();msg(e.message||String(e),'error');}}
});
})();
