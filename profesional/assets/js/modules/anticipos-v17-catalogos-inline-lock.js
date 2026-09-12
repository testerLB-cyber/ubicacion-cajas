/* Tráfico App Profesional · Anticipos v17 · Catálogos siempre integrados */
(function(){
  if(window.__ccAntCatalogInlineLockV17)return;
  window.__ccAntCatalogInlineLockV17=true;

  function removeLegacyCatalogModals(){
    document.getElementById('ccERP13')?.remove();
    document.getElementById('ccERPForm13')?.remove();
  }

  function openInlineCatalogs(cat){
    removeLegacyCatalogModals();
    if(typeof window.ccAntView==='function') window.ccAntView('catalogos',cat);
    setTimeout(()=>{
      try{
        removeLegacyCatalogModals();
        if(typeof window.ccAntOpenERPCatalogs==='function') window.ccAntOpenERPCatalogs();
      }catch(err){
        console.error('[Anticipos v17] No se pudo abrir Catálogos integrados:',err);
      }
    },0);
  }

  document.addEventListener('click',function(ev){
    const cat=ev.target.closest?.('.cc-ant-nav [data-antv="catalogos"]');
    if(!cat)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    openInlineCatalogs(cat);
  },true);

  function normalizeButton(){
    const cat=document.querySelector('.cc-ant-nav [data-antv="catalogos"]');
    if(!cat)return false;
    cat.innerHTML='<i class="fa-solid fa-database mr-1"></i> Catálogos';
    cat.setAttribute('title','Catálogos integrados de Anticipos');
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(normalizeButton()||tries>=30)clearInterval(timer);
  },400);
})();
