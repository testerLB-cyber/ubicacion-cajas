function ccAuditId(prefix='OP'){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);}

const save=()=>ccCloudSave('ACTUALIZACION');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7); const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); const fmtDate=d=>new Date(d+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'});
window.ccTab=function(tab,btn){document.querySelectorAll('#controlCajasSection .cc-tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('#controlCajasSection .cc-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const panel=document.getElementById('ccPanel'+tab.charAt(0).toUpperCase()+tab.slice(1));panel?.classList.add('active');requestAnimationFrame(()=>{if(tab==='anticipos'&&typeof ccAntLoad==='function')ccAntLoad();else if(tab==='dashboard')ccRenderDashboard();else if(tab==='inventario')ccRenderInventario();else if(tab==='renta')ccRenderRenta();else if(tab==='historial')ccRenderHistorial();else if(tab==='proforma'&&typeof ccRenderProforma==='function')ccRenderProforma();else if(tab==='mantenimiento')ccRenderMantenimiento();else if(tab==='mapa')ccCargarMapaUnidades();else if(tab==='configuracion')ccRenderConfiguracion();});};
function modal(title,body,onSave){document.getElementById('ccFormModal')?.remove();const d=document.createElement('div');d.id='ccFormModal';d.dataset.auditTitle=title;d.style='position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px';d.innerHTML=`<div style="background:#fff;width:min(760px,96vw);max-height:92vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>${esc(title)}</strong><button type="button" onclick="this.closest('#ccFormModal').remove()" style="color:#fff;font-size:18px">×</button></div><form id="ccForm" style="padding:18px">${body}<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" onclick="this.closest('#ccFormModal').remove()">Cancelar</button><button class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>`;document.body.appendChild(d);d.querySelector('#ccForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button[type=submit]');if(btn){btn.disabled=true;btn.textContent='Guardando...';}const operationId=ccAuditId('OP');const before=JSON.parse(JSON.stringify(ccState()));try{const saveResult=await onSave(new FormData(e.target));const after=JSON.parse(JSON.stringify(ccState()));if(!saveResult?.skipCloudSave){const result=await ccCloudSave('FORMULARIO');if(!result?.ok)throw new Error(result?.error||'Supabase rechazó el guardado');await ccAudit({operacionId:operationId,accion:'GUARDAR_FORMULARIO',modulo:'CONTROL_CAJA',submodulo:title,idRegistro:'',datosAnteriores:before,datosNuevos:after,detalle:'Formulario guardado y verificado en Supabase: '+title});}d.remove();ccRenderAll();}catch(err){console.error('GUARDADO DE FORMULARIO:',err);if(btn){btn.disabled=false;btn.textContent='Guardar';}showStatus?.('NO SE GUARDÓ · '+(err.message||err),'error');alert('No se guardó en Supabase.\n\n'+(err.message||err));}};}

window.ccEditarUnidadDirecto=function(id){
  const x=cajas.find(u=>u.id===id);
  if(!x){alert('No se encontró la unidad.');return;}

  const tipos=(configuracion.tiposUnidad||[]).filter(t=>t.estatus!=='INACTIVO');
  const usos=(configuracion.tiposUsoCaja||[]).filter(u=>u.estatus!=='INACTIVO');
  const tipoActual=x.tipoUnidadId||'tipo_caja';
  const optsTipos=tipos.map(t=>`<option value="${esc(t.id)}" ${t.id===tipoActual?'selected':''}>${esc(t.nombre)}</option>`).join('');
  const optsUsos=usos.map(u=>`<option value="${esc(u.nombre)}" ${u.nombre===x.tipoUsoCaja?'selected':''}>${esc(u.nombre)}</option>`).join('');
  const optsClientes=clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${esc(c.id)}" ${c.id===x.clienteId?'selected':''}>${esc(c.nombre)}</option>`).join('');

  document.getElementById('ccEditUnitModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccEditUnitModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`<div style="background:#fff;width:min(780px,96vw);max-height:94vh;overflow:auto;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>EDITAR UNIDAD · ${esc(x.numero||'')}</strong>
      <button type="button" id="ccEditUnitClose" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccEditUnitForm" style="padding:18px">
      <div class="cc-grid">
        <div class="cc-field"><label>Tipo de unidad</label><select name="tipoUnidadId" required>${optsTipos}</select></div>
        <div class="cc-field"><label>Identificador / Número</label><input name="numero" required value="${esc(x.numero||'')}"></div>
        <div class="cc-field"><label>Descripción</label><input name="descripcion" required value="${esc(x.descripcion||'')}"></div>
        <div class="cc-field"><label>Placas MX</label><input name="placasMx" value="${esc(x.placasMx||x.placas||'')}"></div>
        <div class="cc-field"><label>Placas USA</label><input name="placasUsa" value="${esc(x.placasUsa||'')}"></div>
        <div class="cc-field"><label>Marca</label><input name="marca" value="${esc(x.marca||'')}"></div>
        <div class="cc-field"><label>Modelo / Año</label><input name="modelo" value="${esc(x.modelo||'')}"></div>
        <div class="cc-field"><label>Tamaño</label><input name="tamano" value="${esc(x.tamano||'')}"></div>
        <div class="cc-field"><label>Tipo de uso de caja</label><select name="tipoUsoCaja"><option value="">Sin uso</option>${optsUsos}</select></div>
        <div class="cc-field"><label>Tipo / Configuración</label><input name="tipo" value="${esc(x.tipo||'')}"></div>
        <div class="cc-field"><label>Origen</label><select name="origen"><option value="MEXICANA" ${x.origen==='MEXICANA'||!x.origen?'selected':''}>MEXICANA</option><option value="USA" ${x.origen==='USA'?'selected':''}>USA</option></select></div>
        <div class="cc-field"><label>Cliente asignado</label><select name="clienteId"><option value="">Sin cliente</option>${optsClientes}</select></div>
        <div class="cc-field"><label>Capacidad</label><input name="capacidad" value="${esc(x.capacidad||'')}"></div>
        <div class="cc-field"><label>Estatus</label><select name="estatus"><option value="ACTIVO" ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option value="INACTIVO" ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option><option value="MANTENIMIENTO" ${x.estatus==='MANTENIMIENTO'?'selected':''}>MANTENIMIENTO</option></select></div>
        <div class="cc-field"><label>Largo (ft)</label><input name="largoFt" type="number" step="0.01" min="0" value="${esc(x.largoFt||'')}"></div>
        <div class="cc-field"><label>Ancho (ft)</label><input name="anchoFt" type="number" step="0.01" min="0" value="${esc(x.anchoFt||'')}"></div>
        <div class="cc-field"><label>Alto (ft)</label><input name="altoFt" type="number" step="0.01" min="0" value="${esc(x.altoFt||'')}"></div>
        <div class="cc-field full"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones||'')}</textarea></div>
      </div>
      <div id="ccEditUnitStatus" class="cc-note" style="margin-top:10px">Los cambios se guardarán directamente en Supabase.</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccEditUnitCancel">Cancelar</button>
        <button type="submit" class="cc-btn cc-btn-primary" id="ccEditUnitSave"><i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);

  const close=()=>ov.remove();
  ov.querySelector('#ccEditUnitClose').onclick=close;
  ov.querySelector('#ccEditUnitCancel').onclick=close;

  ov.querySelector('#ccEditUnitForm').onsubmit=async e=>{
    e.preventDefault();
    e.stopPropagation();
    const fd=new FormData(e.currentTarget);
    const btn=ov.querySelector('#ccEditUnitSave');
    const status=ov.querySelector('#ccEditUnitStatus');
    btn.disabled=true;
    btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Guardando en Supabase...';
    status.textContent='Enviando cambios a PostgreSQL...';

    try{
      const tipo=configuracion.tiposUnidad.find(t=>t.id===fd.get('tipoUnidadId'));
      const numero=String(fd.get('numero')||'').trim();
      if(!numero)throw new Error('El número de unidad es obligatorio.');
      const dup=cajas.find(u=>u.id!==x.id&&String(u.numero||'').trim().toUpperCase()===numero.toUpperCase());
      if(dup)throw new Error('Ya existe otra unidad con el número '+numero+'.');

      const obj={
        ...x,
        id:x.id,
        tipoUnidadId:String(fd.get('tipoUnidadId')||''),
        tipoUnidadNombre:tipo?.nombre||x.tipoUnidadNombre||'CAJA',
        categoriaUnidad:tipo?.categoria||x.categoriaUnidad||'CAJA',
        numero,
        descripcion:String(fd.get('descripcion')||'').trim(),
        placasMx:String(fd.get('placasMx')||'').trim(),
        placasUsa:String(fd.get('placasUsa')||'').trim(),
        placas:String(fd.get('placasMx')||fd.get('placasUsa')||'').trim(),
        tipoUsoCaja:String(fd.get('tipoUsoCaja')||'').trim(),
        marca:String(fd.get('marca')||'').trim(),
        modelo:String(fd.get('modelo')||'').trim(),
        tamano:String(fd.get('tamano')||'').trim(),
        tipo:String(fd.get('tipo')||'').trim(),
        origen:String(fd.get('origen')||'').trim(),
        clienteId:String(fd.get('clienteId')||'').trim(),
        capacidad:String(fd.get('capacidad')||'').trim(),
        estatus:String(fd.get('estatus')||'ACTIVO').trim(),
        largoFt:Number(fd.get('largoFt')||0),
        anchoFt:Number(fd.get('anchoFt')||0),
        altoFt:Number(fd.get('altoFt')||0),
        largo:Number(fd.get('largoFt')||0)*0.3048,
        ancho:Number(fd.get('anchoFt')||0)*0.3048,
        alto:Number(fd.get('altoFt')||0)*0.3048,
        observaciones:String(fd.get('observaciones')||'').trim()
      };

