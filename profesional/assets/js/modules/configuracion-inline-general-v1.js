/* Tráfico App · Configuración inline general v1
   Convierte formularios/listados flotantes abiertos desde Configuración en contenido del panel.
   Conserva los controles y handlers originales para no romper altas/ediciones/guardado. */
(function(){
 'use strict';
 if(window.__CC_CONFIG_INLINE_GENERAL_V1__)return; window.__CC_CONFIG_INLINE_GENERAL_V1__=true;
 const panel=()=>document.getElementById('ccPanelConfiguracion');
 const visible=el=>!!(el&&el.offsetParent!==null);
 function activeSection(){const p=panel();if(!p)return null;return [...p.querySelectorAll('.cc-config-section')].find(visible)||p;}
 function isConfigOpen(){const p=panel();return visible(p);}
 function host(){const s=activeSection();if(!s)return null;let h=s.querySelector(':scope > .cc-config-inline-editor');if(!h){h=document.createElement('div');h.className='cc-config-inline-editor';h.style.cssText='margin-top:12px;width:100%;';s.appendChild(h)}return h;}
 function looksLikeOverlay(el){if(!(el instanceof HTMLElement)||el.parentElement!==document.body)return false;if(el.id==='ccPrintUnitsModal'||el.id==='ccPrintQrPreview')return true;const st=(el.getAttribute('style')||'').toLowerCase();if(!st.includes('position:fixed')&&!st.includes('position: fixed'))return false;return !!el.querySelector('form,.cc-config-card,[data-cancel],[data-close],[data-close2]');}
 function absorb(el){if(!isConfigOpen()||!looksLikeOverlay(el)||el.dataset.ccConfigInline==='1')return false;const h=host();if(!h)return false;el.dataset.ccConfigInline='1';el.style.cssText='display:block;position:static;inset:auto;background:transparent;padding:0;width:100%;height:auto;z-index:auto;';const card=el.firstElementChild;if(card){card.style.width='100%';card.style.maxWidth='none';card.style.maxHeight='none';card.style.overflow='visible';card.style.boxShadow='none';card.style.border='1px solid #e2e8f0';card.style.borderRadius='14px'}
 // Los botones cerrar/cancelar siguen funcionando; el contenido permanece dentro de Configuración.
 h.replaceChildren(el);h.scrollIntoView({behavior:'smooth',block:'nearest'});return true;}
 function scan(){if(!isConfigOpen())return;[...document.body.children].forEach(absorb)}
 function wireNav(){const p=panel();if(!p)return;p.querySelectorAll('.cc-config-nav-btn').forEach(b=>{if(b.dataset.ccInlineNav)return;b.dataset.ccInlineNav='1';b.addEventListener('click',()=>setTimeout(scan,0),true)})}
 function boot(){wireNav();scan();new MutationObserver(ms=>{wireNav();for(const m of ms)for(const n of m.addedNodes){if(n instanceof HTMLElement){absorb(n);n.querySelectorAll?.('*').forEach(x=>{if(x.parentElement===document.body)absorb(x)})}}}).observe(document.body,{childList:true,subtree:false});setInterval(wireNav,700)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();