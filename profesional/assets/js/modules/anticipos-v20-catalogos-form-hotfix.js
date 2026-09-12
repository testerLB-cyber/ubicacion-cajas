/* Tráfico App Profesional · Anticipos v20 · hotfix formularios Catálogos */
(function(){
  if(window.__ccAntV20CatalogForms)return; window.__ccAntV20CatalogForms=true;
  const SEL='#ccAntViewCatalogos';
  function visible(){const v=document.querySelector(SEL);return v&&getComputedStyle(v).display!=='none'}
  function cleanLegacy(){document.getElementById('ccERP13')?.remove();document.getElementById('ccERPForm13')?.remove()}
  function showForm(){
    if(!visible())return false;
    cleanLegacy();
    const main=document.getElementById('ccV15Main'); if(!main)return false;
    const host=document.getElementById('ccV16ConceptForm')||document.getElementById('ccV15FormHost');
    if(!host||!host.innerHTML.trim())return false;
    const head=main.querySelector('.cc-v15-head');
    if(head&&host.parentElement===main&&head.nextElementSibling!==host)head.insertAdjacentElement('afterend',host);
    host.style.setProperty('display','block','important');
    host.style.setProperty('visibility','visible','important');
    host.style.setProperty('opacity','1','important');
    host.style.setProperty('position','relative','important');
    host.style.setProperty('z-index','5','important');
    host.style.setProperty('margin','12px 0','important');
    host.style.setProperty('padding','14px','important');
    host.style.setProperty('background','#f8fafc','important');
    host.style.setProperty('border','2px solid #93c5fd','important');
    host.style.setProperty('border-radius','12px','important');
    host.querySelectorAll('form,.cc-v15-form').forEach(x=>{x.style.setProperty('display','block','important');x.style.setProperty('visibility','visible','important');x.style.setProperty('opacity','1','important')});
    host.scrollIntoView({behavior:'auto',block:'start'});
    return true;
  }
  function retry(){let n=0;const t=setInterval(()=>{n++;if(showForm()||n>=12)clearInterval(t)},50)}
  document.addEventListener('click',ev=>{
    if(!visible())return;
    const b=ev.target.closest?.('#ccV15New,#ccV15NewCfg,#ccV16ConceptNew,#ccV15Main [data-edit],#ccV15Main [data-v16-edit]');
    if(!b)return;
    retry();
  },false);
  const mo=new MutationObserver(()=>{if(visible())showForm()});
  function attach(){const v=document.querySelector(SEL);if(!v)return false;mo.observe(v,{childList:true,subtree:true});return true}
  let tries=0,t=setInterval(()=>{tries++;if(attach()||tries>40)clearInterval(t)},250);
})();