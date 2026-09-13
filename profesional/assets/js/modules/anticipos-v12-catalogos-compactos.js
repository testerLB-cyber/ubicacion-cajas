/* Tráfico App Profesional · Anticipos v12 · Catálogos compactos · solo presentación */
(function(){
  if(window.__ccAntV12Compact)return; window.__ccAntV12Compact=true;
  const STYLE_ID='ccAntV12CompactStyle';
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`
#ccAntViewCatalogos .cc-ant-report-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))!important;gap:10px!important;align-items:start!important}
#ccAntViewCatalogos .cc-card,#ccAntViewCatalogos .cc-ant-card,#ccAntViewCatalogos .cc-config-card{padding:10px 12px!important;border-radius:10px!important;box-shadow:none!important}
#ccAntViewCatalogos h3,#ccAntViewCatalogos h4{margin:0 0 7px!important;font-size:13px!important;line-height:1.25!important}
#ccAntViewCatalogos .cc-toolbar{gap:6px!important;margin-bottom:7px!important;align-items:center!important}
#ccAntViewCatalogos .cc-btn{min-height:28px!important;padding:5px 9px!important;font-size:11px!important;border-radius:7px!important}
#ccAntViewCatalogos table{font-size:11px!important;width:100%!important}
#ccAntViewCatalogos th,#ccAntViewCatalogos td{padding:6px 7px!important;line-height:1.25!important;vertical-align:middle!important}
#ccAntViewCatalogos .cc-note{font-size:10px!important;line-height:1.3!important}
#ccAntViewCatalogos .cc-field{margin-bottom:7px!important}
#ccAntViewCatalogos .cc-field label{font-size:10px!important;margin-bottom:3px!important}
#ccAntViewCatalogos input,#ccAntViewCatalogos select,#ccAntViewCatalogos textarea{min-height:31px!important;padding:5px 7px!important;font-size:11px!important}
#ccAntViewCatalogos .cc-grid{gap:7px!important}
@media(max-width:720px){#ccAntViewCatalogos .cc-ant-report-grid{grid-template-columns:1fr!important;gap:8px!important}#ccAntViewCatalogos th,#ccAntViewCatalogos td{padding:5px!important}}
`;
    document.head.appendChild(s);
  }
  function mark(){
    const root=document.getElementById('ccAntViewCatalogos');if(!root)return;
    root.classList.add('cc-ant-catalogos-compactos');
    root.querySelectorAll('table').forEach(t=>{const p=t.parentElement;if(p){p.style.maxHeight='310px';p.style.overflow='auto';}});
  }
  function install(){installStyle();mark();const root=document.getElementById('ccAntViewCatalogos');if(root)new MutationObserver(()=>mark()).observe(root,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
