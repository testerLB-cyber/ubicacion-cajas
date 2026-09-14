/* Tráfico App · Inventario · botonera canónica estable v2 */
(function(){
'use strict';
if(window.__CC_INVENTARIO_TOOLBAR_STABLE_V2__)return;
window.__CC_INVENTARIO_TOOLBAR_STABLE_V2__=true;
window.__CC_INVENTARIO_QR_BUTTON_STABLE_V1__=true;

function actionsBox(){
  const panel=document.getElementById('ccPanelInventario');
  if(!panel)return null;
  const toolbar=[...panel.querySelectorAll('.cc-toolbar')].find(x=>(x.textContent||'').includes('Inventario de unidades'));
  return toolbar?.querySelector('.cc-actions')||null;
}
function findButton(actions,needle){return [...actions.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes(needle));}
function ensureToolbar(){
  const actions=actionsBox();if(!actions)return false;

  const importar=findButton(actions,'ccAbrirImportarUnidades');
  const template=findButton(actions,'ccDescargarTemplateUnidades');
  const agregar=findButton(actions,'ccNuevaCaja');

  const legacyIds=['ccInvPrintQr_20260913','ccInvPrintQrMoved','ccInventoryPrintQrDirectV61','ccUnitQrMainBtn'];
  legacyIds.forEach(id=>document.getElementById(id)?.remove());
  [...actions.querySelectorAll('button')].forEach(b=>{
    const t=String(b.textContent||'').trim().toUpperCase();
    if(t.includes('IMPRIMIR QR')&&b.id!=='ccInventoryPrintQrStableV7')b.remove();
  });

  let qr=document.getElementById('ccInventoryPrintQrStableV7');
  if(!qr){
    qr=document.createElement('button');
    qr.type='button';
    qr.id='ccInventoryPrintQrStableV7';
    qr.className='cc-btn cc-btn-primary';
    qr.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Imprimir QR';
  }
  qr.onclick=e=>{e.preventDefault();e.stopPropagation();if(typeof window.ccOpenPrintQrV7==='function')window.ccOpenPrintQrV7();else if(typeof window.ccOpenPrintV3==='function')window.ccOpenPrintV3();};

  // Orden único y permanente: Importar · Descargar template · Imprimir QR · Agregar unidad.
  [importar,template,qr,agregar].filter(Boolean).forEach(b=>actions.appendChild(b));
  actions.dataset.ccInventoryToolbarStable='1';
  return true;
}

function install(){
  if(window.__CC_INVENTARIO_TOOLBAR_RENDER_WRAPPED__)return true;
  if(!window.__CC_INVENTARIO_TABLE_STABLE_V2__||typeof window.ccRenderInventario!=='function')return false;
  window.__CC_INVENTARIO_TOOLBAR_RENDER_WRAPPED__=true;
  const render=window.ccRenderInventario;
  const wrapped=function(){
    const out=render.apply(this,arguments);
    ensureToolbar();
    return out;
  };
  wrapped.__ccInventoryToolbarStableV2=true;
  wrapped.__ccWrapped=render;
  window.ccRenderInventario=wrapped;
  ensureToolbar();
  return true;
}

window.ccEnsureInventoryToolbar=ensureToolbar;
if(!install()){
  let n=0;
  const wait=setInterval(()=>{n++;if(install()||n>120)clearInterval(wait);},100);
}
})();
