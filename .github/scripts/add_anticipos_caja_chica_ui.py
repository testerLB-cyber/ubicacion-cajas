from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists():
    raise SystemExit('No existe anticipos-profesional-flow.js')

extra=r'''

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
'''

text=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Caja chica, responsables, cajas y traspasos */'
if marker not in text:
    P.write_text(text+extra,encoding='utf-8')
print('Caja chica, cajas, responsables, autocompletado, tipos de comprobante y traspasos integrados')
