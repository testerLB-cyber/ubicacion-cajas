    showStatus?.(`IMPORTACIÓN COMPLETA · ${nuevos.length} unidades guardadas y verificadas en Supabase`,'success');
    alert(`Importación completa.\n\n${nuevos.length} unidades fueron guardadas y verificadas en Supabase.`);
    return {ok:true,cantidad:nuevos.length};
  }catch(err){
    console.error('IMPORTACION UNIDADES:',err);
    showStatus?.('ERROR DE IMPORTACIÓN · '+(err.message||err),'error');
    alert('No se pudo completar la importación en Supabase.\n\n'+(err.message||err));
    return {ok:false,error:err.message||String(err)};
  }
};
document.addEventListener('click',function(e){
  const btn=e.target.closest('#controlCajasSection button');
  if(!btn)return;
  const txt=(btn.innerText||btn.textContent||'').trim().replace(/\s+/g,' ');
  if(!txt)return;
  if(/^(Editar|Eliminar|Liberar|FUERA DE SERVICIO|Guardar|Cancelar|Volver|Cerrar|Limpiar|Todos|Cajas|Carros|Todas|General|Revisar|Ver inventario|Ver mantenimiento)$/i.test(txt))return;
  if(btn.closest('.cc-sim-3d-wrap'))return;
  ccAudit({operacionId:ccAuditId('BTN'),accion:'CLICK_BOTON',modulo:'INTERFAZ',submodulo:'CONTROL_CAJAS',detalle:txt});
},true);

