/* Tráfico App · Registro modular profesional */
(function(){
  const app=window.TraficApp=window.TraficApp||{};
  app.version='profesional-modular-v5';
  app.modules=app.modules||{};
  app.contracts=app.contracts||{};
  app.register=function(name,descriptor){
    if(!name) throw new Error('Módulo sin nombre');
    app.modules[name]=Object.assign({name,status:'registered'},descriptor||{});
    return app.modules[name];
  };
  app.requireGlobals=function(name,globals){
    app.contracts[name]=Array.isArray(globals)?globals.slice():[];
    return app.contracts[name];
  };
  app.checkContract=function(name){
    const required=app.contracts[name]||[];
    const missing=required.filter(key=>typeof window[key]==='undefined');
    return {ok:missing.length===0,missing};
  };

  /* Log de actividad */
  if(!document.querySelector('script[data-cc-activity-log]')){
    const s=document.createElement('script');
    s.src='assets/js/modules/activity-log.js?v=20260913-1';
    s.defer=true;
    s.setAttribute('data-cc-activity-log','1');
    document.head.appendChild(s);
  }

  /* Tipo base CAJA/CARRO separado del tipo específico (TRACTO, RABON, etc.). */
  if(!document.querySelector('script[data-cc-unit-type-canonical]')){
    const s=document.createElement('script');
    s.src='assets/js/modules/inventario-tipo-unidad-general.js?v=20260914-safe-1';
    s.defer=true;
    s.setAttribute('data-cc-unit-type-canonical','1');
    document.head.appendChild(s);
  }

  /* Tarifas de comisiones + liquidaciones de Hojas de Servicio. */
  if(!document.querySelector('script[data-cc-commissions]') && !document.querySelector('script[data-cc-commissions-direct]')){
    const s=document.createElement('script');
    s.src='assets/js/modules/commissions-liquidations.js?v=20260914-safe-1';
    s.defer=true;
    s.setAttribute('data-cc-commissions','1');
    document.head.appendChild(s);
  }
})();
