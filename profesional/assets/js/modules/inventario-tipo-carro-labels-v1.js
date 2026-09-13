/* Tráfico App · Etiquetas semánticas para variante de CARRO */
(function(){
  if(window.__CC_TIPO_CARRO_LABELS_V1__)return;
  window.__CC_TIPO_CARRO_LABELS_V1__=true;
  function apply(){
    const nav=document.querySelector('[data-config-tipos-unidad-general]');
    if(nav){
      const span=nav.querySelector('span'); if(span)span.textContent='Tipos de unidad de carro';
      const small=nav.querySelector('small'); if(small)small.textContent='Variante para unidades CARRO';
    }
    const sec=document.getElementById('ccConfigTiposUnidadGeneral');
    if(sec){
      const strong=sec.querySelector('.cc-toolbar strong'); if(strong)strong.textContent='Tipos de unidad de carro';
      const note=sec.querySelector('.cc-toolbar .cc-note'); if(note)note.textContent='Catálogo de variantes para unidades cuyo Tipo de unidad principal es CARRO. Lo usan Inventario, Anticipos y Hojas de Servicio.';
      const name=sec.querySelector('input[name="nombre"]'); if(name)name.placeholder='Ej. ESTAQUITA / VAN, RABON, TONELADA, TRACTO-CAMION...';
    }
    document.querySelectorAll('#ccFormModal [data-cc-tipo-unidad-general],#ccEditUnitModal [data-cc-tipo-unidad-general]').forEach(field=>{
      const label=field.querySelector('label'); if(label)label.textContent='Tipo de unidad de carro';
      const note=field.querySelector('div'); if(note)note.textContent='Se muestra únicamente cuando el Tipo de unidad principal es CARRO.';
      const sel=field.querySelector('select'); if(sel&&sel.options?.[0])sel.options[0].textContent='Selecciona tipo de unidad de carro';
    });
    document.querySelectorAll('.cc-car-type-detail').forEach(x=>{
      x.textContent=x.textContent.replace(/^Tipo unidad:/i,'Tipo de unidad de carro:');
    });
  }
  document.addEventListener('DOMContentLoaded',apply);
  document.addEventListener('click',()=>setTimeout(apply,30),true);
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(apply,200);setTimeout(apply,900);
})();
