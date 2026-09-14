/* Tráfico App · Inventario · catálogo único de tipos v7 */
(function(){
 'use strict';
 if(window.__CC_TIPO_UNIDAD_UNICO_V7__)return;
 window.__CC_TIPO_UNIDAD_UNICO_V7__=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let tipos=[],mapa=new Map(),loading=false;
 async function rpc(name,args={}){const c=sb();if(!c)throw new Error('Supabase no está disponible.');const r=await c.rpc(name,args);if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'Operación no disponible');return r.data;}
 function tipoById(id){return tipos.find(x=>String(x.id)===String(id));}
 function options(current=''){
   return '<option value="">Selecciona tipo de unidad</option>'+tipos.filter(x=>x.estatus==='ACTIVO'||String(x.id)===String(current)).map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(current)?'selected':'')+'>'+esc(x.nombre)+' · '+esc(x.categoria||'')+(x.estatus==='INACTIVO'?' (INACTIVO)':'')+'</option>').join('');
 }
 function setLegacyBase(base,tipo){
   if(!base||!tipo)return;
   const cat=String(tipo.categoria||'').toUpperCase();
   const opts=[...base.options];
   let opt=null;
   if(cat==='CARRO') opt=opts.find(o=>String(o.textContent||'').trim().toUpperCase()==='CARRO');
   else opt=opts.find(o=>String(o.textContent||'').trim().toUpperCase().includes('CAJA'));
   if(opt)base.value=opt.value;
 }
 async function load(){
   if(loading||!sb()||!window.CC_AUTH_READY)return;loading=true;
   try{
     const [a,b]=await Promise.all([rpc('cc_unit_type_catalog_list'),rpc('cc_unit_type_map')]);
     tipos=a?.rows||[];
     mapa=new Map((b?.rows||[]).map(x=>[String(x.numero||'').trim().toUpperCase(),x]));
     decorateModals();decorateInventory();installCatalog();
   }catch(e){console.warn('Catálogo único de tipos:',e)}finally{loading=false;}
 }
 function decorateModal(modal){
   if(!modal)return;
   const f=modal.querySelector('form'),base=f?.querySelector('[name="tipoUnidadId"]'),num=f?.querySelector('[name="numero"]');
   if(!f||!base||!num)return;
   const baseField=base.closest('.cc-field');
   if(baseField){baseField.style.display='none';base.required=false;}
   let field=f.querySelector('[data-cc-tipo-unidad-unico]');
   if(!field){
     field=document.createElement('div');field.className='cc-field';field.dataset.ccTipoUnidadUnico='1';
     field.innerHTML='<label>Tipo de unidad</label><select name="tipoUnidadGeneralId" required></select><div style="font-size:9px;color:#64748b;margin-top:4px">Catálogo general de Configuración. La clasificación CAJA/CARRO se aplica automáticamente.</div>';
     if(baseField)baseField.insertAdjacentElement('afterend',field);else f.prepend(field);
   }
   const det=field.querySelector('select');
   const key=String(num.value||'').trim().toUpperCase();
   const mapped=mapa.get(key);
   if(!det.dataset.ccUnitKey||det.dataset.ccUnitKey!==key){
     det.dataset.ccUnitKey=key;
     det.dataset.ccInitialized='';
   }
   if(!det.dataset.ccInitialized){
     let current=String(mapped?.tipoUnidadGeneralId||'');
     if(!current){
       const legacyText=String(base.selectedOptions?.[0]?.textContent||'').toUpperCase();
       const cat=legacyText.includes('CARRO')?'CARRO':'CAJA';
       current=String(tipos.find(x=>x.estatus==='ACTIVO'&&String(x.categoria).toUpperCase()===cat)?.id||'');
     }
     det.innerHTML=options(current);if(current)det.value=current;
     det.dataset.ccInitialized='1';
   }
   if(!det.dataset.ccBound){
     det.dataset.ccBound='1';
     det.addEventListener('change',()=>setLegacyBase(base,tipoById(det.value)));
   }
   setLegacyBase(base,tipoById(det.value));
 }
 function decorateModals(){decorateModal(document.getElementById('ccFormModal'));decorateModal(document.getElementById('ccEditUnitModal'));}
 async function persist(number,typeId){await rpc('cc_set_unit_type',{p_numero:number,p_tipo_id:typeId});await load();window.ccAntLoad?.(true);}
 document.addEventListener('submit',e=>{
   const f=e.target;if(!(f instanceof HTMLFormElement))return;
   const modal=f.closest('#ccFormModal,#ccEditUnitModal');if(!modal)return;
   const base=f.querySelector('[name="tipoUnidadId"]'),num=f.querySelector('[name="numero"]'),det=f.querySelector('[name="tipoUnidadGeneralId"]');
   if(!base||!num||!det)return;
   const typeId=String(det.value||'');const tipo=tipoById(typeId);
   if(!typeId||!tipo){e.preventDefault();e.stopImmediatePropagation();alert('Selecciona el tipo de unidad.');return;}
   setLegacyBase(base,tipo);
   const number=String(num.value||'').trim();let tries=0;
   const wait=()=>{if(!document.body.contains(modal)){persist(number,typeId).catch(err=>alert('La unidad se guardó, pero no se pudo sincronizar el tipo de unidad.\n\n'+err.message));return;}if(++tries<30)setTimeout(wait,250);};
   setTimeout(wait,300);
 },true);
 function decorateInventory(){
   const body=document.getElementById('ccInventarioBody');if(!body)return;
   [...body.querySelectorAll('tr')].forEach(tr=>{
     const td=tr.children;if(td.length<3)return;
     const x=mapa.get(String(td[2]?.textContent||'').trim().toUpperCase());if(!x)return;
     let tag=td[1]?.querySelector('.cc-unit-type-general');
     if(!tag){tag=document.createElement('div');tag.className='cc-unit-type-general';tag.style.cssText='font-size:9px;color:#1d4ed8;font-weight:900;margin-top:4px';td[1]?.appendChild(tag);}
     tag.textContent='Tipo unidad: '+(x.tipoUnidadGeneralNombre||'SIN TIPO')+' · '+(x.categoriaUnidad||'');
     td[1]?.querySelector('.cc-car-type-detail')?.remove();
   });
 }
 function canEdit(){return window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));}
 function renderCatalog(){
   const el=document.getElementById('ccTiposUnidadList');if(!el)return;
   el.innerHTML=tipos.length?tipos.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><strong>'+esc(x.nombre)+'</strong></td><td><span class="cc-badge">'+esc(x.categoria||'')+'</span></td><td><span class="cc-badge '+(x.estatus==='ACTIVO'?'cc-ok':'cc-off')+'">'+esc(x.estatus||'ACTIVO')+'</span></td><td><button class="cc-btn cc-btn-light" data-unit-type-edit="'+esc(x.id)+'" '+(canEdit()?'':'disabled')+'>Editar</button></td></tr>').join(''):'<tr><td colspan="5" style="padding:30px;text-align:center;color:#94a3b8">No hay tipos configurados.</td></tr>';
   el.querySelectorAll('[data-unit-type-edit]').forEach(b=>b.onclick=()=>openCatalogForm(tipoById(b.dataset.unitTypeEdit)||{}));
 }
 function openCatalogForm(x={}){
   if(!canEdit())return alert('Sin permiso para modificar Configuración.');
   document.getElementById('ccCanonicalTypeModal')?.remove();
   const ov=document.createElement('div');ov.id='ccCanonicalTypeModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100500;display:flex;align-items:center;justify-content:center;padding:16px';
   ov.innerHTML='<div style="background:#fff;width:min(560px,96vw);border-radius:16px;overflow:hidden"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+(x.id?'Editar':'Nuevo')+' tipo de unidad</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px"><div class="cc-field"><label>Nombre</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field" style="margin-top:10px"><label>Clasificación de inventario</label><select name="categoria"><option value="CAJA" '+(x.categoria==='CAJA'?'selected':'')+'>CAJA</option><option value="CARRO" '+(x.categoria!=='CAJA'?'selected':'')+'>CARRO / TRACTO</option></select></div><div class="cc-field" style="margin-top:10px"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button class="cc-btn cc-btn-primary" type="submit">Guardar</button></div></form></div>';
   document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
   ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{const fd=new FormData(e.currentTarget);await rpc('cc_unit_type_catalog_save',{p_item:{id:x.id||'',nombre:String(fd.get('nombre')||'').trim().toUpperCase(),categoria:String(fd.get('categoria')||'CARRO'),estatus:String(fd.get('estatus')||'ACTIVO')}});close();await load();renderCatalog();}catch(err){alert(err.message||err);b.disabled=false;}};
 }
 function installCatalog(){
   const btn=document.querySelector('#ccPanelConfiguracion .cc-config-nav-btn[data-config="tiposUnidad"]');
   if(btn){btn.querySelector('span')&&(btn.querySelector('span').textContent='Tipos de unidad');btn.querySelector('small')&&(btn.querySelector('small').textContent='Catálogo general · CAJA / CARRO');}
   window.ccRenderTiposUnidad=renderCatalog;
   window.ccNuevoTipoUnidad=id=>openCatalogForm(tipoById(id)||{});
   window.ccDeleteTipoUnidad=()=>alert('Los tipos de unidad no se eliminan; puedes marcarlos INACTIVOS.');
   const sec=document.getElementById('ccConfigTiposUnidad');const head=sec?.querySelector('.cc-config-section-head');const add=head?.querySelector('button');if(add)add.onclick=()=>openCatalogForm({categoria:'CARRO'});
 }
 function tick(){if(!window.CC_AUTH_READY)return;decorateModals();decorateInventory();installCatalog();}
 function boot(){const timer=setInterval(()=>{if(window.CC_AUTH_READY){clearInterval(timer);load();setInterval(tick,1500);}},250);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