window.ccRefreshMailSettings=async function(){
  if(!ccSupabaseReady())return;
  try{
    const {data,error}=await gmSupabase.rpc('cc_get_mail_settings');
    if(error)throw error;
    configuracion.correoEnvio=Object.assign({proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},data||{});
    const cfg=configuracion.correoEnvio;
    const n=document.getElementById('ccMailSenderName'),e=document.getElementById('ccMailSenderEmail'),r=document.getElementById('ccMailReplyTo'),k=document.getElementById('ccMailKeyStatus'),b=document.getElementById('ccMailConfigBadge');
    if(n)n.value=cfg.nombreRemitente||'';if(e)e.value=cfg.correoRemitente||'';if(r)r.value=cfg.replyTo||'';
    if(k)k.textContent=cfg.apiKeyConfigurada?'Contraseña de aplicación configurada y protegida en Supabase Vault.':'Contraseña de aplicación no configurada.';
    const listo=!!(cfg.nombreRemitente&&cfg.correoRemitente&&cfg.apiKeyConfigurada);
    if(b){b.className='cc-badge '+(listo?'cc-ok':'cc-off');b.textContent=listo?'Listo para enviar':'Configuración incompleta';}
  }catch(err){console.error('CONFIG CORREO:',err);const b=document.getElementById('ccMailConfigBadge');if(b){b.className='cc-badge cc-off';b.textContent='Error de configuración';}}
};
window.ccRenderConfiguracion=function(){
  const el=document.getElementById('ccCorreosMantenimientoList');if(!el)return;
  const st=document.getElementById('ccCloudStatus');if(st)st.innerHTML='Base de datos: <b>Supabase / PostgreSQL</b> · '+(ccCloudReady?'conectada y protegida con auditoría de versiones.':'pendiente de conexión: configura GM_SUPABASE_URL en el HTML.');
  const arr=configuracion.correosMantenimiento||[];
  el.innerHTML=arr.length?arr.map((email,i)=>`<div class="cc-email-row"><div><i class="fa-solid fa-envelope text-slate-400 mr-2"></i><strong>${esc(email)}</strong></div><button class="cc-btn cc-btn-danger" onclick="ccEliminarCorreoMantenimiento(${i})"><i class="fa-solid fa-trash mr-1"></i>Eliminar</button></div>`).join(''):'<div style="padding:18px;text-align:center;color:#94a3b8">No hay destinatarios configurados.</div>';
  const cfg=configuracion.correoEnvio||{};const n=document.getElementById('ccMailSenderName'),e=document.getElementById('ccMailSenderEmail'),r=document.getElementById('ccMailReplyTo');if(n&&!n.value)n.value=cfg.nombreRemitente||'';if(e&&!e.value)e.value=cfg.correoRemitente||'';if(r&&!r.value)r.value=cfg.replyTo||'';
  ccRefreshMailSettings();ccRenderClientes();ccRenderResponsables();ccRenderTiposUnidad();ccRenderTiposUsoCaja();
};
window.ccGuardarConfiguracionCorreo=async function(){
  const nombre=String(document.getElementById('ccMailSenderName')?.value||'').trim();
  const correo=String(document.getElementById('ccMailSenderEmail')?.value||'').trim().toLowerCase();
  const reply=String(document.getElementById('ccMailReplyTo')?.value||'').trim().toLowerCase();
  const api=String(document.getElementById('ccMailApiKey')?.value||'').trim();
  if(!nombre||!correo){alert('Captura el nombre y el correo remitente.');return;}
  try{
    showStatus?.('Guardando configuración segura de correo...','info');
    const {data,error}=await gmSupabase.rpc('cc_save_mail_settings',{p_nombre_remitente:nombre,p_correo_remitente:correo,p_reply_to:reply||null,p_resend_api_key:api||null});
    if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la configuración');
    const key=document.getElementById('ccMailApiKey');if(key)key.value='';
    await ccRefreshMailSettings();
    await ccAudit({operacionId:ccAuditId('MAILCFG'),accion:'CONFIGURAR_CORREO_REMITENTE',modulo:'CONFIGURACION',submodulo:'CORREO',datosNuevos:{nombreRemitente:nombre,correoRemitente:correo,replyTo:reply,contrasenaAplicacionActualizada:!!api},detalle:'Configuración de Gmail remitente actualizada'});
    showStatus?.('CONFIGURACIÓN DE CORREO GUARDADA','success');
  }catch(err){console.error(err);showStatus?.('ERROR CONFIGURANDO CORREO · '+(err.message||err),'error');alert('No se pudo guardar la configuración de correo.\n\n'+(err.message||err));}
};
window.ccNuevoCorreoMantenimiento=function(){modal('Agregar destinatario de mantenimiento',`<div class="cc-field"><label>Correo electrónico</label><input name="correo" type="email" required placeholder="correo@empresa.com"></div>`,f=>{const email=String(f.get('correo')||'').trim().toLowerCase();if(!email)return;if(!configuracion.correosMantenimiento)configuracion.correosMantenimiento=[];if(configuracion.correosMantenimiento.includes(email)){alert('Ese correo ya está configurado.');return;}configuracion.correosMantenimiento.push(email);ccAudit({operacionId:ccAuditId('CFG'),accion:'AGREGAR_CORREO_MANTENIMIENTO',modulo:'CONFIGURACION',submodulo:'CORREOS',datosNuevos:{correo:email},detalle:'Destinatario agregado para avisos de mantenimiento'});save();ccRenderConfiguracion();});};
window.ccEliminarCorreoMantenimiento=function(i){const arr=configuracion.correosMantenimiento||[];if(!arr[i])return;if(!confirm(`¿Eliminar ${arr[i]} de las notificaciones de mantenimiento?`))return;const eliminado=arr[i];arr.splice(i,1);ccAudit({operacionId:ccAuditId('CFG'),accion:'ELIMINAR_CORREO_MANTENIMIENTO',modulo:'CONFIGURACION',submodulo:'CORREOS',datosAnteriores:{correo:eliminado},detalle:'Destinatario eliminado de avisos de mantenimiento'});save();ccRenderConfiguracion();};
window.ccEnviarCorreoPrueba=async function(){
  if(!(configuracion.correosMantenimiento||[]).length){alert('Primero agrega por lo menos un destinatario.');return;}
  try{
    showStatus?.('Enviando correo de prueba...','info');
    const {data,error}=await gmSupabase.functions.invoke('cc-send-maintenance-email',{body:{test:true}});
    if(error)throw error;if(data?.ok===false)throw new Error(data.message||data.error||'El proveedor rechazó el envío');
    showStatus?.('CORREO DE PRUEBA ENVIADO','success');alert('Correo de prueba enviado correctamente a los destinatarios configurados.');
  }catch(err){console.error('PRUEBA CORREO:',err);showStatus?.('ERROR DE CORREO · '+(err.message||err),'error');alert('No se pudo enviar el correo de prueba.\n\n'+(err.message||err));}
};
window.ccEnviarAvisoMantenimiento=async function(x,record,evento='ENTRADA'){
  if(!(configuracion.correosMantenimiento||[]).length){
    showStatus?.('Mantenimiento guardado, pero no hay destinatarios de correo configurados.','error');
    return {ok:false,error:'SIN_DESTINATARIOS'};
  }
  if(!record?.id)return {ok:false,error:'MANTENIMIENTO_SIN_ID'};
  const esLiberacion=String(evento).toUpperCase()==='LIBERACION';
  try{
    showStatus?.(esLiberacion?'Enviando correo de liberación...':'Enviando aviso de fuera de servicio por correo...','info');
    const {data,error}=await gmSupabase.functions.invoke('cc-send-maintenance-email',{
      body:{recordId:record.id,evento:esLiberacion?'LIBERACION':'ENTRADA'}
    });
    if(error)throw error;
    if(data?.ok===false)throw new Error(data.message||data.error||'No se pudo enviar el correo');

    await ccAudit({
      operacionId:ccAuditId('MAIL'),
      accion:esLiberacion?'AVISO_LIBERACION_ENVIADO':'AVISO_MANTENIMIENTO_ENVIADO',
      modulo:'MANTENIMIENTO',
      submodulo:'CORREO',
      idRegistro:record.id,
      idUnidad:x?.id||record.cajaId||'',
      numeroUnidad:x?.numero||record.numero||'',
      idMantenimiento:record.id,
      detalle:esLiberacion
        ?`Correo de liberación enviado · ${Number(data.attachments||0)} evidencia(s) adjunta(s)`
        :`Correo de fuera de servicio enviado · ${Number(data.attachments||0)} evidencia(s) adjunta(s)`
    });

