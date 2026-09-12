/* Tráfico App Profesional · Anticipos v33 · ocultar catálogo Tipos de movimiento de caja */
(function(){
  'use strict';
  if(window.__ccAntV33HideTiposMovCaja)return;window.__ccAntV33HideTiposMovCaja=true;
  function hide(){
    const root=document.getElementById('ccAntViewCatalogos')||document.getElementById('ccPanelAnticipos');
    if(!root)return;
    const nodes=[...root.querySelectorAll('div,section,article')];
    for(const el of nodes){
      const title=el.querySelector(':scope > .cc-toolbar strong,:scope > strong,:scope > h3,:scope > h4');
      const txt=(title?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(txt==='tipos de movimiento de caja'||txt==='tipo de movimiento de caja')el.style.setProperty('display','none','important');
    }
  }
  function boot(){
    hide();
    document.addEventListener('click',e=>{if(e.target.closest?.('#ccPanelAnticipos [data-antv="catalogos"]'))setTimeout(hide,120)},true);
    const root=document.getElementById('ccPanelAnticipos')||document.body;
    new MutationObserver(()=>hide()).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1400));else setTimeout(boot,1400);
})();
