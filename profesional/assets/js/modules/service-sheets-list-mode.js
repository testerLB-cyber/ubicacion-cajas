/* Tráfico App Profesional · Hojas de Servicio · Comprobación modo lista */
(function(){
  'use strict';
  if(window.__HS_LIST_MODE__) return;
  window.__HS_LIST_MODE__=true;

  const text=v=>String(v??'').trim();
  const val=(row,s)=>text(row.querySelector(s)?.value);
  const selectedText=(row,s)=>text(row.querySelector(s)?.selectedOptions?.[0]?.textContent)||val(row,s)||'—';

  function ensureStyles(){
    if(document.getElementById('hs-list-mode-style')) return;
    const st=document.createElement('style');
    st.id='hs-list-mode-style';
    st.textContent=`
      #hs104CompList .hs-list-row{padding:10px 12px!important;border-radius:10px!important;margin:0 0 7px!important;box-shadow:none!important;border:1px solid #e2e8f0!important;background:#fff!important}
      #hs104CompList .hs-list-row>.cc-toolbar{margin:0!important;min-height:auto!important;align-items:center!important}
      #hs104CompList .hs-list-row .hs-list-summary{display:grid;grid-template-columns:minmax(105px,.8fr) minmax(160px,1.3fr) minmax(120px,1fr) minmax(120px,1fr) minmax(110px,.8fr);gap:10px;align-items:center;flex:1;min-width:0}
      #hs104CompList .hs-list-row .hs-list-cell{min-width:0}
      #hs104CompList .hs-list-row .hs-list-cell small{display:block;font-size:8px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1px}
      #hs104CompList .hs-list-row .hs-list-cell strong{display:block;font-size:11px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #hs104CompList .hs-list-row .hs-list-edit-area{display:none;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0}
      #hs104CompList .hs-list-row.hs-list-editing .hs-list-edit-area{display:block}
      #hs104CompList .hs-list-row .hs104-actions{margin:0!important;justify-content:flex-end!important;align-items:center!important;flex-wrap:nowrap!important}
      #hs104CompList .hs-list-row .hs104-actions .cc-btn{white-space:nowrap;font-size:9px!important;padding:6px 9px!important;min-height:28px!important}
      #hs104CompList .hs-list-row .hs104-note[data-hs-mobile-note]{margin-top:8px!important}
      #hs104CompList [data-show-all="1"]>.hs104-card{padding:8px!important;margin-bottom:10px}
      @media(max-width:900px){
        #hs104CompList .hs-list-row .hs-list-summary{grid-template-columns:1fr 1.5fr 1fr;gap:7px}
        #hs104CompList .hs-list-row .hs104-actions{flex-wrap:wrap!important}
      }
      @media(max-width:640px){
        #hs104CompList .hs-list-row .cc-toolbar{align-items:flex-start!important;flex-direction:column!important}
        #hs104CompList .hs-list-row .hs-list-summary{grid-template-columns:1fr 1fr;width:100%}
        #hs104CompList .hs-list-row .hs104-actions{width:100%;justify-content:flex-start!important}
      }
    `;
    document.head.appendChild(st);
  }

  function updateSummary(row){
    const summary=row.querySelector('.hs-list-summary');
    if(!summary) return;
    const originalTitle=row.dataset.hsFolio||text(row.querySelector('[data-hs-original-title]')?.textContent)||'—';
    const cliente=selectedText(row,'[data-cliente]');
    const tipo=selectedText(row,'[data-tipo]');
    const clas=selectedText(row,'[data-clas]');
    const fecha=val(row,'[data-fecha]')||'—';
    const person=row.dataset.hsPerson||row.closest('[data-hs-person-group]')?.dataset.hsPersonGroup||'—';
    summary.innerHTML=
      '<div class="hs-list-cell"><small>Folio</small><strong>'+originalTitle+'</strong></div>'+ 
      '<div class="hs-list-cell"><small>Persona</small><strong>'+person+'</strong></div>'+ 
      '<div class="hs-list-cell"><small>Cliente</small><strong>'+cliente+'</strong></div>'+ 
      '<div class="hs-list-cell"><small>Tipo / clasificación</small><strong>'+tipo+' · '+clas+'</strong></div>'+ 
      '<div class="hs-list-cell"><small>Fecha uso</small><strong>'+fecha+'</strong></div>';
  }

  function syncPhotoAction(row){
    if(!row) return;
    const actions=row.querySelector(':scope > .hs104-actions');
    if(!actions) return;
    const source=row.querySelector('[data-mobile-photo]');
    let listBtn=actions.querySelector('[data-hs-list-photo]');
    if(!source){
      if(listBtn) listBtn.remove();
      return;
    }
    if(!listBtn){
      listBtn=document.createElement('button');
      listBtn.type='button';
      listBtn.className='cc-btn cc-btn-light';
      listBtn.dataset.hsListPhoto='1';
      listBtn.innerHTML='<i class="fa-solid fa-camera"></i> Ver foto';
      const edit=actions.querySelector('[data-hs-edit]');
      if(edit) edit.after(listBtn); else actions.insertBefore(listBtn,actions.firstChild);
      listBtn.addEventListener('click',()=>source.click());
    }
    source.style.display='none';
  }

  function patchRow(row){
    if(!row) return;
    if(row.dataset.hsListMode==='1') { updateSummary(row); syncPhotoAction(row); return; }
    const toolbar=row.querySelector(':scope > .cc-toolbar');
    const grid=row.querySelector(':scope > .hs104-grid');
    const obsField=row.querySelector(':scope > .cc-field');
    const actions=row.querySelector(':scope > .hs104-actions');
    if(!toolbar||!grid||!actions) return;

    const title=toolbar.querySelector('strong');
    row.dataset.hsFolio=text(title?.textContent)||row.dataset.row||'—';
    const groupTitle=row.parentElement?.previousElementSibling?.textContent||row.closest('.hs104-card')?.querySelector(':scope > div:first-child')?.textContent||'';
    row.dataset.hsPerson=text(groupTitle).replace(/\s*·\s*\d+\s*pendiente\(s\).*/i,'').replace(/^\s*/,'')||'—';

    row.classList.add('hs-list-row');
    row.dataset.hsListMode='1';
    if(title) title.setAttribute('data-hs-original-title','1');

    const summary=document.createElement('div');
    summary.className='hs-list-summary';
    toolbar.insertBefore(summary,toolbar.firstChild);
    const oldInfo=toolbar.querySelector('div:not(.hs-list-summary)');
    if(oldInfo) oldInfo.style.display='none';

    const editArea=document.createElement('div');
    editArea.className='hs-list-edit-area';
    grid.parentNode.insertBefore(editArea,grid);
    editArea.appendChild(grid);
    if(obsField&&obsField!==actions) editArea.appendChild(obsField);

    const edit=document.createElement('button');
    edit.type='button';
    edit.className='cc-btn cc-btn-light';
    edit.dataset.hsEdit='1';
    edit.innerHTML='<i class="fa-solid fa-pen"></i> Editar';
    actions.insertBefore(edit,actions.firstChild);

    const save=actions.querySelector('[data-save]');
    const ret=actions.querySelector('[data-return]');
    if(save){save.innerHTML='<i class="fa-solid fa-circle-check"></i> Comprobar';}
    if(ret){ret.innerHTML='<i class="fa-solid fa-rotate-left"></i> Regresar';}

    edit.onclick=()=>{
      const open=row.classList.toggle('hs-list-editing');
      edit.innerHTML=open?'<i class="fa-solid fa-xmark"></i> Cerrar':'<i class="fa-solid fa-pen"></i> Editar';
      updateSummary(row);
    };
    row.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('change',()=>updateSummary(row)));
    updateSummary(row);
    syncPhotoAction(row);
  }

  function markGroups(){
    const root=document.getElementById('hs104CompList');
    if(!root) return;
    root.querySelectorAll('[data-show-all="1"] > .hs104-card').forEach(group=>{
      if(group.dataset.hsPersonGroup) return;
      const first=group.querySelector(':scope > div:first-child');
      const label=text(first?.textContent).replace(/\s*·\s*\d+\s*pendiente\(s\).*/i,'');
      group.dataset.hsPersonGroup=label||'—';
      group.querySelectorAll('[data-row]').forEach(row=>row.dataset.hsPerson=label||row.dataset.hsPerson||'—');
    });
  }

  function patch(){
    ensureStyles();
    const root=document.getElementById('hs104CompList');
    if(!root) return;
    markGroups();
    root.querySelectorAll('[data-row]').forEach(patchRow);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-v="Comprobacion"]')||e.target.closest?.('#hs104CompShowAll')) setTimeout(patch,180);
  },true);
  document.addEventListener('change',e=>{
    if(['hs104CompPerson','hs104CompType','hs104CompShowAll'].includes(e.target?.id)) setTimeout(patch,180);
  },true);
  window.hsApplyListMode=patch;
  setInterval(()=>{if(document.getElementById('hs104CompList'))patch();},900);
})();
