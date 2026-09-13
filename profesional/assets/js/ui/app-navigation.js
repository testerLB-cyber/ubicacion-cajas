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
  ccLoadScriptOnce('assets/js/modules/anticipos-mobile-precapture.js?v=ant-mobile-pre-v1','data-ant-mobile-pre','1').catch(console.warn);

  window.__HS_V104_AUTOCOMPLETE__=true;

  // Carga secuencial: módulo principal -> buscador -> precaptura -> ver todos -> modo lista -> evidencia/PDF/QR -> reapertura.
  ccLoadScriptOnce('assets/js/modules/service-sheets-v104.js?v=hs-v104-fix1','data-hs-main','1')
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-v104-autocomplete.js?v=hs-autocomplete-v2','data-hs-autocomplete','1'))
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-precapture.js?v=hs-precapture-v2','data-hs-precapture','1'))
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-show-all.js?v=hs-show-all-v1','data-hs-show-all','1'))
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-list-mode.js?v=hs-list-mode-v2','data-hs-list-mode','1'))
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-manual-photo-pdf.js?v=hs-manual-photo-pdf-v2','data-hs-manual-photo-pdf','1'))
    .then(()=>ccLoadScriptOnce('assets/js/modules/service-sheets-reopen.js?v=hs-reopen-v1','data-hs-reopen','1'))
    .catch(err=>console.warn('Control de Hojas de Servicio no pudo cargar',err));
});