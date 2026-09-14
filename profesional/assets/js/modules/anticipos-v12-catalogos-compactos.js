/* Tráfico App Profesional · Anticipos v12 · Catálogos por selección · solo presentación */
(function(){
  if(window.__ccAntV12Compact)return; window.__ccAntV12Compact=true;
  const STYLE_ID='ccAntV12CompactStyle';
  let selectedKey='';
  let applying=false;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`
#ccAntViewCatalogos{--cat-border:#e2e8f0;--cat-muted:#64748b;--cat-bg:#f8fafc}
#ccAntCatalogSelector{display:flex;flex-wrap:wrap;gap:7px;padding:10px 0 12px;margin-bottom:4px;border-bottom:1px solid var(--cat-border)}
#ccAntCatalogSelector .cc-ant-cat-select{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:7px 10px;font-size:10.5px;font-weight:800;cursor:pointer;transition:.15s ease}
#ccAntCatalogSelector .cc-ant-cat-select:hover{background:#f8fafc;border-color:#94a3b8}
#ccAntCatalogSelector .cc-ant-cat-select.active{background:#0f172a;color:#fff;border-color:#0f172a}
#ccAntCatalogHint{padding:22px 16px;text-align:center;color:#64748b;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;font-size:11px}
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
  #ccAntCatalogSelector{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  #ccAntCatalogSelector .cc-ant-cat-select{text-align:left}
  #ccAntViewCatalogos .cc-toolbar{align-items:flex-start!important;flex-direction:column!important}
  #ccAntViewCatalogos th,#ccAntViewCatalogos td{padding:6px 7px!important}
}
`;
    document.head.appendChild(s);
  }

  function labelFor(card,index){
    const h=card.querySelector(':scope > h3,:scope > h4,.cc-toolbar strong,h3,h4');
    const raw=String(h?.textContent||'').replace(/\s+/g,' ').trim();
    return raw||('Catálogo '+(index+1));
  }
  function keyFor(card,index){
    return card.dataset.ccAntCatalogKey || (card.dataset.ccAntCatalogKey='cat-'+index+'-'+labelFor(card,index).toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi,'-').replace(/^-|-$/g,''));
  }

  function applySelection(root){
    if(applying)return; applying=true;
    try{
      const grid=root.querySelector('.cc-ant-report-grid');
      if(!grid)return;
      const cards=[...grid.children].filter(el=>el.id!=='ccAntCatalogHint' && !el.matches('script,style'));
      const selector=root.querySelector('#ccAntCatalogSelector');
      if(!selector||!cards.length)return;
      const keys=cards.map((c,i)=>keyFor(c,i));
      if(selectedKey && !keys.includes(selectedKey)) selectedKey='';
      cards.forEach((c,i)=>{c.style.display=selectedKey===keyFor(c,i)?'block':'none';});
      let hint=grid.querySelector('#ccAntCatalogHint');
      if(!hint){hint=document.createElement('div');hint.id='ccAntCatalogHint';hint.textContent='Selecciona un catálogo para ver su información.';grid.prepend(hint);}
      hint.style.display=selectedKey?'none':'block';
      selector.querySelectorAll('[data-cat-key]').forEach(b=>b.classList.toggle('active',b.dataset.catKey===selectedKey));
      root.querySelectorAll('table').forEach(t=>{const p=t.parentElement;if(p){p.style.maxHeight='300px';p.style.overflow='auto';p.style.borderTop='0';}});
    } finally {applying=false;}
  }

  function buildSelector(root){
    const grid=root.querySelector('.cc-ant-report-grid');
    if(!grid)return;
    const cards=[...grid.children].filter(el=>el.id!=='ccAntCatalogHint' && !el.matches('script,style'));
    if(!cards.length)return;
    let sel=root.querySelector('#ccAntCatalogSelector');
    if(!sel){sel=document.createElement('div');sel.id='ccAntCatalogSelector';grid.parentNode.insertBefore(sel,grid);}
    const signature=cards.map((c,i)=>keyFor(c,i)+'|'+labelFor(c,i)).join('||');
    if(sel.dataset.signature!==signature){
      sel.dataset.signature=signature;
      sel.innerHTML=cards.map((c,i)=>'<button type="button" class="cc-ant-cat-select" data-cat-key="'+keyFor(c,i)+'">'+labelFor(c,i)+'</button>').join('');
      sel.onclick=e=>{const b=e.target.closest('[data-cat-key]');if(!b)return;selectedKey=(selectedKey===b.dataset.catKey?'':b.dataset.catKey);applySelection(root);};
    }
    applySelection(root);
  }

  function mark(){
    const root=document.getElementById('ccAntViewCatalogos');if(!root)return;
    root.classList.add('cc-ant-catalogos-compactos','cc-ant-catalogos-listado','cc-ant-catalogos-selector');
    buildSelector(root);
  }
  function install(){
    installStyle();mark();
    const root=document.getElementById('ccAntViewCatalogos');
    if(root){let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(mark,25);}).observe(root,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
