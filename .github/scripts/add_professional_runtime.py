from pathlib import Path
import json
import re

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

anticipos_flow = r'''/* Tráfico App Profesional · Flujo simplificado de cierre y comprobantes de anticipos */
(function(){
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  const sb=()=>window.gmSupabase;

  function ocultarPendientesConfirmar(){
    const btn=document.querySelector('.cc-ant-nav [data-antv="confirmar"]');
    if(btn) btn.style.display='none';
    const view=document.getElementById('ccAntViewConfirmar');
    if(view) view.style.display='none';
  }

  function tieneComprobacion(a){
    return !!a && (String(a.estatus||'').toUpperCase()==='PENDIENTE_CONFIRMAR' || Number(a.comprobado||0)>0);
  }

  async function cargarDatos(){
    const r=await sb().rpc('cc_ant_list');
    if(r&&r.error) throw r.error;
    if(!r?.data?.ok) throw new Error(r?.data?.error||'No se pudieron cargar comprobantes');
    return r.data;
  }

  function cerrarModal(id){document.getElementById(id)?.remove()}

  async function editarComprobante(a,c){
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){
      alert('El anticipo debe estar abierto para editar comprobantes.');return;
    }
    cerrarModal('ccProfCompEdit');
    const ov=document.createElement('div');ov.id='ccProfCompEdit';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:100003;display:flex;align-items:center;justify-content:center;padding:18px';
    const fecha=String(c.fecha||'').slice(0,10);
    ov.innerHTML='<div style="background:#fff;width:min(650px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><strong>Editar comprobante</strong><button id="ccProfCompEditX" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form id="ccProfCompEditForm" style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="'+esc(fecha)+'"></div><div class="cc-field"><label>Concepto *</label><input name="concepto" required value="'+esc(c.concepto||'')+'"></div><div class="cc-field"><label>Tipo documento</label><input name="tipoDocumento" value="'+esc(c.tipo_documento||'')+'"></div><div class="cc-field"><label>Folio documento</label><input name="folioDocumento" value="'+esc(c.folio_documento||'')+'"></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required value="'+Number(c.monto||0)+'"></div><div class="cc-field"><label>URL evidencia</label><input name="evidenciaUrl" value="'+esc(c.evidencia_url||'')+'"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="observaciones">'+esc(c.observaciones||'')+'</textarea></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" id="ccProfCompEditCancel">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();ov.querySelector('#ccProfCompEditX').onclick=close;ov.querySelector('#ccProfCompEditCancel').onclick=close;
    ov.querySelector('#ccProfCompEditForm').onsubmit=async ev=>{
      ev.preventDefault();const fd=new FormData(ev.currentTarget);const btn=ev.currentTarget.querySelector('button[type=submit]');btn.disabled=true;
      try{
        const item={id:c.id,fecha:new Date(String(fd.get('fecha'))+'T12:00:00').toISOString(),concepto:String(fd.get('concepto')||''),tipoDocumento:String(fd.get('tipoDocumento')||''),folioDocumento:String(fd.get('folioDocumento')||''),monto:Number(fd.get('monto')||0),evidenciaUrl:String(fd.get('evidenciaUrl')||''),observaciones:String(fd.get('observaciones')||'')};
        const r=await sb().rpc('cc_ant_update_comprobacion',{p_item:item});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo actualizar');
        close();await window.ccAntLoad?.(true);await verComprobantes(a.id);
      }catch(e){alert(e.message||e);btn.disabled=false}
    };
  }

  async function eliminarComprobante(a,c){
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){alert('El anticipo debe estar abierto para eliminar comprobantes.');return}
    if(!confirm('¿Eliminar este comprobante de '+money(c.monto)+'? El registro se conservará en historial como cancelado.'))return;
    const motivo=prompt('Motivo de eliminación:','Corrección de comprobante')||'Corrección de comprobante';
    try{
      const r=await sb().rpc('cc_ant_delete_comprobacion',{p_id:c.id,p_motivo:motivo});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo eliminar');
      await window.ccAntLoad?.(true);await verComprobantes(a.id);
    }catch(e){alert(e.message||e)}
  }

  async function verComprobantes(anticipoId){
    try{
      const d=await cargarDatos();
      const a=(d.anticipos||[]).find(x=>x.id===anticipoId);if(!a)throw new Error('Anticipo no encontrado');
      const comps=(d.comprobaciones||[]).filter(x=>x.anticipo_id===anticipoId&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
      cerrarModal('ccProfCompModal');
      const ov=document.createElement('div');ov.id='ccProfCompModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:100002;display:flex;align-items:center;justify-content:center;padding:18px';
      const editable=!['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase()) && (typeof window.ccPerm!=='function'||window.ccPerm('anticipos.editar'));
      const rows=comps.length?comps.map(c=>'<tr><td>'+date(c.fecha)+'</td><td><strong>'+esc(c.concepto||'Comprobante')+'</strong><div style="font-size:9px;color:#64748b">'+esc(c.observaciones||'')+'</div></td><td>'+esc(c.tipo_documento||'—')+'</td><td>'+esc(c.folio_documento||'—')+'</td><td><strong>'+money(c.monto)+'</strong></td><td>'+(c.evidencia_url?'<a href="'+esc(c.evidencia_url)+'" target="_blank" rel="noopener" class="cc-btn cc-btn-light">Ver archivo</a>':'—')+'</td><td>'+(editable?'<button class="cc-btn cc-btn-light" data-prof-comp-edit="'+esc(c.id)+'"><i class="fa-solid fa-pen mr-1"></i>Editar</button> <button class="cc-btn cc-btn-danger" data-prof-comp-del="'+esc(c.id)+'"><i class="fa-solid fa-trash mr-1"></i>Eliminar</button>':'Solo lectura')+'</td></tr>').join(''):'<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8">No hay comprobantes activos.</td></tr>';
      ov.innerHTML='<div style="background:#fff;width:min(1050px,97vw);max-height:92vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><div><strong>Comprobantes · '+esc(a.folio||'')+'</strong><div style="font-size:10px;color:#ddd6fe">'+esc(a.operador||'')+' · '+esc(a.destino||'')+'</div></div><button id="ccProfCompX" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><div style="padding:18px"><div class="cc-config-alert" style="margin-bottom:12px"><strong>Entregado:</strong> '+money(a.montoEntregado||0)+' · <strong>Comprobado:</strong> '+money(a.comprobado||0)+' · <strong>Pendiente:</strong> '+money(a.pendiente||0)+(editable?'':'<br><span style="color:#92400e">Anticipo cerrado/cancelado: comprobantes en modo solo lectura.</span>')+'</div><div class="cc-inv-wrap" style="max-height:58vh;overflow:auto"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>CONCEPTO</th><th>TIPO</th><th>FOLIO</th><th>MONTO</th><th>EVIDENCIA</th><th>ACCIONES</th></tr></thead><tbody>'+rows+'</tbody></table></div><div style="text-align:right;margin-top:14px"><button class="cc-btn cc-btn-primary" id="ccProfCompClose">Cerrar</button></div></div></div>';
      document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('#ccProfCompX').onclick=close;ov.querySelector('#ccProfCompClose').onclick=close;
      ov.onclick=ev=>{const eb=ev.target.closest('[data-prof-comp-edit]'),db=ev.target.closest('[data-prof-comp-del]');if(eb){const c=comps.find(x=>x.id===eb.dataset.profCompEdit);if(c)editarComprobante(a,c)}if(db){const c=comps.find(x=>x.id===db.dataset.profCompDel);if(c)eliminarComprobante(a,c)}};
    }catch(e){alert(e.message||e)}
  }
  window.ccProfVerComprobantes=verComprobantes;

  function mejorarListado(){
    ocultarPendientesConfirmar();
    const body=document.getElementById('ccAntBody');
    const rows=Array.from(body?.querySelectorAll('tr')||[]);
    const data=Array.isArray(window.ccAntFiltered)?window.ccAntFiltered:[];
    rows.forEach((tr,i)=>{
      const a=data[i];if(!a||!tieneComprobacion(a))return;
      const estado=String(a.estatus||'').toUpperCase();
      if(!['CERRADO','CANCELADO'].includes(estado)){
        tr.style.background='#fef3c7';tr.style.boxShadow='inset 4px 0 0 #f59e0b';tr.dataset.comprobacionLista='1';
      }
      const actions=tr.lastElementChild?.querySelector('div')||tr.lastElementChild;if(!actions)return;
      if(!actions.querySelector('[data-prof-comp-view]')){
        const v=document.createElement('button');v.type='button';v.className='cc-btn';v.style.background='#7c3aed';v.style.color='#fff';v.dataset.profCompView=a.id;v.innerHTML='<i class="fa-solid fa-receipt mr-1"></i>Ver comprobantes';v.onclick=ev=>{ev.preventDefault();ev.stopPropagation();verComprobantes(a.id)};actions.appendChild(v);
      }
      if(!['CERRADO','CANCELADO'].includes(estado)&&!actions.querySelector('[data-ant-close-main]')){
        const b=document.createElement('button');b.type='button';b.className='cc-btn cc-btn-primary';b.dataset.antCloseMain=a.id;b.innerHTML='<i class="fa-solid fa-circle-check mr-1"></i>Cerrar anticipo';b.title='Finalizar este anticipo usando sus comprobaciones registradas';b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();if(typeof window.ccAntCerrar==='function')window.ccAntCerrar(a.id)};actions.appendChild(b);
      }
    });
  }

  function instalar(){
    ocultarPendientesConfirmar();
    if(typeof window.ccAntRender!=='function')return;
    if(window.ccAntRender.__profCierreEnListado)return;
    const original=window.ccAntRender;
    const wrapped=function(){const r=original.apply(this,arguments);mejorarListado();return r};
    wrapped.__profCierreEnListado=true;window.ccAntRender=wrapped;mejorarListado();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(instalar,0));else setTimeout(instalar,0);
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

needle='<script src="assets/js/modules/inventario.js"></script>'
if registry_tag not in html:
    if needle not in html: raise SystemExit('No se encontró fachada Inventario para insertar registro modular')
    html=html.replace(needle,registry_tag+'\n'+needle,1)

if anticipos_flow_tag not in html:
    anticipos_re=re.compile(r'(<script\b[^>]*\bsrc=["\']assets/js/modules/anticipos\.js["\'][^>]*>\s*</script>)',re.I)
    if not anticipos_re.search(html): raise SystemExit('No se encontró anticipos.js para insertar flujo profesional')
    html=anticipos_re.sub(lambda m:m.group(1)+'\n'+anticipos_flow_tag,html,count=1)

if health_tag not in html:
    pos=html.lower().rfind('</body>')
    if pos<0: raise SystemExit('No se encontró </body>')
    html=html[:pos]+health_tag+'\n'+html[pos:]
html=html.replace('profesional-modular-v3','profesional-modular-v4')
INDEX.write_text(html,encoding='utf-8')

for name,contract in contracts.items():
    owner=OUT/contract['owner']
    if not owner.exists(): raise SystemExit(f'Owner de módulo faltante: {name} -> {owner}')
for rel in ['assets/js/core/module-registry.js','assets/js/core/health-check.js','assets/js/modules/anticipos-profesional-flow.js','module-contracts.json']:
    if not (OUT/rel).exists(): raise SystemExit('Runtime faltante: '+rel)
if registry_tag not in html or health_tag not in html or anticipos_flow_tag not in html:
    raise SystemExit('Runtime modular no quedó cargado en index.html')
print('Runtime modular v4 listo: registro, contratos, health check y flujo profesional de anticipos')
