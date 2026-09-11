/* Tráfico App · Health check no invasivo */
(function(){
  const app=window.TraficApp=window.TraficApp||{};
  app.health=app.health||{};
  const contracts={
    inventario:['ccRenderInventario','ccEditarUnidadDirecto'],
    rentas:['ccRenderRenta','ccRenderHistorial'],
    mantenimiento:['ccRenderMantenimiento'],
    mapa:['ccCargarMapaUnidades'],
    configuracion:['ccRenderConfiguracion'],
    anticipos:['ccAntLoad'],
    auth:['ccPerm']
  };
  Object.entries(contracts).forEach(([name,required])=>app.requireGlobals?.(name,required));
  app.health.run=function(){
    const modules={};
    Object.keys(contracts).forEach(name=>modules[name]=app.checkContract?app.checkContract(name):{ok:false,missing:['registry']});
    const supabase={
      sdk:!!(window.supabase&&typeof window.supabase.createClient==='function'),
      client:!!window.gmSupabase,
      url:!!window.GM_SUPABASE_URL,
      key:!!window.GM_SUPABASE_ANON_KEY
    };
    const ok=Object.values(modules).every(x=>x.ok)&&supabase.sdk&&supabase.client&&supabase.url&&supabase.key;
    const result={ok,modules,supabase,build:app.version,checkedAt:new Date().toISOString()};
    app.health.last=result;
    document.documentElement.dataset.traficHealth=ok?'ok':'warning';
    if(!ok) console.warn('Tráfico App · Health check',result);
    else console.info('Tráfico App · Health check OK',result);
    return result;
  };
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>app.health.run(),0));
})();
