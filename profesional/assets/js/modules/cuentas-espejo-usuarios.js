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
 function showIfAdmin(){
  setup();const panel=document.getElementById('esUsuariosPanel');if(!panel)return;
  if(!isAdmin()){panel.style.display='none';return}
  if(panel.style.display==='none'){panel.style.display='block';refresh().catch(e=>{document.getElementById('esLista').innerHTML='<tr><td colspan="5">'+esc(e.message)+'</td></tr>'})}
 }
 document.addEventListener('DOMContentLoaded',()=>{setup();showIfAdmin();new MutationObserver(()=>showIfAdmin()).observe(document.body,{attributes:true,attributeFilter:['class']});});
 const old=window.ccApplyAccess;
 if(typeof old==='function')window.ccApplyAccess=function(...args){const ret=old.apply(this,args);showIfAdmin();return ret};
})();
