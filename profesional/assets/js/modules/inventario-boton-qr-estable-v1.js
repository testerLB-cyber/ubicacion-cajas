/* Tráfico App · Inventario · botón QR persistente v1 */
(function(){
'use strict';
if(window.__CC_INVENTARIO_QR_BUTTON_STABLE_V1__)return;
window.__CC_INVENTARIO_QR_BUTTON_STABLE_V1__=true;

function ensureButton(){
  const panel=document.getElementById('ccPanelInventario');
  if(!panel)return false;
  const toolbar=[...panel.querySelectorAll('.cc-toolbar')].find(x=>(x.textContent||'').includes('Inventario de unidades'));
  if(!toolbar)return false;
  const actions=toolbar.querySelector('.cc-actions')||toolbar;
  ['ccInvPrintQr_20260913','ccInvPrintQrMoved','ccInventoryPrintQrDirectV61'].forEach(id=>document.getElementById(id)?.remove());
  let btn=document.getElementById('ccInventoryPrintQrStableV7');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.id='ccInventoryPrintQrStableV7';
    btn.className='cc-btn cc-btn-primary';
    btn.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Imprimir QR';
    btn.onclick=e=>{e.preventDefault();if(typeof window.ccOpenPrintQrV7==='function')window.ccOpenPrintQrV7();};
  }
  const add=actions.querySelector('button[onclick*="ccNuevaCaja"]');
  if(!btn.isConnected){if(add)actions.insertBefore(btn,add);else actions.appendChild(btn);}
  return true;
}

function install(){
  if(window.__CC_INVENTARIO_QR_RENDER_WRAPPED__)return true;
  if(!window.__CC_INVENTARIO_TABLE_STABLE_V1__||typeof window.ccRenderInventario!=='function')return false;
  window.__CC_INVENTARIO_QR_RENDER_WRAPPED__=true;
  const render=window.ccRenderInventario;
  window.ccRenderInventario=function(){
    const out=render.apply(this,arguments);
    ensureButton();
    return out;
  };
  ensureButton();
  return true;
}

if(!install()){
  const wait=setInterval(()=>{if(install())clearInterval(wait);},120);
  setTimeout(()=>clearInterval(wait),15000);
}
})();
