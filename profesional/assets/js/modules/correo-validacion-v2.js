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
      (email.closest('.cc-field')||email.parentElement)?.parentElement?.insertBefore(field,email.closest('.cc-field')||email.parentElement);
      document.getElementById('ccMailProvider').onchange=syncLabels;
    }
    syncLabels();
    return true;
  }
  function syncLabels(){
    const p=provider(),key=document.getElementById('ccMailApiKey'),note=document.getElementById('ccMailProviderNote');
    const label=key?.closest('.cc-field')?.querySelector('label');
    if(label)label.textContent=p==='OUTLOOK'?'Contraseña / contraseña de aplicación de Outlook':'Contraseña de aplicación de Gmail';
    if(note)note.textContent=p==='OUTLOOK'?'Microsoft 365 / Outlook usa SMTP seguro por puerto 587.':'Gmail requiere una contraseña de aplicación válida; no uses la contraseña normal.';
    if(key)key.placeholder=p==='OUTLOOK'?'Contraseña SMTP / aplicación':'Contraseña de aplicación de 16 caracteres';
  }
  async function loadSettings(){
    ensureUi();
    try{
      const {data,error}=await sb().rpc('cc_get_mail_settings'); if(error)throw error;
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
    const {data,error}=await sb().functions.invoke('cc-send-maintenance-email',{body:{test:true}});
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
      window.showStatus?.('Guardando configuración nueva de correo...','info');
      const {data,error}=await sb().rpc('cc_save_mail_settings',{p_nombre_remitente:nombre,p_correo_remitente:correo,p_reply_to:reply||null,p_resend_api_key:password,p_proveedor:p});
      if(error)throw error;if(data?.ok===false)throw new Error(data?.error||'No se pudo guardar');
      document.getElementById('ccMailApiKey').value='';
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
  const timer=setInterval(()=>{if(ensureUi()){loadSettings();clearInterval(timer);}},300);
  setTimeout(()=>clearInterval(timer),20000);
  new MutationObserver(()=>ensureUi()).observe(document.documentElement,{childList:true,subtree:true});
})();
