/* Tráfico App · Configuración · estándar visual de catálogos v1
   Catálogo -> Agregar nuevo + Buscar + Listado + Editar. Alta/edición permanecen en modal.
   Impresión queda excluida intencionalmente. */
(function(){'use strict';if(window.__CC_CONFIG_CATALOG_STD_V1__)return;window.__CC_CONFIG_CATALOG_STD_V1__=true;
const ROOT='#ccPanelConfiguracion';
const isPrint=s=>!!s.closest('#ccPrintUnitsModal,#ccPrintQrPreview')||s.id==='ccConfigImpresion'||s.dataset?.configPlaceholder==='impresion';
const visible=e=>{const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'};
function titleOf(sec){return sec.querySelector('strong,h2,h3,h4')?.textContent?.trim()||'Catálogo'}
function findList(sec){return sec.querySelector('[data-gpc-list],[data-config-list],tbody,.cc-catalog-list,.cc-list,.cc-table-wrap,table')}
function rowsOf(list){if(!list)return[];if(list.tagName==='TABLE')return [...list.querySelectorAll('tbody tr')];if(list.tagName==='TBODY')return [...list.children];return [...list.children].filter(x=>!x.classList.contains('cc-cat-std-tools'))}
function filter(sec){const q=(sec.querySelector('.cc-cat-std-search')?.value||'').trim().toLocaleLowerCase('es');const list=findList(sec);rowsOf(list).forEach(r=>{r.style.display=!q||(r.textContent||'').toLocaleLowerCase('es').includes(q)?'':'none'});}
function addButton(sec){return [...sec.querySelectorAll('button,a')].find(b=>/^(agregar|nuevo|nueva|agregar nuevo|agregar nueva|alta|crear)/i.test((b.textContent||'').trim())||b.matches('[data-gpc-add],[data-add],[data-new]'))}
function decorate(sec){if(!sec||isPrint(sec)||sec.dataset.ccCatStd==='1')return;const list=findList(sec);if(!list)return;sec.dataset.ccCatStd='1';sec.classList.add('cc-cat-standard');
 const original=addButton(sec);const tools=document.createElement('div');tools.className='cc-cat-std-tools';tools.innerHTML='<div class="cc-cat-std-head"><div><strong>'+titleOf(sec).replace(/[&<>]/g,'')+'</strong><small>Consulta y administra este catálogo.</small></div><button type="button" class="cc-btn cc-btn-primary cc-cat-std-add"><i class="fa-solid fa-plus"></i> Agregar nuevo</button></div><div class="cc-cat-std-searchbox"><i class="fa-solid fa-magnifying-glass"></i><input class="cc-cat-std-search" type="search" placeholder="Buscar en este catálogo…" autocomplete="off"></div>';
 list.parentNode.insertBefore(tools,list);const add=tools.querySelector('.cc-cat-std-add');if(original){original.style.display='none';add.onclick=()=>original.click()}else add.style.display='none';tools.querySelector('input').oninput=()=>filter(sec);ensureEditLabels(sec);}
function ensureEditLabels(sec){sec.querySelectorAll('[data-gpc-edit],[data-edit],button,a').forEach(b=>{const t=(b.textContent||'').trim();if((b.matches('[data-gpc-edit],[data-edit]')||/^editar$/i.test(t))&&!t){b.textContent='Editar'}})}
function sections(){const root=document.querySelector(ROOT);if(!root)return[];return [...root.querySelectorAll('.cc-config-section')].filter(s=>!isPrint(s))}
function scan(){sections().forEach(s=>{decorate(s);ensureEditLabels(s);if(s.dataset.ccCatStd==='1')filter(s)})}
function css(){if(document.getElementById('ccCatStdCss'))return;const s=document.createElement('style');s.id='ccCatStdCss';s.textContent=`
${ROOT} .cc-cat-standard .cc-cat-std-tools{margin:0 0 12px;padding:0;background:transparent}
${ROOT} .cc-cat-std-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
${ROOT} .cc-cat-std-head>div{display:flex;flex-direction:column;gap:2px}${ROOT} .cc-cat-std-head small{color:#64748b;font-size:11px;font-weight:500}
${ROOT} .cc-cat-std-searchbox{height:40px;border:1px solid #dbe2ea;border-radius:10px;background:#fff;display:flex;align-items:center;gap:9px;padding:0 12px;max-width:520px}
${ROOT} .cc-cat-std-searchbox i{color:#64748b}${ROOT} .cc-cat-std-search{border:0!important;outline:0!important;box-shadow:none!important;width:100%;height:36px;background:transparent!important}
${ROOT} .cc-cat-standard table{width:100%}${ROOT} .cc-cat-standard [data-gpc-edit],${ROOT} .cc-cat-standard [data-edit]{white-space:nowrap}
@media(max-width:680px){${ROOT} .cc-cat-std-head{align-items:stretch;flex-direction:column}${ROOT} .cc-cat-std-add{width:100%}${ROOT} .cc-cat-std-searchbox{max-width:none}}
`;document.head.appendChild(s)}
function boot(){css();scan();const root=document.querySelector(ROOT)||document.body;new MutationObserver(()=>scan()).observe(root,{childList:true,subtree:true});document.addEventListener('click',e=>{const b=e.target.closest?.(`${ROOT} .cc-config-nav-btn`);if(!b||b.dataset.configPlaceholder==='impresion'||/impresi[oó]n/i.test(b.textContent||''))return;setTimeout(scan,30);setTimeout(scan,250)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();})();
