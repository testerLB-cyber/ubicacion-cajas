/* Tráfico App · Inventario · tipos de unidad canónicos v3 */
(function(){
 'use strict';
 if(window.__CC_TIPO_UNIDAD_CANONICAL_V3__)return;
 window.__CC_TIPO_UNIDAD_CANONICAL_V3__=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let tipos=[],mapa=new Map(),loading=false;
 const isCar=s=>String(s?.selectedOptions?.[0]?.textContent||'').trim().toUpperCase()==='CARRO';
 async function load(){
   if(loading||!sb())return;loading=true;
   try{
     const [a,b]=await Promise.all([sb().rpc('cc_unit_type_catalog_list'),sb().rpc('cc_car_unit_type_map')]);
     if(a.error)throw a.error;if(b.error)throw b.error;
     tipos=a.data?.rows||[];mapa=new Map((b.data?.rows||[]).map(x=>[String(x.numero||'').trim().toUpperCase(),x]));
     decorateModals();decorateInventory();removeLegacyConfig();
   }catch(e){console.warn('Tipos de unidad canónicos:',e)}finally{loading=false;}
 }
 function options(current=''){
   return '<option value="">Selecciona tipo de unidad</option>'+tipos.filter(x=>x.estatus==='ACTIVO'||String(x.id)===String(current)).map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(current)?'selected':'')+'>'+esc(x.nombre)+(x.estatus==='INACTIVO'?' (INACTIVO)':'')+'</option>').join('');
 }
 function decorateModal(modal){
   if(!modal)return;const f=modal.querySelector('form'),base=f?.querySelector('[name="tipoUnidadId"]'),num=f?.querySelector('[name="numero"]');if(!f||!base||!num)return;
   let field=f.querySelector('[data-cc-tipo-unidad-canonico]');
   if(!field){field=document.createElement('div');field.className='cc-field';field.dataset.ccTipoUnidadCanonico='1';field.innerHTML='<label>Tipo específico de unidad</label><select name="tipoUnidadGeneralId"></select><div style="font-size:9px;color:#64748b;margin-top:4px">Mismo catálogo usado por Inventario, Anticipos y Hojas.</div>';base.closest('.cc-field')?.insertAdjacentElement('afterend',field);}
   const det=field.querySelector('select');
   const sync=()=>{const key=String(num.value||'').trim().toUpperCase(),cur=mapa.get(key)?.tipoUnidadId||mapa.get(key)?.tipoUnidadGeneralId||det.value||'';det.innerHTML=options(cur);field.style.display=isCar(base)?'block':'none';det.required=isCar(base);};
   if(!base.dataset.canonicalBound){base.dataset.canonicalBound='1';base.addEventListener('change',sync);num.addEventListener('change',sync);num.addEventListener('input',sync);}sync();
 }
 function decorateModals(){decorateModal(document.getElementById('ccFormModal'));decorateModal(document.getElementById('ccEditUnitModal'));}
 async function persist(number,typeId){
   const r=await sb().rpc('cc_set_car_unit_type',{p_numero:number,p_tipo_id:typeId});if(r.error||r.data?.ok===false)throw new Error(r.error?.message||r.data?.error||'No se pudo guardar el tipo de unidad');await load();window.ccAntLoad?.(true);
 }
 document.addEventListener('submit',e=>{
   const f=e.target;if(!(f instanceof HTMLFormElement))return;const modal=f.closest('#ccFormModal,#ccEditUnitModal');if(!modal)return;
   const base=f.querySelector('[name="tipoUnidadId"]'),num=f.querySelector('[name="numero"]'),det=f.querySelector('[name="tipoUnidadGeneralId"]');if(!base||!num||!isCar(base))return;
   const typeId=String(det?.value||'');if(!typeId){e.preventDefault();e.stopImmediatePropagation();alert('Selecciona el tipo específico de la unidad.');return;}
   const number=String(num.value||'').trim();let tries=0;const wait=()=>{if(!document.body.contains(modal)){persist(number,typeId).catch(err=>alert('La unidad se guardó, pero no se pudo sincronizar su tipo.\n\n'+err.message));return;}if(++tries<30)setTimeout(wait,250);};setTimeout(wait,300);
 },true);
 function decorateInventory(){
   const body=document.getElementById('ccInventarioBody');if(!body)return;
   [...body.querySelectorAll('tr')].forEach(tr=>{const td=tr.children;if(td.length<3)return;const x=mapa.get(String(td[2]?.textContent||'').trim().toUpperCase());let tag=td[1]?.querySelector('.cc-car-type-detail');if(x?.tipoUnidadNombre||x?.tipoUnidadGeneralNombre){if(!tag){tag=document.createElement('div');tag.className='cc-car-type-detail';tag.style.cssText='font-size:9px;color:#1d4ed8;font-weight:900;margin-top:4px';td[1].appendChild(tag);}tag.textContent='Tipo unidad: '+(x.tipoUnidadNombre||x.tipoUnidadGeneralNombre);}else tag?.remove();});
 }
 function removeLegacyConfig(){document.querySelector('[data-config-tipos-unidad-general]')?.remove();document.getElementById('ccConfigTiposUnidadGeneral')?.remove();}
 const mo=new MutationObserver(()=>{removeLegacyConfig();decorateModals();decorateInventory();});
 function boot(){removeLegacyConfig();load();mo.observe(document.documentElement,{childList:true,subtree:true});setInterval(()=>{if(document.getElementById('ccInventarioBody'))load();},45000);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
