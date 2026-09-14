/* Tráfico App · Inventario · tipos de unidad canónicos v6 */
(function(){
 'use strict';
 if(window.__CC_TIPO_UNIDAD_CANONICAL_V6__)return;
 window.__CC_TIPO_UNIDAD_CANONICAL_V6__=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let tipos=[],mapa=new Map(),loading=false;
 const isCar=s=>String(s?.selectedOptions?.[0]?.textContent||'').trim().toUpperCase()==='CARRO';
 async function rpc(name,args={}){const c=sb();if(!c)throw new Error('Supabase no está disponible.');const r=await c.rpc(name,args);if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'Operación no disponible');return r.data;}
 async function load(){
   if(loading||!sb()||!window.CC_AUTH_READY)return;loading=true;
   try{
     const [a,b]=await Promise.all([rpc('cc_unit_type_catalog_list'),rpc('cc_car_unit_type_map')]);
     tipos=a?.rows||[];mapa=new Map((b?.rows||[]).map(x=>[String(x.numero||'').trim().toUpperCase(),x]));
     decorateModals();decorateInventory();installCanonicalCatalog();
   }catch(e){console.warn('Tipos de unidad canónicos:',e)}finally{loading=false;}
 }
 function options(current=''){
   return '<option value="">Selecciona tipo de unidad</option>'+tipos.filter(x=>x.estatus==='ACTIVO'||String(x.id)===String(current)).map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(current)?'selected':'')+'>'+esc(x.nombre)+(x.estatus==='INACTIVO'?' (INACTIVO)':'')+'</option>').join('');
 }
 function ensureBaseCar(base,key){
   const mapped=mapa.get(key);if(!mapped)return false;
   const current=String(base.value||'');
   const hasCurrent=[...base.options].some(o=>String(o.value)===current&&current!=='');
   if(hasCurrent&&isCar(base))return true;
   const car=[...base.options].find(o=>String(o.textContent||'').trim().toUpperCase()==='CARRO');
   if(car){base.value=car.value;return true;}return false;
 }
 function decorateModal(modal){
   if(!modal)return;const f=modal.querySelector('form'),base=f?.querySelector('[name="tipoUnidadId"]'),num=f?.querySelector('[name="numero"]');if(!f||!base||!num)return;
   const key=String(num.value||'').trim().toUpperCase();ensureBaseCar(base,key);
   let field=f.querySelector('[data-cc-tipo-unidad-canonico]');
   if(!field){field=document.createElement('div');field.className='cc-field';field.dataset.ccTipoUnidadCanonico='1';field.innerHTML='<label>Tipo específico de unidad</label><select name="tipoUnidadGeneralId"></select><div style="font-size:9px;color:#64748b;margin-top:4px">Catálogo único usado por Inventario, Anticipos y Hojas.</div>';base.closest('.cc-field')?.insertAdjacentElement('afterend',field);}
   const det=field.querySelector('select');
   const sync=(forceFromDb=false)=>{
     const k=String(num.value||'').trim().toUpperCase();ensureBaseCar(base,k);
     const mappedId=String(mapa.get(k)?.tipoUnidadGeneralId||'');
     const current=String(det.value||'');
     const cur=forceFromDb||!det.dataset.ccInitialized ? mappedId : current;
     const html=options(cur);
     if(det.innerHTML!==html)det.innerHTML=html;
     if(cur)det.value=cur;
     det.dataset.ccInitialized='1';
     const car=isCar(base)||!!mapa.get(k);field.style.display=car?'block':'none';det.required=car;
   };
   if(!base.dataset.canonicalBound){
     base.dataset.canonicalBound='1';
     base.addEventListener('change',()=>sync(false));
     num.addEventListener('change',()=>{det.dataset.ccInitialized='';sync(true);});
     num.addEventListener('input',()=>{det.dataset.ccInitialized='';sync(true);});
   }
   if(!det.dataset.ccInitialized)sync(true);else sync(false);
 }
 function decorateModals(){decorateModal(document.getElementById('ccFormModal'));decorateModal(document.getElementById('ccEditUnitModal'));}
 async function persist(number,typeId){await rpc('cc_set_car_unit_type',{p_numero:number,p_tipo_id:typeId});await load();window.ccAntLoad?.(true);}
 document.addEventListener('submit',e=>{
   const f=e.target;if(!(f instanceof HTMLFormElement))return;const modal=f.closest('#ccFormModal,#ccEditUnitModal');if(!modal)return;
   const base=f.querySelector('[name="tipoUnidadId"]'),num=f.querySelector('[name="numero"]'),det=f.querySelector('[name="tipoUnidadGeneralId"]');if(!base||!num)return;
   const key=String(num.value||'').trim().toUpperCase();const car=isCar(base)||!!mapa.get(key);if(!car)return;
   const typeId=String(det?.value||'');if(!typeId){e.preventDefault();e.stopImmediatePropagation();alert('Selecciona el tipo específico de la unidad.');return;}
   const number=String(num.value||'').trim();let tries=0;const wait=()=>{if(!document.body.contains(modal)){persist(number,typeId).catch(err=>alert('La unidad se guardó, pero no se pudo sincronizar su tipo.\n\n'+err.message));return;}if(++tries<30)setTimeout(wait,250);};setTimeout(wait,300);
 },true);
 function decorateInventory(){
   const body=document.getElementById('ccInventarioBody');if(!body)return;
   [...body.querySelectorAll('tr')].forEach(tr=>{const td=tr.children;if(td.length<3)return;const x=mapa.get(String(td[2]?.textContent||'').trim().toUpperCase());const value=x?.tipoUnidadGeneralNombre||'';let tag=td[1]?.querySelector('.cc-car-type-detail');if(value){if(!tag){tag=document.createElement('div');tag.className='cc-car-type-detail';tag.style.cssText='font-size:9px;color:#1d4ed8;font-weight:900;margin-top:4px';td[1].appendChild(tag);}const txt='Tipo unidad: '+value;if(tag.textContent!==txt)tag.textContent=txt;}else if(tag)tag.remove();});
 }
 function canEdit(){return window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));}
 function renderCanonicalCatalog(){
   const el=document.getElementById('ccTiposUnidadList');if(!el)return;
   el.innerHTML=tipos.length?tipos.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><strong>'+esc(x.nombre)+'</strong></td><td>CARRO</td><td><span class="cc-badge '+(x.estatus==='ACTIVO'?'cc-ok':'cc-off')+'">'+esc(x.estatus||'ACTIVO')+'</span></td><td><button class="cc-btn cc-btn-light" data-canonical-edit="'+esc(x.id)+'" '+(canEdit()?'':'disabled')+'>Editar</button></td></tr>').join(''):'<tr><td colspan="5" style="padding:30px;text-align:center;color:#94a3b8">No hay tipos configurados.</td></tr>';
   el.querySelectorAll('[data-canonical-edit]').forEach(b=>b.onclick=()=>openCatalogForm(tipos.find(x=>String(x.id)===String(b.dataset.canonicalEdit))));
 }
 function openCatalogForm(x={}){
   if(!canEdit())return alert('Sin permiso para modificar Configuración.');
   document.getElementById('ccCanonicalTypeModal')?.remove();const ov=document.createElement('div');ov.id='ccCanonicalTypeModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100500;display:flex;align-items:center;justify-content:center;padding:16px';
   ov.innerHTML='<div style="background:#fff;width:min(560px,96vw);border-radius:16px;overflow:hidden"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+(x.id?'Editar':'Nuevo')+' tipo de unidad</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px"><div class="cc-field"><label>Nombre</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field" style="margin-top:10px"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button class="cc-btn cc-btn-primary" type="submit">Guardar</button></div></form></div>';document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
   ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{const fd=new FormData(e.currentTarget);await rpc('cc_unit_type_catalog_save',{p_item:{id:x.id||'',nombre:String(fd.get('nombre')||'').trim().toUpperCase(),estatus:fd.get('estatus')}});close();await load();renderCanonicalCatalog();}catch(err){alert(err.message||err);b.disabled=false;}};
 }
 function installCanonicalCatalog(){
   const btn=document.querySelector('#ccPanelConfiguracion .cc-config-nav-btn[data-config="tiposUnidad"]');if(btn){btn.querySelector('span')&&(btn.querySelector('span').textContent='Tipos de unidad');btn.querySelector('small')&&(btn.querySelector('small').textContent='TRACTO · RABÓN · TONELADA · VAN');}
   window.ccRenderTiposUnidad=renderCanonicalCatalog;
   window.ccNuevoTipoUnidad=function(id){openCatalogForm(tipos.find(x=>String(x.id)===String(id))||{});};
   window.ccDeleteTipoUnidad=function(){alert('Los tipos del catálogo único no se eliminan. Puedes marcarlos INACTIVOS.');};
   const sec=document.getElementById('ccConfigTiposUnidad');const head=sec?.querySelector('.cc-config-section-head');const add=head?.querySelector('button');if(add){add.onclick=()=>openCatalogForm({});}
 }
 function tick(){if(!window.CC_AUTH_READY)return;decorateModals();decorateInventory();installCanonicalCatalog();}
 function boot(){const timer=setInterval(()=>{if(window.CC_AUTH_READY){clearInterval(timer);load();setInterval(tick,1500);}},250);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
