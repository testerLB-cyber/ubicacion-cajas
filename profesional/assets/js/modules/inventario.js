/* Tráfico App · API pública · Inventario */
(function(){
  const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};

  function openPrintQr(){
    if(typeof window.ccOpenPrintQrV5==='function') return window.ccOpenPrintQrV5();
    if(typeof window.ccOpenPrintV3==='function') return window.ccOpenPrintV3();
    alert('El módulo Imprimir QR todavía está cargando. Intenta nuevamente.');
  }

  function ensurePrintQrButton(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel)return false;
    const toolbar=[...panel.querySelectorAll('.cc-toolbar')].find(t=>(t.textContent||'').includes('Inventario de unidades'));
    if(!toolbar)return false;
    const actions=toolbar.querySelector('.cc-actions')||toolbar;
    let btn=document.getElementById('ccUnitQrMainBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='ccUnitQrMainBtn';
      btn.type='button';
      btn.className='cc-btn cc-btn-primary';
      btn.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Imprimir QR';
    }
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();openPrintQr();};
    const addBtn=actions.querySelector('button[onclick*="ccNuevaCaja"]');
    if(addBtn){
      if(btn.parentElement!==actions||btn.nextElementSibling!==addBtn)actions.insertBefore(btn,addBtn);
    }else if(btn.parentElement!==actions){
      actions.appendChild(btn);
    }
    return true;
  }

  root.modules.inventario={name:'inventario',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);},render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);}};

  ensurePrintQrButton();
  document.addEventListener('DOMContentLoaded',ensurePrintQrButton);
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('#controlCajasSection .cc-tab');
    if(tab&&(tab.getAttribute('onclick')||'').includes("ccTab('inventario'"))){
      setTimeout(ensurePrintQrButton,0);
      setTimeout(ensurePrintQrButton,80);
      setTimeout(ensurePrintQrButton,300);
    }
  },true);
  const obs=new MutationObserver(()=>ensurePrintQrButton());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  const retry=setInterval(ensurePrintQrButton,500);
  setTimeout(()=>clearInterval(retry),30000);
})();
