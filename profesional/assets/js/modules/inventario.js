/* Tráfico App · API pública · Inventario */
(function(){
  const root=window.TraficApp=window.TraficApp||{};root.modules=root.modules||{};

  function openPrintQr(){
    if(typeof window.ccOpenPrintQrV6==='function') return window.ccOpenPrintQrV6();
    if(typeof window.ccOpenPrintV3==='function') return window.ccOpenPrintV3();
    alert('El módulo Imprimir QR todavía está cargando. Intenta nuevamente.');
  }

  function ensurePrintQrButton(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel)return false;
    const toolbar=[...panel.querySelectorAll('.cc-toolbar')].find(t=>(t.textContent||'').includes('Inventario de unidades'));
    if(!toolbar)return false;
    const actions=toolbar.querySelector('.cc-actions')||toolbar;
    let btn=document.getElementById('ccInvPrintQr_20260913');
    if(!btn){
      btn=document.createElement('div');
      btn.id='ccInvPrintQr_20260913';
      btn.setAttribute('tabindex','0');
      btn.innerHTML='<span style="font-size:15px;line-height:1">▦</span><span>Imprimir QR</span>';
      btn.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;gap:7px!important;background:#2563eb!important;color:#fff!important;border:2px solid #1d4ed8!important;border-radius:10px!important;padding:10px 14px!important;min-height:40px!important;box-sizing:border-box!important;font-size:12px!important;font-weight:900!important;line-height:1!important;cursor:pointer!important;user-select:none!important;position:relative!important;z-index:20!important;white-space:nowrap!important;';
      btn.onclick=function(e){e.preventDefault();e.stopPropagation();openPrintQr();};
      btn.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openPrintQr();}};
    }
    const addBtn=actions.querySelector('button[onclick*="ccNuevaCaja"]');
    if(addBtn){
      if(btn.parentElement!==actions||btn.nextElementSibling!==addBtn)actions.insertBefore(btn,addBtn);
    }else if(btn.parentElement!==actions){actions.appendChild(btn);}
    return true;
  }

  root.modules.inventario={name:'inventario',open(){const b=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('inventario'"));if(b&&typeof window.ccTab==='function')return window.ccTab('inventario',b);},render(){if(typeof window.ccRenderInventario==='function')return window.ccRenderInventario();},edit(id){if(typeof window.ccEditarUnidadDirecto==='function')return window.ccEditarUnidadDirecto(id);}};

  ensurePrintQrButton();
  document.addEventListener('DOMContentLoaded',ensurePrintQrButton);
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('#controlCajasSection .cc-tab');
    if(tab&&(tab.getAttribute('onclick')||'').includes("ccTab('inventario'"))){setTimeout(ensurePrintQrButton,0);setTimeout(ensurePrintQrButton,80);setTimeout(ensurePrintQrButton,300);}
  },true);
  const obs=new MutationObserver(()=>ensurePrintQrButton());
  obs.observe(document.documentElement,{childList:true,subtree:true});
  const retry=setInterval(ensurePrintQrButton,400);
  setTimeout(()=>clearInterval(retry),30000);
})();
