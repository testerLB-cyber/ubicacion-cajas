/* Tráfico App Profesional · Anticipos v18 · formularios de catálogo visibles inline */
(function(){
  if(window.__ccAntV18InlineForms)return; window.__ccAntV18InlineForms=true;

  function isCatalogVisible(){
    const v=document.getElementById('ccAntViewCatalogos');
    return !!v && getComputedStyle(v).display!=='none';
  }

  function promoteForm(){
    const main=document.getElementById('ccV15Main');
    const form=document.getElementById('ccV15FormHost');
    if(!main||!form||!form.innerHTML.trim())return false;
    const head=main.querySelector('.cc-v15-head');
    if(head && form.previousElementSibling!==head){
      head.insertAdjacentElement('afterend',form);
    }
    form.style.display='block';
    form.style.margin='10px 0 14px';
    form.style.padding='14px';
    form.style.background='#f8fafc';
    form.style.border='1px solid #cbd5e1';
    form.style.borderRadius='12px';
    form.scrollIntoView({behavior:'smooth',block:'center'});
    const first=form.querySelector('input:not([type="hidden"]),select,textarea');
    setTimeout(()=>first?.focus?.(),120);
    return true;
  }

  function promoteConceptForm(){
    const main=document.getElementById('ccV15Main');
    const form=document.getElementById('ccV16ConceptForm');
    if(!main||!form||!form.innerHTML.trim())return false;
    const head=main.querySelector('.cc-v15-head');
    if(head && form.previousElementSibling!==head){
      head.insertAdjacentElement('afterend',form);
    }
    form.style.display='block';
    form.style.margin='10px 0 14px';
    form.style.padding='14px';
    form.style.background='#f8fafc';
    form.style.border='1px solid #cbd5e1';
    form.style.borderRadius='12px';
    form.scrollIntoView({behavior:'smooth',block:'center'});
    const first=form.querySelector('input:not([type="hidden"]),select,textarea');
    setTimeout(()=>first?.focus?.(),120);
    return true;
  }

  function removeLegacy(){
    document.getElementById('ccERP13')?.remove();
    document.getElementById('ccERPForm13')?.remove();
  }

  document.addEventListener('click',function(ev){
    if(!isCatalogVisible() && !ev.target.closest?.('.cc-ant-nav [data-antv="catalogos"]')) return;
    const newBtn=ev.target.closest?.('#ccV15New,#ccV15NewCfg,#ccV16ConceptNew');
    const editBtn=ev.target.closest?.('#ccV15Main [data-edit],#ccV15Main [data-v16-edit]');
    if(!newBtn&&!editBtn)return;
    removeLegacy();
    setTimeout(()=>{
      removeLegacy();
      if(!promoteConceptForm()) promoteForm();
    },40);
    setTimeout(()=>{
      if(!promoteConceptForm()) promoteForm();
    },180);
  },true);

  const observer=new MutationObserver(()=>{
    if(!isCatalogVisible())return;
    if(!promoteConceptForm()) promoteForm();
  });

  function attach(){
    const host=document.getElementById('ccAntViewCatalogos');
    if(!host)return false;
    observer.observe(host,{childList:true,subtree:true});
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(attach()||tries>30)clearInterval(timer)},300);
})();
