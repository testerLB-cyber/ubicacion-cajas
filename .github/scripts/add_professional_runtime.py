from pathlib import Path
import json

ROOT=Path('.')
OUT=ROOT/'profesional'
JS=OUT/'assets'/'js'
INDEX=OUT/'index.html'

if not INDEX.exists():
    raise SystemExit('No existe profesional/index.html; ejecutar build_professional.py primero')

registry = r'''/* Tráfico App · Registro modular profesional */
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
'''

health = r'''/* Tráfico App · Health check no invasivo */
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
'''

anticipos_flow = r'''/* Tráfico App Profesional · Flujo simplificado de cierre de anticipos */
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
'''

contracts = {
  'inventario': {'globals':['ccRenderInventario','ccEditarUnidadDirecto'],'owner':'assets/js/modules/inventario.js'},
  'rentas': {'globals':['ccRenderRenta','ccRenderHistorial'],'owner':'assets/js/modules/rentas.js'},
  'mantenimiento': {'globals':['ccRenderMantenimiento'],'owner':'assets/js/modules/mantenimiento-dot.js'},
  'mapa': {'globals':['ccCargarMapaUnidades'],'owner':'assets/js/modules/mapa.js'},
  'configuracion': {'globals':['ccRenderConfiguracion'],'owner':'assets/js/modules/configuracion.js'},
  'anticipos': {'globals':['ccAntLoad'],'owner':'assets/js/modules/anticipos.js'},
  'auth': {'globals':['ccPerm'],'owner':'assets/js/security/auth-permissions.js'}
}

(JS/'core').mkdir(parents=True,exist_ok=True)
(JS/'core'/'module-registry.js').write_text(registry,encoding='utf-8')
(JS/'core'/'health-check.js').write_text(health,encoding='utf-8')
(JS/'modules').mkdir(parents=True,exist_ok=True)
(JS/'modules'/'anticipos-profesional-flow.js').write_text(anticipos_flow,encoding='utf-8')
(OUT/'module-contracts.json').write_text(json.dumps(contracts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

html=INDEX.read_text(encoding='utf-8')
registry_tag='<script src="assets/js/core/module-registry.js"></script>'
health_tag='<script src="assets/js/core/health-check.js"></script>'
anticipos_flow_tag='<script src="assets/js/modules/anticipos-profesional-flow.js"></script>'

# Registro antes de las fachadas; override de Anticipos justo después del módulo original.
needle='<script src="assets/js/modules/inventario.js"></script>'
if registry_tag not in html:
    if needle not in html: raise SystemExit('No se encontró fachada Inventario para insertar registro modular')
    html=html.replace(needle,registry_tag+'\n'+needle,1)
anticipos_tag='<script src="assets/js/modules/anticipos.js"></script>'
if anticipos_flow_tag not in html:
    if anticipos_tag not in html: raise SystemExit('No se encontró anticipos.js para insertar flujo profesional')
    html=html.replace(anticipos_tag,anticipos_tag+'\n'+anticipos_flow_tag,1)
if health_tag not in html:
    pos=html.lower().rfind('</body>')
    if pos<0: raise SystemExit('No se encontró </body>')
    html=html[:pos]+health_tag+'\n'+html[pos:]
html=html.replace('profesional-modular-v3','profesional-modular-v4')
INDEX.write_text(html,encoding='utf-8')

# Validaciones estructurales: no se publica si falta un contrato o archivo.
for name,contract in contracts.items():
    owner=OUT/contract['owner']
    if not owner.exists(): raise SystemExit(f'Owner de módulo faltante: {name} -> {owner}')
for rel in ['assets/js/core/module-registry.js','assets/js/core/health-check.js','assets/js/modules/anticipos-profesional-flow.js','module-contracts.json']:
    if not (OUT/rel).exists(): raise SystemExit('Runtime faltante: '+rel)
if registry_tag not in html or health_tag not in html or anticipos_flow_tag not in html:
    raise SystemExit('Runtime modular no quedó cargado en index.html')
print('Runtime modular v4 listo: registro, contratos, health check y flujo profesional de anticipos')
