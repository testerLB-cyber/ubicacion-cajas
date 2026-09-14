/* Tráfico App · Registro modular profesional · arranque seguro */
(function(){
  'use strict';
  const app=window.TraficApp=window.TraficApp||{};
  app.version='profesional-modular-v17-rentas-cobro-comercial-proforma';
  app.modules=app.modules||{};
  app.contracts=app.contracts||{};
  app.register=function(name,descriptor){if(!name)throw new Error('Módulo sin nombre');app.modules[name]=Object.assign({name,status:'registered'},descriptor||{});return app.modules[name];};
  app.requireGlobals=function(name,globals){app.contracts[name]=Array.isArray(globals)?globals.slice():[];return app.contracts[name];};
  app.checkContract=function(name){const required=app.contracts[name]||[];const missing=required.filter(key=>typeof window[key]==='undefined');return {ok:missing.length===0,missing};};
  let loaded=false;
  function addScript(src,attr){if(document.querySelector('script['+attr+']'))return;const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(attr,'1');s.onerror=()=>console.error('No se pudo cargar módulo opcional:',src);document.head.appendChild(s);}
  function loadOptionalModules(){if(loaded||!window.CC_AUTH_READY||!window.gmSupabase)return false;loaded=true;addScript('assets/js/modules/activity-log.js?v=20260914-safe-2','data-cc-activity-log');addScript('assets/js/modules/inventario-tipo-unidad-general.js?v=20260914-inventory-final-3','data-cc-unit-type-canonical');addScript('assets/js/modules/inventario-estabilidad-tabla.js?v=20260914-table-stable-1','data-cc-inventory-table-stability');addScript('assets/js/modules/renta-tarifas-tipo-v1.js?v=20260914-rent-commercial-proforma-3','data-cc-rent-type-rates');if(!document.querySelector('script[data-cc-commissions-direct]'))addScript('assets/js/modules/commissions-liquidations.js?v=20260914-safe-2','data-cc-commissions');return true;}
  app.loadOptionalModules=loadOptionalModules;
  const timer=setInterval(()=>{if(loadOptionalModules())clearInterval(timer);},350);
  setTimeout(()=>{if(!loaded&&!window.CC_AUTH_READY)console.info('Módulos opcionales esperando autenticación.');},2500);
})();