/* Tráfico App · Correo v2 · configuración limpia Gmail / Outlook */
(function(){
  if(window.__ccMailValidationV2)return; window.__ccMailValidationV2=true;
  const sb=()=>window.gmSupabase;
  const text=e=>String(e?.message||e||'Error desconocido');
  const provider=()=>String(document.getElementById('ccMailProvider')?.value||'GMAIL').toUpperCase();

  function ensureUi(){
    const email=document.getElementById('ccMailSenderEmail');
    const key=document.getElementById('ccMailApiKey');
    if(!email||!key)return false;
    if(!document.getElementById('ccMailProvider')){
      const field=document.createElement('div');field.className='cc-field';field.id='ccMailProviderField';
      field.innerHTML='<label>Proveedor de correo</label><select id="ccMailProvider"><option value="GMAIL">Gmail</option><option value="OUTLOOK">Outlook / Microsoft 365</option></select><div class="cc-note" id="ccMailProviderNote">Usa una contraseña de aplicación de Gmail.</div>';
      const anchor=email.closest('.cc-field')||email.parentElement;
      if(anchor?.parentElement)anchor.parentElement.insertBefore(field,anchor);
      const sel=document.getElementById('ccMailProvider');
      if(sel)sel.onchange=syncLabels;
    }
    syncLabels();
    return true;
  }
  function syncLabels(){
    const p=provider(),key=document.getElementById('ccMailApiKey'),note=document.getElementById('ccMailProviderNote');
    const label=key?.closest('.cc-field')?.querySelector('label');
    const labelText=p==='OUTLOOK'?'Contraseña / contraseña de aplicación de Outlook':'Contraseña de aplicación de Gmail';
    const noteText=p==='OUTLOOK'?'Microsoft 365 / Outlook usa SMTP seguro por puerto 587.':'Gmail requiere una contraseña de aplicación válida; no uses la contraseña normal.';
    const placeholder=p==='OUTLOOK'?'Contraseña SMTP / aplicación':'Contraseña de aplicación de 16 caracteres';
    if(label&&label.textContent!==labelText)label.textContent=labelText;
    if(note&&note.textContent!==noteText)note.textContent=noteText;
    if(key&&key.placeholder!==placeholder)key.placeholder=placeholder;
  }
  async function loadSettings(){
    if(!ensureUi())return null;
    try{
      const client=sb(); if(!client)return null;
      const {data,error}=await client.rpc('cc_get_mail_settings'); if(error)throw error;
      const d=data||{};
      const p=document.getElementById('ccMailProvider'); if(p)p.value=String(d.proveedor||'GMAIL').toUpperCase();
      const n=document.getElementById('ccMailSenderName'); if(n&&!n.value)n.value=d.nombreRemitente||'';
      const e=document.getElementById('ccMailSenderEmail'); if(e&&!e.value)e.value=d.correoRemitente||'';
      const r=document.getElementById('ccMailReplyTo'); if(r&&!r.value)r.value=d.replyTo||'';
      syncLabels();
      return d;
    }catch(err){console.warn('Correo settings:',err);return null;}
  }
  async function testMail(){
    const client=sb(); if(!client)throw new Error('Supabase no está disponible.');
    const {data,error}=await client.functions.invoke('cc-send-maintenance-email',{body:{test:true}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.message||data?.error||'El servidor de correo rechazó el envío.');
    return data;
  }
  window.ccEnviarCorreoPrueba=async function(){
    try{
      window.showStatus?.('Probando envío de correo...','info');
      const d=await testMail();
      window.showStatus?.('CORREO DE PRUEBA ENVIADO','success');
      alert('Correo de prueba enviado correctamente.\n\nProveedor: '+(d.provider||provider())+'\nDestinatarios: '+((d.recipients||[]).join(', ')||'configurados'));
    }catch(err){
      window.showStatus?.('ERROR DE CORREO · '+text(err),'error');
      alert('No se pudo enviar el correo de prueba.\n\n'+text(err));
    }
  };
  window.ccGuardarConfiguracionCorreo=async function(){
    ensureUi();
    const p=provider();
    const nombre=String(document.getElementById('ccMailSenderName')?.value||'').trim();
    const correo=String(document.getElementById('ccMailSenderEmail')?.value||'').trim().toLowerCase();
    const reply=String(document.getElementById('ccMailReplyTo')?.value||'').trim().toLowerCase();
    const password=String(document.getElementById('ccMailApiKey')?.value||'').replace(/\s/g,'').trim();
    if(!nombre||!correo)return alert('Captura nombre y correo remitente.');
    if(!password)return alert('La configuración fue limpiada. Captura una contraseña nueva para el proveedor seleccionado.');
    if(p==='GMAIL'&&password.length!==16)return alert('Para Gmail captura una contraseña de aplicación nueva de 16 caracteres.');
    try{
      const client=sb(); if(!client)throw new Error('Supabase no está disponible.');
      window.showStatus?.('Guardando configuración nueva de correo...','info');
      const {data,error}=await client.rpc('cc_save_mail_settings',{p_nombre_remitente:nombre,p_correo_remitente:correo,p_reply_to:reply||null,p_resend_api_key:password,p_proveedor:p});
      if(error)throw error;if(data?.ok===false)throw new Error(data?.error||'No se pudo guardar');
      const key=document.getElementById('ccMailApiKey');if(key)key.value='';
      await loadSettings();
      window.showStatus?.('Configuración guardada · realizando prueba real...','info');
      const t=await testMail();
      window.showStatus?.('CORREO CONFIGURADO Y VERIFICADO','success');
      alert('Configuración nueva guardada y verificada.\n\nProveedor: '+(t.provider||p)+'\nEl correo de prueba fue enviado correctamente.');
    }catch(err){
      window.showStatus?.('CONFIGURACIÓN GUARDADA / CORREO NO VERIFICADO · '+text(err),'error');
      alert('No quedó operativo el envío de correo.\n\n'+text(err));
    }
  };

  const oldRefresh=window.ccRefreshMailSettings;
  if(typeof oldRefresh==='function')window.ccRefreshMailSettings=async function(){const r=await oldRefresh.apply(this,arguments);await loadSettings();return r;};

  // Inicialización acotada. No usar MutationObserver global: puede generar ciclos y congelar la app.
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(ensureUi()){loadSettings();clearInterval(timer);}
    else if(tries>=40)clearInterval(timer);
  },300);
})();
