    e.preventDefault();
    const motivo=String(new FormData(e.target).get('motivo')||'').trim();
    if(!motivo)return;
    const file=input.files?.[0]||null;
    try{
      const btn=e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
      showStatus?.('Enviando unidad a mantenimiento en Supabase...','info');
      let evidenciaUrl='';
      if(file){showStatus?.('Subiendo foto de evidencia...','info');evidenciaUrl=await ccUploadMantenimientoEvidencia(file,x.id);}
      const fecha=new Date().toISOString();
      const {data,error}=await gmSupabase.rpc('cc_start_maintenance',{p_unidad_id:x.id,p_motivo:motivo,p_fecha:fecha,p_evidencia_url:evidenciaUrl||null});
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo enviar a mantenimiento');
      ccRevision=Number(data?.revision||ccRevision);
      const record=data?.record||{};
      cerrar();
      await ccReloadFromDatabase();
      const unidadActual=cajas.find(a=>a.id===id)||x;
      await ccAudit({operacionId:ccAuditId('MANT'),accion:'ENTRADA_MANTENIMIENTO',modulo:'MANTENIMIENTO',submodulo:'ENTRADA',idRegistro:record.id||'',idUnidad:id,numeroUnidad:unidadActual.numero||'',idCliente:unidadActual.clienteId||'',idMantenimiento:record.id||'',estatusAnterior:x.estatus,estatusNuevo:'MANTENIMIENTO',datosNuevos:record,detalle:motivo});
      showStatus?.('UNIDAD EN MANTENIMIENTO · Guardado en Supabase','success');
      await ccGenerarPDFMantenimiento(record,unidadActual);
      await ccEnviarAvisoMantenimiento(unidadActual,record,'ENTRADA');
    }catch(err){console.error('ERROR ENVIANDO A MANTENIMIENTO:',err);showStatus?.('ERROR: no se envió a mantenimiento · '+(err.message||err),'error');alert('No se pudo poner la unidad fuera de servicio:\n'+(err.message||err));const btn=e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=false;btn.textContent='Confirmar fuera de servicio';}}
  };
};

window.ccLiberarMantenimiento=async function(id){
  const x=cajas.find(a=>a.id===id);
  if(!x)return;
  if(x.estatus!=='MANTENIMIENTO'){alert('Esta unidad no está en mantenimiento.');return;}
  const recActual=(configuracion.mantenimientoHistorial||[]).find(r=>r.cajaId===x.id&&!r.fechaLiberacion)||
                  (configuracion.mantenimientoHistorial||[]).find(r=>r.id===x.mantenimientoRecordId);

  document.getElementById('ccMantLiberarModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccMantLiberarModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#166534;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>LIBERAR UNIDAD · ${esc(x.numero||x.descripcion||'UNIDAD')}</strong>
      <button type="button" id="ccMantLibCerrar" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccMantLibForm" style="padding:18px">
      <div class="cc-field"><label>¿Qué se reparó? *</label><textarea name="reparacion" required placeholder="Describe el trabajo realizado, piezas cambiadas o reparación efectuada"></textarea></div>
      <div class="cc-field" style="margin-top:12px">
        <label>Foto de evidencia de liberación (opcional)</label>
        <input name="evidenciaLiberacion" type="file" accept="image/jpeg,image/png,image/webp">
        <div class="cc-note">JPG, PNG o WEBP · máximo 5 MB. En el correo y PDF de liberación se incluirán esta foto y la evidencia original de fuera de servicio cuando existan.</div>
      </div>
      ${recActual?.evidenciaUrl?`<div class="cc-note" style="margin-top:10px;color:#1e40af"><i class="fa-solid fa-camera mr-1"></i>Ya existe evidencia de entrada a mantenimiento y se conservará para el cierre.</div>`:''}
      <div id="ccMantLibPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccMantLibCancelar">Cancelar</button>
        <button class="cc-btn cc-btn-primary" type="submit">Liberar unidad</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);
  const cerrar=()=>ov.remove();
  ov.querySelector('#ccMantLibCerrar').onclick=cerrar;
  ov.querySelector('#ccMantLibCancelar').onclick=cerrar;

  const input=ov.querySelector('input[name="evidenciaLiberacion"]');
  input.onchange=()=>{
    const file=input.files?.[0];
    const box=ov.querySelector('#ccMantLibPreview');
    if(!file){box.style.display='none';return;}
    box.querySelector('img').src=URL.createObjectURL(file);
    box.style.display='block';
  };

  ov.querySelector('#ccMantLibForm').onsubmit=async e=>{
    e.preventDefault();
    const reparacion=String(new FormData(e.target).get('reparacion')||'').trim();
    if(!reparacion)return;
    const file=input.files?.[0]||null;
    const btn=e.target.querySelector('button[type="submit"]');

    try{
      if(btn){btn.disabled=true;btn.textContent='Liberando...';}
      showStatus?.('Liberando unidad de mantenimiento...','info');

      let evidenciaLiberacionUrl='';
      if(file){
        showStatus?.('Subiendo foto de liberación...','info');
        evidenciaLiberacionUrl=await ccUploadMantenimientoEvidencia(file,x.id);
      }

      const {data,error}=await gmSupabase.rpc('cc_release_maintenance',{
        p_unidad_id:x.id,
        p_reparacion:reparacion,
        p_fecha:new Date().toISOString(),
        p_evidencia_liberacion_url:evidenciaLiberacionUrl||null
      });
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo liberar mantenimiento');

      ccRevision=Number(data?.revision||ccRevision);
      const record=data?.record||{};
      cerrar();
      await ccReloadFromDatabase();

      const unidadActual=cajas.find(a=>a.id===id)||x;
      const recordActual=(configuracion.mantenimientoHistorial||[]).find(r=>r.id===record.id)||record;

