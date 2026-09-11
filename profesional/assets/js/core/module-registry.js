/* Tráfico App · Registro modular profesional */
(function(){
  const app=window.TraficApp=window.TraficApp||{};
  app.version='profesional-modular-v4';
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
})();
