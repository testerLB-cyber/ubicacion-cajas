    const esperado={
      numero:String(obj.numero||'').trim(),
      descripcion:String(obj.descripcion||''),
      placasMx:String(obj.placasMx||''),
      placasUsa:String(obj.placasUsa||''),
      tipoUsoCaja:String(obj.tipoUsoCaja||''),
      marca:String(obj.marca||''),
      modelo:String(obj.modelo||''),
      tamano:String(obj.tamano||''),
      tipo:String(obj.tipo||''),
      origen:String(obj.origen||''),
      clienteId:String(obj.clienteId||''),
      capacidad:String(obj.capacidad||''),
      estatus:String(obj.estatus||''),
      observaciones:String(obj.observaciones||'')
    };
    const actual={
      numero:String(verificada.numero||'').trim(),
      descripcion:String(verificada.descripcion||''),
      placasMx:String(verificada.placasMx||''),
      placasUsa:String(verificada.placasUsa||''),
      tipoUsoCaja:String(verificada.tipoUsoCaja||''),
      marca:String(verificada.marca||''),
      modelo:String(verificada.modelo||''),
      tamano:String(verificada.tamano||''),
      tipo:String(verificada.tipo||''),
      origen:String(verificada.origen||''),
      clienteId:String(verificada.clienteId||''),
      capacidad:String(verificada.capacidad||''),
      estatus:String(verificada.estatus||''),
      observaciones:String(verificada.observaciones||'')
    };
    const diferencias=Object.keys(esperado).filter(k=>esperado[k]!==actual[k]);
    if(diferencias.length)throw new Error('Supabase no confirmó estos cambios: '+diferencias.join(', '));

    await ccAudit({operacionId:ccAuditId('UNIT'),accion:'ACTUALIZAR_UNIDAD',modulo:'INVENTARIO',submodulo:'UNIDAD',idRegistro:x.id,idUnidad:x.id,numeroUnidad:numeroNuevo,datosAnteriores:x,datosNuevos:verificada,detalle:'Unidad actualizada y verificada campo por campo en Supabase'});
    showStatus?.('UNIDAD ACTUALIZADA Y VERIFICADA EN SUPABASE','success');
    return {skipCloudSave:true};
  });
  setTimeout(ccActualizarCamposUnidadModal,0);
};
window.ccActualizarCamposUnidadModal=function(){const s=document.getElementById('ccTipoUnidadModal');if(!s)return;const t=configuracion.tiposUnidad.find(x=>x.id===s.value);const esCaja=String(t?.categoria||t?.nombre||'CAJA').toUpperCase().includes('CAJA');document.querySelectorAll('#ccForm [data-unit-field="caja"]').forEach(el=>el.style.display=esCaja?'block':'none');document.querySelectorAll('#ccForm [data-unit-field="dimensiones"]').forEach(el=>el.style.display=esCaja?'none':'grid');};
window.ccNuevoCliente=function(id){const x=clientes.find(a=>a.id===id)||{};modal(id?'Editar cliente':'Nuevo cliente',`<div class="cc-grid"><div class="cc-field"><label>Nombre / Razón social</label><input name="nombre" required value="${esc(x.nombre)}"></div><div class="cc-field"><label>Contacto</label><input name="contacto" value="${esc(x.contacto)}"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="${esc(x.telefono)}"></div><div class="cc-field"><label>Correo</label><input name="correo" type="email" value="${esc(x.correo)}"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones)}</textarea></div></div>`,f=>{const o={...x,id:x.id||uid(),nombre:f.get('nombre'),contacto:f.get('contacto'),telefono:f.get('telefono'),correo:f.get('correo'),estatus:f.get('estatus'),observaciones:f.get('observaciones')};if(id)clientes=clientes.map(a=>a.id===id?o:a);else clientes.push(o);});};
window.ccNuevoResponsable=function(id){const x=responsables.find(a=>a.id===id)||{};modal(id?'Editar responsable':'Nuevo responsable',`<div class="cc-grid"><div class="cc-field"><label>Nombre completo</label><input name="nombre" required value="${esc(x.nombre)}"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="${esc(x.telefono)}"></div><div class="cc-field"><label>Correo</label><input name="correo" type="email" value="${esc(x.correo)}"></div><div class="cc-field"><label>Área / Puesto</label><input name="puesto" value="${esc(x.puesto)}"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div></div>`,f=>{const o={...x,id:x.id||uid(),nombre:f.get('nombre'),telefono:f.get('telefono'),correo:f.get('correo'),puesto:f.get('puesto'),estatus:f.get('estatus')};if(id)responsables=responsables.map(a=>a.id===id?o:a);else responsables.push(o);});};
window.ccRentaTipoFiltroActual='CAJA';
window.ccFiltrarRentaTipo=function(tipo){window.ccRentaTipoFiltroActual=['CAJA','CARRO','TODOS'].includes(tipo)?tipo:'CAJA';const t=document.getElementById('ccRentaListadoTipoTitulo');if(t)t.textContent=window.ccRentaTipoFiltroActual==='CAJA'?'Listado de cajas en renta':window.ccRentaTipoFiltroActual==='CARRO'?'Listado de carros en renta':'Listado de unidades en renta';if(typeof ccRenderRenta==='function')ccRenderRenta();};
window.ccNuevaRenta=function(id){const x=rentas.find(a=>a.id===id)||{};const optsC=clientes.filter(a=>a.estatus!=='INACTIVO').map(a=>`<option value="${a.id}" ${x.clienteId===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');const optsR=cajas.filter(a=>a.estatus!=='INACTIVO'&&a.estatus!=='MANTENIMIENTO'&&(window.ccRentaTipoFiltroActual==='TODOS'||String(a.categoriaUnidad||a.tipoUnidadNombre||'CAJA').toUpperCase()===(window.ccRentaTipoFiltroActual||'CAJA'))).map(a=>`<option value="${a.id}" ${x.cajaId===a.id?'selected':''}>${esc(a.numero)} — ${esc(a.descripcion)}</option>`).join('');const optsP=responsables.filter(a=>a.estatus!=='INACTIVO').map(a=>`<option value="${a.id}" ${x.responsableId===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');modal(id?'Editar unidad de renta':'Nueva unidad de renta',`<div class="cc-grid"><div class="cc-field"><label>Unidad</label><select name="cajaId" required>${optsR||'<option value="">Primero registra una caja</option>'}</select></div><div class="cc-field"><label>Cliente</label><select name="clienteId" required onchange="ccActualizarTarifaRenta()">${optsC||'<option value="">Primero registra un cliente</option>'}</select></div><div class="cc-field"><label>Responsable</label><select name="responsableId" required>${optsP||'<option value="">Primero registra un responsable</option>'}</select></div><div class="cc-field"><label>Fecha de renta</label><input name="fechaInicio" type="date" required value="${esc(x.fechaInicio||iso(new Date()))}"></div><div class="cc-field"><label>Fecha fin</label><input name="fechaFin" type="date" value="${esc(x.fechaFin)}"></div><div class="cc-field"><label>Tipo de renta</label><select name="metodoCobro"><option value="DIARIO" ${x.metodoCobro==='DIARIO'||!x.metodoCobro?'selected':''}>Diario</option><option value="SEMANAL" ${x.metodoCobro==='SEMANAL'?'selected':''}>Semanal</option><option value="MENSUAL" ${x.metodoCobro==='MENSUAL'?'selected':''}>Mensual</option></select></div><div class="cc-field"><label>Renta indeterminada</label><select name="indeterminada"><option value="SI" ${x.indeterminada==='SI'?'selected':''}>SÍ</option><option value="NO" ${x.indeterminada!=='SI'?'selected':''}>NO</option></select></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones)}</textarea></div></div>`,f=>{const o={...x,id:x.id||uid(),metodoCobro:f.get('metodoCobro')||'DIARIO',tarifaId:f.get('tarifaId')||'',totalTarifa:Number(f.get('totalTarifa')||0),cajaId:f.get('cajaId'),clienteId:f.get('clienteId'),responsableId:f.get('responsableId'),fechaInicio:f.get('fechaInicio'),fechaFin:f.get('fechaFin'),indeterminada:f.get('indeterminada'),observaciones:f.get('observaciones')};if(id)rentas=rentas.map(a=>a.id===id?o:a);else rentas.push(o);});};
window.ccSacarDeRenta=function(id){
  const r=rentas.find(x=>x.id===id);if(!r)return;
  const unidad=cajas.find(x=>x.id===r.cajaId);
  const cliente=clientes.find(x=>x.id===r.clienteId);
  const etiqueta=unidad?.numero||unidad?.descripcion||'la unidad';
  const hoy=iso(new Date());
  modal('Sacar de renta · '+etiqueta,`<div style="padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:14px;color:#9a3412;font-size:12px"><strong>Salida manual de renta</strong><br>La unidad seguirá apareciendo EN RENTA, aunque esté vencida, hasta confirmar esta salida.</div><div class="cc-grid"><div class="cc-field"><label>Fecha real de salida</label><input name="fechaSalida" type="date" required min="${esc(r.fechaInicio||'')}" value="${esc(hoy)}"></div><div class="cc-field"><label>Unidad</label><input value="${esc(etiqueta)}" disabled></div><div class="cc-field"><label>Cliente</label><input value="${esc(cliente?.nombre||'—')}" disabled></div><div class="cc-field"><label>Fecha de inicio</label><input value="${esc(r.fechaInicio||'—')}" disabled></div></div>`,async f=>{
    const fechaSalida=String(f.get('fechaSalida')||'').trim();
    if(!fechaSalida)throw new Error('Selecciona la fecha real de salida.');
    if(r.fechaInicio&&fechaSalida<r.fechaInicio)throw new Error('La fecha de salida no puede ser anterior a la fecha de inicio.');
    const antes=JSON.parse(JSON.stringify(r));
    showStatus?.('Finalizando renta en Supabase...','info');
    const {data,error}=await gmSupabase.rpc('cc_finalize_renta',{p_renta_id:id,p_fecha:fechaSalida});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||'No se pudo finalizar la renta');
    ccRevision=Number(data.revision||ccRevision+1);
    r.fechaFin=fechaSalida;r.indeterminada='NO';r.estatus='FINALIZADA';r.finalizadaEn=new Date().toISOString();
    r.observaciones=(r.observaciones?String(r.observaciones)+' | ':'')+`Renta finalizada manualmente. Fecha real de salida: ${fechaSalida}.`;
    Object.keys(matriz).forEach(k=>{if(k.startsWith(r.id+'_')&&k.slice(r.id.length+1)>=fechaSalida)delete matriz[k];});
    await ccAudit({operacionId:ccAuditId('RENTA'),accion:'SACAR_DE_RENTA',modulo:'RENTA',submodulo:'SALIDA',idRegistro:r.id,idUnidad:unidad?.id||'',numeroUnidad:unidad?.numero||'',idCliente:r.clienteId||'',idRenta:r.id,estatusAnterior:'ACTIVA',estatusNuevo:'FINALIZADA',datosAnteriores:antes,datosNuevos:r,fechaNueva:fechaSalida,detalle:'Renta finalizada manualmente con fecha real de salida '+fechaSalida});
    showStatus?.(`${etiqueta} salió de renta con fecha ${fechaSalida} y ahora está disponible.`,'success');
    return {skipCloudSave:true};
  });
};

window.ccUploadMantenimientoEvidencia=async function(file,unidadId){
  if(!file)return '';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('La evidencia debe ser JPG, PNG o WEBP.');
  if(file.size>5*1024*1024)throw new Error('La imagen no puede pesar más de 5 MB.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=`${unidadId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  const {error}=await gmSupabase.storage.from('cc-mantenimiento').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(error)throw error;
  const {data}=gmSupabase.storage.from('cc-mantenimiento').getPublicUrl(path);
  return data?.publicUrl||'';
};

window.ccPonerMantenimiento=async function(id){
  const x=cajas.find(a=>a.id===id);
  if(!x)return;
  if(x.estatus==='MANTENIMIENTO'){alert('Esta unidad ya está en mantenimiento.');return;}
  document.getElementById('ccMantEntradaModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccMantEntradaModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#991b1b;color:#fff;display:flex;justify-content:space-between;align-items:center"><strong>FUERA DE SERVICIO · ${esc(x.numero||x.descripcion||'UNIDAD')}</strong><button type="button" id="ccMantEntradaCerrar" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button></div>
    <form id="ccMantEntradaForm" style="padding:18px">
      <div class="cc-field"><label>Motivo del mantenimiento *</label><textarea name="motivo" required placeholder="Describe la falla o motivo por el que sale de servicio"></textarea></div>
      <div class="cc-field" style="margin-top:12px"><label>Foto de evidencia (opcional)</label><input name="evidencia" type="file" accept="image/jpeg,image/png,image/webp"><div class="cc-note">JPG, PNG o WEBP · máximo 5 MB. La foto se guardará en Supabase y se incluirá en el PDF.</div></div>
      <div id="ccMantPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" id="ccMantEntradaCancelar">Cancelar</button><button class="cc-btn cc-btn-maintenance">Confirmar fuera de servicio</button></div>
    </form>
  </div>`;
  document.body.appendChild(ov);
  const cerrar=()=>ov.remove();
  ov.querySelector('#ccMantEntradaCerrar').onclick=cerrar;
  ov.querySelector('#ccMantEntradaCancelar').onclick=cerrar;
  const input=ov.querySelector('input[name="evidencia"]');
  input.onchange=()=>{const file=input.files?.[0];const box=ov.querySelector('#ccMantPreview');if(!file){box.style.display='none';return;}box.querySelector('img').src=URL.createObjectURL(file);box.style.display='block';};
  ov.querySelector('#ccMantEntradaForm').onsubmit=async e=>{
