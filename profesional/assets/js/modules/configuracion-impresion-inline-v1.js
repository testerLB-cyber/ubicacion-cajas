/* Tráfico App · Configuración → Impresión inline v1
   Conserva el flujo original de selección/QR/PDF, pero monta la interfaz
   directamente dentro de la pantalla de Configuración en vez de un modal. */
(function(){
 'use strict';
 if(window.__CC_CONFIG_PRINT_INLINE_V1__)return;
 window.__CC_CONFIG_PRINT_INLINE_V1__=true;

 const panel=()=>document.getElementById('ccPanelConfiguracion');
 function ensureSection(){
  const p=panel(); if(!p)return null;
  let s=document.getElementById('ccConfigImpresion');
  if(!s){
   s=document.createElement('div');
   s.id='ccConfigImpresion';
   s.className='cc-config-section';
   s.innerHTML='<div class="cc-config-card" id="ccPrintInlineHost"><div class="cc-note" style="padding:14px">Abre Impresión para cargar las unidades.</div></div>';
   p.appendChild(s);
  }
  return s;
 }
 function showSection(btn){
  const s=ensureSection(); if(!s)return;
  if(typeof window.ccConfigSection==='function'){
   try{window.ccConfigSection('impresion',btn);}catch(_){ }
  }
  panel()?.querySelectorAll('.cc-config-section').forEach(x=>x.style.display=(x===s?'':'none'));
  s.style.display='';
  panel()?.querySelectorAll('.cc-config-nav-btn').forEach(x=>x.classList.toggle('active',x===btn));
 }
 function inlineModal(){
  const modal=document.getElementById('ccPrintUnitsModal');
  const s=ensureSection(); if(!modal||!s)return false;
  let host=document.getElementById('ccPrintInlineHost');
  if(!host){host=document.createElement('div');host.id='ccPrintInlineHost';host.className='cc-config-card';s.appendChild(host);}
  const card=modal.firstElementChild;
  if(!card)return false;
  modal.removeAttribute('style');
  modal.style.cssText='display:block;position:static;inset:auto;background:transparent;padding:0;width:100%;';
  modal.id='ccPrintUnitsInline';
  card.style.cssText='background:#fff;width:100%;max-width:none;max-height:none;overflow:visible;border-radius:14px;box-shadow:none;border:1px solid #e2e8f0;';
  card.querySelectorAll('[data-close],[data-close2]').forEach(b=>b.remove());
  const list=card.querySelector('#ccPrintList'); if(list)list.style.maxHeight='58vh';
  host.replaceChildren(modal);
  return true;
 }
 function wire(){
  const p=panel(); if(!p)return false;
  ensureSection();
  const btn=p.querySelector('[data-config-placeholder="impresion"]');
  if(!btn||btn.dataset.inlinePrintWired==='1')return !!btn;
  const original=btn.onclick;
  if(typeof original!=='function')return false;
  btn.dataset.inlinePrintWired='1';
  btn.onclick=function(ev){
   ev?.preventDefault?.();
   showSection(btn);
   document.getElementById('ccPrintUnitsInline')?.remove();
   original.call(btn,ev);
   let tries=0;
   const t=setInterval(()=>{tries++; if(inlineModal()||tries>30)clearInterval(t);},20);
  };
  return true;
 }
 function boot(){
  wire();
  const root=document.getElementById('controlCajasSection')||document.body;
  new MutationObserver(()=>wire()).observe(root,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
