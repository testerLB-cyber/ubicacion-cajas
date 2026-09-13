/* Tráfico App · API pública · Inventario */
(function(){
  const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};

  function loadQr(){
    if(window.__CC_UNIT_QR_SYSTEM_V2__)return;
    if(document.querySelector('script[data-unit-qr-system-v2]'))return;
    const s=document.createElement('script');
    s.src='assets/js/modules/inventario-qr-system-v1.js?v=unit-qr-preview-print-v3-20260913-0003';
    s.dataset.unitQrSystemV2='1';
    s.onerror=e=>console.warn('No se pudo cargar sistema QR de unidades',e);
    document.body.appendChild(s);
  }

  function ensurePrintQrButton(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel)return false;
    const importBtn=panel.querySelector('button[onclick*="ccAbrirImportarUnidades"]');
    if(!importBtn)return false;
    let btn=document.getElementById('ccUnitQrMainBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='ccUnitQrMainBtn';
      btn.type='button';
      btn.className='cc-btn cc-btn-primary';
      btn.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Imprimir QR';
      btn.onclick=()=>{
        loadQr();
        if(typeof window.ccOpenUnitQrGenerator==='function')return window.ccOpenUnitQrGenerator();
        let n=0;
        const t=setInterval(()=>{
          n++;
          if(typeof window.ccOpenUnitQrGenerator==='function'){
            clearInterval(t);
            window.ccOpenUnitQrGenerator();
          }else if(n>=20){
            clearInterval(t);
            alert('No se pudo abrir el generador QR. Recarga la página e intenta de nuevo.');
          }
        },100);
      };
    }
    if(importBtn.nextElementSibling!==btn)importBtn.insertAdjacentElement('afterend',btn);
    return true;
  }

  root.modules.inventario={name:'inventario',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);},render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);}};

  loadQr();
  ensurePrintQrButton();
  document.addEventListener('DOMContentLoaded',()=>{loadQr();ensurePrintQrButton();});
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('#controlCajasSection .cc-tab');
    if(tab&&(tab.getAttribute('onclick')||'').includes("ccTab('inventario'"))){
      setTimeout(()=>{loadQr();ensurePrintQrButton();},30);
    }
  },true);
  const retry=setInterval(ensurePrintQrButton,500);
  setTimeout(()=>clearInterval(retry),20000);
})();
