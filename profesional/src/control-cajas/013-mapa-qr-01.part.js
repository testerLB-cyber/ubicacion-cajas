    const safeDesde=(desde||'inicio').replace(/[^0-9a-z_-]/gi,'_');
    const safeHasta=(hasta||'actual').replace(/[^0-9a-z_-]/gi,'_');
    doc.save(`Control_DOT_Detallado_${safeDesde}_a_${safeHasta}.pdf`);

    await ccAudit({
      operacionId:ccAuditId('EXP'),
      accion:'EXPORTAR_DOT_PDF_DETALLADO',
      modulo:'DOT',
      submodulo:'PDF',
      fechaNueva:hasta||desde||'',
      detalle:`Reporte DOT detallado con evidencias · rango ${rangoDesde} a ${rangoHasta} · ${rows.length} registros`
    });

    showStatus?.(`PDF DOT DETALLADO GENERADO · ${rows.length} registros`,'success');
  }catch(err){
    console.error('PDF DOT DETALLADO:',err);
    showStatus?.('ERROR AL GENERAR PDF DOT · '+(err.message||err),'error');
    alert('No fue posible generar el PDF DOT.\n\n'+(err.message||err));
  }
};


const CC_LOCATION_EDGE='https://nbogdhriavzqetnlrrau.supabase.co/functions/v1/cc-location';

window.ccEnsureScript=function(src,globalName){
  return new Promise((resolve,reject)=>{
    if(globalName&&window[globalName]){resolve();return;}
    const found=[...document.scripts].find(x=>x.src===src);
    if(found){found.addEventListener('load',()=>resolve(),{once:true});found.addEventListener('error',()=>reject(new Error('No se pudo cargar '+src)),{once:true});return;}
    const sc=document.createElement('script');sc.src=src;sc.async=true;sc.onload=()=>resolve();sc.onerror=()=>reject(new Error('No se pudo cargar '+src));document.head.appendChild(sc);
  });
};

window.ccEnsureLeaflet=async function(){
  if(window.L)return;
  if(!document.querySelector('link[data-cc-leaflet]')){
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    l.dataset.ccLeaflet='1';
    document.head.appendChild(l);
  }
  await ccEnsureScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','L');
};

window.ccEnsureQRCode=async function(){
  if(window.QRCode)return;
  await ccEnsureScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js','QRCode');
};

window.ccConfigurarUrlUbicacion=async function(){
  const actual=String(configuracion.ubicacionPublicaUrl||'').trim();
  const valor=prompt('Pega la URL pública de GitHub Pages donde estará la página de ubicación.\\nEjemplo: https://usuario.github.io/ubicacion-cajas/',actual);
  if(valor===null)return null;
  const limpio=String(valor||'').trim().replace(/\?+$/,'');
  if(limpio && !/^https:\/\/.+/i.test(limpio)){
    alert('La URL debe iniciar con https://');
    return null;
  }
  const {data,error}=await gmSupabase.rpc('cc_save_location_page_url',{p_url:limpio});
  if(error)throw error;
  if(data?.ok===false)throw new Error(data.error||'No se pudo guardar la URL');
  configuracion.ubicacionPublicaUrl=limpio;
  showStatus?.('URL pública de ubicación guardada en Supabase','success');
  return limpio;
};

window.ccMostrarQrUnidad=async function(id){
  const u=cajas.find(x=>x.id===id);
  if(!u)return;

  try{
    // URL canónica de GitHub Pages.
    const URL_CANONICA='https://testerLB-cyber.github.io/ubicacion-cajas/';
    let base=String(configuracion.ubicacionPublicaUrl||URL_CANONICA).trim();

    // Corrige automáticamente cualquier URL anterior/incompleta.
    if(!/^https:\/\/testerLB-cyber\.github\.io\/ubicacion-cajas\/?$/i.test(base)){
      base=URL_CANONICA;
      try{
        const {data,error}=await gmSupabase.rpc('cc_save_location_page_url',{p_url:base});
        if(error)console.warn('No se pudo actualizar URL pública:',error);
        else configuracion.ubicacionPublicaUrl=base;
      }catch(_){}
    }

    let unit=cajas.find(x=>x.id===id);
    if(!unit?.qrToken){
      showStatus?.('Generando token QR para la unidad...','info');
      const {data,error}=await gmSupabase.rpc('cc_ensure_unit_qr_token',{p_unidad_id:id});
      if(error)throw error;
      if(data?.ok===false)throw new Error(data.error||'No se pudo generar el token QR.');
      await ccReloadFromDatabase();
      unit=cajas.find(x=>x.id===id);
      if(unit&&!unit.qrToken)unit.qrToken=String(data?.token||'');
    }

    if(!unit?.qrToken)throw new Error('No fue posible generar el token QR de esta unidad.');

    const token=String(unit.qrToken||'').trim();
    // Acepta UUID estándar de Supabase (con guiones) y tokens heredados de 32 hexadecimales.
    const uuidOk=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
    const legacyOk=/^[0-9a-f]{32}$/i.test(token);
    if(!(uuidOk||legacyOk)){
      throw new Error('El token QR de esta unidad no tiene un formato válido.');
    }

    // Construir la URL mediante URL() evita errores de slash, ? y espacios.
