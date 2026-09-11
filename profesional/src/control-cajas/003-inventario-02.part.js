      const {data,error}=await gmSupabase.rpc('cc_update_unit',{p_unidad:obj});
      if(error)throw new Error(error.message||String(error));
      if(!data?.ok)throw new Error(data?.detalle||data?.error||'Supabase rechazó la actualización.');

      status.textContent='Cambio aceptado. Verificando directamente en la base...';

      const {data:loaded,error:loadErr}=await gmSupabase.rpc('cc_load_all');
      if(loadErr)throw new Error(loadErr.message||String(loadErr));
      const dbUnits=Array.isArray(loaded?.state?.cajas)?loaded.state.cajas:[];
      const saved=dbUnits.find(u=>u.id===x.id);
      if(!saved)throw new Error('La unidad no apareció al verificar Supabase.');

      const fields=['numero','descripcion','placasMx','placasUsa','tipoUsoCaja','marca','modelo','tamano','tipo','origen','clienteId','capacidad','estatus','observaciones'];
      const diff=fields.filter(k=>String(saved[k]??'')!==String(obj[k]??''));
      if(diff.length)throw new Error('Supabase no confirmó: '+diff.join(', '));

      ccRevision=Number(loaded?.revision||ccRevision);
      ccNormalizeState(loaded?.state||{});
      ccRenderAll();

      await ccAudit({
        operacionId:ccAuditId('UNIT'),
        accion:'ACTUALIZAR_UNIDAD',
        modulo:'INVENTARIO',
        submodulo:'EDICION_DIRECTA',
        idRegistro:x.id,
        idUnidad:x.id,
        numeroUnidad:numero,
        datosAnteriores:x,
        datosNuevos:saved,
        detalle:'Edición directa confirmada en Supabase'
      });

      showStatus?.('UNIDAD ACTUALIZADA CORRECTAMENTE EN SUPABASE','success');
      alert('Unidad actualizada correctamente en Supabase.');
      close();
    }catch(err){
      console.error('EDITAR UNIDAD DIRECTO:',err);
      status.textContent='ERROR: '+(err.message||err);
      status.style.color='#b91c1c';
      btn.disabled=false;
      btn.innerHTML='<i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios';
      alert('No se pudo actualizar la unidad.\n\n'+(err.message||err));
    }
  };
};

