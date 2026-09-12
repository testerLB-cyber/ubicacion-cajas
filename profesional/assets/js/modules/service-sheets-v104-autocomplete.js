/* Tráfico App Profesional · Control de Hojas de Servicio v104 · Autocomplete personas */
(function(){
  'use strict';
  if(window.__HS_V104_AUTOCOMPLETE__) return;
  window.__HS_V104_AUTOCOMPLETE__=true;

  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();

  function enhance(){
    const view=document.getElementById('hs104View');
    if(!view)return;
    const select=view.querySelector('#hs104CompPerson');
    const type=view.querySelector('#hs104CompType');
    if(!select||!type)return;

    let input=view.querySelector('#hs104CompPersonSearch');
    let list=view.querySelector('#hs104CompPersonList');
    if(!input){
      input=document.createElement('input');
      input.id='hs104CompPersonSearch';
      input.className='cc-input';
      input.setAttribute('autocomplete','off');
      input.setAttribute('list','hs104CompPersonList');
      input.placeholder='Escribe para buscar...';
      input.style.minWidth='260px';
      list=document.createElement('datalist');
      list.id='hs104CompPersonList';
      select.before(input);
      select.before(list);
      select.style.display='none';

      const choose=()=>{
        const q=norm(input.value);
        const opts=[...select.options].filter(o=>o.value);
        if(!q){
          if(select.value){select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));}
          return;
        }
        let match=opts.find(o=>norm(o.textContent)===q);
        if(!match){
          const starts=opts.filter(o=>norm(o.textContent).startsWith(q));
          if(starts.length===1)match=starts[0];
        }
        if(!match){
          const contains=opts.filter(o=>norm(o.textContent).includes(q));
          if(contains.length===1)match=contains[0];
        }
        if(match&&select.value!==match.value){
          select.value=match.value;
          input.value=match.textContent.trim();
          select.dispatchEvent(new Event('change',{bubbles:true}));
        }
      };
      input.addEventListener('change',choose);
      input.addEventListener('input',()=>{
        const q=norm(input.value);
        if(!q){choose();return;}
        const opts=[...select.options].filter(o=>o.value);
        const exact=opts.find(o=>norm(o.textContent)===q);
        if(exact){select.value=exact.value;select.dispatchEvent(new Event('change',{bubbles:true}));}
      });
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();choose();}});
    }

    const current=select.value;
    const opts=[...select.options].filter(o=>o.value);
    list.innerHTML=opts.map(o=>'<option value="'+String(o.textContent||'').replace(/"/g,'&quot;')+'"></option>').join('');
    input.placeholder=type.value==='BENEFICIARIO'?'Buscar beneficiario...':'Buscar operador...';
    if(current){
      const sel=opts.find(o=>o.value===current);
      if(sel&&input.value!==sel.textContent.trim())input.value=sel.textContent.trim();
    }else if(document.activeElement!==input){
      input.value='';
    }
  }

  const observer=new MutationObserver(()=>enhance());
  function install(){
    const root=document.getElementById('controlCajasSection')||document.body;
    observer.observe(root,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#ccTabHojasServicio,[data-v="Comprobacion"]'))setTimeout(enhance,80);
    },true);
    setInterval(enhance,800);
    enhance();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();