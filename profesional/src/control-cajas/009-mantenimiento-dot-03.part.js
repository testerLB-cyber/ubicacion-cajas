window.ccAbrirDotRegistro=function(id){
  const unidad=cajas.find(x=>x.id===id);
  if(!unidad)return;
  document.getElementById('ccDotModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccDotModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  const hoy=iso(new Date());
  const clientesOpts=clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>REGISTRO DOT · ${esc(unidad.numero||unidad.descripcion||'UNIDAD')}</strong>
      <button type="button" id="ccDotCerrar" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccDotForm" style="padding:18px">
      <div class="cc-grid">
        <div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="${hoy}"></div>
        <div class="cc-field"><label>Cliente (opcional)</label><select name="clienteId"><option value="">Sin cliente</option>${clientesOpts}</select></div>
      </div>
      <div class="cc-field" style="margin-top:10px"><label>Breve descripción *</label><textarea name="descripcion" required placeholder="Describe brevemente el motivo o trabajo DOT"></textarea></div>
      <div class="cc-field" style="margin-top:10px"><label>Foto de evidencia (opcional)</label><input name="evidencia" type="file" accept="image/jpeg,image/png,image/webp"><div class="cc-note">JPG, PNG o WEBP · máximo 5 MB.</div></div>
      <div id="ccDotPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccDotCancelar">Cancelar</button>
        <button type="submit" class="cc-btn cc-btn-dot">Guardar DOT</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();
  ov.querySelector('#ccDotCerrar').onclick=close;
  ov.querySelector('#ccDotCancelar').onclick=close;
  const inp=ov.querySelector('input[name="evidencia"]');
  inp.onchange=()=>{
    const f=inp.files?.[0],box=ov.querySelector('#ccDotPreview');
    if(!f){box.style.display='none';return;}
    box.querySelector('img').src=URL.createObjectURL(f);box.style.display='block';
  };
  ov.querySelector('#ccDotForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const fecha=String(fd.get('fecha')||'');
    const clienteId=String(fd.get('clienteId')||'');
    const descripcion=String(fd.get('descripcion')||'').trim();
    const file=inp.files?.[0]||null;
    const btn=e.target.querySelector('button[type="submit"]');
    try{
      btn.disabled=true;btn.textContent='Guardando...';
      showStatus?.('Guardando registro DOT en Supabase...','info');
      let evidenciaUrl='';
      if(file)evidenciaUrl=await ccDotUpload(file,unidad.id);
      const {data,error}=await gmSupabase.rpc('cc_dot_create',{
        p_unidad_id:unidad.id,p_fecha:fecha,p_cliente_id:clienteId||null,p_descripcion:descripcion,p_evidencia_url:evidenciaUrl||null
      });
      if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo guardar DOT');
      const dotRegistro=data?.registro||{};
      await ccAudit({operacionId:ccAuditId('DOT'),accion:'REGISTRO_DOT',modulo:'DOT',submodulo:'ENTRADA',idRegistro:dotRegistro.id||'',idUnidad:unidad.id,numeroUnidad:unidad.numero||'',idCliente:clienteId,fechaNueva:fecha,detalle:descripcion,datosNuevos:dotRegistro});
      close();
      showStatus?.('REGISTRO DOT GUARDADO · Enviando correo...','success');

      let mailOk=false;
      try{
        if((configuracion.correosMantenimiento||[]).length && dotRegistro.id){
          const {data:mailData,error:mailError}=await gmSupabase.functions.invoke('cc-send-maintenance-email',{
            body:{recordId:dotRegistro.id,evento:'DOT'}
          });
          if(mailError)throw mailError;
          if(mailData?.ok===false)throw new Error(mailData.message||mailData.error||'No se pudo enviar el correo DOT');
          mailOk=true;
          await ccAudit({
            operacionId:ccAuditId('DOTMAIL'),
            accion:'AVISO_DOT_ENVIADO',
            modulo:'DOT',
            submodulo:'CORREO',
            idRegistro:dotRegistro.id,
            idUnidad:unidad.id,
            numeroUnidad:unidad.numero||'',
            idCliente:clienteId,
            fechaNueva:fecha,
            detalle:'Correo automático DOT enviado a destinatarios configurados'+(mailData?.attachments?` · ${mailData.attachments} adjunto(s)`:'' )
          });
        }
      }catch(mailErr){
        console.error('CORREO DOT:',mailErr);
        showStatus?.('DOT GUARDADO · Error al enviar correo: '+(mailErr.message||mailErr),'error');
      }

      if(mailOk)showStatus?.('REGISTRO DOT GUARDADO · CORREO ENVIADO','success');
      else if(!(configuracion.correosMantenimiento||[]).length)showStatus?.('REGISTRO DOT GUARDADO · Sin destinatarios configurados','success');
      await ccMostrarDotControl();
    }catch(err){
      console.error('DOT:',err);btn.disabled=false;btn.textContent='Guardar DOT';
      showStatus?.('ERROR DOT · '+(err.message||err),'error');alert('No se pudo guardar el registro DOT.\n\n'+(err.message||err));
    }
  };
};

