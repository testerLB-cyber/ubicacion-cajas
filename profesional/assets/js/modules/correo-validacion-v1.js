/* Tráfico App · Validación robusta de correo Gmail */
(function(){
  if(window.__ccMailValidationV1)return; window.__ccMailValidationV1=true;
  const sb=()=>window.gmSupabase;
  const msg=e=>String(e?.message||e||'Error desconocido');
  async function testMail(){
    const client=sb(); if(!client) throw new Error('Supabase no está disponible.');
    const {data,error}=await client.functions.invoke('cc-send-maintenance-email',{body:{test:true}});
    if(error)throw error;
    if(!data?.ok){
      const attempts=Array.isArray(data?.smtpAttempts)?data.smtpAttempts:[];
      const extra=attempts.length?'\n\nIntentos SMTP:\n'+attempts.map(x=>'Puerto '+x.port+': '+(x.ok?'OK':x.error||'ERROR')).join('\n'):'';
      throw new Error((data?.message||data?.error||'No se pudo enviar el correo')+extra);
    }
    return data;
  }
  window.ccEnviarCorreoPrueba=async function(){
    try{
      window.showStatus?.('Probando conexión y envío de correo...','info');
      const data=await testMail();
      window.showStatus?.('CORREO DE PRUEBA ENVIADO','success');
      alert('Correo de prueba enviado correctamente.\n\nProveedor: '+(data.provider||'GMAIL')+'\nDestinatarios: '+((data.recipients||[]).join(', ')||'configurados'));
    }catch(err){
      console.error('PRUEBA CORREO:',err);
      window.showStatus?.('ERROR DE CORREO · '+msg(err),'error');
      alert('No se pudo enviar el correo de prueba.\n\n'+msg(err));
    }
  };
  window.ccGuardarConfiguracionCorreo=async function(){
    const nombre=String(document.getElementById('ccMailSenderName')?.value||'').trim();
    const correo=String(document.getElementById('ccMailSenderEmail')?.value||'').trim().toLowerCase();
    const reply=String(document.getElementById('ccMailReplyTo')?.value||'').trim().toLowerCase();
    const api=String(document.getElementById('ccMailApiKey')?.value||'').replace(/\s/g,'').trim();
    if(!nombre||!correo){alert('Captura el nombre y el correo remitente.');return;}
    if(api && api.length!==16){alert('La contraseña de aplicación de Gmail debe tener 16 caracteres. No uses la contraseña normal de Gmail.');return;}
    try{
      window.showStatus?.('Guardando configuración segura de correo...','info');
      const {data,error}=await sb().rpc('cc_save_mail_settings',{p_nombre_remitente:nombre,p_correo_remitente:correo,p_reply_to:reply||null,p_resend_api_key:api||null});
      if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la configuración');
      const key=document.getElementById('ccMailApiKey');if(key)key.value='';
      await window.ccRefreshMailSettings?.();
      window.showStatus?.('Configuración guardada · verificando Gmail...','info');
      try{
        const test=await testMail();
        window.showStatus?.('CONFIGURACIÓN GUARDADA Y GMAIL VERIFICADO','success');
        alert('Configuración guardada y verificada.\n\nEl correo de prueba fue enviado correctamente a '+((test.recipients||[]).length||0)+' destinatario(s).');
      }catch(testErr){
        window.showStatus?.('CONFIGURACIÓN GUARDADA · GMAIL RECHAZÓ EL ENVÍO','error');
        alert('La configuración sí se guardó, pero Gmail rechazó el envío.\n\n'+msg(testErr));
      }
    }catch(err){
      console.error('CONFIG CORREO:',err);
      window.showStatus?.('ERROR AL GUARDAR CORREO · '+msg(err),'error');
      alert('No se pudo guardar la configuración de correo.\n\n'+msg(err));
    }
  };
})();
