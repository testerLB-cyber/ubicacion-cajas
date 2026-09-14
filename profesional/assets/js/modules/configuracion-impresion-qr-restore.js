/* Tráfico App · Configuración · QR grande y persistente en Impresión v2 */
(function(){
  'use strict';
  if(window.__CC_CONFIG_PRINT_QR_RESTORE_V2__)return;
  window.__CC_CONFIG_PRINT_QR_RESTORE_V2__=true;

  let savedQrBtn=null;
  let observerBusy=false;

  function configPanel(){return document.getElementById('ccPanelConfiguracion');}
  function printNav(){
    const panel=configPanel();
    if(!panel)return null;
    const nav=panel.querySelector('.cc-config-nav,.cc-config-sidebar,.cc-config-menu')||panel.querySelector('.cc-config-nav-btn')?.parentElement;
    if(!nav)return null;
    return nav.querySelector('[data-config-placeholder="impresion"]');
  }
  function ensureConfigPrintNav(){
    const btn=printNav();
    if(!btn)return;
    btn.style.display='';
    btn.hidden=false;
    btn.innerHTML='<i class="fa-solid fa-print"></i><span>Impresión</span><small>Unidades y QR</small>';
  }
  function qrFooter(modal){
    const body=modal?.querySelector('#ccPrintBody');
    if(!body)return null;
    const direct=body.querySelector('#ccPrintList')?.nextElementSibling;
    if(direct)return direct;
    return [...body.querySelectorAll('div')].find(x=>String(x.style?.justifyContent||'').includes('flex-end'))||body;
  }
  function makeLarge(btn){
    if(!btn)return;
    btn.style.display='inline-flex';
    btn.hidden=false;
    btn.removeAttribute('aria-hidden');
    btn.classList.add('cc-btn','cc-btn-primary');
    btn.style.minWidth='220px';
    btn.style.minHeight='54px';
    btn.style.padding='13px 24px';
    btn.style.fontSize='16px';
    btn.style.fontWeight='900';
    btn.style.justifyContent='center';
    btn.style.alignItems='center';
    btn.style.gap='9px';
    btn.style.borderRadius='12px';
    btn.innerHTML='<i class="fa-solid fa-qrcode" style="font-size:20px"></i> GENERAR QR';
  }
  function ensureQrButton(){
    const modal=document.getElementById('ccPrintUnitsModal');
    if(!modal)return;
    let btn=modal.querySelector('#ccPrintQrBtn');
    if(btn){
      savedQrBtn=btn;
      makeLarge(btn);
      return;
    }
    if(savedQrBtn){
      const footer=qrFooter(modal);
      if(footer){
        footer.appendChild(savedQrBtn);
        makeLarge(savedQrBtn);
      }
    }
  }
  function run(){
    if(observerBusy)return;
    observerBusy=true;
    try{ensureConfigPrintNav();ensureQrButton();}
    finally{observerBusy=false;}
  }
  const mo=new MutationObserver(()=>requestAnimationFrame(run));
  function boot(){
    run();
    mo.observe(document.getElementById('controlCajasSection')||document.body,{childList:true,subtree:true});
    setInterval(run,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
