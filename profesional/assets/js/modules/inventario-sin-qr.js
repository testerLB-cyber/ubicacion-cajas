/* Tráfico App · Inventario limpio · QR sólo en Configuración */
(function(){
  'use strict';
  if(window.__CC_INVENTARIO_SIN_QR__) return;
  window.__CC_INVENTARIO_SIN_QR__=true;

  const qrIds=[
    'ccInvPrintQr_20260913',
    'ccInvPrintQrMoved',
    'ccInventoryPrintQrDirectV61',
    'ccUnitQrMainBtn',
    'ccInventoryPrintQrStableV7'
  ];

  function limpiarQrInventario(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel) return;

    qrIds.forEach(id=>panel.querySelector('#'+id)?.remove());

    panel.querySelectorAll('button,a').forEach(el=>{
      const texto=String(el.textContent||'').trim().toUpperCase();
      const onclick=String(el.getAttribute('onclick')||'').toUpperCase();
      const id=String(el.id||'').toUpperCase();
      const esQrInventario=
        texto.includes('IMPRIMIR QR') ||
        texto==='QR' ||
        id.includes('PRINTQR') ||
        id.includes('QRMAIN') ||
        onclick.includes('OPENPRINTQR') ||
        onclick.includes('IMPRIMIRQR');
      if(esQrInventario) el.remove();
    });
  }

  window.ccEnsureInventoryToolbar=function(){
    limpiarQrInventario();
    return true;
  };

  const observer=new MutationObserver(()=>limpiarQrInventario());

  function iniciar(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel){setTimeout(iniciar,150);return;}
    limpiarQrInventario();
    observer.observe(panel,{childList:true,subtree:true});

    if(typeof window.ccRenderInventario==='function'&&!window.ccRenderInventario.__sinQrInventario){
      const original=window.ccRenderInventario;
      const limpio=function(){
        const out=original.apply(this,arguments);
        limpiarQrInventario();
        requestAnimationFrame(limpiarQrInventario);
        return out;
      };
      limpio.__sinQrInventario=true;
      limpio.__ccWrapped=original;
      window.ccRenderInventario=limpio;
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar,{once:true});
  else iniciar();
})();
