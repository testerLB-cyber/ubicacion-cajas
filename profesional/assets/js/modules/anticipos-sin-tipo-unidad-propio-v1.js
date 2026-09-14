/* Tráfico App · Anticipos · sin tipo propio + tipo automático desde unidad */
(function(){
  'use strict';
  if(window.__CC_ANT_SIN_TIPO_UNIDAD_PROPIO_V1__)return;
  window.__CC_ANT_SIN_TIPO_UNIDAD_PROPIO_V1__=true;

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const isLegacyTypeText=t=>{
    const s=norm(t);
    return (
      (s.includes('tipo')&&s.includes('unidad')&&s.includes('anticipo')) ||
      s==='tipos de viaje / anticipo' ||
      s==='tipo de viaje / anticipo'
    );
  };

  let destinationCache=null;
  async function destinationData(){
    if(destinationCache)return destinationCache;
    const s=window.gmSupabase;if(!s?.rpc)throw new Error('Supabase no está disponible.');
    const {data,error}=await s.rpc('cc_ant_destination_catalog');
    if(error)throw error;
    if(data?.ok===false)throw new Error(data.error||'No se pudo leer la configuración de Anticipos.');
    destinationCache=data||{};
    return destinationCache;
  }

  function replaceLegacyHelp(form){
    form.querySelectorAll('div,p,small,span').forEach(el=>{
      if(el.children.length)return;
      const t=norm(el.textContent);
      if(t.includes('selecciona destino')&&t.includes('tipo de unidad')&&t.includes('anticipo')){
        el.textContent='Selecciona destino y unidad. El tipo de unidad se obtiene automáticamente del catálogo principal.';
      }
    });
  }

  async function syncUnitType(form,unitSelect,typeSelect,note){
    typeSelect.value='';
    if(!unitSelect.value){
      note.textContent='Tipo de unidad: se tomará automáticamente de la unidad seleccionada.';
      typeSelect.dispatchEvent(new Event('change',{bubbles:true}));
      return false;
    }
    const D=await destinationData();
    const row=(D.unidadesTipoGeneral||[]).find(x=>String(x.id)===String(unitSelect.value));
    const tid=String(row?.tipoUnidadGeneralId||'');
    if(!tid){
      note.textContent='La unidad seleccionada no tiene Tipo de unidad configurado en el catálogo principal.';
      note.style.color='#b91c1c';
      typeSelect.dispatchEvent(new Event('change',{bubbles:true}));
      return false;
    }
    if(![...typeSelect.options].some(o=>String(o.value)===tid)){
      const op=document.createElement('option');
      op.value=tid;
      op.textContent=row?.tipoUnidadGeneralNombre||tid;
      typeSelect.appendChild(op);
    }
    typeSelect.value=tid;
    note.style.color='';
    note.textContent='Tipo de unidad: '+(row?.tipoUnidadGeneralNombre||'configurado')+' · automático';
    typeSelect.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function patchNewAdvanceForm(){
    const form=document.getElementById('ccAntForm');
    if(!form)return false;
    replaceLegacyHelp(form);

    const unitSelect=form.querySelector('select[name="unidadId"]');
    const typeSelect=form.querySelector('#antTipoUnidad,select[name="tipoUnidadAnticipoId"],select[name="tipoUnidadId"]');
    if(!unitSelect||!typeSelect)return false;

    const typeField=typeSelect.closest('.cc-field');
    if(typeField)typeField.style.setProperty('display','none','important');
    typeSelect.required=false;
    typeSelect.setAttribute('aria-hidden','true');

    if(form.dataset.ccAutoMainUnitType==='1')return true;
    form.dataset.ccAutoMainUnitType='1';

    let note=form.querySelector('[data-ant-main-unit-type-note]');
    if(!note){
      note=document.createElement('div');
      note.dataset.antMainUnitTypeNote='1';
      note.className='cc-note';
      note.style.marginTop='5px';
      note.textContent='Tipo de unidad: se tomará automáticamente de la unidad seleccionada.';
      unitSelect.closest('.cc-field')?.appendChild(note);
    }

    const sync=()=>syncUnitType(form,unitSelect,typeSelect,note).catch(err=>{
      note.style.color='#b91c1c';
      note.textContent='No se pudo obtener el tipo de la unidad: '+(err?.message||err);
      return false;
    });

    unitSelect.addEventListener('change',sync);
    form.addEventListener('submit',async e=>{
      const ok=await sync();
      if(!ok){
        e.preventDefault();
        e.stopImmediatePropagation();
        alert('La unidad seleccionada debe tener un Tipo de unidad activo configurado en el catálogo principal.');
      }
    },true);
    sync();
    return true;
  }

  function cleanCatalog(){
    const root=document.getElementById('ccAntViewCatalogos');
    if(!root)return false;

    root.querySelectorAll('.cc-config-card,.cc-card,.cc-ant-card').forEach(card=>{
      const title=card.querySelector(':scope > h3,:scope > h4,.cc-toolbar strong,h3,h4');
      if(title&&isLegacyTypeText(title.textContent))card.remove();
    });

    root.querySelectorAll('#ccAntCatalogSelector button').forEach(btn=>{
      if(isLegacyTypeText(btn.textContent))btn.remove();
    });

    root.querySelectorAll('.cc-field').forEach(field=>{
      const label=field.querySelector(':scope > label');
      if(label&&isLegacyTypeText(label.textContent))field.remove();
    });
    return true;
  }

  function clean(){
    cleanCatalog();
    patchNewAdvanceForm();
  }

  let timer=null;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(clean,40);};
  const install=()=>{clean();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
