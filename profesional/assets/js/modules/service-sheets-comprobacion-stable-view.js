/* Control de Hojas · selector estable Pendientes/Historial · 2026-09-30 */
(function(){'use strict';if(window.__HS_COMP_STABLE_VIEW__)return;window.__HS_COMP_STABLE_VIEW__=true;
function card(el){return el?.closest('.hs104-card')||null}
function install(){
 const view=document.getElementById('hs104View'),list=document.getElementById('hs104CompList'),hist=document.getElementById('hs104Hist');
 if(!view||!list||!hist)return;
 const p=card(list),h=card(hist);if(!p||!h)return;
 let bar=document.getElementById('hsCompStableBar');
 if(!bar){bar=document.createElement('div');bar.id='hsCompStableBar';bar.style='display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px';
 bar.innerHTML='<button type="button" class="cc-btn cc-btn-primary" data-hsv="P">Pendientes</button><button type="button" class="cc-btn cc-btn-light" data-hsv="H">Historial</button>';
 p.parentNode.insertBefore(bar,p);bar.querySelectorAll('[data-hsv]').forEach(b=>b.onclick=()=>mode(b.dataset.hsv));}
 if(!bar.dataset.mode)mode('P');else mode(bar.dataset.mode);
}
function mode(m){
 const bar=document.getElementById('hsCompStableBar'),p=card(document.getElementById('hs104CompList')),h=card(document.getElementById('hs104Hist'));if(!bar||!p||!h)return;
 bar.dataset.mode=m;
 if(typeof window.hsSetComprobacionHistory==='function'){
   window.hsSetComprobacionHistory(m==='H');
 }else{
   p.style.display=m==='P'?'':'none';h.style.display=m==='H'?'':'none';
 }
 bar.querySelectorAll('[data-hsv]').forEach(b=>{const on=b.dataset.hsv===m;b.classList.toggle('cc-btn-primary',on);b.classList.toggle('cc-btn-light',!on)});
}
new MutationObserver(()=>{if(document.getElementById('hs104CompList')&&document.getElementById('hs104Hist'))setTimeout(install,30)}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-v="Comprobacion"]'))setTimeout(install,100)},true);
})();