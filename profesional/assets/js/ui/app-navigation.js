function gmMostrarControlCajas(){
  document.body.classList.add('gm-control-mode');
  document.getElementById('gmSideDashboard')?.classList.remove('active');
  document.getElementById('gmSideCajas')?.classList.add('active');
  document.body.scrollTop=0;
  document.documentElement.scrollTop=0;
  if(typeof ccRenderAll==='function') ccRenderAll();
}
function gmMostrarDashboard(){
  document.body.classList.remove('gm-control-mode');
  document.getElementById('gmSideCajas')?.classList.remove('active');
  document.getElementById('gmSideDashboard')?.classList.add('active');
  window.scrollTo({top:0,behavior:'auto'});
}
function ccLoadUnitQrSystem(){
  if(window.__CC_UNIT_QR_SYSTEM_V2__)return;
  if(document.querySelector('script[data-unit-qr-system-v2]'))return;
  const s=document.createElement('script');
  s.src='assets/js/modules/inventario-qr-system-v1.js?v=unit-qr-preview-print-v3-20260913-0003';
  s.dataset.unitQrSystemV2='1';
  s.onerror=e=>console.warn('No se pudo cargar sistema QR de unidades',e);
  document.body.appendChild(s);
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('gmSideDashboard')?.classList.add('active');
  document.getElementById('gmSideCajas')?.classList.remove('active');
  ccLoadUnitQrSystem();
});
