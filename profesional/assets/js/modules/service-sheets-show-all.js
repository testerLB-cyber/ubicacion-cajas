/* Tráfico App Profesional · Hojas de Servicio · Comprobación Ver Todos */
(function(){
  'use strict';
  if(window.__HS_SHOW_ALL__) return;
  window.__HS_SHOW_ALL__=true;

  let restoring=false;
  let lastPerson='';

  function getEls(){
    const view=document.getElementById('hs104View');
    if(!view) return {};
    return {
      view,
      type:view.querySelector('#hs104CompType'),
      person:view.querySelector('#hs104CompPerson'),
      list:view.querySelector('#hs104CompList'),
      search:view.querySelector('#hs104CompPersonSearch'),
      check:view.querySelector('#hs104CompShowAll')
    };
  }

  function setPersonUi(disabled){
    const {person,search}=getEls();
    if(person) person.disabled=disabled;
    if(search){
      search.disabled=disabled;
      search.style.opacity=disabled?'.55':'1';
      search.placeholder=disabled?'Mostrando todos los pendientes':'Buscar operador...';
    }
  }

  function renderAll(){
    const {person,list,check,type}=getEls();
    if(!person||!list||!check||!check.checked) return;
    const opts=[...person.options].filter(o=>o.value);
    if(!opts.length){
      list.innerHTML='<div style="padding:26px;text-align:center;color:#64748b">No hay hojas pendientes.</div>';
      return;
    }
    lastPerson=person.value||lastPerson||'';
    const holder=document.createElement('div');
    holder.className='hs104-row';
    holder.dataset.showAll='1';

    opts.forEach(opt=>{
      person.disabled=false;
      person.value=opt.value;
      person.dispatchEvent(new Event('change',{bubbles:true}));
      const current=list.querySelector('.hs104-row');
      if(!current) return;
      const group=document.createElement('div');
      group.className='hs104-card';
      group.style.cssText='padding:10px;border:1px solid #cbd5e1;background:#f8fafc';
      group.innerHTML='<div style="font-weight:900;font-size:12px;color:#0f172a;margin-bottom:8px"><i class="fa-solid fa-user mr-1"></i>'+opt.textContent+'</div>';
      [...current.children].forEach(card=>group.appendChild(card));
      holder.appendChild(group);
    });

    list.innerHTML='';
    list.appendChild(holder);
    setPersonUi(true);
    if(typeof window.hsPatchPrecapture==='function') setTimeout(()=>window.hsPatchPrecapture(),60);
    check.closest('label')?.classList.add('hs104-show-all-active');
    if(type) type.disabled=false;
  }

  function restoreIndividual(){
    const {person,check}=getEls();
    if(!person||!check) return;
    restoring=true;
    setPersonUi(false);
    check.closest('label')?.classList.remove('hs104-show-all-active');
    const target=[...person.options].some(o=>o.value===lastPerson)?lastPerson:'';
    person.value=target;
    person.dispatchEvent(new Event('change',{bubbles:true}));
    restoring=false;
  }

  function install(){
    const {view,type,person,list}=getEls();
    if(!view||!type||!person||!list) return false;
    if(view.querySelector('#hs104CompShowAll')) return true;

    const label=document.createElement('label');
    label.style.cssText='display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;font-size:11px;font-weight:900;color:#334155;cursor:pointer;white-space:nowrap';
    label.innerHTML='<input id="hs104CompShowAll" type="checkbox" style="width:16px;height:16px;accent-color:#2563eb"> Ver todos';
    const actions=type.closest('.hs104-actions')||type.parentElement;
    actions?.appendChild(label);

    const check=label.querySelector('#hs104CompShowAll');
    check.addEventListener('change',()=>{
      if(check.checked) renderAll();
      else restoreIndividual();
    });

    type.addEventListener('change',()=>{
      setTimeout(()=>{
        const c=document.getElementById('hs104CompShowAll');
        if(c?.checked) renderAll();
      },0);
    });

    person.addEventListener('change',()=>{
      if(restoring) return;
      const c=document.getElementById('hs104CompShowAll');
      if(c?.checked) return;
      lastPerson=person.value||lastPerson;
    });
    return true;
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-v="Comprobacion"]')) setTimeout(install,100);
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.id==='hs104CompType') setTimeout(install,50);
  },true);
  setInterval(()=>{
    if(document.getElementById('hs104CompList')) install();
  },1200);
})();
