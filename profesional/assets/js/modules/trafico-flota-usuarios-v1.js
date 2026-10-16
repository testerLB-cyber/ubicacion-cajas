(function(){
'use strict';
if(window.__ccTraficoFlotaV1)return;window.__ccTraficoFlotaV1=true;
const $=s=>document.querySelector(s), esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sb=()=>window.gmSupabase;
let data={usuarios:[],unidades:[],operadores:[],asignaciones:[]},selected='',draft=[],loading=false;
const isAdmin=()=>window.CC_ACCESS?.superAdmin===true||window.CC_ACCESS?.rol==='ADMIN';
function ensure(){
 const panel=$('#ccPanelConfiguracion'),nav=panel?.querySelector('.cc-config-nav');if(!panel||!nav)return false;
 let b=nav.querySelector('[data-config="flotaTrafico"]');
 if(!b){b=document.createElement('button');b.type='button';b.className='cc-config-nav-btn';b.dataset.config='flotaTrafico';b.innerHTML='<i class="fa-solid fa-truck"></i><span>Flota de usuarios de Tráfico</span><small>Usuarios, unidades y operadores</small>';b.onclick=()=>{window.ccConfigSection?.('flotaTrafico',b);load().catch(showError)};nav.appendChild(b);}b.style.display=(window.CC_AUTH_READY&&isAdmin())?'':'none';
 let sec=$('#ccConfigFlotaTrafico');
 if(!sec){sec=document.createElement('div');sec.id='ccConfigFlotaTrafico';sec.className='cc-config-section';sec.innerHTML=
 '<div class="cc-config-card"><div class="cc-toolbar"><div><strong>Flota de usuarios de Tráfico</strong><div class="cc-note">Marca qué usuarios administrarán una flota y asigna cada unidad con su operador del catálogo.</div></div><button type="button" class="cc-btn cc-btn-light" data-refresh>Actualizar</button></div>'+
 '<div class="cc-grid" style="grid-template-columns:minmax(220px,1fr) minmax(220px,2fr);align-items:end;margin-top:12px"><div class="cc-field"><label>Buscar usuario</label><input data-search placeholder="Nombre o correo"></div><div class="cc-field"><label>Usuario</label><select data-user><option value="">Selecciona un usuario</option></select></div></div>'+
 '<div data-editor style="display:none;margin-top:14px"><label style="display:flex;gap:10px;align-items:center;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-weight:800;color:#1e3a8a"><input type="checkbox" data-flag style="width:18px;height:18px"> Este usuario es de Tráfico y puede tener flota asignada</label>'+
 '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 8px"><strong>Unidades asignadas y sus operadores</strong><button type="button" class="cc-btn cc-btn-light" data-add>+ Agregar unidad</button></div>'+
 '<div data-rows style="display:grid;gap:8px"></div><div class="cc-note" style="margin-top:8px">Cada unidad solo puede estar asignada a un usuario de Tráfico. Puedes asignar varias unidades al mismo usuario.</div>'+
 '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button type="button" class="cc-btn cc-btn-primary" data-save>Guardar configuración</button></div></div><div data-empty class="cc-note" style="padding:18px 0">Selecciona un usuario para configurar su flota.</div><div data-status role="status" style="margin-top:10px"></div></div>';
 panel.appendChild(sec);
 sec.querySelector('[data-refresh]').onclick=()=>load().catch(showError);
 sec.querySelector('[data-search]').oninput=renderUsers;
 sec.querySelector('[data-user]').onchange=e=>{selected=e.target.value;draft=(data.asignaciones||[]).filter(x=>x.userId===selected).map(x=>({unidadId:x.unidadId,operadorId:x.operadorId}));renderEditor();};
 sec.querySelector('[data-flag]').onchange=()=>renderEditor();
 sec.querySelector('[data-add]').onclick=()=>{if(!sec.querySelector('[data-flag]').checked)return status('Marca primero al usuario como usuario de Tráfico.','error');draft.push({unidadId:'',operadorId:''});renderRows();};
 sec.querySelector('[data-save]').onclick=save;
 }
 return true;
}
function status(msg,type){const e=$('#ccConfigFlotaTrafico [data-status]');if(e){e.textContent=msg;e.style.color=type==='error'?'#b91c1c':'#166534';}}
function showError(e){status(e?.message||String(e),'error');}
async function load(){
 if(loading||!ensure())return;loading=true;status('Cargando catálogos…');
 try{const r=await sb().rpc('cc_trafico_flota_list');if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error==='SIN_PERMISO'?'Solo un administrador puede configurar la flota.':'No se pudo cargar la configuración.');
 data={usuarios:r.data.usuarios||[],unidades:r.data.unidades||[],operadores:r.data.operadores||[],asignaciones:r.data.asignaciones||[]};
 const sel=$('#ccConfigFlotaTrafico [data-user]');const prev=selected;sel.innerHTML='<option value="">Selecciona un usuario</option>'+data.usuarios.map(u=>'<option value="'+esc(u.userId)+'">'+esc(u.nombre||u.email||'Usuario')+' · '+esc(u.email||'')+(u.activo?'':' · INACTIVO')+'</option>').join('');
 selected=data.usuarios.some(u=>u.userId===prev)?prev:'';sel.value=selected;
 draft=selected?data.asignaciones.filter(x=>x.userId===selected).map(x=>({unidadId:x.unidadId,operadorId:x.operadorId})):[];
 renderUsers();renderEditor();status('Catálogos actualizados.'); 
 }finally{loading=false;}
}
function renderUsers(){
 const sel=$('#ccConfigFlotaTrafico [data-user]');if(!sel)return;const q=($('#ccConfigFlotaTrafico [data-search]').value||'').trim().toLowerCase();const current=selected;
 const list=data.usuarios.filter(u=>!q||[u.nombre,u.email,u.rol].some(v=>String(v||'').toLowerCase().includes(q)));
 sel.innerHTML='<option value="">Selecciona un usuario ('+list.length+')</option>'+list.map(u=>'<option value="'+esc(u.userId)+'">'+esc(u.nombre||u.email||'Usuario')+' · '+esc(u.email||'')+(u.esTrafico?' · TRÁFICO':'')+(u.activo?'':' · INACTIVO')+'</option>').join('');
 if(list.some(u=>u.userId===current)){sel.value=current;}else if(current){selected='';draft=[];renderEditor();}
}
function renderEditor(){
 const sec=$('#ccConfigFlotaTrafico');if(!sec)return;const u=data.usuarios.find(x=>x.userId===selected),ed=sec.querySelector('[data-editor]'),empty=sec.querySelector('[data-empty]');
 ed.style.display=u?'block':'none';empty.style.display=u?'none':'block';if(!u)return;
 const flag=sec.querySelector('[data-flag]');flag.checked=!!u.esTrafico;
 sec.querySelector('[data-add]').disabled=!flag.checked;
 sec.querySelector('[data-save]').disabled=!isAdmin();
 renderRows();
}
function renderRows(){
 const sec=$('#ccConfigFlotaTrafico'),el=sec?.querySelector('[data-rows]');if(!el)return;
 const enabled=!!sec.querySelector('[data-flag]').checked;
 el.innerHTML=draft.map((a,i)=>{
  const unitOpts='<option value="">Selecciona unidad</option>'+data.unidades.map(u=>'<option value="'+esc(u.id)+'" '+(a.unidadId===u.id?'selected':'')+'>'+esc(u.numero||u.id)+' · '+esc(u.descripcion||u.tipo||'')+'</option>').join('');
  const opOpts='<option value="">Selecciona operador</option>'+data.operadores.map(o=>'<option value="'+esc(o.id)+'" '+(a.operadorId===o.id?'selected':'')+'>'+esc(o.nombre||o.id)+(o.numeroEmpleado?' · '+esc(o.numeroEmpleado):'')+'</option>').join('');
  return '<div style="display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto;gap:8px;align-items:end;padding:10px;border:1px solid #dbe3ef;border-radius:10px;background:#f8fafc" data-row="'+i+'"><div class="cc-field"><label>Unidad</label><select data-unit '+(enabled?'':'disabled')+'>'+unitOpts+'</select></div><div class="cc-field"><label>Operador asignado</label><select data-op '+(enabled?'':'disabled')+'>'+opOpts+'</select></div><button type="button" class="cc-btn cc-btn-light" data-remove="'+i+'" '+(enabled?'':'disabled')+'>Quitar</button></div>';
 }).join('')||'<div class="cc-note" style="padding:12px;border:1px dashed #cbd5e1;border-radius:8px">No hay unidades asignadas todavía.</div>';
 el.querySelectorAll('[data-row]').forEach(row=>{const i=Number(row.dataset.row);row.querySelector('[data-unit]').onchange=e=>{draft[i].unidadId=e.target.value;};row.querySelector('[data-op]').onchange=e=>{draft[i].operadorId=e.target.value;};row.querySelector('[data-remove]').onclick=()=>{draft.splice(i,1);renderRows();};});
}
async function save(){
 const sec=$('#ccConfigFlotaTrafico'),flag=sec?.querySelector('[data-flag]');if(!selected)return status('Selecciona un usuario.','error');
 if(!isAdmin())return status('Solo un administrador puede guardar esta configuración.','error');
 const enabled=!!flag.checked;
 if(enabled&&draft.some(a=>!a.unidadId||!a.operadorId))return status('Completa la unidad y el operador de cada renglón.','error');
 if(new Set(draft.map(a=>a.unidadId).filter(Boolean)).size!==draft.filter(a=>a.unidadId).length)return status('No repitas una unidad en la misma flota.','error');
 if(!enabled&&draft.length){draft=[];}
 const b=sec.querySelector('[data-save]');b.disabled=true;b.textContent='Guardando…';
 try{const r=await sb().rpc('cc_trafico_flota_save',{p_user_id:selected,p_es_trafico:enabled,p_asignaciones:enabled?draft:[]});if(r.error)throw r.error;if(!r.data?.ok){const msgs={UNIDAD_ASIGNADA_A_OTRO_USUARIO:'Una de las unidades ya está asignada a otro usuario de Tráfico.',UNIDAD_NO_DISPONIBLE:'Una unidad seleccionada ya no está activa.',OPERADOR_NO_DISPONIBLE:'Un operador seleccionado ya no está activo.',UNIDAD_Y_OPERADOR_REQUERIDOS:'Cada unidad necesita un operador.'};throw new Error(msgs[r.data?.error]||r.data?.error||'No se pudo guardar.');}
 status('Configuración guardada correctamente.');await load();
 }catch(e){showError(e);}finally{b.disabled=false;b.textContent='Guardar configuración';}
}
document.addEventListener('cc:access-ready',()=>{if(ensure()&&isAdmin())load().catch(showError);});
document.addEventListener('click',e=>{if(e.target.closest('[onclick*="ccTab(\'configuracion\'"]'))setTimeout(()=>{if(ensure()&&isAdmin())load().catch(showError);},120);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(ensure()&&isAdmin()&&window.CC_AUTH_READY)load().catch(showError);});else if(ensure()&&isAdmin()&&window.CC_AUTH_READY)load().catch(showError);
})();