/* Tráfico App · Rentas · estabilidad de tipo comercial y proforma v1 */
(function(){
  'use strict';
  if(window.__CC_RENTA_COBRO_ESTABILIDAD_V1__)return;
  window.__CC_RENTA_COBRO_ESTABILIDAD_V1__=true;

  function updateProformaCopy(){
    const body=document.getElementById('ccProformaBody');
    const card=body?.closest('.cc-proforma-card');
    const note=card?.querySelector('.cc-note');
    if(note)note.textContent='El cálculo usa Cliente + Tipo de cobro de caja + Periodo. Puedes modificar la tarifa o el importe de cada renta antes de cerrar la proforma.';
    const th=body?.closest('table')?.querySelector('thead th:nth-child(4)');
    if(th)th.textContent='TIPO DE COBRO';
  }

  function stabilizeRentForm(){
    const f=document.querySelector('#ccFormModal #ccForm');
    const sel=f?.querySelector('[name="tipoCobroCajaId"]');
    if(!f||!sel)return;
    if(!sel.dataset.stableValueBound){
      sel.dataset.stableValueBound='1';
      sel.addEventListener('change',()=>{sel.dataset.stableValue=sel.value||'';});
      if(sel.value)sel.dataset.stableValue=sel.value;
    }
    const wanted=sel.dataset.stableValue||sel.value||'';
    if(wanted&&[...sel.options].some(o=>o.value===wanted)&&sel.value!==wanted)sel.value=wanted;
  }

  function install(){
    updateProformaCopy();
    stabilizeRentForm();
    /* El módulo comercial ya actualiza tarifa mediante listeners propios.
       Evitamos que el onchange heredado vuelva a reconstruir el selector y borre la selección. */
    if(window.__CC_RENTA_COBRO_COMERCIAL_V3__){
      window.ccActualizarTarifaRenta=function(){stabilizeRentForm();};
    }
  }

  const t=setInterval(()=>{
    if(window.CC_AUTH_READY&&window.__CC_RENTA_COBRO_COMERCIAL_V3__){clearInterval(t);install();}
  },200);
  document.addEventListener('click',()=>setTimeout(install,0),true);
})();