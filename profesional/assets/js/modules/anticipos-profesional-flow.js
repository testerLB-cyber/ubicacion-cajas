/* Tráfico App Profesional · Flujo simplificado de cierre de anticipos */
(function(){
  function ocultarPendientesConfirmar(){
    const btn=document.querySelector('.cc-ant-nav [data-antv="confirmar"]');
    if(btn) btn.style.display='none';
    const view=document.getElementById('ccAntViewConfirmar');
    if(view) view.style.display='none';
  }
  function tieneComprobacion(a){
    return !!a && (String(a.estatus||'').toUpperCase()==='PENDIENTE_CONFIRMAR' || Number(a.comprobado||0)>0);
  }
  function mejorarListado(){
    ocultarPendientesConfirmar();
    const body=document.getElementById('ccAntBody');
    const rows=Array.from(body?.querySelectorAll('tr')||[]);
    const data=Array.isArray(window.ccAntFiltered)?window.ccAntFiltered:[];
    rows.forEach((tr,i)=>{
      const a=data[i];
      if(!a || !tieneComprobacion(a) || ['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())) return;
      tr.style.background='#fef3c7';
      tr.style.boxShadow='inset 4px 0 0 #f59e0b';
      tr.dataset.comprobacionLista='1';
      const actions=tr.lastElementChild?.querySelector('div') || tr.lastElementChild;
      if(!actions || actions.querySelector('[data-ant-close-main]')) return;
      const b=document.createElement('button');
      b.type='button';
      b.className='cc-btn cc-btn-primary';
      b.dataset.antCloseMain=a.id;
      b.innerHTML='<i class="fa-solid fa-circle-check mr-1"></i>Cerrar anticipo';
      b.title='Finalizar este anticipo usando sus comprobaciones registradas';
      b.addEventListener('click',function(ev){
        ev.preventDefault();ev.stopPropagation();
        if(typeof window.ccAntCerrar==='function') window.ccAntCerrar(a.id);
      });
      actions.appendChild(b);
    });
  }
  function instalar(){
    ocultarPendientesConfirmar();
    if(typeof window.ccAntRender!=='function') return;
    if(window.ccAntRender.__profCierreEnListado) return;
    const original=window.ccAntRender;
    const wrapped=function(){
      const r=original.apply(this,arguments);
      mejorarListado();
      return r;
    };
    wrapped.__profCierreEnListado=true;
    window.ccAntRender=wrapped;
    mejorarListado();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(instalar,0));
  else setTimeout(instalar,0);
})();
