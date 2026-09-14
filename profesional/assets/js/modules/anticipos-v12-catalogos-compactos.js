/* Tráfico App Profesional · Anticipos v12 · Catálogos en listado simple · solo presentación */
(function(){
  if(window.__ccAntV12Compact)return; window.__ccAntV12Compact=true;
  const STYLE_ID='ccAntV12CompactStyle';
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`
#ccAntViewCatalogos{--cat-border:#e2e8f0;--cat-muted:#64748b;--cat-bg:#f8fafc}
#ccAntViewCatalogos .cc-ant-report-grid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;align-items:start!important}
#ccAntViewCatalogos .cc-card,#ccAntViewCatalogos .cc-ant-card,#ccAntViewCatalogos .cc-config-card{padding:0!important;border:1px solid var(--cat-border)!important;border-radius:10px!important;box-shadow:none!important;background:#fff!important;overflow:hidden!important}
#ccAntViewCatalogos .cc-card>h3,#ccAntViewCatalogos .cc-card>h4,#ccAntViewCatalogos .cc-ant-card>h3,#ccAntViewCatalogos .cc-ant-card>h4,#ccAntViewCatalogos .cc-config-card>h3,#ccAntViewCatalogos .cc-config-card>h4{padding:10px 12px!important;margin:0!important;background:var(--cat-bg)!important;border-bottom:1px solid var(--cat-border)!important;font-size:12px!important;line-height:1.2!important}
#ccAntViewCatalogos .cc-toolbar{display:flex!important;justify-content:space-between!important;gap:8px!important;margin:0!important;padding:9px 12px!important;align-items:center!important;border-bottom:1px solid var(--cat-border)!important;background:#fff!important}
#ccAntViewCatalogos .cc-toolbar>div:first-child{min-width:0!important}
#ccAntViewCatalogos .cc-btn{min-height:27px!important;padding:4px 8px!important;font-size:10px!important;border-radius:6px!important;white-space:nowrap!important}
#ccAntViewCatalogos table{font-size:10.5px!important;width:100%!important;border-collapse:collapse!important}
#ccAntViewCatalogos thead th{position:sticky!important;top:0!important;z-index:1!important;background:#f8fafc!important;color:#475569!important;font-size:9.5px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.02em!important;border-bottom:1px solid var(--cat-border)!important}
#ccAntViewCatalogos th,#ccAntViewCatalogos td{padding:7px 9px!important;line-height:1.2!important;vertical-align:middle!important;border-bottom:1px solid #f1f5f9!important}
#ccAntViewCatalogos tbody tr:last-child td{border-bottom:0!important}
#ccAntViewCatalogos tbody tr:hover{background:#f8fafc!important}
#ccAntViewCatalogos td:last-child{white-space:nowrap!important;width:1%!important}
#ccAntViewCatalogos td:last-child .cc-btn{margin:1px 2px!important}
#ccAntViewCatalogos .cc-note{font-size:9.5px!important;line-height:1.25!important;color:var(--cat-muted)!important}
#ccAntViewCatalogos .cc-field{margin-bottom:6px!important}
#ccAntViewCatalogos .cc-field label{font-size:9.5px!important;margin-bottom:3px!important}
#ccAntViewCatalogos input,#ccAntViewCatalogos select,#ccAntViewCatalogos textarea{min-height:29px!important;padding:4px 7px!important;font-size:10.5px!important}
#ccAntViewCatalogos .cc-grid{gap:6px!important}
#ccAntViewCatalogos .cc-badge{font-size:9px!important;padding:3px 6px!important}
@media(max-width:720px){
  #ccAntViewCatalogos .cc-ant-report-grid{grid-template-columns:1fr!important;gap:8px!important}
  #ccAntViewCatalogos .cc-toolbar{align-items:flex-start!important;flex-direction:column!important}
  #ccAntViewCatalogos th,#ccAntViewCatalogos td{padding:6px 7px!important}
}
`;
    document.head.appendChild(s);
  }
  function mark(){
    const root=document.getElementById('ccAntViewCatalogos');if(!root)return;
    root.classList.add('cc-ant-catalogos-compactos','cc-ant-catalogos-listado');
    root.querySelectorAll('table').forEach(t=>{
      const p=t.parentElement;if(p){p.style.maxHeight='260px';p.style.overflow='auto';p.style.borderTop='0';}
    });
  }
  function install(){installStyle();mark();const root=document.getElementById('ccAntViewCatalogos');if(root)new MutationObserver(()=>mark()).observe(root,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
