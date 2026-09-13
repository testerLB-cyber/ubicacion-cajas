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
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('gmSideDashboard')?.classList.add('active');
  document.getElementById('gmSideCajas')?.classList.remove('active');
  if(!document.querySelector('script[data-mobile-users]')){
    const s=document.createElement('script');
    s.src='assets/js/security/mobile-app-users.js?v=mobile-users-v2';
    s.dataset.mobileUsers='1';
    document.body.appendChild(s);
  }
  if(!document.querySelector('script[data-hs-catalogs]')){
    const c=document.createElement('script');
    c.src='assets/js/modules/service-sheets-catalogs.js?v=hs-catalogs-v1';
    c.dataset.hsCatalogs='1';
    document.body.appendChild(c);
  }
});
