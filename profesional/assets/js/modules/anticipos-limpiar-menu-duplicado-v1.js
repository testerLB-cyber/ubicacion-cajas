/* Tráfico App · Anticipos · limpia menú duplicado inferior */
(function(){
'use strict';
if(window.__CC_ANT_CLEAN_DUP_MENU_V1__)return;
window.__CC_ANT_CLEAN_DUP_MENU_V1__=true;
const LEGACY_LABELS=['Conceptos','Destinos','Métodos de depósito','Cuentas / cajas','Tipos de movimiento de caja','Tipos de unidad para Anticipos','Configuración por destino'];
function norm(v){return String(v||'').replace(/\s+/g,' ').trim();}
function isLegacyButton(el){const t=norm(el.textContent);return LEGACY_LABELS.includes(t);}
function removeLegacyMenus(){
 const root=document.getElementById('ccAntViewCatalogos');if(!root)return;
 // Conserva el selector nuevo dentro de ccAntCatalogV12.
 const keep=root.querySelector('#ccAntCatalogV12 #ccAntCatalogSelector');
 const buttons=[...root.querySelectorAll('button')].filter(isLegacyButton);
 const groups=new Set();
 for(const b of buttons){
   if(keep&&keep.contains(b))continue;
   let n=b.parentElement;
   while(n&&n!==root){
     const bs=[...n.querySelectorAll(':scope > button')].filter(isLegacyButton);
     if(bs.length>=3){groups.add(n);break;}
     n=n.parentElement;
   }
 }
 groups.forEach(g=>g.remove());
 // Elimina también el aviso vacío asociado al menú viejo, si quedó suelto.
 [...root.querySelectorAll('div,p,span')].forEach(el=>{
   if(keep&&keep.contains(el))return;
   const t=norm(el.textContent);
   if(t==='Selecciona un catálogo para ver su información.' && !el.closest('#ccAntCatalogV12')) el.remove();
 });
}
function install(){
 removeLegacyMenus();
 const root=document.getElementById('ccAntViewCatalogos');
 if(!root)return;
 let timer;
 new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(removeLegacyMenus,30);}).observe(root,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
