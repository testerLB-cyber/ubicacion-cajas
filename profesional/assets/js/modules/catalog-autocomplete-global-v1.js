/* Tráfico App · Autocompletado global de catálogos: Cliente / Operador / Responsable / Unidad */
(function(){
  'use strict';
  if(window.__CC_GLOBAL_CATALOG_AUTOCOMPLETE_V1__)return;
  window.__CC_GLOBAL_CATALOG_AUTOCOMPLETE_V1__=true;

  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEYWORDS=['CLIENTE','OPERADOR','RESPONSABLE','UNIDAD'];

  function getLabel(select){
    const field=select.closest('.cc-field,.form-group,.field,[class*="field"]');
    const lab=field?.querySelector('label');
    if(lab?.textContent)return lab.textContent;
    if(select.id){const byFor=document.querySelector('label[for="'+CSS.escape(select.id)+'"]');if(byFor?.textContent)return byFor.textContent;}
    return '';
  }
  function kindOf(select){
    const raw=norm([getLabel(select),select.name,select.id,select.getAttribute('aria-label'),select.dataset?.label].filter(Boolean).join(' '));
    return KEYWORDS.find(k=>raw.includes(k))||'';
  }
  function options(select){
    return [...select.options].filter(o=>String(o.value||'').trim()&&!o.disabled).map(o=>({value:String(o.value),label:String(o.textContent||'').trim()}));
  }
  function currentLabel(select){
    const o=select.selectedOptions?.[0];return o&&o.value?String(o.textContent||'').trim():'';
  }
  function unitCode(label){
    const s=String(label||'').trim();
    if(!s)return '';
    const byDot=s.split('·')[0].trim();
    const byDash=byDot.split(' - ')[0].trim();
    return norm(byDash.split(/\s+/)[0]||byDash);
  }
  function enhance(select){
    if(!(select instanceof HTMLSelectElement)||select.multiple||select.dataset.ccGlobalAutocomplete==='1')return;
    if(select.closest('[data-dot-autocomplete="1"]')||select.querySelector?.('[data-dot-lookup]'))return;
    const kind=kindOf(select);if(!kind)return;
    const form=select.closest('form');if(!form)return;
    select.dataset.ccGlobalAutocomplete='1';

    const wrap=document.createElement('div');
    wrap.className='cc-global-autocomplete-wrap';
    wrap.style='position:relative;width:100%';
    const input=document.createElement('input');
    input.type='text';input.autocomplete='off';input.spellcheck=false;
    input.placeholder='Escribe 3 caracteres para buscar';
    input.value=currentLabel(select);
    input.dataset.ccCatalogKind=kind;
    input.style.width='100%';
    const menu=document.createElement('div');
    menu.style='display:none;position:absolute;left:0;right:0;top:calc(100% + 3px);z-index:10040;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 28px rgba(15,23,42,.18);max-height:240px;overflow:auto';
    wrap.append(input,menu);
    select.insertAdjacentElement('afterend',wrap);
    select.style.display='none';

    let selectedValue=select.value||'';
    let selectedLabel=currentLabel(select);
    const close=()=>{menu.style.display='none';menu.innerHTML='';};
    const choose=item=>{
      select.value=item.value;
      selectedValue=item.value;selectedLabel=item.label;input.value=item.label;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      close();
    };
    const exactMatch=()=>{
      const q=norm(input.value);
      if(!q){select.value='';selectedValue='';selectedLabel='';return true;}
      const xs=options(select);
      let hit=xs.find(x=>norm(x.label)===q);
      if(!hit&&kind==='UNIDAD')hit=xs.find(x=>unitCode(x.label)===q);
      if(hit){choose(hit);return true;}
      return !!selectedValue&&select.value===selectedValue&&(norm(selectedLabel)===q||(kind==='UNIDAD'&&unitCode(selectedLabel)===q));
    };
    wrap.__ccValidate=exactMatch;

    input.addEventListener('input',()=>{
      selectedValue='';selectedLabel='';select.value='';
      const q=norm(input.value);if(q.length<3){close();return;}
      const xs=options(select).filter(x=>norm(x.label).includes(q)||(kind==='UNIDAD'&&unitCode(x.label).includes(q))).sort((a,b)=>{
        const aa=(kind==='UNIDAD'&&unitCode(a.label).startsWith(q))||norm(a.label).startsWith(q)?0:1;
        const bb=(kind==='UNIDAD'&&unitCode(b.label).startsWith(q))||norm(b.label).startsWith(q)?0:1;
        return aa-bb||a.label.localeCompare(b.label,'es');
      }).slice(0,12);
      menu.innerHTML='';
      if(!xs.length){const d=document.createElement('div');d.style='padding:10px 12px;color:#b91c1c;font-size:12px;font-weight:700';d.textContent='No existe en el catálogo';menu.appendChild(d);menu.style.display='block';return;}
      xs.forEach(item=>{const b=document.createElement('button');b.type='button';b.style='display:block;width:100%;text-align:left;border:0;background:#fff;padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9';b.innerHTML='<strong>'+esc(item.label)+'</strong>';b.onmousedown=e=>{e.preventDefault();choose(item);};menu.appendChild(b);});menu.style.display='block';
    });
    input.addEventListener('focus',()=>{if(norm(input.value).length>=3)input.dispatchEvent(new Event('input'));});
    input.addEventListener('blur',()=>setTimeout(()=>{exactMatch();close();},80));

    if(form.dataset.ccGlobalAutocompleteValidation!=='1'){
      form.dataset.ccGlobalAutocompleteValidation='1';
      form.addEventListener('submit',e=>{
        const wraps=[...form.querySelectorAll('.cc-global-autocomplete-wrap')];
        for(const w of wraps){const inp=w.querySelector('input[data-cc-catalog-kind]');const sel=w.previousElementSibling;if(!(sel instanceof HTMLSelectElement))continue;w.__ccValidate?.();
          if(String(inp?.value||'').trim()&&!sel.value){e.preventDefault();e.stopImmediatePropagation();inp.focus();alert((inp.dataset.ccCatalogKind||'Valor')+' no válido. Debes seleccionar una opción existente del catálogo.');return;}
          if(sel.required&&!sel.value){e.preventDefault();e.stopImmediatePropagation();inp.focus();alert((inp.dataset.ccCatalogKind||'Valor')+' es obligatorio. Selecciona una opción existente del catálogo.');return;}
        }
      },true);
    }
  }
  function scan(root=document){
    const scope=root?.querySelectorAll?root:document;
    if(root instanceof HTMLSelectElement)enhance(root);
    scope.querySelectorAll?.('form select').forEach(enhance);
  }
  let queued=false;
  const observer=new MutationObserver(muts=>{
    if(queued)return;
    if(!muts.some(m=>m.addedNodes?.length))return;
    queued=true;requestAnimationFrame(()=>{queued=false;scan(document);});
  });
  observer.observe(document.body,{childList:true,subtree:true});
  scan(document);
})();
