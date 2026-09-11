/* Tráfico App · Fachada modular segura · Configuración */
(function(){
  const root=window.TraficApp=window.TraficApp||{};
  root.modules=root.modules||{};
  root.modules.configuracion={
    name:'configuracion',
    open(){
      const btn=[...document.querySelectorAll('#controlCajasSection .cc-tab')].find(x=>(x.getAttribute('onclick')||'').includes("ccTab('configuracion'"));
      if(btn&&typeof window.ccTab==='function') return window.ccTab('configuracion',btn);
    },
    render(){if(typeof window.ccRenderConfiguracion==='function') return window.ccRenderConfiguracion();}
  };
})();
