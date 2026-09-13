/* Tráfico App · Inventario · Generar QR junto a Importar unidades */
(function(){
  if(window.__INVENTARIO_QR_TOOLBAR_V2__) return;
  window.__INVENTARIO_QR_TOOLBAR_V2__=true;

  function findImportButton(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel) return null;
    return panel.querySelector('button[onclick*="ccAbrirImportarUnidades"]') ||
      [...panel.querySelectorAll('button')].find(b=>/importar\s+unidades/i.test((b.textContent||'').trim()));
  }

  function placeButton(){
    const importBtn=findImportButton();
    if(!importBtn) return false;
    const qrBtn=document.getElementById('ccQrBatchBtn');
    if(!qrBtn) return false;
    qrBtn.style.cssText='margin:0!important;padding:7px 10px!important;font-size:10px!important;font-weight:800!important;display:inline-flex!important;align-items:center!important;gap:4px!important;';
    qrBtn.className='cc-btn cc-btn-primary';
    qrBtn.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Generar QR';
    if(importBtn.nextElementSibling!==qrBtn) importBtn.insertAdjacentElement('afterend',qrBtn);
    return true;
  }

  function ensureBatchLoaded(){
    if(window.__INVENTARIO_QR_BATCH_V1__){ placeButton(); return; }
    if(document.querySelector('script[data-qr-batch-toolbar-v2]')) return;
    const s=document.createElement('script');
    s.src='assets/js/modules/inventario-qr-batch-v1.js?v=qr-batch-toolbar-v2-20260912-2330';
    s.dataset.qrBatchToolbarV2='1';
    s.onload=()=>{setTimeout(placeButton,0);setTimeout(placeButton,100);};
    s.onerror=e=>console.warn('No se pudo cargar generador QR masivo',e);
    document.body.appendChild(s);
  }

  function apply(){ ensureBatchLoaded(); placeButton(); }

  const timer=setInterval(()=>{
    const panel=document.getElementById('ccPanelInventario');
    if(panel){ apply(); if(document.getElementById('ccQrBatchBtn')&&findImportButton()) clearInterval(timer); }
  },300);
  setTimeout(()=>clearInterval(timer),15000);

  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('#controlCajasSection .cc-tab');
    if(tab && (tab.getAttribute('onclick')||'').includes("ccTab('inventario'"))){
      setTimeout(apply,30);setTimeout(apply,250);
    }
  },true);
  window.addEventListener('load',()=>setTimeout(apply,150));
})();
