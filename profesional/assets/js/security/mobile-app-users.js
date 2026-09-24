(function(){
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ensureButton(){
    if(document.getElementById('gmSideMobileUsers')) return;
    const usersBtn=document.getElementById('gmSideUsers');
    if(!usersBtn) return;
    const btn=document.createElement('button');
    btn.id='gmSideMobileUsers'; btn.style.display='none'; btn.innerHTML='<i class="fa-solid fa-mobile-screen-button"></i><span>Usuarios App</span>';
    btn.onclick=openAdmin;
    usersBtn.insertAdjacentElement('afterend',btn);
    const sync=()=>{btn.style.display=(window.CC_ACCESS?.rol==='ADMIN')?'':'none';};
    sync(); setInterval(sync,1200);
  }
  async function getData(){const {data,error}=await sb().rpc('cc_admin_mobile_data'); if(error||!data?.ok) throw new Error(error?.message||data?.error||'No se pudo cargar'); return data;}
  async function openAdmin(){
    if(window.CC_ACCESS?.rol!=='ADMIN'){alert('Solo ADMIN puede administrar usuarios de la app.');return;}
    let data; try{data=await getData();}catch(e){alert(e.message);return;}
    document.getElementById('ccMobileUsersModal')?.remove();
    const ov=document.createElement('div'); ov.id='ccMobileUsersModal'; ov.className='cc-user-modal';
    ov.innerHTML='<div class="cc-user-card" style="width:min(920px,98vw)"><div class="cc-user-head"><div><b>Usuarios de aplicación móvil</b><div style="font-size:10px;color:#bfdbfe">Acceso por usuario y contraseña · ligado a operador</div></div><div style="display:flex;gap:7px"><button class="cc-btn cc-btn-primary" id="ccMobileNewBtn"><i class="fa-solid fa-user-plus"></i> Nuevo usuario</button><button class="cc-btn cc-btn-light" onclick="this.closest(\'.cc-user-modal\').remove()">Cerrar</button></div></div><div class="cc-user-body"><div style="overflow:auto"><table style="width:100%;min-width:760px;border-collapse:collapse"><thead><tr style="background:#e2e8f0"><th style="padding:9px;text-align:left">Usuario</th><th style="padding:9px;text-align:left">Nombre</th><th style="padding:9px;text-align:left">Operador ligado</th><th style="padding:9px;text-align:left">Estatus</th><th style="padding:9px;text-align:left">Permisos</th><th style="padding:9px;text-align:left">Acción</th></tr></thead><tbody>'+(data.usuarios||[]).map(u=>'<tr style="border-top:1px solid #e2e8f0"><td style="padding:9px;font-weight:900">'+esc(u.username||'—')+'</td><td style="padding:9px">'+esc(u.nombre||'—')+'</td><td style="padding:9px">'+esc(u.operadorNombre||'—')+'</td><td style="padding:9px">'+(u.activo?'ACTIVO':'INACTIVO')+'</td><td style="padding:9px;font-size:10px">'+permText(u.permisos)+'</td><td style="padding:9px"><button class="cc-btn cc-btn-light" data-mob-edit="'+esc(u.userId)+'">Modificar</button></td></tr>').join('')+'</tbody></table></div></div></div>';
    document.body.appendChild(ov);
    document.getElementById('ccMobileNewBtn').onclick=()=>openCreate(data.operadores||[]); ov.querySelectorAll('[data-mob-edit]').forEach(b=>b.onclick=()=>openEdit((data.usuarios||[]).find(u=>u.userId===b.dataset.mobEdit),data.operadores||[]));
  }
  function pval(p,k,d=true){const v=p?.app_movil?.[k];return typeof v==='boolean'?v:d}
  function permText(p){return [['hojas','Hojas'],['anticipos','Anticipos'],['historial','Historial'],['documentos','Documentos']].filter(([k])=>pval(p,k)).map(x=>x[1]).join(' · ')||'Sin módulos'}
  function permHtml(p={}){return '<div style="margin-top:14px"><strong>Permisos de la app móvil</strong><div class="cc-note">Define qué puede ver este operador.</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px">'+[['hojas','Hojas de servicio'],['anticipos','Anticipos'],['historial','Mi historial'],['documentos','Documentos de unidad']].map(([k,l])=>'<label style="display:flex;gap:7px;align-items:center"><input type="checkbox" data-mob-perm="'+k+'" '+(pval(p,k)?'checked':'')+'> '+l+'</label>').join('')+'</div></div>'}
  function readPerms(root=document){const a={ver:true};root.querySelectorAll('[data-mob-perm]').forEach(x=>a[x.dataset.mobPerm]=x.checked);return {app_movil:a}}
  function openCreate(ops){
    document.getElementById('ccMobileCreateModal')?.remove();
    const ov=document.createElement('div'); ov.id='ccMobileCreateModal'; ov.className='cc-user-modal';
    ov.innerHTML='<div class="cc-user-card" style="width:min(620px,96vw)"><div class="cc-user-head"><b>Nuevo usuario de app</b><button class="cc-btn cc-btn-light" onclick="this.closest(\'.cc-user-modal\').remove()">Cerrar</button></div><div class="cc-user-body"><div class="cc-grid"><div class="cc-field"><label>Nombre visible</label><input id="ccMobName"></div><div class="cc-field"><label>Usuario</label><input id="ccMobUsername" autocapitalize="none"></div><div class="cc-field"><label>Contraseña inicial</label><input id="ccMobPassword" type="password" minlength="8"></div><div class="cc-field"><label>Operador</label><select id="ccMobOperator"><option value="">Selecciona operador</option>'+ops.map(o=>'<option value="'+esc(o.id)+'" data-name="'+esc(o.nombre)+'">'+esc((o.numeroEmpleado?o.numeroEmpleado+' · ':'')+o.nombre)+'</option>').join('')+'</select></div></div>'+permHtml()+'<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="cc-btn cc-btn-primary" id="ccMobSave">Crear usuario</button></div></div></div>';
    document.body.appendChild(ov);
    document.getElementById('ccMobSave').onclick=save;
  }
  async function save(){
    const nombre=document.getElementById('ccMobName').value.trim();
    const username=document.getElementById('ccMobUsername').value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');
    const password=document.getElementById('ccMobPassword').value;
    const sel=document.getElementById('ccMobOperator'); const operadorId=sel.value; const operadorNombre=sel.selectedOptions[0]?.dataset.name||'';
    if(!nombre||username.length<3||password.length<8||!operadorId){alert('Captura nombre, usuario de mínimo 3 caracteres, contraseña de mínimo 8 y operador.');return;}
    const email=username+'@usuarios.trafico-app.com';
    const permisos=readPerms(document.getElementById('ccMobileCreateModal'));
    const {data,error}=await sb().functions.invoke('cc-admin-users',{body:{action:'create_user',email,password,nombre,activo:true,permisos}});
    if(error||!data?.ok){alert(error?.message||data?.error||'No se pudo crear el usuario');return;}
    const {data:cfg,error:cfgErr}=await sb().rpc('cc_admin_configure_mobile_user',{p_user_id:data.userId,p_username:username,p_operador_id:operadorId,p_operador_nombre:operadorNombre});
    if(cfgErr||!cfg?.ok){alert(cfgErr?.message||cfg?.error||'Usuario creado, pero no se pudo ligar al operador');return;}
    document.getElementById('ccMobileCreateModal')?.remove(); await openAdmin();
  }
  function openEdit(u,ops){if(!u)return;document.getElementById('ccMobileEditModal')?.remove();const ov=document.createElement('div');ov.id='ccMobileEditModal';ov.className='cc-user-modal';ov.innerHTML='<div class="cc-user-card" style="width:min(620px,96vw)"><div class="cc-user-head"><b>Modificar usuario app</b><button class="cc-btn cc-btn-light" data-x>Cerrar</button></div><div class="cc-user-body"><div class="cc-grid"><div class="cc-field"><label>Nombre</label><input id="ccMobEditName" value="'+esc(u.nombre||'')+'"></div><div class="cc-field"><label>Usuario</label><input value="'+esc(u.username||'')+'" disabled></div><div class="cc-field"><label>Operador</label><select id="ccMobEditOperator">'+ops.map(o=>'<option value="'+esc(o.id)+'" data-name="'+esc(o.nombre)+'" '+(o.id===u.operadorId?'selected':'')+'>'+esc((o.numeroEmpleado?o.numeroEmpleado+' · ':'')+o.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Estatus</label><select id="ccMobEditActive"><option value="1" '+(u.activo?'selected':'')+'>ACTIVO</option><option value="0" '+(!u.activo?'selected':'')+'>INACTIVO</option></select></div></div>'+permHtml(u.permisos)+'<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="cc-btn cc-btn-primary" data-save>Guardar cambios</button></div></div></div>';document.body.appendChild(ov);ov.querySelector('[data-x]').onclick=()=>ov.remove();ov.querySelector('[data-save]').onclick=async()=>{const sel=ov.querySelector('#ccMobEditOperator'),r=await sb().rpc('cc_admin_update_mobile_user',{p_user_id:u.userId,p_nombre:ov.querySelector('#ccMobEditName').value.trim(),p_activo:ov.querySelector('#ccMobEditActive').value==='1',p_operador_id:sel.value,p_operador_nombre:sel.selectedOptions[0]?.dataset.name||'',p_permisos:readPerms(ov)});if(r.error||!r.data?.ok)return alert(r.error?.message||r.data?.error||'No se pudo modificar');ov.remove();await openAdmin();};}
  window.ccOpenMobileUserAdmin=openAdmin;
  document.addEventListener('DOMContentLoaded',ensureButton);
  setTimeout(ensureButton,1200);
})();