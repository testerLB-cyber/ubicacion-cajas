function gmMostrarControlCajas(){
  document.body.classList.add('gm-control-mode');
  document.getElementById('gmSideDashboard')?.classList.remove('active');
  document.getElementById('gmSideCajas')?.classList.add('active');
  document.body.scrollTop=0;
  document.documentElement.scrollTop=0;
  if(typeof ccRenderAll==='function') ccRenderAll();
}
function gmMostrarDashboard(){
  document.body.classList.remove('gm-control-mode');
  document.getElementById('gmSideCajas')?.classList.remove('active');
  document.getElementById('gmSideDashboard')?.classList.add('active');
  window.scrollTo({top:0,behavior:'auto'});
}
function ccLoadScriptOnce(src,attr,value){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector('script['+attr+']');
    if(existing){
      if(existing.dataset.loaded==='1'||existing.readyState==='complete') return resolve(existing);
      existing.addEventListener('load',()=>resolve(existing),{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=src;
    s.setAttribute(attr,value||'1');
    s.onload=()=>{s.dataset.loaded='1';resolve(s)};
    s.onerror=reject;
    document.body.appendChild(s);
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('gmSideDashboard')?.classList.add('active');
  document.getElementById('gmSideCajas')?.classList.remove('active');

  ccLoadScriptOnce('assets/js/security/mobile-app-users.js?v=mobile-users-v2','data-mobile-users','1').catch(console.warn);
  ccLoadScriptOnce('assets/js/modules/service-sheets-catalogs.js?v=hs-catalogs-v2','data-hs-catalogs','1').catch(console.warn);

  // Control de Hojas es el módulo base. Cargarlo primero evita que los complementos
  // de autocompletado/precaptura se ejecuten sin existir la pestaña principal.
  ccLoadScriptOnce('assets/js/modules/service-sheets-v104.js?v=hs-v104-fix1','data-hs-main','1')
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-v104-autocomplete.js?v=hs-autocomplete-fix1','data-hs-autocomplete','1'))
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-precapture.js?v=hs-precapture-v2','data-hs-precapture','1'))
    .catch(err=>console.warn('Control de Hojas de Servicio no pudo cargar',err));
});
