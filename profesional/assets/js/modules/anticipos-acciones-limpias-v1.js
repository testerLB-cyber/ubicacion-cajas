/* Tráfico App · Anticipos · acciones limpias v4 estable */
(function(){'use strict';if(window.__CC_ANT_ACCIONES_LIMPIAS_V4__)return;window.__CC_ANT_ACCIONES_LIMPIAS_V4__=true;
function norm(v){return String(v==null?'':v).trim().toLowerCase();}
function esBeneficiarioRow(tr){if(!tr)return false;var txt=norm(tr.textContent);if(txt.includes('beneficiario'))return true;var tipo=norm(tr.dataset.tipo||tr.dataset.tipoAnticipo||tr.dataset.origen||'');return tipo.includes('beneficiario')||!!tr.querySelector('[data-beneficiario-id],[data-tipo="beneficiario"],[data-tipo-anticipo="beneficiario"]');}
function limpiarListado(){var root=document.getElementById('ccAntBody');if(!root)return;root.querySelectorAll('[data-aa="dev"],[data-aa="links"]').forEach(function(b){b.remove();});root.querySelectorAll('tr').forEach(function(tr){if(esBeneficiarioRow(tr))tr.remove();});}
function quitarPendienteOperadores(){
 document.querySelectorAll('[data-antv="saldos"]').forEach(function(b){b.remove();});
}
function install(){
 quitarPendienteOperadores();
 limpiarListado();
 var root=document.getElementById('ccAntBody');
 if(root)new MutationObserver(limpiarListado).observe(root,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();