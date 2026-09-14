/* Tráfico App · Anticipos · elimina selector duplicado desde origen visual */
(function(){
'use strict';
if(window.__CC_ANT_CLEAN_DUP_MENU_V2__)return;
window.__CC_ANT_CLEAN_DUP_MENU_V2__=true;
function clean(){
  const root=document.getElementById('ccAntViewCatalogos');
  if(!root)return;
  const panel=root.querySelector('#ccAntCatalogV12');
  if(!panel)return;
  const keep=panel.querySelector('#ccAntCatalogSelector');
  [...root.querySelectorAll('#ccAntCatalogSelector')].forEach(sel=>{
    if(sel!==keep)sel.remove();
  });
  [...root.querySelectorAll('#ccAntCatalogHint')].forEach(h=>{
    if(!panel.contains(h))h.remove();
  });
  // Elimina cualquier barra heredada de botones de catálogos fuera del panel nuevo.
  const legacyLabels=new Set(['Conceptos','Destinos','Métodos de depósito','Cuentas / cajas','Tipos de movimiento de caja','Tipos de unidad para Anticipos','Configuración por destino']);
  [...root.querySelectorAll('div')].forEach(div=>{
    if(panel.contains(div))return;
    const direct=[...div.children].filter(x=>x.tagName==='BUTTON');
    const hits=direct.filter(b=>legacyLabels.has(String(b.textContent||'').replace(/\s+/g,' ').trim()));
    if(hits.length>=3)div.remove();
  });
}
function boot(){
  clean();
  const root=document.getElementById('ccAntViewCatalogos');
  if(!root)return;
  let t;
  new MutationObserver(()=>{clearTimeout(t);t=setTimeout(clean,20);}).observe(root,{childList:true,subtree:true});
  [50,150,300,600,1000,1800].forEach(ms=>setTimeout(clean,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
