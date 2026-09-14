/* Tráfico App · Anticipos · Nueva configuración por destino v1 */
(function(){
'use strict';
if(window.__CC_ANT_DEST_NUEVA_CONFIG_V1__)return;
window.__CC_ANT_DEST_NUEVA_CONFIG_V1__=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canCatalog=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('anticipos.catalogos'));
function installButton(){
 const root=document.getElementById('ccAntViewCatalogos');if(!root)return;
 const title=[...root.querySelectorAll('.cc-toolbar strong')].find(x=>String(x.textContent||'').trim()==='Configuración por destino');
 const bar=title?.closest('.cc-toolbar');if(!bar||bar.querySelector('[data-new-destination-config]')||!canCatalog())return;
 const btn=document.createElement('button');btn.type='button';btn.className='cc-btn cc-btn-primary';btn.dataset.newDestinationConfig='1';btn.textContent='+ Nueva configuración';bar.appendChild(btn);
 btn.onclick=()=>openPicker(root);
}
function openPicker(root){
 document.getElementById('ccAntNewDestConfigPicker')?.remove();
 const cards=[...root.querySelectorAll('[data-general-destcfg]')].map(b=>({id:b.dataset.generalDestcfg,nombre:String(b.closest('.cc-config-card')?.querySelector('.cc-toolbar strong')?.textContent||'').trim()})).filter(x=>x.id&&x.nombre);
 if(!cards.length)return alert('Primero crea un destino en el catálogo de Destinos.');
 const o=document.createElement('div');o.id='ccAntNewDestConfigPicker';o.style='position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:14px';
 o.innerHTML='<div style="background:#fff;width:min(520px,96vw);border-radius:16px;overflow:hidden"><div style="background:#0f172a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center"><div><strong>Nueva configuración por destino</strong><div style="font-size:10px;color:#cbd5e1">Selecciona el destino; después elegirás el tipo de unidad y agregarás conceptos.</div></div><button type="button" data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><div style="padding:16px"><div class="cc-field"><label>Destino *</label><select data-dest><option value="">Seleccionar…</option>'+cards.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="button" class="cc-btn cc-btn-primary" data-next>Continuar</button></div></div></div>';
 document.body.appendChild(o);const close=()=>o.remove();o.querySelector('[data-x]').onclick=close;o.querySelector('[data-cancel]').onclick=close;
 o.querySelector('[data-next]').onclick=()=>{const id=o.querySelector('[data-dest]').value;if(!id)return alert('Selecciona un destino.');close();const target=root.querySelector('[data-general-destcfg="'+CSS.escape(id)+'"]');if(!target)return alert('No se encontró el destino seleccionado.');target.click();};
}
function boot(){installButton();const root=document.getElementById('ccAntViewCatalogos');if(root){let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(installButton,80);}).observe(root,{childList:true,subtree:true});}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
