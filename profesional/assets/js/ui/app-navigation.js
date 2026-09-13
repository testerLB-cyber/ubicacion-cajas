function gmMostrarControlCajas(){
  document.body.classList.add('gm-control-mode');
  document.getElementById('gmSideDashboard')?.classList.remove('active');
  document.getElementById('gmSideCajas')?.classList.add('active');
  document.body.scrollTop=0;
  document.documentElement.scrollTop=0;
  if(typeof ccRenderAll==='function') ccRenderAll();
}
function gmMostrarDashboard(){
  document.body.classList.remove('gm-control-mode');
  document.getElementById('gmSideCajas')?.classList.remove('active');
  document.getElementById('gmSideDashboard')?.classList.add('active');
  window.scrollTo({top:0,behavior:'auto'});
}

/* ============================================================
   USUARIOS DE LA APP MÓVIL
   Se apoya en el mismo Supabase Auth de Tráfico App, pero crea
   perfiles con permiso específico app_movil.ver.
   ============================================================ */
function gmEscapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

window.gmOpenMobileUsers=async function(){
  if(window.CC_ACCESS?.rol!=='ADMIN'){
    alert('Solo el administrador puede crear usuarios para la aplicación.');
    return;
  }
  const sb=window.gmSupabase;
  if(!sb){alert('Supabase no está disponible.');return;}
  document.getElementById('gmMobileUsersModal')?.remove();
  let mobileUsers=[];
  try{
    const {data,error}=await sb.rpc('cc_admin_list_users');
    if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudieron cargar usuarios');
    mobileUsers=(data.usuarios||[]).filter(u=>u?.rol==='ADMIN'||u?.permisos?.app_movil?.ver===true);
  }catch(e){alert(e.message||String(e));return;}

  const ov=document.createElement('div');
  ov.id='gmMobileUsersModal';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML=`<div style="width:min(760px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 28px 80px rgba(15,23,42,.28);font-family:Inter,system-ui,-apple-system,sans-serif">
    <div style="padding:18px 20px;background:#0f172a;color:white;display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:20px 20px 0 0">
      <div><div style="font-size:17px;font-weight:900">Usuarios de la aplicación</div><div style="font-size:11px;color:#bfdbfe;margin-top:3px">Acceso independiente para la nueva app móvil</div></div>
      <button onclick="document.getElementById('gmMobileUsersModal').remove()" style="border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:8px 11px;font-weight:800">Cerrar</button>
    </div>
    <div style="padding:20px">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:14px;margin-bottom:18px;color:#1e3a8a;font-size:12px"><b>Nuevo usuario:</b> este acceso permitirá iniciar sesión en la aplicación móvil. No habilita automáticamente módulos de la web.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">
        <label style="font-size:11px;font-weight:800;color:#475569">Nombre<input id="gmMobileUserName" style="display:block;width:100%;margin-top:5px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:14px" autocomplete="name"></label>
        <label style="font-size:11px;font-weight:800;color:#475569">Correo<input id="gmMobileUserEmail" type="email" style="display:block;width:100%;margin-top:5px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:14px" autocomplete="email"></label>
        <label style="font-size:11px;font-weight:800;color:#475569">Contraseña inicial<input id="gmMobileUserPassword" type="password" minlength="8" style="display:block;width:100%;margin-top:5px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:14px" autocomplete="new-password"></label>
      </div>
      <div id="gmMobileUserMsg" style="min-height:18px;margin-top:10px;font-size:12px;font-weight:700"></div>
      <div style="display:flex;justify-content:flex-end;margin-top:8px"><button id="gmMobileUserCreateBtn" onclick="gmCreateMobileUser()" style="border:0;background:#2563eb;color:white;border-radius:11px;padding:10px 16px;font-weight:900;cursor:pointer">Crear usuario de app</button></div>
      <div style="font-size:13px;font-weight:900;color:#0f172a;margin:22px 0 8px">Usuarios con acceso a la app</div>
      <div style="overflow:auto;border:1px solid #e2e8f0;border-radius:12px">
        <table style="width:100%;min-width:520px;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9;text-align:left;color:#475569"><th style="padding:10px">Nombre</th><th style="padding:10px">Correo</th><th style="padding:10px">Estatus</th></tr></thead><tbody>
          ${mobileUsers.length?mobileUsers.map(u=>`<tr style="border-top:1px solid #e2e8f0"><td style="padding:10px;font-weight:800">${gmEscapeHtml(u.nombre||'—')}</td><td style="padding:10px">${gmEscapeHtml(u.email||'')}</td><td style="padding:10px">${u.activo?'<span style="color:#166534;font-weight:900">ACTIVO</span>':'<span style="color:#991b1b;font-weight:900">INACTIVO</span>'}</td></tr>`).join(''):'<tr><td colspan="3" style="padding:16px;color:#64748b;text-align:center">Aún no hay usuarios exclusivos de la app.</td></tr>'}
        </tbody></table>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
};

window.gmCreateMobileUser=async function(){
  const sb=window.gmSupabase;
  if(!sb||window.CC_ACCESS?.rol!=='ADMIN')return;
  const nombre=document.getElementById('gmMobileUserName')?.value.trim()||'';
  const email=document.getElementById('gmMobileUserEmail')?.value.trim()||'';
  const password=document.getElementById('gmMobileUserPassword')?.value||'';
  const msg=document.getElementById('gmMobileUserMsg');
  const btn=document.getElementById('gmMobileUserCreateBtn');
  if(!nombre||!email||password.length<8){if(msg){msg.style.color='#b91c1c';msg.textContent='Captura nombre, correo y contraseña de mínimo 8 caracteres.';}return;}
  if(btn)btn.disabled=true;
  if(msg){msg.style.color='#1d4ed8';msg.textContent='Creando usuario…';}
  try{
    const permisos={app_movil:{ver:true}};
    const {data,error}=await sb.functions.invoke('cc-admin-users',{body:{action:'create_user',email,password,nombre,activo:true,permisos}});
    if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo crear el usuario');
    if(msg){msg.style.color='#166534';msg.textContent='Usuario creado correctamente.';}
    setTimeout(()=>gmOpenMobileUsers(),500);
  }catch(e){if(msg){msg.style.color='#b91c1c';msg.textContent=e.message||String(e);}}
  finally{if(btn)btn.disabled=false;}
};

function gmInstallMobileUsersButton(){
  if(document.getElementById('gmSideMobileUsers'))return;
  const anchor=document.getElementById('gmSideUsers');
  if(!anchor)return;
  const btn=document.createElement('button');
  btn.id='gmSideMobileUsers';
  btn.style.display='none';
  btn.innerHTML='<i class="fa-solid fa-mobile-screen-button"></i><span>Usuarios App</span>';
  btn.onclick=gmOpenMobileUsers;
  anchor.insertAdjacentElement('afterend',btn);
  const sync=()=>{btn.style.display=window.CC_ACCESS?.rol==='ADMIN'?'':'none';};
  sync();
  const timer=setInterval(()=>{sync();if(window.CC_AUTH_READY&&window.CC_ACCESS)clearInterval(timer);},400);
  setTimeout(()=>clearInterval(timer),15000);
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('gmSideDashboard')?.classList.add('active');
  document.getElementById('gmSideCajas')?.classList.remove('active');
  gmInstallMobileUsersButton();
});
