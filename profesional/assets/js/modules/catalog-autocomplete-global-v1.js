/* Tráfico App · Autocompletado global de catálogos: Cliente / Operador / Responsable / Unidad / Tipo de unidad */
(function(){
  'use strict';
  if(window.__CC_GLOBAL_CATALOG_AUTOCOMPLETE_V2__)return;
  window.__CC_GLOBAL_CATALOG_AUTOCOMPLETE_V2__=true;

  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEYWORDS=['TIPO DE UNIDAD','CLIENTE','OPERADOR','RESPONSABLE','UNIDAD'];

  function getLabel(select){
    const field=select.closest('.cc-field,.form-group,.field,[class*="field"]');
    const lab=field?.querySelector('label');
    if(lab?.textContent)return lab.textContent;
    if(select.id){const byFor=document.querySelector('label[for="'+CSS.escape(select.id)+'"]');if(byFor?.textContent)return byFor.textContent;}
    return '';
  }
  function kindOf(select){
    const raw=norm([getLabel(select),select.name,select.id,select.getAttribute('aria-label'),select.dataset?.label].filter(Boolean).join(' '));
    if(raw.includes('TIPO DE UNIDAD')||raw.includes('TIPOUNIDADGENERAL'))return 'TIPO_UNIDAD';
    return KEYWORDS.slice(1).find(k=>raw.includes(k))||'';
  }
  function options(select){
    return [...select.options].filter(o=>String(o.value||'').trim()&&!o.disabled).map(o=>({value:String(o.value),label:String(o.textContent||'').trim()}));
  }
  function currentLabel(select){const o=select.selectedOptions?.[0];return o&&o.value?String(o.textContent||'').trim():'';}
  function unitCode(label){const s=String(label||'').trim();if(!s)return '';const byDot=s.split('·')[0].trim();const byDash=byDot.split(' - ')[0].trim();return norm(byDash.split(/\s+/)[0]||byDash);}
  function isNewRental(select){const modal=select.closest('#ccFormModal');return !!modal&&norm(modal.dataset.auditTitle||'').includes('NUEVA UNIDAD DE RENTA');}

  function openLookup(select,input,kind,choose){
    document.getElementById('ccCatalogLookupModal')?.remove();
    const ov=document.createElement('div');ov.id='ccCatalogLookupModal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100600;display:flex;align-items:center;justify-content:center;padding:16px';
    const title=kind==='TIPO_UNIDAD'?'Tipos de unidad':'Unidades';
    ov.innerHTML='<div style="background:#fff;width:min(680px,96vw);max-height:86vh;border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.3)"><div style="padding:14px 16px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between"><strong>Buscar en catálogo · '+title+'</strong><button type="button" data-close style="border:0;background:none;color:#fff;font-size:22px;cursor:pointer">×</button></div><div style="padding:14px"><input data-search type="search" autocomplete="off" placeholder="Buscar..." style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;margin-bottom:10px"><div data-list style="max-height:58vh;overflow:auto;border:1px solid #e2e8f0;border-radius:10px"></div></div></div>';
    document.body.appendChild(ov);const list=ov.querySelector('[data-list]'),search=ov.querySelector('[data-search]');
    const render=()=>{const q=norm(search.value);const xs=options(select).filter(x=>!q||norm(x.label).includes(q)||(kind==='UNIDAD'&&unitCode(x.label).includes(q)));list.innerHTML=xs.length?xs.map((x,i)=>'<button type="button" data-i="'+i+'" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:#fff;padding:11px 12px;cursor:pointer"><strong>'+esc(x.label)+'</strong></button>').join(''):'<div style="padding:18px;text-align:center;color:#64748b">No se encontraron resultados.</div>';list.querySelectorAll('[data-i]').forEach((b,i)=>b.onclick=()=>{choose(xs[i]);ov.remove();});};
    search.oninput=render;ov.querySelector('[data-close]').onclick=()=>ov.remove();ov.addEventListener('mousedown',e=>{if(e.target===ov)ov.remove();});render();setTimeout(()=>search.focus(),0);
  }

  function enhance(select){
    if(!(select instanceof HTMLSelectElement)||select.multiple||select.dataset.ccGlobalAutocomplete==='1')return;
    if(select.closest('[data-dot-autocomplete="1"]')||select.querySelector?.('[data-dot-lookup]'))return;
    const kind=kindOf(select);if(!kind)return;const form=select.closest('form');if(!form)return;
    if(kind==='UNIDAD'&&isNewRental(select)){
      if(![...select.options].some(o=>o.value===''))select.insertAdjacentHTML('afterbegin','<option value="">Selecciona o busca una unidad</option>');
      select.value='';
    }
    select.dataset.ccGlobalAutocomplete='1';
    const wrap=document.createElement('div');wrap.className='cc-global-autocomplete-wrap';wrap.style='position:relative;width:100%;display:flex;gap:6px;align-items:stretch';
    const input=document.createElement('input');input.type='text';input.autocomplete='off';input.spellcheck=false;input.placeholder=kind==='TIPO_UNIDAD'?'Escribe para buscar tipo de unidad':'Escribe para buscar';input.value=currentLabel(select);input.dataset.ccCatalogKind=kind;input.style='width:100%;min-width:0';
    const dots=document.createElement('button');dots.type='button';dots.textContent='...';dots.title='Buscar en catálogo';dots.setAttribute('aria-label','Buscar en catálogo');dots.style='flex:0 0 42px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc;font-weight:900;font-size:16px;cursor:pointer';
    const menu=document.createElement('div');menu.style='display:none;position:absolute;left:0;right:48px;top:calc(100% + 3px);z-index:10040;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 12px 28px rgba(15,23,42,.18);max-height:240px;overflow:auto';
    wrap.append(input,dots,menu);select.insertAdjacentElement('afterend',wrap);select.style.display='none';
    let selectedValue=select.value||'',selectedLabel=currentLabel(select);
    const close=()=>{menu.style.display='none';menu.innerHTML='';};
    const choose=item=>{select.value=item.value;selectedValue=item.value;selectedLabel=item.label;input.value=item.label;select.dispatchEvent(new Event('change',{bubbles:true}));close();};
    dots.onclick=()=>openLookup(select,input,kind,choose);
    const exactMatch=()=>{const q=norm(input.value);if(!q){select.value='';selectedValue='';selectedLabel='';return true;}const xs=options(select);let hit=xs.find(x=>norm(x.label)===q);if(!hit&&kind==='UNIDAD')hit=xs.find(x=>unitCode(x.label)===q);if(hit){choose(hit);return true;}return !!selectedValue&&select.value===selectedValue&&(norm(selectedLabel)===q||(kind==='UNIDAD'&&unitCode(selectedLabel)===q));};wrap.__ccValidate=exactMatch;
    input.addEventListener('input',()=>{selectedValue='';selectedLabel='';select.value='';const q=norm(input.value);const min=kind==='TIPO_UNIDAD'?1:2;if(q.length<min){close();return;}const xs=options(select).filter(x=>norm(x.label).includes(q)||(kind==='UNIDAD'&&unitCode(x.label).includes(q))).sort((a,b)=>{const aa=(kind==='UNIDAD'&&unitCode(a.label).startsWith(q))||norm(a.label).startsWith(q)?0:1;const bb=(kind==='UNIDAD'&&unitCode(b.label).startsWith(q))||norm(b.label).startsWith(q)?0:1;return aa-bb||a.label.localeCompare(b.label,'es');}).slice(0,15);menu.innerHTML='';if(!xs.length){const d=document.createElement('div');d.style='padding:10px 12px;color:#b91c1c;font-size:12px;font-weight:700';d.textContent='No existe en el catálogo';menu.appendChild(d);menu.style.display='block';return;}xs.forEach(item=>{const b=document.createElement('button');b.type='button';b.style='display:block;width:100%;text-align:left;border:0;background:#fff;padding:10px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9';b.innerHTML='<strong>'+esc(item.label)+'</strong>';b.onmousedown=e=>{e.preventDefault();choose(item);};menu.appendChild(b);});menu.style.display='block';});
    input.addEventListener('focus',()=>{if(norm(input.value).length>=(kind==='TIPO_UNIDAD'?1:2))input.dispatchEvent(new Event('input'));});input.addEventListener('blur',()=>setTimeout(()=>{exactMatch();close();},80));
    if(form.dataset.ccGlobalAutocompleteValidation!=='1'){form.dataset.ccGlobalAutocompleteValidation='1';form.addEventListener('submit',e=>{const wraps=[...form.querySelectorAll('.cc-global-autocomplete-wrap')];for(const w of wraps){const inp=w.querySelector('input[data-cc-catalog-kind]');const sel=w.previousElementSibling;if(!(sel instanceof HTMLSelectElement))continue;w.__ccValidate?.();if(String(inp?.value||'').trim()&&!sel.value){e.preventDefault();e.stopImmediatePropagation();inp.focus();alert((inp.dataset.ccCatalogKind||'Valor')+' no válido. Debes seleccionar una opción existente del catálogo.');return;}if(sel.required&&!sel.value){e.preventDefault();e.stopImmediatePropagation();inp.focus();alert((inp.dataset.ccCatalogKind||'Valor')+' es obligatorio. Selecciona una opción existente del catálogo.');return;}}},true);}
  }
  function scan(root=document){const scope=root?.querySelectorAll?root:document;if(root instanceof HTMLSelectElement)enhance(root);scope.querySelectorAll?.('form select').forEach(enhance);}
  let queued=false;const observer=new MutationObserver(muts=>{if(queued||!muts.some(m=>m.addedNodes?.length))return;queued=true;requestAnimationFrame(()=>{queued=false;scan(document);});});observer.observe(document.body,{childList:true,subtree:true});scan(document);
})();
