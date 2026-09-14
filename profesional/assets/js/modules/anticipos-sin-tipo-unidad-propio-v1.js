/* Tráfico App · Anticipos · eliminar catálogo propio de tipo de unidad */
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

  function clean(){
    const root=document.getElementById('ccAntViewCatalogos');
    if(!root)return false;

    /* Quitar tarjetas antiguas del catálogo propio de Anticipos. */
    root.querySelectorAll('.cc-config-card,.cc-card,.cc-ant-card').forEach(card=>{
      const title=card.querySelector(':scope > h3,:scope > h4,.cc-toolbar strong,h3,h4');
      if(title&&isLegacyTypeText(title.textContent))card.remove();
    });

    /* Quitar botones del selector compacto si quedaron huérfanos. */
    root.querySelectorAll('#ccAntCatalogSelector button').forEach(btn=>{
      if(isLegacyTypeText(btn.textContent))btn.remove();
    });

    /* Quitar controles sueltos de ese catálogo, sin tocar Configuración por destino. */
    root.querySelectorAll('.cc-field').forEach(field=>{
      const label=field.querySelector(':scope > label');
      if(label&&isLegacyTypeText(label.textContent))field.remove();
    });

    return true;
  }

  let timer=null;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(clean,40);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{clean();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});},{once:true});
  else {clean();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
})();
