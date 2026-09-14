/* Tráfico App · DOT operador + borrado autorizado + autocompletado de catálogos */
(function(){
 'use strict';
 if(window.__CC_DOT_OPERADOR_BORRADO_V1__)return;window.__CC_DOT_OPERADOR_BORRADO_V1__=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
 let operadoresCache=null;
 async function operadores(){
  if(operadoresCache)return operadoresCache;
  const {data,error}=await sb().rpc('cc_dot_operator_catalog');if(error)throw error;
  operadoresCache=(Array.isArray(data?.operadores)?data.operadores:[]).map(o=>({id:String(o.id||''),nombre:String(o.nombre||''),extra:String(o.numeroEmpleado||'')})).filter(o=>o.id&&o.nombre);
  return operadoresCache;
 }
 function catalogFromSelect(sel){
  return [...(sel?.options||[])].filter(o=>o.value).map(o=>({id:String(o.value),nombre:String(o.textContent||'').trim(),extra:''}));
 }
 function makeAutocomplete(field,{name,label,catalog,selectedId='',selectedLabel='',placeholder='',required=false}){
  if(!field||field.dataset.dotAutocomplete==='1')return;
  field.dataset.dotAutocomplete='1';field.style.position='relative';
  const hidden=document.createElement('input');hidden.type='hidden';hidden.name=name;hidden.value=selectedId||'';
  const input=document.createElement('input');input.type='text';input.autocomplete='off';input.spellcheck=false;input.placeholder=placeholder||'Escribe al menos 3 letras';input.value=selectedLabel||'';input.dataset.dotLookup=name;if(required)input.required=true;
  const menu=document.createElement('div');menu.dataset.dotSuggest=name;menu.style='display:none;position:absolute;left:0;right:0;top:calc(100% + 3px);z-index:10020;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 28px rgba(15,23,42,.18);max-height:230px;overflow:auto';
  field.innerHTML='';const lab=document.createElement('label');lab.textContent=label;field.append(lab,input,hidden,menu);
  field.dataset.selectedLabel=selectedLabel||'';field.dataset.dotRequired=required?'1':'0';
  const close=()=>{menu.style.display='none';menu.innerHTML='';};
  const choose=item=>{hidden.value=item.id;input.value=item.nombre;field.dataset.selectedLabel=item.nombre;close();};
  const exact=()=>{const q=norm(input.value);if(!q){hidden.value='';field.dataset.selectedLabel='';return !required;}const hit=catalog.find(x=>norm(x.nombre)===q || norm((x.nombre+(x.extra?' · '+x.extra:'')))===q);if(hit){choose(hit);return true;}return !!hidden.value&&norm(field.dataset.selectedLabel)===q;};
  field.__dotExact=exact;
  input.addEventListener('input',()=>{
    hidden.value='';field.dataset.selectedLabel='';const q=norm(input.value);if(q.length<3){close();return;}
    const matches=catalog.filter(x=>norm(x.nombre+' '+x.extra).includes(q)).sort((a,b)=>{const as=norm(a.nombre).startsWith(q)?0:1,bs=norm(b.nombre).startsWith(q)?0:1;return as-bs||a.nombre.localeCompare(b.nombre,'es');}).slice(0,10);
    menu.innerHTML='';
    if(!matches.length){const d=document.createElement('div');d.style='padding:10px 12px;color:#b91c1c;font-size:12px;font-weight:700';d.textContent='No existe en el catálogo';menu.appendChild(d);menu.style.display='block';return;}
    matches.forEach(item=>{const b=document.createElement('button');b.type='button';b.style='display:block;width:100%;text-align:left;border:0;background:#fff;padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9';b.innerHTML='<strong>'+esc(item.nombre)+'</strong>'+(item.extra?'<div style="font-size:11px;color:#64748b">'+esc(item.extra)+'</div>':'');b.onmousedown=e=>{e.preventDefault();choose(item);};menu.appendChild(b);});menu.style.display='block';
  });
  input.addEventListener('focus',()=>{if(norm(input.value).length>=3)input.dispatchEvent(new Event('input'));});
  input.addEventListener('blur',()=>setTimeout(()=>{exact();close();},150));
 }
 function installValidation(form,{operatorRequired=false}={}){
  if(!form)return;form.dataset.dotCatalogValidation='1';form.dataset.dotOperatorRequired=operatorRequired?'1':'0';
  if(form.__dotCatalogSubmit)return;form.__dotCatalogSubmit=true;
  form.addEventListener('submit',e=>{
    const checks=[['clienteId','Cliente',false],['operadorId','Operador',form.dataset.dotOperatorRequired==='1']];
    for(const [name,label,required] of checks){const field=[...form.querySelectorAll('[data-dot-autocomplete="1"]')].find(x=>x.querySelector('[name="'+name+'"]'));if(!field)continue;const ok=field.__dotExact?.();const input=field.querySelector('[data-dot-lookup="'+name+'"]'),hidden=field.querySelector('[name="'+name+'"]');if(required&&!hidden?.value){e.preventDefault();e.stopImmediatePropagation();input?.focus();alert(label+' es obligatorio. Escribe al menos 3 letras y selecciona una opción existente del catálogo.');return;}if(String(input?.value||'').trim()&&!hidden?.value){e.preventDefault();e.stopImmediatePropagation();input?.focus();alert(label+' no válido. Debes seleccionar una opción existente del catálogo.');return;}if(required&&ok===false){e.preventDefault();e.stopImmediatePropagation();input?.focus();alert(label+' es obligatorio y debe existir en el catálogo.');return;}}
  },true);
 }
 async function enhanceDotForm(modalId,selectedOperatorId='',selectedOperatorLabel=''){
  const modal=document.getElementById(modalId),form=modal?.querySelector('form');if(!form)return;
  const operatorRequired=modalId==='ccDotModal';
  const clientSel=form.querySelector('select[name="clienteId"]');
  if(clientSel&&!form.querySelector('[data-dot-lookup="clienteId"]')){const cat=catalogFromSelect(clientSel);const wrap=clientSel.closest('.cc-field');const sid=clientSel.value||'';const slabel=sid?(clientSel.selectedOptions?.[0]?.textContent||'').trim():'';makeAutocomplete(wrap,{name:'clienteId',label:'Cliente (opcional)',catalog:cat,selectedId:sid,selectedLabel:slabel,placeholder:'Escribe 3 letras del cliente'});}
  if(!form.querySelector('[data-dot-lookup="operadorId"]')){
   const rows=form.querySelector('.cc-grid');if(rows){const wrap=document.createElement('div');wrap.className='cc-field';rows.appendChild(wrap);try{const cat=await operadores();let label=selectedOperatorLabel||'';if(selectedOperatorId&&!label)label=cat.find(x=>x.id===String(selectedOperatorId))?.nombre||'';makeAutocomplete(wrap,{name:'operadorId',label:operatorRequired?'Operador *':'Operador (opcional)',catalog:cat,selectedId:selectedOperatorId||'',selectedLabel:label,placeholder:'Escribe 3 letras del operador',required:operatorRequired});}catch(err){wrap.innerHTML='<label>'+(operatorRequired?'Operador *':'Operador (opcional)')+'</label><input disabled value="No se pudieron cargar operadores">';console.warn('DOT operadores',err);}}
  }
  installValidation(form,{operatorRequired});
 }
 function wrapDotForms(){
  if(typeof window.ccAbrirDotRegistro==='function'&&!window.ccAbrirDotRegistro.__opWrap){const old=window.ccAbrirDotRegistro;const w=function(){const r=old.apply(this,arguments);setTimeout(()=>enhanceDotForm('ccDotModal'),0);return r};w.__opWrap=true;window.ccAbrirDotRegistro=w;}
  if(typeof window.ccEditarDot==='function'&&!window.ccEditarDot.__opWrap){const old=window.ccEditarDot;const w=function(id){const r=old.apply(this,arguments);const row=(window.ccDotData||[]).find(x=>x.id===id);setTimeout(()=>enhanceDotForm('ccDotEditModal',row?.operadorId||'',row?.operador||''),0);return r};w.__opWrap=true;window.ccEditarDot=w;}
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
