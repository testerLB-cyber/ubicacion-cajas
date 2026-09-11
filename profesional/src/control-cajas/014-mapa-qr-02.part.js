    const target='https://testerlb-cyber.github.io/ubicacion-cajas/?q='+encodeURIComponent(token);

    // Validación robusta de la URL final.
    const checkUrl=new URL(target);
    const hostOk=checkUrl.hostname.toLowerCase()==='testerlb-cyber.github.io';
    const pathOk=checkUrl.pathname.replace(/\/+$/,'')==='/ubicacion-cajas';
    const tokenOk=checkUrl.searchParams.get('q')===token;
    if(!(checkUrl.protocol==='https:'&&hostOk&&pathOk&&tokenOk)){
      throw new Error('La liga QR no se construyó correctamente.');
    }

    await ccEnsureQRCode();

    document.getElementById('ccQrUnitModal')?.remove();
    const ov=document.createElement('div');
    ov.id='ccQrUnitModal';
    ov.className='cc-location-modal';

    ov.innerHTML=`<div class="cc-location-card" style="width:min(660px,96vw)">
      <div class="cc-location-head">
        <strong>QR DE UBICACIÓN · ${esc(unit.numero||unit.descripcion||'UNIDAD')}</strong>
        <button class="cc-location-close" type="button">×</button>
      </div>
      <div class="cc-location-body">
        <div class="cc-qr-box">
          <div id="ccQrCanvas" style="padding:28px;background:#fff;border:16px solid #fff;border-radius:14px;max-width:500px;overflow:auto"></div>
          <div style="font-size:11px;font-weight:900;color:#0f172a">Liga exacta del QR:</div>
          <div class="cc-qr-url" id="ccQrTarget">${esc(target)}</div>
          <div class="cc-note"><b>iPhone:</b> abre Cámara, apunta al QR y toca la notificación amarilla de Safari que aparece en la pantalla. El iPhone no abre el enlace automáticamente sin tocar esa notificación.</div>
          <details style="width:100%;margin-top:8px">
            <summary style="cursor:pointer;font-size:10px;font-weight:900;color:#475569">QR de prueba para iPhone</summary>
            <div style="padding:12px;text-align:center">
              <div id="ccQrIphoneTest" style="display:inline-block;padding:22px;background:#fff;border:14px solid #fff"></div>
              <div style="font-size:9px;color:#64748b;margin-top:6px">Prueba: https://testerlb-cyber.github.io/ubicacion-cajas/</div>
            </div>
          </details>

          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
            <a class="cc-btn cc-btn-primary" href="${esc(target)}" target="_blank" rel="noopener">
              <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Probar enlace
            </a>
            <button class="cc-btn cc-btn-light" type="button" id="ccQrCopy">
              <i class="fa-solid fa-copy mr-1"></i>Copiar enlace
            </button>
            <button class="cc-btn cc-btn-light" type="button" id="ccQrPrint">
              <i class="fa-solid fa-print mr-1"></i>Imprimir QR
            </button>
          </div>
        </div>
      </div>
    </div>`;

    document.body.appendChild(ov);
    ov.querySelector('.cc-location-close').onclick=()=>ov.remove();

    const qrBox=ov.querySelector('#ccQrCanvas');
    qrBox.innerHTML='';
    new QRCode(qrBox,{
      text:target,
      width:420,
      height:420,
      colorDark:'#000000',
      colorLight:'#ffffff',
      correctLevel:QRCode.CorrectLevel.H
    });

    const iphoneTest=ov.querySelector('#ccQrIphoneTest');
    if(iphoneTest){
      new QRCode(iphoneTest,{
        text:'https://testerlb-cyber.github.io/ubicacion-cajas/',
        width:260,
        height:260,
        colorDark:'#000000',
        colorLight:'#ffffff',
        correctLevel:QRCode.CorrectLevel.H
      });
    }

    ov.querySelector('#ccQrCopy').onclick=async()=>{
      try{
        await navigator.clipboard.writeText(target);
        showStatus?.('Enlace QR copiado','success');
      }catch(_){
        prompt('Copia este enlace:',target);
      }
    };

    ov.querySelector('#ccQrPrint').onclick=()=>{
      const canvas=qrBox.querySelector('canvas');
      const img=qrBox.querySelector('img');
      const src=canvas?canvas.toDataURL('image/png'):img?.src;
      if(!src)return;
      const w=window.open('','_blank','width=650,height=760');
      w.document.write(`<html><head><title>QR ${esc(unit.numero||'')}</title></head><body style="font-family:Arial;text-align:center;padding:30px"><h2>${esc(unit.numero||'')}</h2><p>${esc(unit.descripcion||'')}</p><img src="${src}" style="width:360px;height:360px;image-rendering:pixelated"><p style="font-size:13px">Escanear para registrar ubicación</p><p style="font-size:10px;word-break:break-all">${esc(target)}</p>
</body></html>`);
      w.document.close();w.focus();setTimeout(()=>w.print(),300);
    };

    console.log('QR URL:',target);
  }catch(err){
    console.error('QR UBICACION:',err);
    alert('No se pudo generar el QR.\n\n'+(err.message||err));
  }
};

