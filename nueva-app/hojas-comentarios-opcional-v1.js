/* Tráfico App Móvil · Hojas · Comentarios opcional v1 */
(function(){
  'use strict';
  if(window.__MOBILE_HOJAS_COMENTARIOS_V1__)return;
  window.__MOBILE_HOJAS_COMENTARIOS_V1__=true;
  function apply(){
    const input=document.getElementById('hsUsedAt');
    if(!input)return false;
    input.required=false;
    input.removeAttribute('required');
    input.placeholder='Comentarios opcionales';
    const label=input.closest('.field')?.querySelector('label');
    if(label)label.textContent='Comentarios';
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  let n=0;const t=setInterval(()=>{n++;if(apply()||n>40)clearInterval(t)},100);
})();
