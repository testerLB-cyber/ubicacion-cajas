/* Tráfico App · Configuración · restaurar QR en Catálogo Impresión v1 */
(function(){
  'use strict';
  if(window.__CC_CONFIG_PRINT_QR_RESTORE_V1__)return;
  window.__CC_CONFIG_PRINT_QR_RESTORE_V1__=true;

  function ensureConfigPrintNav(){
    const panel=document.getElementById('ccPanelConfiguracion');
    if(!panel)return;
    const nav=panel.querySelector('.cc-config-nav,.cc-config-sidebar,.cc-config-menu')||panel.querySelector('.cc-config-nav-btn')?.parentElement;
    if(!nav)return;
    const btn=nav.querySelector('[data-config-placeholder="impresion"]');
    if(btn){
      btn.style.display='';
      btn.hidden=false;
      if(!btn.querySelector('.fa-qrcode')){
        btn.innerHTML='<i class="fa-solid fa-print"></i><span>Impresión</span><small>Unidades y QR</small>';
      }else{
        const small=btn.querySelector('small');if(small)small.textContent='Unidades y QR';
      }
    }
  }

  function ensureQrButton(){
    const modal=document.getElementById('ccPrintUnitsModal');
    if(!modal)return;
    const body=modal.querySelector('#ccPrintBody');
    if(!body)return;
    let btn=modal.querySelector('#ccPrintQrBtn');
    if(!btn){
      const footer=[...body.querySelectorAll('div')].find(x=>String(x.style?.justifyContent||'').includes('flex-end'))||body;
      btn=document.createElement('button');
      btn.type='button';
      btn.id='ccPrintQrBtn';
      btn.className='cc-btn cc-btn-primary';
      btn.innerHTML='<i class="fa-solid fa-qrcode"></i> QR';
      footer.appendChild(btn);
    }
    btn.style.display='inline-flex';
    btn.hidden=false;
    btn.removeAttribute('aria-hidden');
  }

  function run(){ensureConfigPrintNav();ensureQrButton();}
  const mo=new MutationObserver(run);
  function boot(){
    run();
    mo.observe(document.getElementById('controlCajasSection')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden','class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
