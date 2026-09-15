/* Tráfico App · Anticipos · acciones limpias v1 */
(function(){'use strict';if(window.__CC_ANT_ACCIONES_LIMPIAS_V1__)return;window.__CC_ANT_ACCIONES_LIMPIAS_V1__=true;
function clean(){const root=document.getElementById('ccAntBody');if(!root)return;root.querySelectorAll('[data-aa="dev"],[data-aa="links"]').forEach(b=>b.remove());}
function install(){clean();const root=document.getElementById('ccAntBody');if(root)new MutationObserver(clean).observe(root,{childList:true,subtree:true});new MutationObserver(()=>{const r=document.getElementById('ccAntBody');if(r){clean();}}).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();})();