window.ccNuevaCaja=function(id){
  const x=cajas.find(a=>a.id===id)||{};
  const tipos=(configuracion.tiposUnidad||[]).filter(t=>t.estatus!=='INACTIVO');
  const tipoActual=x.tipoUnidadId||tipos.find(t=>String(t.nombre).toUpperCase()==='CAJA')?.id||'tipo_caja';
  const optsTipos=tipos.map(t=>`<option value="${t.id}" ${tipoActual===t.id?'selected':''}>${esc(t.nombre)}</option>`).join('');
  const opts=clientes.filter(a=>a.estatus!=='INACTIVO').map(a=>`<option value="${a.id}" ${x.clienteId===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('');
  const usos=(configuracion.tiposUsoCaja||[]).filter(u=>u.estatus!=='INACTIVO');
  const optsUsos=usos.map(u=>`<option value="${u.nombre}" ${x.tipoUsoCaja===u.nombre?'selected':''}>${esc(u.nombre)}</option>`).join('');
  const html=`<div class="cc-grid"><div class="cc-field"><label>Tipo de unidad</label><select name="tipoUnidadId" id="ccTipoUnidadModal" required onchange="ccActualizarCamposUnidadModal()">${optsTipos}</select></div><div class="cc-field"><label>Identificador / Número</label><input name="numero" required value="${esc(x.numero)}"></div><div class="cc-field"><label>Descripción</label><input name="descripcion" required value="${esc(x.descripcion)}"></div><div class="cc-field"><label>Placas MX</label><input name="placasMx" value="${esc(x.placasMx||x.placas||'')}" placeholder="Placas México"></div><div class="cc-field"><label>Placas USA</label><input name="placasUsa" value="${esc(x.placasUsa||'')}" placeholder="Placas Estados Unidos"></div><div class="cc-field"><label>Marca</label><input name="marca" value="${esc(x.marca)}"></div><div class="cc-field"><label>Modelo / Año</label><input name="modelo" value="${esc(x.modelo)}"></div><div class="cc-field" data-unit-field="caja"><label>Tamaño</label><input name="tamano" placeholder="53 FT, 48 FT..." value="${esc(x.tamano)}"></div><div class="cc-field" data-unit-field="caja"><label>Tipo de uso *</label><select name="tipoUsoCaja"><option value="">Selecciona uso</option>${optsUsos}</select></div><div class="cc-grid" data-unit-field="dimensiones" style="grid-column:1/-1;grid-template-columns:repeat(3,1fr);gap:10px"><div class="cc-field"><label>Largo</label><input name="largoFt" type="number" step="0.01" min="0" value="${esc(x.largoFt||(x.largo?Number(x.largo)/0.3048:''))}"></div><div class="cc-field"><label>Ancho</label><input name="anchoFt" type="number" step="0.01" min="0" value="${esc(x.anchoFt||(x.ancho?Number(x.ancho)/0.3048:''))}"></div><div class="cc-field"><label>Alto</label><input name="altoFt" type="number" step="0.01" min="0" value="${esc(x.altoFt||(x.alto?Number(x.alto)/0.3048:''))}"></div></div><div class="cc-field"><label>Tipo / Configuración</label><input name="tipo" value="${esc(x.tipo)}"></div><div class="cc-field"><label>Origen</label><select name="origen"><option value="MEXICANA" ${x.origen==='MEXICANA'||!x.origen?'selected':''}>MEXICANA</option><option value="USA" ${x.origen==='USA'?'selected':''}>USA</option></select></div><div class="cc-field"><label>Cliente asignado</label><select name="clienteId"><option value="">Sin cliente</option>${opts}</select></div><div class="cc-field"><label>Capacidad</label><input name="capacidad" value="${esc(x.capacidad)}"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option><option ${x.estatus==='MANTENIMIENTO'?'selected':''}>MANTENIMIENTO</option></select></div><div class="cc-field full"><label>Observaciones</label><textarea name="observaciones">${esc(x.observaciones)}</textarea></div></div><div class="cc-note" style="margin-top:10px"><i class="fa-solid fa-shield-halved mr-1"></i>El <b>Identificador / Número</b> es único y no puede repetirse en otra unidad.</div>`;

  if(!id){
    modal('Nueva unidad',html,f=>{
      const tipo=configuracion.tiposUnidad.find(t=>t.id===f.get('tipoUnidadId'));
      const esCajaNueva=String(tipo?.categoria||tipo?.nombre||'').toUpperCase().includes('CAJA');
      if(esCajaNueva&&!String(f.get('tipoUsoCaja')||'').trim())throw new Error('Selecciona el tipo de uso de la caja.');
      const numeroNuevo=String(f.get('numero')||'').trim();
      const duplicada=cajas.find(u=>String(u.numero||'').trim().toUpperCase()===numeroNuevo.toUpperCase());
      if(duplicada)throw new Error('Ya existe una unidad registrada con el código / número '+numeroNuevo+'.');
      cajas.push({id:uid(),tipoUnidadId:f.get('tipoUnidadId'),tipoUnidadNombre:tipo?.nombre||'CAJA',categoriaUnidad:tipo?.categoria||'CAJA',numero:numeroNuevo,descripcion:f.get('descripcion'),placasMx:String(f.get('placasMx')||'').trim(),placasUsa:String(f.get('placasUsa')||'').trim(),placas:String(f.get('placasMx')||f.get('placasUsa')||'').trim(),tipoUsoCaja:String(f.get('tipoUsoCaja')||'').trim(),marca:f.get('marca'),modelo:f.get('modelo'),tamano:f.get('tamano'),largoFt:Number(f.get('largoFt')||0),anchoFt:Number(f.get('anchoFt')||0),altoFt:Number(f.get('altoFt')||0),largo:Number(f.get('largoFt')||0)*0.3048,ancho:Number(f.get('anchoFt')||0)*0.3048,alto:Number(f.get('altoFt')||0)*0.3048,tipo:f.get('tipo'),origen:f.get('origen'),clienteId:f.get('clienteId'),capacidad:f.get('capacidad'),estatus:f.get('estatus'),observaciones:f.get('observaciones')});
    });
    setTimeout(ccActualizarCamposUnidadModal,0);
    return;
  }

  modal('Editar unidad',html,async f=>{
    const tipo=configuracion.tiposUnidad.find(t=>t.id===f.get('tipoUnidadId'));
    const esCajaNueva=String(tipo?.categoria||tipo?.nombre||'').toUpperCase().includes('CAJA');
    if(esCajaNueva&&!String(f.get('tipoUsoCaja')||'').trim())throw new Error('Selecciona el tipo de uso de la caja.');
    const numeroNuevo=String(f.get('numero')||'').trim();
    const duplicada=cajas.find(u=>u.id!==x.id&&String(u.numero||'').trim().toUpperCase()===numeroNuevo.toUpperCase());
    if(duplicada)throw new Error('Ya existe una unidad registrada con el código / número '+numeroNuevo+'.');
    const obj={...x,id:x.id,tipoUnidadId:f.get('tipoUnidadId'),tipoUnidadNombre:tipo?.nombre||'CAJA',categoriaUnidad:tipo?.categoria||'CAJA',numero:numeroNuevo,descripcion:f.get('descripcion'),placasMx:String(f.get('placasMx')||'').trim(),placasUsa:String(f.get('placasUsa')||'').trim(),placas:String(f.get('placasMx')||f.get('placasUsa')||'').trim(),tipoUsoCaja:String(f.get('tipoUsoCaja')||'').trim(),marca:f.get('marca'),modelo:f.get('modelo'),tamano:f.get('tamano'),largoFt:Number(f.get('largoFt')||0),anchoFt:Number(f.get('anchoFt')||0),altoFt:Number(f.get('altoFt')||0),largo:Number(f.get('largoFt')||0)*0.3048,ancho:Number(f.get('anchoFt')||0)*0.3048,alto:Number(f.get('altoFt')||0)*0.3048,tipo:f.get('tipo'),origen:f.get('origen'),clienteId:f.get('clienteId'),capacidad:f.get('capacidad'),estatus:f.get('estatus'),observaciones:f.get('observaciones')};
    const {data,error}=await gmSupabase.rpc('cc_update_unit',{p_unidad:obj});
    if(error)throw error;
    if(data?.ok===false)throw new Error((data?.detalle||data?.error||'Supabase rechazó la actualización'));
    if(!data?.unidad)throw new Error('Supabase no devolvió la unidad actualizada.');

    // Sincroniza inmediatamente el registro local con la respuesta real de PostgreSQL.
    cajas=cajas.map(u=>u.id===x.id?data.unidad:u);
    ccRevision=Number(data?.revision||ccRevision);
    ccRenderInventario();

    // Verificación real: volver a leer toda la base y comparar los campos editados.
    const reload=await ccReloadFromDatabase();
    if(!reload?.ok)throw new Error(reload?.error||'No se pudo verificar la actualización en Supabase.');
    const verificada=cajas.find(u=>u.id===x.id);
    if(!verificada)throw new Error('La unidad actualizada no apareció al volver a leer Supabase.');

