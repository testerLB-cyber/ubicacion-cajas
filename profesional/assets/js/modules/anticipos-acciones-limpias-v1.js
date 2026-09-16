/* Tráfico App · Anticipos · acciones limpias v3 */
(function(){'use strict';if(window.__CC_ANT_ACCIONES_LIMPIAS_V3__)return;window.__CC_ANT_ACCIONES_LIMPIAS_V3__=true;
function norm(v){return String(v==null?'':v).trim().toLowerCase();}
function esBeneficiarioRow(tr){if(!tr)return false;var txt=norm(tr.textContent);if(txt.includes('beneficiario'))return true;var tipo=norm(tr.dataset.tipo||tr.dataset.tipoAnticipo||tr.dataset.origen||'');return tipo.includes('beneficiario')||!!tr.querySelector('[data-beneficiario-id],[data-tipo="beneficiario"],[data-tipo-anticipo="beneficiario"]');}
function limpiarListado(){var root=document.getElementById('ccAntBody');if(!root)return;root.querySelectorAll('[data-aa="dev"],[data-aa="links"]').forEach(function(b){b.remove();});root.querySelectorAll('tr').forEach(function(tr){if(esBeneficiarioRow(tr))tr.remove();});}
function botonesBalance(){return Array.from(document.querySelectorAll('button,a,[role="button"]')).filter(function(el){return norm(el.textContent)==='balance por operador'||norm(el.textContent)==='balance operador';});}
function acomodarBalance(){
 var bs=botonesBalance();if(!bs.length)return;
 var azul=bs.find(function(b){var c=String(b.className||'').toLowerCase();return c.includes('primary')||c.includes('blue')||getComputedStyle(b).backgroundColor==='rgb(37, 99, 235)';})||bs[0];
 var gris=bs.find(function(b){return b!==azul;});
 if(!gris)return;
 var parent=gris.parentNode;if(!parent)return;
 parent.insertBefore(azul,gris);
 gris.remove();
 azul.textContent='Balance por operador';
 azul.style.display='';
}
function aplicar(){limpiarListado();acomodarBalance();}
function install(){aplicar();var root=document.getElementById('ccAntBody');if(root)new MutationObserver(limpiarListado).observe(root,{childList:true,subtree:true});new MutationObserver(function(){acomodarBalance();limpiarListado();}).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();