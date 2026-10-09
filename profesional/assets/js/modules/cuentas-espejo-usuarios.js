/* Tráfico App · Configuración de cuentas espejo externas. Altas en borrador hasta activar invitación segura. */
(function(){
 const root=()=>document.getElementById('ccConfigClientes');
 const db=()=>window.gmSupabase;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&quot;':'&quot;',"'":'&#39;'}[c]));
 const isAdmin=()=>window.CC_ACCESS?.superAdmin===true||window.CC_ACCESS?.rol==='ADMIN';
 let clients=[],users=[];
 async function refresh(){
  if(!isAdmin())return;
  const [c,u]=await Promise.all([
   db().from('cc_clientes').select('id,nombre,estatus').eq('estatus','ACTIVO').order('nombre'),
   db().from('cc_cuentas_espejo_usuarios').select('*').order('created_at',{ascending:false})
  ]);
  if(c.error||u.error)throw c.error||u.error;
  clients=c.data||[];users=u.data||[];
  const sel=document.getElementById('esCliente');
  sel.innerHTML='<option value="">Seleccione cliente activo</option>'+clients.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
  document.getElementById('esLista').innerHTML=users.length?users.map(x=>'<tr><td>'+esc(x.nombre)+'</td><td>'+esc(x.email)+'</td><td>'+esc(clients.find(c=>c.id===x.cliente_id)?.nombre||x.cliente_id)+'</td><td>'+[x.ver_aeropuerto?'Aeropuerto':null,x.ver_cajas_renta?'Cajas':null,x.ver_mapa_unidades?'Mapa':null].filter(Boolean).join(' · ')+'</td><td>'+(x.auth_user_id?(x.activo?'Activo':'Suspendido'):'Pendiente de invitación')+'</td></tr>').join(''):'<tr><td colspan="5" style="padding:14px">Sin cuentas registradas</td></tr>';
 }
 function setup(){
  if(!root()||document.getElementById('esUsuariosPanel'))return;
  root().insertAdjacentHTML('beforeend',`<div id="esUsuariosPanel" class="cc-config-card" style="margin-top:18px;display:none">
  <div class="cc-config-section-head"><div><h4>Usuarios de Cuenta Espejo</h4><p>Portal externo por cliente. El acceso permanece deshabilitado hasta completar la invitación y protección de datos.</p></div><button id="esAbrir" class="cc-btn cc-btn-primary" type="button">Agregar usuario</button></div>
  <div id="esFormulario" style="display:none;padding:14px;border:1px solid #e2e8f0;border-radius:10px;margin:12px 0">
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
    <label>Nombre completo<input id="esNombre" class="cc-input" maxlength="160" autocomplete="off" style="width:100%"></label>
    <label>Correo electrónico<input id="esEmail" class="cc-input" type="email" maxlength="260" autocomplete="off" style="width:100%"></label>
    <label>Cliente<select id="esCliente" class="cc-input" style="width:100%"></select></label>
    <label>Vista predeterminada<select id="esDefault" class="cc-input" style="width:100%"><option value="aeropuerto">Pantalla Aeropuerto</option><option value="cajas_renta">Cajas de renta</option><option value="mapa_unidades">Mapa de unidades</option></select></label>
   </div>
   <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px">
    <label><input type="checkbox" id="esAero" checked> Pantalla Aeropuerto</label>
    <label><input type="checkbox" id="esRenta"> Cajas de renta</label>
    <label><input type="checkbox" id="esMapa"> Mapa de unidades</label>
   </div>
   <div style="margin-top:15px;display:flex;gap:10px;align-items:center"><button id="esGuardar" type="button" class="cc-btn cc-btn-primary">Guardar configuración</button><span id="esMsg" style="font-size:12px"></span></div>
  </div>
  <div style="overflow:auto"><table class="cc-table-list"><thead><tr><th>NOMBRE</th><th>CORREO</th><th>CLIENTE</th><th>PERMISOS</th><th>ESTADO</th></tr></thead><tbody id="esLista"></tbody></table></div>
  </div>`);
  const $=id=>document.getElementById(id);
  $('esAbrir').onclick=()=>{$('esFormulario').style.display=$('esFormulario').style.display==='none'?'block':'none'};
  $('esGuardar').onclick=async()=>{
   const nombre=$('esNombre').value.trim(),email=$('esEmail').value.trim().toLowerCase(),cliente_id=$('esCliente').value;
   const va=$('esAero').checked,vr=$('esRenta').checked,vm=$('esMapa').checked,def=$('esDefault').value;
   const msg=$('esMsg');
   if(!nombre||!/^\S+@\S+\.\S+$/.test(email)||!cliente_id){msg.textContent='Completa nombre, correo y cliente.';return}
   if(!(va||vr||vm)||!(def==='aeropuerto'&&va||def==='cajas_renta'&&vr||def==='mapa_unidades'&&vm)){msg.textContent='Selecciona una vista predeterminada autorizada.';return}
   $('esGuardar').disabled=true;msg.textContent='Guardando…';
   try{
    const {error}=await db().from('cc_cuentas_espejo_usuarios').insert({nombre,email,cliente_id,ver_aeropuerto:va,ver_cajas_renta:vr,ver_mapa_unidades:vm,vista_default:def,activo:false});
    if(error)throw error;
    msg.textContent='Configuración guardada. Acceso aún no habilitado.';
    $('esFormulario').style.display='none';$('esNombre').value='';$('esEmail').value='';
    await refresh();
   }catch(e){msg.textContent='Error: '+e.message}finally{$('esGuardar').disabled=false}
  };
 }
 function enhanceClientModal(id){
  const modal=document.getElementById('ccFormModal'),form=modal?.querySelector('#ccForm');if(!form)return;
  const card=modal.firstElementChild;if(card){card.style.width='min(900px,97vw)';card.style.borderRadius='20px';card.style.boxShadow='0 28px 90px rgba(15,23,42,.28)';}
  const header=card?.firstElementChild;if(header){header.style.padding='20px 24px';header.style.background='linear-gradient(120deg,#0f172a,#1d4ed8)';header.style.alignItems='center'}
  form.style.padding='22px 24px';
  const section=document.createElement('section');section.style='margin-top:20px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;overflow:hidden';
  section.innerHTML='<div style="padding:15px 17px;background:#eff6ff;display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b style="font-size:14px;color:#1e3a8a">Usuarios de Cuenta Espejo</b><div style="font-size:12px;color:#64748b;margin-top:4px">Accesos externos exclusivos para este cliente</div></div><span style="font-size:11px;padding:5px 9px;background:white;border-radius:16px;color:#1d4ed8">Portal privado</span></div><div id="esClienteContenido" style="padding:16px"></div>';
  const footer=form.lastElementChild;form.insertBefore(section,footer);
  const content=section.querySelector('#esClienteContenido');
  if(!id){content.innerHTML='<p style="margin:0;color:#475569;font-size:13px">Primero guarda el cliente. Después entra a Editar para agregar sus usuarios y permisos.</p>';return}
  content.innerHTML='<p style="color:#64748b">Cargando usuarios…</p>';
  const render=async()=>{
   const {data,error}=await db().from('cc_cuentas_espejo_usuarios').select('*').eq('cliente_id',id).order('created_at',{ascending:false});
   if(!document.contains(section))return;
   if(error){content.textContent='No se pudieron consultar usuarios: '+error.message;return}
   content.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><strong style="color:#334155">Usuarios registrados ('+(data||[]).length+')</strong><button type="button" id="esClienteNuevo" class="cc-btn cc-btn-primary">+ Agregar usuario</button></div><div id="esClienteForm" style="display:none;background:white;padding:15px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:14px"></div><div style="display:grid;gap:7px">'+((data||[]).map(u=>'<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:10px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:9px"><div><b>'+esc(u.nombre)+'</b><div style="font-size:12px;color:#64748b">'+esc(u.email)+'</div><div style="font-size:11px;color:#64748b">'+[u.ver_aeropuerto?'Aeropuerto':'',u.ver_cajas_renta?'Cajas de renta':'',u.ver_mapa_unidades?'Mapa':''].filter(Boolean).join(' · ')+'</div></div><span style="font-size:11px;color:#64748b">'+(u.auth_user_id?(u.activo?'Activo':'Suspendido'):'Invitación pendiente')+'</span></div>').join('')||'<p style="font-size:12px;color:#64748b">Este cliente todavía no tiene usuarios.</p>')+'</div>';
   content.querySelector('#esClienteNuevo').onclick=()=>{
    const box=content.querySelector('#esClienteForm');box.style.display='block';
    box.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px"><label>Nombre<input id="esCN" class="cc-input" required style="width:100%"></label><label>Correo<input id="esCE" class="cc-input" type="email" required style="width:100%"></label><label>Vista inicial<select id="esCD" class="cc-input" style="width:100%"><option value="aeropuerto">Pantalla Aeropuerto</option><option value="cajas_renta">Cajas de renta</option><option value="mapa_unidades">Mapa de unidades</option></select></label></div><div style="display:flex;flex-wrap:wrap;gap:15px;margin:14px 0;font-size:13px"><label><input id="esCA" type="checkbox" checked> Pantalla Aeropuerto</label><label><input id="esCR" type="checkbox"> Cajas de renta</label><label><input id="esCM" type="checkbox"> Mapa de unidades</label></div><div style="display:flex;gap:10px;align-items:center"><button id="esCSave" type="button" class="cc-btn cc-btn-primary">Guardar usuario</button><button id="esCCancel" type="button" class="cc-btn cc-btn-light">Cancelar</button></div><p id="esCMsg" style="font-size:12px;margin:7px 0 0;color:#64748b">El acceso quedará pendiente de invitación segura.</p>';
    const $=x=>box.querySelector('#'+x);
    $('esCCancel').onclick=()=>{box.style.display='none'};
    $('esCSave').onclick=async()=>{
     const nombre=$('esCN').value.trim(),email=$('esCE').value.trim().toLowerCase(),va=$('esCA').checked,vr=$('esCR').checked,vm=$('esCM').checked,def=$('esCD').value;
     if(!nombre||!/^\S+@\S+\.\S+$/.test(email)||!(va||vr||vm)||!((def==='aeropuerto'&&va)||(def==='cajas_renta'&&vr)||(def==='mapa_unidades'&&vm))){$('esCMsg').textContent='Revisa correo, nombre, permisos y vista inicial.';return}
     $('esCSave').disabled=true;
     const {error}=await db().from('cc_cuentas_espejo_usuarios').insert({nombre,email,cliente_id:id,ver_aeropuerto:va,ver_cajas_renta:vr,ver_mapa_unidades:vm,vista_default:def,activo:false});
     if(error){$('esCSave').disabled=false;$('esCMsg').textContent='No se guardó: '+error.message;return}
     await render();
    };
   };
  };
  render().catch(e=>{content.textContent=e.message});
 }
 const oldNewCliente=window.ccNuevoCliente;
 if(typeof oldNewCliente==='function')window.ccNuevoCliente=function(id){const value=oldNewCliente.apply(this,arguments);enhanceClientModal(id);return value};
 function showIfAdmin(){
  setup();const panel=document.getElementById('esUsuariosPanel');if(!panel)return;
  panel.style.display='none';return;
 }
 document.addEventListener('DOMContentLoaded',()=>{setup();showIfAdmin();new MutationObserver(()=>showIfAdmin()).observe(document.body,{attributes:true,attributeFilter:['class']});});
 const old=window.ccApplyAccess;
 if(typeof old==='function')window.ccApplyAccess=function(...args){const ret=old.apply(this,args);showIfAdmin();return ret};
})();
