/* Tráfico App Profesional · Flujo simplificado de cierre y comprobantes de anticipos */
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


/* Tráfico App Profesional · Gestión de comprobantes desde Comprobar y listado */
(function(){
  if(window.__ccProfCompGestionV2)return;
  window.__ccProfCompGestionV2=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';

  async function datos(){
    const r=await sb().rpc('cc_ant_list');
    if(r?.error)throw r.error;
    if(!r?.data?.ok)throw new Error(r?.data?.error||'No se pudieron cargar las comprobaciones');
    return r.data;
  }

  async function editar(anticipoId,compId,onDone){
    const d=await datos(),a=(d.anticipos||[]).find(x=>x.id===anticipoId),c=(d.comprobaciones||[]).find(x=>x.id===compId);
    if(!a||!c)return;
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){alert('Primero debes abrir el anticipo para editar comprobaciones.');return}
    document.getElementById('ccProfCompInlineEdit')?.remove();
    const ov=document.createElement('div');ov.id='ccProfCompInlineEdit';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100006;display:flex;align-items:center;justify-content:center;padding:18px';
    ov.innerHTML='<div style="background:#fff;width:min(660px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><strong>Editar comprobante</strong><button id="ccPCIEX" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form id="ccPCIEForm" style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="'+esc(String(c.fecha||'').slice(0,10))+'"></div><div class="cc-field"><label>Concepto *</label><input name="concepto" required value="'+esc(c.concepto||'')+'"></div><div class="cc-field"><label>Tipo documento</label><input name="tipoDocumento" value="'+esc(c.tipo_documento||'')+'"></div><div class="cc-field"><label>Folio</label><input name="folioDocumento" value="'+esc(c.folio_documento||'')+'"></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required value="'+Number(c.monto||0)+'"></div><div class="cc-field"><label>URL evidencia</label><input name="evidenciaUrl" value="'+esc(c.evidencia_url||'')+'"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="observaciones">'+esc(c.observaciones||'')+'</textarea></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" id="ccPCIECancel">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('#ccPCIEX').onclick=close;ov.querySelector('#ccPCIECancel').onclick=close;
    ov.querySelector('#ccPCIEForm').onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(ev.currentTarget),b=ev.currentTarget.querySelector('button[type=submit]');b.disabled=true;try{const item={id:compId,fecha:new Date(String(fd.get('fecha'))+'T12:00:00').toISOString(),concepto:String(fd.get('concepto')||''),tipoDocumento:String(fd.get('tipoDocumento')||''),folioDocumento:String(fd.get('folioDocumento')||''),monto:Number(fd.get('monto')||0),evidenciaUrl:String(fd.get('evidenciaUrl')||''),observaciones:String(fd.get('observaciones')||'')};const r=await sb().rpc('cc_ant_update_comprobacion',{p_item:item});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo actualizar');close();await window.ccAntLoad?.(true);if(onDone)await onDone()}catch(e){alert(e.message||e);b.disabled=false}};
  }

  async function eliminar(anticipoId,compId,onDone){
    const d=await datos(),a=(d.anticipos||[]).find(x=>x.id===anticipoId),c=(d.comprobaciones||[]).find(x=>x.id===compId);if(!a||!c)return;
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){alert('Primero debes abrir el anticipo para eliminar comprobaciones.');return}
    if(!confirm('¿Eliminar el comprobante de '+money(c.monto)+'? Se conservará en historial como cancelado.'))return;
    const motivo=prompt('Motivo de eliminación:','Corrección de comprobante')||'Corrección de comprobante';
    try{const r=await sb().rpc('cc_ant_delete_comprobacion',{p_id:compId,p_motivo:motivo});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo eliminar');await window.ccAntLoad?.(true);if(onDone)await onDone()}catch(e){alert(e.message||e)}
  }

  async function renderEnComprobar(anticipoId){
    const modal=document.getElementById('ccAntCompModal');if(!modal)return;
    const anchor=modal.querySelector('#ccCompList');if(!anchor)return;
    let box=modal.querySelector('#ccProfSavedComps');if(!box){box=document.createElement('div');box.id='ccProfSavedComps';box.className='cc-comp-list';box.style='margin-top:14px;border-top:2px solid #e2e8f0;padding-top:12px';anchor.insertAdjacentElement('afterend',box)}
    try{
      const d=await datos(),a=(d.anticipos||[]).find(x=>x.id===anticipoId),comps=(d.comprobaciones||[]).filter(x=>x.anticipo_id===anticipoId&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
      if(!a)return;const editable=!['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())&&(typeof window.ccPerm!=='function'||window.ccPerm('anticipos.editar'));
      box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><div><strong>Comprobaciones ya guardadas</strong><div class="cc-note">Puedes corregirlas antes de cerrar el anticipo.</div></div><span class="cc-badge">'+comps.length+' comprobante(s)</span></div>'+(comps.length?comps.map(c=>'<div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;background:#fff"><div style="display:flex;justify-content:space-between;gap:10px"><div><strong>'+esc(c.concepto||'Comprobante')+'</strong><div style="font-size:10px;color:#64748b">'+date(c.fecha)+' · '+esc(c.tipo_documento||'—')+' · Folio '+esc(c.folio_documento||'—')+'</div><div style="font-size:10px;color:#64748b;margin-top:3px">'+esc(c.observaciones||'')+'</div></div><strong>'+money(c.monto)+'</strong></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+(c.evidencia_url?'<a class="cc-btn cc-btn-light" href="'+esc(c.evidencia_url)+'" target="_blank" rel="noopener">Ver archivo</a>':'')+(editable?'<button class="cc-btn cc-btn-light" data-inline-edit="'+esc(c.id)+'"><i class="fa-solid fa-pen mr-1"></i>Editar</button><button class="cc-btn cc-btn-danger" data-inline-del="'+esc(c.id)+'"><i class="fa-solid fa-trash mr-1"></i>Eliminar</button>':'<span class="cc-badge">Solo lectura</span>')+'</div></div>').join(''):'<div class="cc-note">Todavía no hay comprobaciones guardadas.</div>');
      box.onclick=ev=>{const eb=ev.target.closest('[data-inline-edit]'),db=ev.target.closest('[data-inline-del]');if(eb)editar(anticipoId,eb.dataset.inlineEdit,()=>renderEnComprobar(anticipoId));if(db)eliminar(anticipoId,db.dataset.inlineDel,()=>renderEnComprobar(anticipoId))};
    }catch(e){box.innerHTML='<div class="cc-note" style="color:#b91c1c">'+esc(e.message||e)+'</div>'}
  }

  function wrapComprobar(){
    if(typeof window.ccAntComprobar!=='function'||window.ccAntComprobar.__profCompsV2)return;
    const original=window.ccAntComprobar;
    const wrapped=async function(id){const r=await original.apply(this,arguments);setTimeout(()=>renderEnComprobar(id),80);setTimeout(()=>renderEnComprobar(id),600);return r};
    wrapped.__profCompsV2=true;window.ccAntComprobar=wrapped;
  }

  function botonesListado(){
    const body=document.getElementById('ccAntBody'),rows=Array.from(body?.querySelectorAll('tr')||[]),data=Array.isArray(window.ccAntFiltered)?window.ccAntFiltered:[];
    rows.forEach((tr,i)=>{const a=data[i];if(!a)return;const actions=tr.lastElementChild?.querySelector('div')||tr.lastElementChild;if(!actions||actions.querySelector('[data-prof-comp-view]'))return;const b=document.createElement('button');b.type='button';b.className='cc-btn';b.style.background='#7c3aed';b.style.color='#fff';b.dataset.profCompView=a.id;b.innerHTML='<i class="fa-solid fa-receipt mr-1"></i>Ver comprobantes';b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();if(typeof window.ccProfVerComprobantes==='function')window.ccProfVerComprobantes(a.id)};actions.appendChild(b)});
  }

  function install(){
    wrapComprobar();botonesListado();
    if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__profCompsListV2){const o=window.ccAntRender,w=function(){const r=o.apply(this,arguments);setTimeout(botonesListado,0);wrapComprobar();return r};w.__profCompsListV2=true;window.ccAntRender=w}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();


/* Tráfico App Profesional · Caja chica, responsables, cajas y traspasos */
(function(){
  if(window.__ccAntCajaChicaV1)return;
  window.__ccAntCajaChicaV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  const state={base:null,extra:null};

  async function load(){
    const [a,b]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);
    if(a.error)throw a.error;if(b.error)throw b.error;
    state.base=a.data;state.extra=b.data;return state;
  }
  function active(xs){return (xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO')}
  function labelOp(x){return x.nombre+(x.numero_empleado?' · '+x.numero_empleado:'')}
  function labelUnit(x){return x.numero+(x.descripcion?' · '+x.descripcion:'')}
  function findExact(xs,value,labelFn,alts=[]){const v=String(value||'').trim().toLowerCase();return (xs||[]).find(x=>[labelFn(x),...alts.map(f=>f(x))].some(s=>String(s||'').trim().toLowerCase()===v))}

  function patchTipoDocumento(root=document){
    const tipos=active(state.extra?.tiposComprobante||[]);if(!tipos.length)return;
    root.querySelectorAll('input[name="tipoDocumento"],select[name="tipoDocumento"]').forEach(el=>{
      if(el.dataset.catalogoTipoComp==='1')return;
      const current=String(el.value||'').toUpperCase();
      const s=document.createElement('select');s.name='tipoDocumento';s.className=el.className;s.required=el.required;s.dataset.catalogoTipoComp='1';
      s.innerHTML='<option value="">Seleccionar</option>'+tipos.map(t=>'<option value="'+esc(t.nombre)+'" '+(String(t.nombre).toUpperCase()===current?'selected':'')+'>'+esc(t.nombre)+'</option>').join('');
      el.replaceWith(s);
    });
  }

  function ensureViews(){
    const panel=document.getElementById('ccPanelAnticipos'),nav=panel?.querySelector('.cc-ant-nav');if(!panel||!nav)return;
    if(!document.getElementById('ccAntBalances')){
      const k=document.getElementById('ccAntKpis');const b=document.createElement('div');b.id='ccAntBalances';b.className='cc-ant-kpis';b.style='margin-top:8px';k?.insertAdjacentElement('afterend',b);
    }
    const defs=[['cajachica','Caja chica'],['cajaspro','Cajas y balances'],['traspasos','Traspasos'],['catalogospro','Responsables / comprobantes']];
    defs.forEach(([id,name])=>{if(!nav.querySelector('[data-antv="'+id+'"]')){const b=document.createElement('button');b.className='cc-btn cc-btn-light';b.dataset.antv=id;b.textContent=name;b.onclick=()=>window.ccAntView(id,b);nav.appendChild(b)}});
    const mk=(id,html)=>{if(!document.getElementById(id)){const d=document.createElement('div');d.id=id;d.className='cc-ant-view';d.style.display='none';d.innerHTML=html;panel.appendChild(d)}};
    mk('ccAntViewCajachica','<div class="cc-toolbar"><div><strong>Caja chica por responsable</strong><div class="cc-note">Control separado de entregas, comprobaciones y cierres a responsables.</div></div><button class="cc-btn cc-btn-primary" id="ccCajaChicaNuevo">Nueva caja chica</button></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>FECHA</th><th>RESPONSABLE</th><th>CAJA</th><th>ENTREGADO</th><th>COMPROBADO</th><th>PENDIENTE</th><th>ESTATUS</th><th>ACCIONES</th></tr></thead><tbody id="ccCajaChicaBody"></tbody></table></div>');
    mk('ccAntViewCajaspro','<div class="cc-toolbar"><div><strong>Cajas y balances</strong><div class="cc-note">Cada caja puede habilitarse para operadores, caja chica o ambos.</div></div><button class="cc-btn cc-btn-primary" id="ccCajaNueva">Nueva caja</button></div><div id="ccCajasProCards" class="cc-ant-report-grid"></div>');
    mk('ccAntViewTraspasos','<div class="cc-toolbar"><div><strong>Traspasos entre cajas</strong><div class="cc-note">La salida y entrada quedan enlazadas en historial.</div></div><button class="cc-btn cc-btn-primary" id="ccTraspasoNuevo">Nuevo traspaso</button></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>ORIGEN</th><th>DESTINO</th><th>MONTO</th><th>REFERENCIA</th><th>OBSERVACIONES</th></tr></thead><tbody id="ccTraspasosBody"></tbody></table></div>');
    mk('ccAntViewCatalogospro','<div class="cc-ant-report-grid"><div class="cc-config-card"><div class="cc-toolbar"><strong>Responsables</strong><button class="cc-btn cc-btn-primary" id="ccRespNuevo">Agregar</button></div><div id="ccRespLista"></div></div><div class="cc-config-card"><div class="cc-toolbar"><strong>Tipos de comprobante</strong><button class="cc-btn cc-btn-primary" id="ccTipoCompNuevo">Agregar</button></div><div id="ccTipoCompLista"></div></div></div>');
    document.getElementById('ccCajaChicaNuevo').onclick=()=>nuevoAnticipo(true);
    document.getElementById('ccCajaNueva').onclick=()=>cajaForm();
    document.getElementById('ccTraspasoNuevo').onclick=traspasoForm;
    document.getElementById('ccRespNuevo').onclick=()=>catalogForm('RESPONSABLE');
    document.getElementById('ccTipoCompNuevo').onclick=()=>catalogForm('TIPO_COMPROBANTE');
  }

  function renderBalances(){
    const el=document.getElementById('ccAntBalances');if(!el)return;
    const qs=active(state.extra?.cuentas||[]);el.innerHTML=qs.length?qs.map(q=>'<div class="cc-ant-kpi"><small>'+esc(q.nombre)+'</small><strong>'+money(q.saldo)+'</strong><div style="font-size:9px;color:#64748b">'+(q.usoOperadores?'Operadores ':'')+(q.usoCajaChica?'· Caja chica':'')+'</div></div>').join(''):'<div class="cc-note">No hay cajas activas.</div>';
  }

  function renderCajas(){
    const el=document.getElementById('ccCajasProCards');if(!el)return;
    el.innerHTML=(state.extra?.cuentas||[]).map(q=>'<div class="cc-config-card"><div style="display:flex;justify-content:space-between;gap:10px"><div><strong>'+esc(q.nombre)+'</strong><div class="cc-note">'+esc(q.tipo||'CAJA')+' · '+esc(q.estatus||'')+'</div></div><strong>'+money(q.saldo)+'</strong></div><div style="margin-top:8px"><span class="cc-badge">'+(q.usoOperadores?'Anticipos operadores':'Sin operadores')+'</span> <span class="cc-badge">'+(q.usoCajaChica?'Caja chica':'Sin caja chica')+'</span></div><button class="cc-btn cc-btn-light" style="margin-top:10px" data-edit-caja="'+esc(q.id)+'">Editar</button></div>').join('')||'<div class="cc-note">Sin cajas.</div>';
    el.onclick=e=>{const b=e.target.closest('[data-edit-caja]');if(b)cajaForm((state.extra.cuentas||[]).find(x=>x.id===b.dataset.editCaja))};
  }

  function renderCajaChica(){
    const body=document.getElementById('ccCajaChicaBody');if(!body)return;
    const rows=state.extra?.cajaChica||[];
    body.innerHTML=rows.length?rows.map(a=>'<tr><td><strong>'+esc(a.folio)+'</strong></td><td>'+date(a.fecha)+'</td><td>'+esc(a.responsable||'—')+'</td><td>'+esc(a.cuenta||'—')+'</td><td>'+money(a.montoEntregado)+'</td><td>'+money(a.comprobado)+'</td><td><strong>'+money(a.pendiente)+'</strong></td><td>'+esc(a.estatus)+'</td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="cc-btn cc-btn-light" data-cc-comp="'+esc(a.id)+'">Comprobar</button><button class="cc-btn" style="background:#7c3aed;color:#fff" data-cc-view="'+esc(a.id)+'">Ver comprobantes</button>'+(a.estatus!=='CERRADO'&&a.estatus!=='CANCELADO'&&Number(a.comprobado)>0?'<button class="cc-btn cc-btn-primary" data-cc-close="'+esc(a.id)+'">Cerrar anticipo</button>':'')+'</div></td></tr>').join(''):'<tr><td colspan="9" style="padding:22px;text-align:center;color:#94a3b8">Sin movimientos de caja chica.</td></tr>';
    body.onclick=e=>{const c=e.target.closest('[data-cc-comp]'),v=e.target.closest('[data-cc-view]'),x=e.target.closest('[data-cc-close]');if(c)window.ccAntComprobar?.(c.dataset.ccComp);if(v)window.ccProfVerComprobantes?.(v.dataset.ccView);if(x)window.ccAntCerrar?.(x.dataset.ccClose)};
  }

  function renderTraspasos(){
    const b=document.getElementById('ccTraspasosBody');if(!b)return;
    b.innerHTML=(state.extra?.traspasos||[]).map(x=>'<tr><td>'+date(x.fecha)+'</td><td>'+esc(x.origen||'—')+'</td><td>'+esc(x.destino||'—')+'</td><td><strong>'+money(x.monto)+'</strong></td><td>'+esc(x.referencia||'')+'</td><td>'+esc(x.observaciones||'')+'</td></tr>').join('')||'<tr><td colspan="6" style="padding:22px;text-align:center;color:#94a3b8">Sin traspasos.</td></tr>';
  }

  function renderCatalogos(){
    const r=document.getElementById('ccRespLista'),t=document.getElementById('ccTipoCompLista');
    if(r){r.innerHTML=(state.extra?.responsables||[]).map(x=>'<div style="padding:8px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.numero_empleado||'')+' '+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-resp="'+esc(x.id)+'">Editar</button></div>').join('')||'<div class="cc-note">Sin responsables.</div>';r.onclick=e=>{const b=e.target.closest('[data-edit-resp]');if(b)catalogForm('RESPONSABLE',(state.extra.responsables||[]).find(x=>x.id===b.dataset.editResp))}}
    if(t){t.innerHTML=(state.extra?.tiposComprobante||[]).map(x=>'<div style="padding:8px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-tipo="'+esc(x.id)+'">Editar</button></div>').join('')||'<div class="cc-note">Sin tipos.</div>';t.onclick=e=>{const b=e.target.closest('[data-edit-tipo]');if(b)catalogForm('TIPO_COMPROBANTE',(state.extra.tiposComprobante||[]).find(x=>x.id===b.dataset.editTipo))}}
  }

  function hideCajaChicaFromMain(){
    const ids=new Set((state.extra?.cajaChica||[]).map(x=>x.id));const rows=Array.from(document.querySelectorAll('#ccAntBody tr')),data=window.ccAntFiltered||[];rows.forEach((tr,i)=>{if(data[i]&&ids.has(data[i].id))tr.style.display='none'});
  }

  async function refresh(){
    try{await load();ensureViews();renderBalances();renderCajas();renderCajaChica();renderTraspasos();renderCatalogos();patchTipoDocumento();hideCajaChicaFromMain()}catch(e){console.warn('Anticipos profesional extra',e)}
  }

  function overlay(title,body,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:100010;display:flex;align-items:center;justify-content:center;padding:18px';ov.innerHTML='<div style="background:#fff;width:min(920px,97vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+body+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button class="cc-btn cc-btn-primary" type="submit">Guardar</button></div></form></div>';document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget),e.currentTarget);close();await window.ccAntLoad?.(true);await refresh()}catch(err){alert(err.message||err);b.disabled=false}};return ov;
  }

  function cajaForm(q={}){
    overlay(q.id?'Editar caja':'Nueva caja','<div class="cc-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(q.nombre||'')+'"></div><div class="cc-field"><label>Saldo inicial</label><input name="saldoInicial" type="number" step="0.01" value="'+Number(q.saldoInicial||0)+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(q.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(q.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div style="display:flex;gap:18px;margin-top:12px"><label><input type="checkbox" name="usoOperadores" '+(q.usoOperadores?'checked':'')+'> Para anticipos a operadores</label><label><input type="checkbox" name="usoCajaChica" '+(q.usoCajaChica?'checked':'')+'> Para caja chica / responsables</label></div>',async fd=>{if(!fd.get('usoOperadores')&&!fd.get('usoCajaChica'))throw new Error('Marca al menos un uso para la caja.');const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CUENTA',p_item:{id:q.id||'',nombre:fd.get('nombre'),tipo:'CAJA',saldoInicial:Number(fd.get('saldoInicial')||0),estatus:fd.get('estatus'),usoOperadores:!!fd.get('usoOperadores'),usoCajaChica:!!fd.get('usoCajaChica')}});if(r.error)throw r.error});
  }

  function catalogForm(tipo,x={}){
    const resp=tipo==='RESPONSABLE';overlay((x.id?'Editar ':'Nuevo ')+(resp?'responsable':'tipo de comprobante'),'<div class="cc-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div>'+(resp?'<div class="cc-field"><label>Número empleado</label><input name="numeroEmpleado" value="'+esc(x.numero_empleado||'')+'"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="'+esc(x.telefono||'')+'"></div>':'')+'<div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div>',async fd=>{const item={id:x.id||'',nombre:fd.get('nombre'),estatus:fd.get('estatus')};if(resp){item.numeroEmpleado=fd.get('numeroEmpleado');item.telefono=fd.get('telefono')}const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:tipo,p_item:item});if(r.error)throw r.error});
  }

  function traspasoForm(){
    const qs=active(state.extra?.cuentas||[]),opts=qs.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');overlay('Nuevo traspaso','<div class="cc-grid"><div class="cc-field"><label>Caja origen *</label><select name="origen" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Caja destino *</label><select name="destino" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div>',async fd=>{if(fd.get('origen')===fd.get('destino'))throw new Error('Origen y destino deben ser diferentes.');const r=await sb().rpc('cc_ant_transfer_funds',{p_item:{cuentaOrigenId:fd.get('origen'),cuentaDestinoId:fd.get('destino'),monto:Number(fd.get('monto')),fecha:new Date(fd.get('fecha')+'T12:00:00').toISOString(),referencia:fd.get('referencia'),observaciones:fd.get('observaciones')}});if(r.error)throw r.error});
  }

  function nuevoAnticipo(forceCajaChica=false){
    const B=state.base||{},E=state.extra||{},ops=active(B.operadores),units=B.unidadesCarro||[],resps=active(E.responsables),dest=active(B.destinos),types=active(B.tiposUnidadAnticipos),methods=active(B.metodosDeposito),concepts=active(B.conceptos);
    const opList=ops.map(x=>'<option value="'+esc(labelOp(x))+'"></option>').join(''),unitList=units.map(x=>'<option value="'+esc(labelUnit(x))+'"></option>').join(''),respList=resps.map(x=>'<option value="'+esc(x.nombre)+'"></option>').join('');
    const ov=overlay('Nuevo anticipo','<label style="display:flex;align-items:center;gap:8px;font-weight:800;margin-bottom:12px"><input id="ccEsCajaChica" name="esCajaChica" type="checkbox" '+(forceCajaChica?'checked':'')+'> Caja chica</label><div id="ccCamposOperador" class="cc-grid"><div class="cc-field"><label>Operador *</label><input name="operadorTexto" list="ccOpsList" autocomplete="off"><datalist id="ccOpsList">'+opList+'</datalist><div class="cc-note">Escribe y selecciona una coincidencia existente.</div></div><div class="cc-field"><label>Unidad / carro *</label><input name="unidadTexto" list="ccUnitsList" autocomplete="off"><datalist id="ccUnitsList">'+unitList+'</datalist><div class="cc-note">Solo carros existentes.</div></div><div class="cc-field"><label>Tipo unidad anticipo *</label><select name="tipoUnidadId"><option value="">Seleccionar</option>'+types.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div></div><div id="ccCamposResp" style="display:none"><div class="cc-field"><label>Responsable *</label><input name="responsableTexto" list="ccRespList" autocomplete="off"><datalist id="ccRespList">'+respList+'</datalist><div class="cc-note">Debe existir en el catálogo de Responsables.</div></div></div><div class="cc-grid" style="margin-top:10px"><div class="cc-field"><label>Destino *</label><select name="destinoId" required><option value="">Seleccionar</option>'+dest.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Método depósito *</label><select name="metodoId" required><option value="">Seleccionar</option>'+methods.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Caja *</label><select name="cuentaId" required></select></div><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="cc-field"><label>Viaje / referencia</label><input name="viaje"></div></div><div class="cc-field" style="margin-top:12px"><label>Conceptos y montos</label><div id="ccConceptosNuevo" style="max-height:260px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px;padding:8px">'+concepts.map(c=>'<div style="display:grid;grid-template-columns:auto 1fr 130px;gap:8px;align-items:center;padding:6px"><input type="checkbox" data-concept-id="'+esc(c.id)+'"><span>'+esc(c.nombre)+'</span><input type="number" min="0" step="0.01" data-concept-monto="'+esc(c.id)+'" value="0"></div>').join('')+'</div></div><div class="cc-field" style="margin-top:10px"><label>Total entregado *</label><input name="montoEntregado" type="number" min="0" step="0.01" required></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div>',async(fd,form)=>{const caja=!!fd.get('esCajaChica'),op=findExact(ops,fd.get('operadorTexto'),labelOp,[x=>x.nombre,x=>x.numero_empleado]),unit=findExact(units,fd.get('unidadTexto'),labelUnit,[x=>x.numero]),resp=findExact(resps,fd.get('responsableTexto'),x=>x.nombre,[x=>x.numero_empleado]);if(!caja&&(!op||!unit))throw new Error('Operador y unidad deben seleccionarse de las opciones existentes.');if(caja&&!resp)throw new Error('El responsable debe existir en el catálogo.');const detalles=[];form.querySelectorAll('[data-concept-id]:checked').forEach(ch=>{const id=ch.dataset.conceptId,m=Number(form.querySelector('[data-concept-monto="'+id+'"]')?.value||0);if(m>0)detalles.push({conceptoId:id,monto:m})});if(!detalles.length)throw new Error('Selecciona al menos un concepto con monto mayor a cero.');const item={esCajaChica:caja,operadorId:caja?'':op.id,responsableId:caja?resp.id:'',unidadId:caja?'':unit.id,tipoUnidadAnticipoId:caja?'':fd.get('tipoUnidadId'),destinoId:fd.get('destinoId'),metodoDepositoId:fd.get('metodoId'),cuentaId:fd.get('cuentaId'),fecha:new Date(fd.get('fecha')+'T12:00:00').toISOString(),viaje:fd.get('viaje'),montoEntregado:Number(fd.get('montoEntregado')),observaciones:fd.get('observaciones'),detalles};const r=await sb().rpc('cc_ant_create',{p_item:item});if(r.error)throw r.error});
    const form=ov.querySelector('form'),chk=form.querySelector('#ccEsCajaChica'),opBox=form.querySelector('#ccCamposOperador'),respBox=form.querySelector('#ccCamposResp'),qsel=form.querySelector('[name=cuentaId]');
    function toggle(){const caja=chk.checked;opBox.style.display=caja?'none':'grid';respBox.style.display=caja?'block':'none';const qs=active(E.cuentas).filter(q=>caja?q.usoCajaChica:q.usoOperadores);qsel.innerHTML='<option value="">Seleccionar</option>'+qs.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');form.querySelector('[name=tipoUnidadId]').required=!caja;form.querySelector('[name=operadorTexto]').required=!caja;form.querySelector('[name=unidadTexto]').required=!caja;form.querySelector('[name=responsableTexto]').required=caja}chk.onchange=toggle;toggle();
  }

  function overrideNuevo(){window.ccAntNuevoAnticipo=function(){nuevoAnticipo(false)}}
  function overrideCajaCatalog(){if(typeof window.ccAntCatalogoForm==='function'&&!window.ccAntCatalogoForm.__ccCajaV1){const o=window.ccAntCatalogoForm;const w=function(tipo){if(tipo==='CUENTA')return cajaForm();return o.apply(this,arguments)};w.__ccCajaV1=true;window.ccAntCatalogoForm=w}}
  function wrapLoad(){if(typeof window.ccAntLoad!=='function'||window.ccAntLoad.__ccExtraV1)return;const o=window.ccAntLoad;const w=async function(){const r=await o.apply(this,arguments);await refresh();return r};w.__ccExtraV1=true;window.ccAntLoad=w}
  function installObserver(){const mo=new MutationObserver(()=>patchTipoDocumento(document));mo.observe(document.body,{subtree:true,childList:true})}
  async function install(){ensureViews();overrideNuevo();overrideCajaCatalog();wrapLoad();installObserver();await refresh()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();


/* Tráfico App Profesional · Modelo corregido: cuentas + operador/responsable */
(function(){
  if(window.__ccAntCuentasCorrectedV1)return;
  window.__ccAntCuentasCorrectedV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  let cache={base:null,extra:null};

  async function load(){
    const [a,b]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);
    if(a.error)throw a.error;if(b.error)throw b.error;
    cache={base:a.data||{},extra:b.data||{}};return cache;
  }
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const exact=(xs,v,fn)=>{v=String(v||'').trim().toLowerCase();return (xs||[]).find(x=>String(fn(x)||'').trim().toLowerCase()===v)};
  const opLabel=x=>x.nombre+(x.numero_empleado?' · '+x.numero_empleado:'');
  const unitLabel=x=>x.numero+(x.descripcion?' · '+x.descripcion:'');
  const respLabel=x=>x.nombre+(x.numero_empleado?' · '+x.numero_empleado:'');

  function hideWrongViews(){
    ['cajachica','cajaspro','traspasos','catalogospro'].forEach(id=>{
      document.querySelector('.cc-ant-nav [data-antv="'+id+'"]')?.remove();
      const v=document.getElementById('ccAntView'+id.charAt(0).toUpperCase()+id.slice(1));if(v)v.style.display='none';
    });
    const cajaBtn=document.querySelector('.cc-ant-nav [data-antv="caja"]');if(cajaBtn)cajaBtn.textContent='Cuentas / movimientos';
    const catCard=[...document.querySelectorAll('#ccAntViewCatalogos .cc-config-card')].find(x=>(x.textContent||'').includes('Cuentas / cajas'));
    if(catCard){const s=catCard.querySelector('strong');if(s)s.textContent='Cuentas';const note=catCard.querySelector('.cc-note');if(note)note.textContent='Administra las cuentas que financiarán anticipos a operadores o responsables.';}
  }

  function accountPanel(){
    const view=document.getElementById('ccAntViewCaja');if(!view)return;
    let p=document.getElementById('ccCuentaMasterPanel');
    if(!p){p=document.createElement('div');p.id='ccCuentaMasterPanel';p.className='cc-config-card';p.style='margin-bottom:14px';view.prepend(p);}
    const qs=active(cache.extra?.cuentas||[]);
    const transfers=cache.extra?.traspasos||[];
    p.innerHTML='<div class="cc-toolbar"><div><strong>Cuentas y balances</strong><div class="cc-note">No son cajas separadas del módulo: son cuentas de origen de fondos.</div></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="cc-btn cc-btn-primary" data-new-account>Nueva cuenta</button><button class="cc-btn cc-btn-light" data-transfer>Traspaso entre cuentas</button></div></div>'+
      '<div class="cc-ant-kpis">'+(qs.length?qs.map(q=>'<div class="cc-ant-kpi"><small>'+esc(q.nombre)+'</small><strong>'+money(q.saldo)+'</strong><div style="font-size:9px;color:#64748b">'+(q.usoOperadores?'Operadores ':'')+(q.usoCajaChica?'Responsables / caja chica':'')+'</div><button class="cc-btn cc-btn-light" style="margin-top:7px" data-edit-account="'+esc(q.id)+'">Editar</button></div>').join(''):'<div class="cc-note">No hay cuentas activas.</div>')+'</div>'+
      '<div style="margin-top:12px"><strong>Últimos traspasos</strong><div class="cc-inv-wrap" style="max-height:220px"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>ORIGEN</th><th>DESTINO</th><th>MONTO</th><th>REFERENCIA</th></tr></thead><tbody>'+(transfers.length?transfers.slice(0,20).map(x=>'<tr><td>'+esc(String(x.fecha||'').slice(0,10))+'</td><td>'+esc(x.origen||'')+'</td><td>'+esc(x.destino||'')+'</td><td>'+money(x.monto)+'</td><td>'+esc(x.referencia||'')+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;color:#94a3b8">Sin traspasos.</td></tr>')+'</tbody></table></div></div>';
    p.querySelector('[data-new-account]').onclick=()=>accountForm();
    p.querySelector('[data-transfer]').onclick=transferForm;
    p.querySelectorAll('[data-edit-account]').forEach(b=>b.onclick=()=>accountForm((cache.extra.cuentas||[]).find(x=>x.id===b.dataset.editAccount)||{}));
  }

  function modal(title,html,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100050;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(980px,98vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;try{await onSubmit(new FormData(e.currentTarget),e.currentTarget);close();await window.ccAntLoad?.(true);await refresh()}catch(err){alert(err.message||err);btn.disabled=false}};
    return ov;
  }

  function accountForm(q={}){
    modal(q.id?'Editar cuenta':'Nueva cuenta','<div class="cc-grid"><div class="cc-field"><label>Nombre de la cuenta *</label><input name="nombre" required value="'+esc(q.nombre||'')+'"></div><div class="cc-field"><label>Saldo inicial</label><input name="saldo" type="number" step="0.01" value="'+Number(q.saldoInicial||0)+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(q.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(q.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:12px"><label><input type="checkbox" name="ops" '+(q.usoOperadores?'checked':'')+'> Puede dar anticipos a operadores</label><label><input type="checkbox" name="resp" '+(q.usoCajaChica?'checked':'')+'> Puede dar anticipos a responsables (caja chica)</label></div>',async fd=>{if(!fd.get('ops')&&!fd.get('resp'))throw new Error('Selecciona al menos un uso para la cuenta.');const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CUENTA',p_item:{id:q.id||'',nombre:String(fd.get('nombre')||''),tipo:'CUENTA',saldoInicial:Number(fd.get('saldo')||0),estatus:String(fd.get('estatus')||'ACTIVO'),usoOperadores:!!fd.get('ops'),usoCajaChica:!!fd.get('resp')}});if(r.error)throw r.error;});
  }

  function transferForm(){
    const qs=active(cache.extra?.cuentas||[]);if(qs.length<2){alert('Necesitas al menos dos cuentas activas.');return;}
    const opts=qs.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');
    modal('Traspaso entre cuentas','<div class="cc-grid"><div class="cc-field"><label>Cuenta origen *</label><select name="origen" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Cuenta destino *</label><select name="destino" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Referencia</label><input name="ref"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="obs"></textarea></div>',async fd=>{if(fd.get('origen')===fd.get('destino'))throw new Error('Origen y destino deben ser diferentes.');const r=await sb().rpc('cc_ant_transfer_funds',{p_item:{cuentaOrigenId:fd.get('origen'),cuentaDestinoId:fd.get('destino'),monto:Number(fd.get('monto')||0),referencia:String(fd.get('ref')||''),observaciones:String(fd.get('obs')||'')}});if(r.error)throw r.error;});
  }

  function patchMainList(){
    const cc=new Map((cache.extra?.cajaChica||[]).map(x=>[x.id,x]));
    const rows=[...document.querySelectorAll('#ccAntBody tr')],data=window.ccAntFiltered||[];
    rows.forEach((tr,i)=>{const a=data[i],r=a&&cc.get(a.id);if(!a)return;tr.style.display='';if(!r)return;const tds=tr.querySelectorAll('td');if(tds[2])tds[2].innerHTML='<strong>'+esc(r.responsable||'Responsable')+'</strong><div style="font-size:9px;color:#64748b">RESPONSABLE</div>';if(tds[4])tds[4].innerHTML='<span class="cc-badge">Caja chica</span>';if(tds[5])tds[5].textContent='RESPONSABLE';});
  }

  async function newAdvance(){
    await load();
    const base=cache.base||{},extra=cache.extra||{};
    const accounts=active(extra.cuentas||[]);if(!accounts.length){alert('Primero registra una cuenta activa.');return;}
    const ops=active(base.operadores||[]),units=base.unidadesCarro||[],resps=active(extra.responsables||[]),concepts=active(base.conceptos||[]),dests=active(base.destinos||[]),methods=active(base.metodosDeposito||[]),types=active(base.tiposUnidadAnticipos||[]);
    const accountOpts=accounts.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');
    const ov=modal('Nuevo anticipo','<div class="cc-grid"><div class="cc-field"><label>Cuenta de origen *</label><select name="cuenta" id="ccCAcct" required><option value="">Seleccionar cuenta</option>'+accountOpts+'</select></div><div class="cc-field" id="ccCBenefTypeWrap"><label>Beneficiario *</label><select name="benefType" id="ccCBenefType"><option value="OPERADOR">Operador</option><option value="RESPONSABLE">Responsable</option></select></div><div class="cc-field" id="ccCOperatorWrap"><label>Operador *</label><input name="operadorText" list="ccCOps" autocomplete="off"><datalist id="ccCOps">'+ops.map(x=>'<option value="'+esc(opLabel(x))+'"></option>').join('')+'</datalist></div><div class="cc-field" id="ccCRespWrap" style="display:none"><label>Responsable *</label><input name="respText" list="ccCResps" autocomplete="off"><datalist id="ccCResps">'+resps.map(x=>'<option value="'+esc(respLabel(x))+'"></option>').join('')+'</datalist></div><div class="cc-field" id="ccCUnitWrap"><label>Unidad *</label><input name="unitText" list="ccCUnits" autocomplete="off"><datalist id="ccCUnits">'+units.map(x=>'<option value="'+esc(unitLabel(x))+'"></option>').join('')+'</datalist></div><div class="cc-field" id="ccCTypeWrap"><label>Tipo anticipo</label><select name="tipoUnidad"><option value="">Seleccionar</option>'+types.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Destino</label><select name="destino"><option value="">Sin destino</option>'+dests.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Método depósito</label><select name="metodo"><option value="">Sin método</option>'+methods.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Concepto *</label><select name="concepto" required><option value="">Seleccionar</option>'+concepts.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Monto autorizado *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Monto entregado *</label><input name="entregado" type="number" min="0" step="0.01" required></div><div class="cc-field"><label>Viaje</label><input name="viaje"></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="obs"></textarea></div>',async(fd,form)=>{
      const q=accounts.find(x=>x.id===fd.get('cuenta'));if(!q)throw new Error('Selecciona una cuenta válida.');
      const mode=String(fd.get('benefType')||'OPERADOR');const isResp=mode==='RESPONSABLE';
      if(isResp&&!q.usoCajaChica)throw new Error('Esta cuenta no está destinada a anticipos de responsables.');
      if(!isResp&&!q.usoOperadores)throw new Error('Esta cuenta no está destinada a anticipos de operadores.');
      let op=null,resp=null,unit=null;
      if(isResp){resp=exact(resps,fd.get('respText'),respLabel);if(!resp)throw new Error('El responsable debe existir en el catálogo.');}
      else{op=exact(ops,fd.get('operadorText'),opLabel);if(!op)throw new Error('El operador debe existir en el catálogo.');unit=exact(units,fd.get('unitText'),unitLabel);if(!unit)throw new Error('La unidad debe existir y ser tipo Carro.');}
      const monto=Number(fd.get('monto')||0),ent=Number(fd.get('entregado')||0);if(monto<=0)throw new Error('Monto inválido.');if(ent<0||ent>monto)throw new Error('El entregado no puede exceder el autorizado.');
      const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:isResp,responsableId:resp?.id||'',operadorId:op?.id||'',unidadId:unit?.id||'',tipoUnidadAnticipoId:isResp?'':String(fd.get('tipoUnidad')||''),destinoId:String(fd.get('destino')||''),metodoDepositoId:String(fd.get('metodo')||''),cuentaId:q.id,viaje:String(fd.get('viaje')||''),referencia:String(fd.get('referencia')||''),montoEntregado:ent,observaciones:String(fd.get('obs')||''),detalles:[{conceptoId:String(fd.get('concepto')||''),monto:monto,observaciones:''}]}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo crear el anticipo');
    });
    const account=ov.querySelector('#ccCAcct'),type=ov.querySelector('#ccCBenefType');
    function sync(){const q=accounts.find(x=>x.id===account.value);if(q){if(q.usoOperadores&&!q.usoCajaChica)type.value='OPERADOR';else if(!q.usoOperadores&&q.usoCajaChica)type.value='RESPONSABLE';}const isResp=type.value==='RESPONSABLE';ov.querySelector('#ccCOperatorWrap').style.display=isResp?'none':'';ov.querySelector('#ccCUnitWrap').style.display=isResp?'none':'';ov.querySelector('#ccCTypeWrap').style.display=isResp?'none':'';ov.querySelector('#ccCRespWrap').style.display=isResp?'':'none';}
    account.onchange=sync;type.onchange=sync;sync();
  }

  async function refresh(){try{await load();hideWrongViews();accountPanel();patchMainList()}catch(e){console.warn('Modelo cuentas anticipos',e)}}

  function install(){
    hideWrongViews();
    window.ccAntNuevoAnticipo=newAdvance;
    if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__cuentasCorrected){const o=window.ccAntRender;const w=function(){const r=o.apply(this,arguments);setTimeout(()=>{hideWrongViews();patchMainList();},0);return r};w.__cuentasCorrected=true;window.ccAntRender=w;}
    if(typeof window.ccAntView==='function'&&!window.ccAntView.__cuentasCorrected){const o=window.ccAntView;const w=function(v,b){const r=o.apply(this,arguments);if(v==='caja')setTimeout(accountPanel,0);return r};w.__cuentasCorrected=true;window.ccAntView=w;}
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();


/* Tráfico App Profesional · Responsables y tipos de comprobante dentro de Catálogos */
(function(){
  if(window.__ccAntCatalogosCleanupV2)return;
  window.__ccAntCatalogosCleanupV2=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function cleanupNav(){
    ['cajachica','cajaspro','traspasos','catalogospro'].forEach(id=>{
      document.querySelector('.cc-ant-nav [data-antv="'+id+'"]')?.remove();
      const viewId='ccAntView'+id.charAt(0).toUpperCase()+id.slice(1);
      const v=document.getElementById(viewId);if(v)v.style.display='none';
    });
    const cajaBtn=document.querySelector('.cc-ant-nav [data-antv="caja"]');
    if(cajaBtn)cajaBtn.textContent='Cuentas / movimientos';
  }

  function modal(title,html,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100060;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget));close();await render()}catch(err){alert(err.message||err);b.disabled=false}};
  }

  async function save(tipo,item){const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:tipo,p_item:item});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo guardar');}

  function formResponsable(x={}){
    modal(x.id?'Editar responsable':'Nuevo responsable','<div class="cc-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Número empleado</label><input name="numero" value="'+esc(x.numero_empleado||'')+'"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="'+esc(x.telefono||'')+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div>',fd=>save('RESPONSABLE',{id:x.id||'',nombre:String(fd.get('nombre')||''),numeroEmpleado:String(fd.get('numero')||''),telefono:String(fd.get('telefono')||''),estatus:String(fd.get('estatus')||'ACTIVO')}));
  }

  function formTipo(x={}){
    modal(x.id?'Editar tipo de comprobante':'Nuevo tipo de comprobante','<div class="cc-grid"><div class="cc-field"><label>Tipo de comprobante *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div>',fd=>save('TIPO_COMPROBANTE',{id:x.id||'',nombre:String(fd.get('nombre')||''),estatus:String(fd.get('estatus')||'ACTIVO')}));
  }

  async function render(){
    cleanupNav();
    const root=document.getElementById('ccAntViewCatalogos');if(!root||!sb())return;
    let grid=root.querySelector('.cc-ant-report-grid');if(!grid){grid=document.createElement('div');grid.className='cc-ant-report-grid';root.appendChild(grid)}
    const r=await sb().rpc('cc_ant_prof_extra_list');if(r.error)throw r.error;const d=r.data||{};
    let resp=document.getElementById('ccAntCatResponsablesCard');if(!resp){resp=document.createElement('div');resp.id='ccAntCatResponsablesCard';resp.className='cc-config-card';grid.appendChild(resp)}
    let tipos=document.getElementById('ccAntCatTiposCompCard');if(!tipos){tipos=document.createElement('div');tipos.id='ccAntCatTiposCompCard';tipos.className='cc-config-card';grid.appendChild(tipos)}
    const rs=d.responsables||[],ts=d.tiposComprobante||[];
    resp.innerHTML='<div class="cc-toolbar"><strong>Responsables</strong><button class="cc-btn cc-btn-primary" data-add-resp>Agregar</button></div><div>'+(rs.length?rs.map(x=>'<div style="padding:8px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.numero_empleado||'')+' · '+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-resp="'+esc(x.id)+'">Editar</button></div>').join(''):'<div class="cc-note">Sin responsables registrados.</div>')+'</div>';
    tipos.innerHTML='<div class="cc-toolbar"><strong>Tipos de comprobante</strong><button class="cc-btn cc-btn-primary" data-add-tipo>Agregar</button></div><div>'+(ts.length?ts.map(x=>'<div style="padding:8px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-tipo="'+esc(x.id)+'">Editar</button></div>').join(''):'<div class="cc-note">Sin tipos de comprobante.</div>')+'</div>';
    resp.querySelector('[data-add-resp]').onclick=()=>formResponsable();resp.querySelectorAll('[data-edit-resp]').forEach(b=>b.onclick=()=>formResponsable(rs.find(x=>x.id===b.dataset.editResp)||{}));
    tipos.querySelector('[data-add-tipo]').onclick=()=>formTipo();tipos.querySelectorAll('[data-edit-tipo]').forEach(b=>b.onclick=()=>formTipo(ts.find(x=>x.id===b.dataset.editTipo)||{}));
  }

  function install(){cleanupNav();render().catch(e=>console.warn('Catálogos anticipos',e));if(typeof window.ccAntView==='function'&&!window.ccAntView.__catalogosRespTipo){const o=window.ccAntView,w=function(v,b){const r=o.apply(this,arguments);if(v==='catalogos')setTimeout(()=>render().catch(console.warn),0);cleanupNav();return r};w.__catalogosRespTipo=true;window.ccAntView=w}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();


/* Tráfico App Profesional · Cuenta única en Catálogos + KPIs por cuenta */
(function(){
  if(window.__ccAntCuentaCatalogoKpisV1)return;
  window.__ccAntCuentaCatalogoKpisV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  let cache={base:null,extra:null}, selected='';
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');

  async function load(){
    const [a,b]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);
    if(a.error)throw a.error;if(b.error)throw b.error;
    cache={base:a.data||{},extra:b.data||{}};return cache;
  }

  function cleanNav(){
    ['caja','cajachica','cajaspro','traspasos','catalogospro'].forEach(id=>document.querySelector('.cc-ant-nav [data-antv="'+id+'"]')?.remove());
    ['ccAntViewCaja','ccAntViewCajachica','ccAntViewCajaspro','ccAntViewTraspasos','ccAntViewCatalogospro'].forEach(id=>{const x=document.getElementById(id);if(x)x.style.display='none'});
  }

  function saldoCuenta(q){return Number(q?.saldo||0)}
  function renderFilter(){
    const k=document.getElementById('ccAntKpis');if(!k)return;
    let box=document.getElementById('ccAntCuentaKpiFilter');
    if(!box){box=document.createElement('div');box.id='ccAntCuentaKpiFilter';box.style='display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:0 0 10px 0;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px';k.parentNode.insertBefore(box,k)}
    const qs=active(cache.extra?.cuentas||[]);
    box.innerHTML='<div class="cc-field" style="min-width:260px;margin:0"><label>Indicadores por cuenta</label><select id="ccAntCuentaKpiSel"><option value="">Todas las cuentas</option>'+qs.map(q=>'<option value="'+esc(q.id)+'" '+(q.id===selected?'selected':'')+'>'+esc(q.nombre)+'</option>').join('')+'</select></div><div class="cc-note" style="padding-bottom:7px">Los indicadores superiores cambian según la cuenta seleccionada.</div>';
    box.querySelector('#ccAntCuentaKpiSel').onchange=e=>{selected=e.target.value||'';renderKpis()};
  }

  function renderKpis(){
    const k=document.getElementById('ccAntKpis');if(!k)return;
    const all=cache.base?.anticipos||[], rows=selected?all.filter(a=>a.cuentaId===selected):all;
    const open=rows.filter(a=>!['CANCELADO','CERRADO'].includes(String(a.estatus||'').toUpperCase()));
    const pending=open.reduce((s,a)=>s+Number(a.pendiente||0),0);
    const confirm=open.filter(a=>String(a.estatus||'').toUpperCase()==='PENDIENTE_CONFIRMAR').length;
    const people=new Set(open.filter(a=>Number(a.pendiente||0)>0).map(a=>a.operadorId||a.responsableId||a.id)).size;
    const late=open.filter(a=>Number(a.pendiente||0)>0&&a.fecha&&(Date.now()-new Date(a.fecha).getTime())/86400000>7).length;
    const qs=active(cache.extra?.cuentas||[]), balance=selected?saldoCuenta(qs.find(q=>q.id===selected)):qs.reduce((s,q)=>s+saldoCuenta(q),0);
    k.innerHTML='<div class="cc-ant-kpi"><small>Saldo '+(selected?'de cuenta':'total cuentas')+'</small><strong>'+money(balance)+'</strong></div><div class="cc-ant-kpi"><small>Pendientes confirmar</small><strong>'+confirm+'</strong></div><div class="cc-ant-kpi"><small>Total por comprobar</small><strong>'+money(pending)+'</strong></div><div class="cc-ant-kpi"><small>Personas con pendiente</small><strong>'+people+'</strong></div><div class="cc-ant-kpi"><small>+7 días</small><strong>'+late+'</strong></div>';
  }

  function modal(title,html,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100080;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(700px,97vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget));close();await refresh()}catch(err){alert(err.message||err);b.disabled=false}};
  }

  function editAccount(q={}){
    modal(q.id?'Editar cuenta':'Nueva cuenta','<div class="cc-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(q.nombre||'')+'"></div><div class="cc-field"><label>Saldo inicial</label><input name="saldo" type="number" step="0.01" value="'+Number(q.saldoInicial||0)+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(q.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(q.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px"><label><input type="checkbox" name="ops" '+(q.usoOperadores?'checked':'')+'> Anticipos a operadores</label><label><input type="checkbox" name="resp" '+(q.usoCajaChica?'checked':'')+'> Anticipos a responsables</label></div>',async fd=>{if(!fd.get('ops')&&!fd.get('resp'))throw new Error('Selecciona al menos un uso para la cuenta.');const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CUENTA',p_item:{id:q.id||'',nombre:String(fd.get('nombre')||''),tipo:'CUENTA',saldoInicial:Number(fd.get('saldo')||0),estatus:String(fd.get('estatus')||'ACTIVO'),usoOperadores:!!fd.get('ops'),usoCajaChica:!!fd.get('resp')}});if(r.error)throw r.error});
  }

  function transfer(){
    const qs=active(cache.extra?.cuentas||[]);if(qs.length<2){alert('Necesitas al menos dos cuentas activas.');return}
    const opts=qs.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');
    modal('Traspaso entre cuentas','<div class="cc-grid"><div class="cc-field"><label>Origen *</label><select name="origen" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Destino *</label><select name="destino" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Referencia</label><input name="ref"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="obs"></textarea></div>',async fd=>{if(fd.get('origen')===fd.get('destino'))throw new Error('Origen y destino deben ser distintos.');const r=await sb().rpc('cc_ant_transfer_funds',{p_item:{cuentaOrigenId:fd.get('origen'),cuentaDestinoId:fd.get('destino'),monto:Number(fd.get('monto')||0),referencia:String(fd.get('ref')||''),observaciones:String(fd.get('obs')||'')}});if(r.error)throw r.error});
  }

  function renderAccountCatalog(){
    const root=document.getElementById('ccAntViewCatalogos');if(!root)return;
    let card=[...root.querySelectorAll('.cc-config-card')].find(x=>/Cuentas/i.test(x.textContent||''));
    if(!card){const grid=root.querySelector('.cc-ant-report-grid')||root;card=document.createElement('div');card.className='cc-config-card';grid.appendChild(card)}
    const qs=cache.extra?.cuentas||[], tr=cache.extra?.traspasos||[];
    card.innerHTML='<div class="cc-toolbar"><div><strong>Cuentas</strong><div class="cc-note">Único catálogo para saldos, usos, movimientos y traspasos.</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="cc-btn cc-btn-primary" data-new>Nueva cuenta</button><button class="cc-btn cc-btn-light" data-mov>Registrar movimiento</button><button class="cc-btn cc-btn-light" data-trans>Traspaso</button></div></div><div style="overflow:auto"><table class="cc-ant-table"><thead><tr><th>CUENTA</th><th>SALDO</th><th>USO</th><th>ESTATUS</th><th></th></tr></thead><tbody>'+qs.map(q=>'<tr><td><strong>'+esc(q.nombre)+'</strong></td><td><strong>'+money(q.saldo)+'</strong></td><td>'+[(q.usoOperadores?'Operadores':''),(q.usoCajaChica?'Responsables':'')].filter(Boolean).join(' / ')+'</td><td>'+esc(q.estatus||'')+'</td><td><button class="cc-btn cc-btn-light" data-edit="'+esc(q.id)+'">Editar</button></td></tr>').join('')+'</tbody></table></div><div style="margin-top:12px"><strong>Historial de traspasos</strong><div class="cc-inv-wrap" style="max-height:200px"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>ORIGEN</th><th>DESTINO</th><th>MONTO</th></tr></thead><tbody>'+(tr.length?tr.slice(0,25).map(x=>'<tr><td>'+esc(String(x.fecha||'').slice(0,10))+'</td><td>'+esc(x.origen||'')+'</td><td>'+esc(x.destino||'')+'</td><td>'+money(x.monto)+'</td></tr>').join(''):'<tr><td colspan="4" style="text-align:center;color:#94a3b8">Sin traspasos.</td></tr>')+'</tbody></table></div></div>';
    card.querySelector('[data-new]').onclick=()=>editAccount();card.querySelector('[data-trans]').onclick=transfer;card.querySelector('[data-mov]').onclick=()=>window.ccAntMovimientoCaja?.();card.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAccount(qs.find(q=>q.id===b.dataset.edit)||{}));
  }

  async function refresh(){try{await load();cleanNav();renderFilter();renderKpis();renderAccountCatalog()}catch(e){console.warn('Cuentas/KPIs anticipos',e)}}
  function install(){cleanNav();refresh();if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__cuentaKpis){const o=window.ccAntRender,w=function(){const r=o.apply(this,arguments);setTimeout(refresh,0);return r};w.__cuentaKpis=true;window.ccAntRender=w}if(typeof window.ccAntView==='function'&&!window.ccAntView.__cuentaCatalog){const o=window.ccAntView,w=function(v,b){const r=o.apply(this,arguments);if(v==='catalogos')setTimeout(refresh,0);cleanNav();return r};w.__cuentaCatalog=true;window.ccAntView=w}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
