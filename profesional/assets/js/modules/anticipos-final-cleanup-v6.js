/* Tráfico App · Anticipos · limpieza final v7 */
(function(){
  'use strict';
  if(window.__ANT_FINAL_CLEANUP_V7__) return;
  window.__ANT_FINAL_CLEANUP_V7__=true;

  function cleanup(){
    document.querySelectorAll('[data-aa="links"]').forEach(el=>el.remove());
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^Enlaces$/i.test(t)||/\bQR\b|c[oó]digo\s*qr|comprobar\s*por\s*qr/i.test(t)) el.remove();
    });

    // Tipos de unidad de Anticipos ya no se administran aquí.
    // Se muestran desde Configuración > Tipos de unidad, únicamente categoría CARRO.
    const list=document.getElementById('ccAntCatTiposAnticipo');
    const card=list?.closest('.cc-config-card');
    if(card){
      const title=card.querySelector('.cc-toolbar strong');
      if(title&&title.textContent!=='Tipos de unidad (desde Configuración · CARRO)') title.textContent='Tipos de unidad (desde Configuración · CARRO)';
      const add=card.querySelector('button[onclick*="TIPO_UNIDAD_ANTICIPO"]');
      if(add) add.remove();
      let note=card.querySelector('[data-ant-unit-source-note]');
      if(!note){
        note=document.createElement('div');
        note.dataset.antUnitSourceNote='1';
        note.className='cc-note';
        note.style.marginTop='6px';
        note.textContent='Este listado se alimenta automáticamente de Configuración > Tipos de unidad y solo muestra tipos clasificados como CARRO.';
        card.querySelector('.cc-toolbar')?.insertAdjacentElement('afterend',note);
      }
    }
  }

  const oldCatalogForm=window.ccAntCatalogoForm;
  if(typeof oldCatalogForm==='function'){
    window.ccAntCatalogoForm=function(t){
      if(t==='TIPO_UNIDAD_ANTICIPO'){
        alert('Los tipos de unidad para Anticipos se administran en Configuración > Tipos de unidad. Solo se usan los clasificados como CARRO.');
        return;
      }
      return oldCatalogForm.apply(this,arguments);
    };
  }

  const mo=new MutationObserver(cleanup);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(cleanup,1200);
  setTimeout(cleanup,100);
})();
