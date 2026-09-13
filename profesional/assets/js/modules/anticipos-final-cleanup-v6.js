/* Tráfico App · Anticipos · limpieza final v6 */
(function(){
  'use strict';
  if(window.__ANT_FINAL_CLEANUP_V6__) return;
  window.__ANT_FINAL_CLEANUP_V6__=true;

  function cleanup(){
    document.querySelectorAll('[data-aa="links"]').forEach(el=>el.remove());
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^Enlaces$/i.test(t)||/\bQR\b|c[oó]digo\s*qr|comprobar\s*por\s*qr/i.test(t)) el.remove();
    });
  }

  const mo=new MutationObserver(cleanup);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(cleanup,1200);
  setTimeout(cleanup,100);
})();
