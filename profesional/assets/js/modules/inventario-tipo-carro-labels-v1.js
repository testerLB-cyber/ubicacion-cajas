/* Tráfico App · Etiquetas CARRO · hotfix estable · 2026-09-13 */
(function(){
  if(window.__CC_TIPO_CARRO_LABELS_V2__) return;
  window.__CC_TIPO_CARRO_LABELS_V2__ = true;

  function setText(el,text){
    if(el && el.textContent !== text) el.textContent = text;
  }

  function apply(){
    const nav=document.querySelector('[data-config-tipos-unidad-general]');
    if(nav){
      setText(nav.querySelector('span'),'Tipos de unidad de carro');
      setText(nav.querySelector('small'),'Variante para unidades CARRO');
    }
    const sec=document.getElementById('ccConfigTiposUnidadGeneral');
    if(sec){
      setText(sec.querySelector('.cc-toolbar strong'),'Tipos de unidad de carro');
      setText(sec.querySelector('.cc-toolbar .cc-note'),'Catálogo de variantes para unidades cuyo Tipo de unidad principal es CARRO. Lo usan Inventario, Anticipos y Hojas de Servicio.');
      const name=sec.querySelector('input[name="nombre"]');
      if(name && name.placeholder!=='Ej. ESTAQUITA / VAN, RABON, TONELADA, TRACTO-CAMION...') name.placeholder='Ej. ESTAQUITA / VAN, RABON, TONELADA, TRACTO-CAMION...';
    }
    document.querySelectorAll('#ccFormModal [data-cc-tipo-unidad-general],#ccEditUnitModal [data-cc-tipo-unidad-general]').forEach(field=>{
      setText(field.querySelector('label'),'Tipo de unidad de carro');
      const note=field.querySelector('div');
      setText(note,'Se muestra únicamente cuando el Tipo de unidad principal es CARRO.');
      const sel=field.querySelector('select');
      if(sel&&sel.options?.[0]&&sel.options[0].textContent!=='Selecciona tipo de unidad de carro') sel.options[0].textContent='Selecciona tipo de unidad de carro';
    });
    document.querySelectorAll('.cc-car-type-detail').forEach(x=>{
      const next=x.textContent.replace(/^Tipo unidad:/i,'Tipo de unidad de carro:');
      if(x.textContent!==next) x.textContent=next;
    });
  }

  document.addEventListener('DOMContentLoaded',apply);
  document.addEventListener('click',()=>setTimeout(apply,40),true);
  setTimeout(apply,200);
  setTimeout(apply,900);
})();
