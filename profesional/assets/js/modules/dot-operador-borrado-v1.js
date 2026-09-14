/* Tráfico App · DOT operador + borrado autorizado */
(function(){
 'use strict';
 if(window.__CC_DOT_OPERADOR_BORRADO_V1__)return;window.__CC_DOT_OPERADOR_BORRADO_V1__=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let operadoresCache=null;
 async function operadores(){
  if(operadoresCache)return operadoresCache;
  const {data,error}=await sb().rpc('cc_dot_operator_catalog');if(error)throw error;
  operadoresCache=Array.isArray(data?.operadores)?data.operadores:[];return operadoresCache;
 }
 async function injectOperator(modalId,selected=''){
  const modal=document.getElementById(modalId),form=modal?.querySelector('form');if(!form||form.querySelector('[name="operadorId"]'))return;
  const rows=form.querySelector('.cc-grid');if(!rows)return;
  const wrap=document.createElement('div');wrap.className='cc-field';wrap.innerHTML='<label>Operador</label><select name="operadorId"><option value="">Sin operador</option></select>';
  rows.appendChild(wrap);
  try{const xs=await operadores();const sel=wrap.querySelector('select');xs.forEach(o=>{const op=document.createElement('option');op.value=o.id;op.textContent=o.nombre+(o.numeroEmpleado?' · '+o.numeroEmpleado:'');if(String(o.id)===String(selected||''))op.selected=true;sel.appendChild(op);});}
  catch(e){wrap.querySelector('select').innerHTML='<option value="">No se pudieron cargar operadores</option>';console.warn('DOT operadores',e);}
 }
 function wrapDotForms(){
  if(typeof window.ccAbrirDotRegistro==='function'&&!window.ccAbrirDotRegistro.__opWrap){const old=window.ccAbrirDotRegistro;const w=function(){const r=old.apply(this,arguments);setTimeout(()=>injectOperator('ccDotModal'),0);return r};w.__opWrap=true;window.ccAbrirDotRegistro=w;}
  if(typeof window.ccEditarDot==='function'&&!window.ccEditarDot.__opWrap){const old=window.ccEditarDot;const w=function(id){const r=old.apply(this,arguments);const row=(window.ccDotData||[]).find(x=>x.id===id);setTimeout(()=>injectOperator('ccDotEditModal',row?.operadorId||''),0);return r};w.__opWrap=true;window.ccEditarDot=w;}
 }
 function patchRpc(){
  const client=sb();if(!client?.rpc||client.rpc.__dotOpWrap)return;
  const old=client.rpc.bind(client);
  const w=function(name,args,options){args=args?{...args}:{};
   if(name==='cc_dot_create'){const v=document.querySelector('#ccDotModal [name="operadorId"]')?.value||null;args.p_operador_id=v||null;}
   if(name==='cc_dot_update'){const v=document.querySelector('#ccDotEditModal [name="operadorId"]')?.value||null;args.p_operador_id=v||null;}
   if(name==='cc_admin_update_user'&&document.getElementById('ccDotDeletePerm')){args.p_permisos=args.p_permisos||{};args.p_permisos.mantenimiento=args.p_permisos.mantenimiento||{};args.p_permisos.mantenimiento.eliminar_dot=!!document.getElementById('ccDotDeletePerm').checked;}
   return old(name,args,options);
  };w.__dotOpWrap=true;client.rpc=w;
 }
 function patchUserPermission(){
  if(typeof window.ccEditUserModal!=='function'||window.ccEditUserModal.__dotPermWrap)return;
  const old=window.ccEditUserModal;const w=function(raw){const obj=typeof raw==='string'?JSON.parse(raw):raw;const r=old.apply(this,arguments);setTimeout(()=>{const group=document.querySelector('#ccEditPerms [data-perm-group="mantenimiento"]');if(!group||document.getElementById('ccDotDeletePerm'))return;const lab=document.createElement('label');lab.className='cc-perm-check';lab.innerHTML='<input type="checkbox" id="ccDotDeletePerm" '+(obj?.permisos?.mantenimiento?.eliminar_dot?'checked':'')+'> Eliminar registros DOT';group.appendChild(lab);},0);return r};w.__dotPermWrap=true;window.ccEditUserModal=w;
 }
 function patchDotTable(){
  const body=document.getElementById('ccDotBody'),table=body?.closest('table');if(!body||!table)return;
  const head=table.querySelector('thead tr');if(head&&!head.querySelector('[data-dot-op-head]')){const th=document.createElement('th');th.dataset.dotOpHead='1';th.textContent='Operador';const ref=head.children[5]||head.lastElementChild;head.insertBefore(th,ref);}
  const rows=window.ccDotData||[];
  [...body.querySelectorAll('tr')].forEach((tr,i)=>{if(!rows[i]){const td=tr.querySelector('td[colspan]');if(td)td.colSpan=9;return;}if(!tr.querySelector('[data-dot-op-cell]')){const td=document.createElement('td');td.dataset.dotOpCell='1';td.textContent=rows[i].operador||'—';const ref=tr.children[5]||tr.lastElementChild;tr.insertBefore(td,ref);}const action=tr.lastElementChild;if(action&&window.ccPerm?.('mantenimiento.eliminar_dot')&&!action.querySelector('[data-dot-delete]')){const b=document.createElement('button');b.type='button';b.className='cc-btn cc-btn-danger';b.dataset.dotDelete='1';b.style.marginLeft='6px';b.innerHTML='<i class="fa-solid fa-trash"></i> Eliminar';b.onclick=()=>window.ccEliminarDotAutorizado(rows[i].id);action.appendChild(b);}});
 }
 function wrapLoad(){if(typeof window.ccCargarDot==='function'&&!window.ccCargarDot.__dotListWrap){const old=window.ccCargarDot;const w=async function(){const r=await old.apply(this,arguments);patchDotTable();return r};w.__dotListWrap=true;window.ccCargarDot=w;}}
 window.ccEliminarDotAutorizado=async function(id){
  if(!window.ccPerm?.('mantenimiento.eliminar_dot'))return alert('Tu usuario no tiene permiso para eliminar registros DOT.');
  const row=(window.ccDotData||[]).find(x=>x.id===id);if(!row)return alert('No se encontró el registro DOT.');
  const {data:{user}}=await sb().auth.getUser();if(!user?.email)return alert('No se pudo identificar tu sesión.');
  document.getElementById('ccDotDeleteAuth')?.remove();const ov=document.createElement('div');ov.id='ccDotDeleteAuth';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:100500;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML='<div style="background:#fff;width:min(520px,96vw);border-radius:16px;overflow:hidden"><div style="background:#991b1b;color:#fff;padding:15px 18px"><strong>ELIMINAR REGISTRO DOT</strong></div><form style="padding:18px"><div class="cc-note" style="margin-bottom:12px">Unidad <b>'+esc(row.unidad||'')+'</b> · '+esc(row.fecha||'')+'. Esta acción queda registrada en auditoría.</div><div class="cc-field"><label>Usuario</label><input value="'+esc(user.email)+'" readonly></div><div class="cc-field" style="margin-top:10px"><label>Contraseña actual *</label><input name="password" type="password" required autocomplete="current-password"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button class="cc-btn cc-btn-danger" type="submit">Confirmar y eliminar</button></div></form></div>';
  document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-cancel]').onclick=close;ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;btn.textContent='Validando...';try{const password=new FormData(e.currentTarget).get('password');const {data,error}=await sb().auth.signInWithPassword({email:user.email,password:String(password||'')});if(error)throw new Error('Credenciales incorrectas.');if(data?.user?.id!==user.id)throw new Error('La sesión validada no corresponde al usuario actual.');btn.textContent='Eliminando...';const res=await sb().rpc('cc_dot_delete',{p_id:id});if(res.error)throw res.error;if(res.data?.ok===false)throw new Error(res.data.error||'No se pudo eliminar DOT');close();await window.ccCargarDot?.();window.showStatus?.('REGISTRO DOT ELIMINADO · AUDITORÍA REGISTRADA','success');}catch(err){btn.disabled=false;btn.textContent='Confirmar y eliminar';alert(err.message||err);}};
 };
 function install(){patchRpc();wrapDotForms();wrapLoad();patchUserPermission();return !!window.ccAbrirDotRegistro;}
 install();const t=setInterval(()=>{install();},700);setTimeout(()=>clearInterval(t),20000);
})();
