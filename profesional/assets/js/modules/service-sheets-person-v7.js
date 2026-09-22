/* Bootstrap aislado: Anticipos + Hojas desde versionescorrectas1. No toca Inventarios. */
(function(){
  if(window.__CORRECT_MODULES_BOOTSTRAP__)return;window.__CORRECT_MODULES_BOOTSTRAP__=true;
  function load(src,attr){return new Promise((resolve,reject)=>{if(document.querySelector('script['+attr+']'))return resolve();const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');s.onload=resolve;s.onerror=reject;document.body.appendChild(s);});}
  function safe(src,attr){return load(src,attr).catch(e=>console.warn('No se pudo cargar '+src,e));}
  document.addEventListener('DOMContentLoaded',()=>{
    safe('assets/js/security/mobile-app-users.js?v=correcta1','data-correct-mobile-users');
    safe('assets/js/modules/anticipos-mobile-pending-badge.js?v=correcta1','data-correct-ant-badge');
    safe('assets/js/modules/anticipos-comprobacion-cierre-v5.js?v=correcta1','data-correct-ant-cierre');
    safe('assets/js/modules/anticipos-final-cleanup-v6.js?v=correcta1','data-correct-ant-clean');
    safe('assets/js/modules/anticipos-comprobado-v7.js?v=correcta1','data-correct-ant-comprobado');
    safe('assets/js/modules/anticipos-mobile-precapture.js?v=correcta1','data-correct-ant-precap');
    safe('assets/js/modules/anticipos-mobile-drafts-v3.js?v=correcta1','data-correct-ant-drafts');
    safe('assets/js/modules/anticipos-mobile-catalog-fix.js?v=correcta1','data-correct-ant-catfix');
    safe('assets/js/modules/anticipos-comprobar-unificado-v4.js?v=correcta1','data-correct-ant-unificado');
    window.__HS_V104_AUTOCOMPLETE__=true;
    load('assets/js/modules/service-sheets-v104.js?v=20260914-any-custody-1','data-correct-hs-main')
      .then(()=>load('assets/js/modules/service-sheets-any-accepted-custody-v1.js?v=20260914-1','data-hs-any-accepted-custody'))
      .then(()=>load('assets/js/modules/service-sheets-v104-autocomplete.js?v=correcta1','data-correct-hs-auto'))
      .then(()=>load('assets/js/modules/service-sheets-precapture.js?v=correcta1','data-correct-hs-precap'))
      .then(()=>load('assets/js/modules/service-sheets-show-all.js?v=correcta1','data-correct-hs-all'))
      .then(()=>load('assets/js/modules/service-sheets-list-mode.js?v=correcta1','data-correct-hs-list'))
      .then(()=>load('assets/js/modules/service-sheets-manual-photo-pdf.js?v=qr-foto-fix-20260922','data-correct-hs-photo'))
      .then(()=>load('assets/js/modules/service-sheets-reopen.js?v=correcta1','data-correct-hs-reopen'))
      .then(()=>load('assets/js/modules/service-sheets-unit-trailer-v1.js?v=20260913-2','data-hs-unit-trailer-v1'))
      .catch(e=>console.warn('Hojas versionescorrectas1',e));
  });
})();
