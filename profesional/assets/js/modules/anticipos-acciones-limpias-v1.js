/* Tráfico App · Anticipos · acciones limpias v2 */
(function(){'use strict';if(window.__CC_ANT_ACCIONES_LIMPIAS_V2__)return;window.__CC_ANT_ACCIONES_LIMPIAS_V2__=true;
function norm(v){return String(v==null?'':v).trim().toLowerCase();}
function esBeneficiarioRow(tr){
  if(!tr)return false;
  var txt=norm(tr.textContent);
  if(txt.includes('beneficiario'))return true;
  var tipo=norm(tr.dataset.tipo||tr.dataset.tipoAnticipo||tr.dataset.origen||'');
  if(tipo.includes('beneficiario'))return true;
  return !!tr.querySelector('[data-beneficiario-id],[data-tipo="beneficiario"],[data-tipo-anticipo="beneficiario"]');
}
function limpiarListado(){
  var root=document.getElementById('ccAntBody');if(!root)return;
  root.querySelectorAll('[data-aa="dev"],[data-aa="links"]').forEach(function(b){b.remove();});
  root.querySelectorAll('tr').forEach(function(tr){if(esBeneficiarioRow(tr))tr.remove();});
}
function abrirBalance(){
  var candidatos=['ccAntBalanceOperadoresBtn','ccAntSaldosBtn','ccAntSaldoOperadoresBtn','ccAntBalanceBtn'];
  for(var i=0;i<candidatos.length;i++){var b=document.getElementById(candidatos[i]);if(b&&b.offsetParent!==null){b.click();return;}}
  if(typeof window.ccAntAbrirBalanceOperadores==='function'){window.ccAntAbrirBalanceOperadores();return;}
  if(typeof window.ccAntOpenOperador==='function'){var s=document.querySelector('#ccAntSaldosBody [data-operador-id],#ccAntSaldosBody button');if(s){s.click();return;}}
  var sec=document.getElementById('ccAntSaldos')||document.getElementById('ccAntSaldosSection')||document.querySelector('[data-ant-section="saldos"]');
  if(sec){sec.style.display='';sec.scrollIntoView({behavior:'smooth',block:'start'});}
}
function reemplazarPendientes(){
  var els=Array.from(document.querySelectorAll('button,a,[role="button"]'));
  els.forEach(function(el){
    var t=norm(el.textContent);
    if(t==='pendiente de operadores'||t==='pendientes de operadores'||t==='pendiente operadores'||t==='pendientes operadores'){
      el.innerHTML=el.innerHTML.replace(/Pendientes?\s+de\s+operadores/ig,'Balance por operador').replace(/Pendientes?\s+operadores/ig,'Balance por operador');
      el.onclick=function(ev){ev.preventDefault();ev.stopPropagation();abrirBalance();};
      el.removeAttribute('data-target');el.removeAttribute('href');
    }
  });
}
function aplicar(){limpiarListado();reemplazarPendientes();}
function install(){
  aplicar();
  var root=document.getElementById('ccAntBody');if(root)new MutationObserver(limpiarListado).observe(root,{childList:true,subtree:true});
  new MutationObserver(aplicar).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();