/* Tráfico App Profesional · Hojas de Servicio · evidencia manual/QR + PDF */
(function(){
  'use strict';
  if(window.__HS_MANUAL_PHOTO_PDF_V2__) return;
  window.__HS_MANUAL_PHOTO_PDF_V2__=true;

  const sb=()=>window.gmSupabase;
  const text=v=>String(v??'').trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let DATA=null,loading=null,qrPoll=null;

  async function getData(force=false){
    if(DATA&&!force) return DATA;
    if(loading) return loading;
    loading=(async()=>{try{const {data,error}=await sb().rpc('hs_list');if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo cargar Hojas de Servicio.');DATA=data;return DATA;}finally{loading=null;}})();
    return loading;
  }

  function ensureStyles(){
    if(document.getElementById('hs-manual-photo-pdf-style-v2')) return;
    const st=document.createElement('style');st.id='hs-manual-photo-pdf-style-v2';st.textContent=`
      .hs-manual-photo-box{margin-top:10px;padding:11px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}
      .hs-manual-photo-box label{display:block;font-size:10px;font-weight:900;color:#334155;margin-bottom:7px}
      .hs-manual-photo-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      .hs-manual-photo-status{display:block;margin-top:7px;font-size:10px;color:#64748b}
      .hs-photo-methods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;width:100%;align-items:stretch}
      .hs-photo-methods .cc-btn{width:100%;min-width:0;white-space:normal;min-height:42px}
      .hs-photo-methods input[type=file]{display:none}
      #hs104Hist th[data-hs-pdf-head],#hs104Hist td[data-hs-pdf-cell]{text-align:right;white-space:nowrap}
      .hs-qr-modal{position:fixed;inset:0;z-index:100900;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;padding:16px}
      .hs-qr-card{width:min(500px,96vw);background:#fff;border-radius:17px;overflow:hidden;box-shadow:0 25px 80px #0008}
      .hs-qr-head{background:#0f172a;color:#fff;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .hs-qr-body{padding:18px;text-align:center}.hs-qr-code{display:flex;justify-content:center;min-height:230px;align-items:center}.hs-qr-code img,.hs-qr-code canvas{max-width:230px!important;height:auto!important}
      .hs-qr-note{font-size:11px;color:#64748b;margin-top:10px}.hs-qr-status{margin-top:11px;padding:10px;border-radius:10px;background:#f8fafc;font-size:12px;color:#475569}
      @media(max-width:640px){.hs-manual-photo-actions{align-items:stretch}.hs-photo-methods .cc-btn{font-size:13px!important;line-height:1.2}}
    `;document.head.appendChild(st);
  }

  async function compressImage(file){
    if(!file?.type?.startsWith('image/')) throw new Error('Selecciona una imagen válida.');
    const url=URL.createObjectURL(file);try{const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('No se pudo leer la foto.'));img.src=url;});let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;const max=1800;if(Math.max(w,h)>max){const r=max/Math.max(w,h);w=Math.round(w*r);h=Math.round(h*r);}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d',{alpha:false}).drawImage(img,0,0,w,h);const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',.78));if(!blob)throw new Error('No se pudo preparar la foto.');return blob;}finally{URL.revokeObjectURL(url);}
  }

  function openPhotoModal(url,title='Evidencia de comprobación'){
    document.getElementById('hs-manual-photo-modal')?.remove();const ov=document.createElement('div');ov.id='hs-manual-photo-modal';ov.style.cssText='position:fixed;inset:0;z-index:100950;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;padding:16px';ov.innerHTML='<div style="width:min(920px,97vw);max-height:94vh;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px #0008"><div style="background:#0f172a;color:#fff;padding:12px 15px;display:flex;align-items:center;justify-content:space-between;gap:10px"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:26px;cursor:pointer">×</button></div><div style="padding:12px;background:#f8fafc;display:flex;align-items:center;justify-content:center;max-height:82vh;overflow:auto"><img src="'+esc(url)+'" alt="Evidencia" style="display:block;max-width:100%;max-height:78vh;object-fit:contain;border-radius:10px"></div></div>';document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.onclick=e=>{if(e.target===ov)close();};
  }
  async function showStoredPhoto(path,title){if(!path)return;const {data,error}=await sb().storage.from('app-hojas-servicio').createSignedUrl(path,900);if(error||!data?.signedUrl)throw new Error(error?.message||'No se pudo abrir la foto.');openPhotoModal(data.signedUrl,title);}

  async function uploadManualPhoto(row,file,status,replacing=false){
    const folioId=row.dataset.row;if(!folioId)throw new Error('No se identificó el folio.');
    if(replacing&&!confirm('Esta hoja ya tiene una fotografía. ¿Está seguro de reemplazar la evidencia actual?')) return false;
    status.textContent='Preparando foto…';const blob=await compressImage(file);const {data:userData,error:userError}=await sb().auth.getUser();if(userError||!userData?.user?.id)throw new Error('Sesión no disponible.');const path=userData.user.id+'/web-manual/'+folioId+'/'+Date.now()+'.jpg';status.textContent='Subiendo foto…';const {error:upErr}=await sb().storage.from('app-hojas-servicio').upload(path,blob,{contentType:'image/jpeg',upsert:false});if(upErr)throw upErr;const {data,error}=await sb().rpc('hs_set_manual_photo',{p_folio_id:folioId,p_foto_path:path});if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo ligar la foto al folio.');row.dataset.hsCurrentPhotoPath=path;row.dataset.hsPhotoSource='MANUAL';DATA=null;status.textContent=replacing?'Foto reemplazada correctamente.':'Foto cargada correctamente.';await patch(true);return true;
  }

  async function ensureQrLib(){
    if(window.QRCode)return;let s=document.querySelector('script[data-hs-qrcode]');if(!s){s=document.createElement('script');s.dataset.hsQrcode='1';s.src='assets/js/vendor/qrcode.min.js?v=1.0.0';document.head.appendChild(s);}await new Promise((res,rej)=>{if(window.QRCode)return res();s.addEventListener('load',res,{once:true});s.addEventListener('error',()=>rej(new Error('No se pudo cargar el generador QR.')),{once:true});});if(!window.QRCode)throw new Error('Generador QR no disponible.');
  }

  function closeQr(){if(qrPoll){clearInterval(qrPoll);qrPoll=null;}document.getElementById('hs-photo-qr-modal')?.remove();}
  async function openQr(row,folio,replacing){
    if(replacing&&!confirm('Esta hoja ya tiene una fotografía. ¿Está seguro de reemplazar la evidencia actual mediante una nueva captura QR?'))return;
    const {data,error}=await sb().rpc('hs_qr_photo_create',{p_folio_id:folio.id});if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo generar el QR.');
    const url=new URL('hojas-servicio-foto-qr.html',location.href);url.search='?t='+encodeURIComponent(data.token);
    closeQr();const ov=document.createElement('div');ov.id='hs-photo-qr-modal';ov.className='hs-qr-modal';ov.innerHTML='<div class="hs-qr-card"><div class="hs-qr-head"><strong>Tomar foto · '+esc(folio.folio||'')+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:25px;cursor:pointer">×</button></div><div class="hs-qr-body"><div class="hs-qr-code" data-code><span>Generando QR…</span></div><div class="hs-qr-note">Escanea con el teléfono. El enlace dura 20 minutos y acepta una sola captura.</div><div class="hs-qr-status" data-status>Esperando fotografía…</div><div style="display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button type="button" class="cc-btn cc-btn-light" data-copy>Copiar enlace</button><button type="button" class="cc-btn cc-btn-light" data-open>Abrir enlace</button></div></div></div>';document.body.appendChild(ov);ov.querySelector('[data-x]').onclick=closeQr;ov.onclick=e=>{if(e.target===ov)closeQr();};ov.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(url.toString());ov.querySelector('[data-status]').textContent='Enlace copiado.';}catch(_){prompt('Copia el enlace:',url.toString());}};ov.querySelector('[data-open]').onclick=()=>window.open(url.toString(),'_blank','noopener');
    try{await ensureQrLib();const el=ov.querySelector('[data-code]');el.innerHTML='';new QRCode(el,{text:url.toString(),width:230,height:230,correctLevel:QRCode.CorrectLevel.M});}catch(e){ov.querySelector('[data-code]').innerHTML='<div style="font-size:12px;color:#64748b;word-break:break-all">'+esc(url.toString())+'</div>';}
    let busy=false;qrPoll=setInterval(async()=>{if(busy||!document.getElementById('hs-photo-qr-modal'))return;busy=true;try{const {data:s,error:e}=await sb().rpc('hs_qr_photo_status',{p_token:data.token});if(e)throw e;if(s?.status==='CAPTURADA'){ov.querySelector('[data-status]').innerHTML='<strong style="color:#166534">Foto recibida correctamente.</strong>';row.dataset.hsCurrentPhotoPath=s.fotoPath||'';DATA=null;clearInterval(qrPoll);qrPoll=null;setTimeout(async()=>{closeQr();await patch(true);},700);}else if(s?.status!=='PENDIENTE'){ov.querySelector('[data-status]').textContent=s?.status==='EXPIRADA'?'El QR venció. Genera uno nuevo.':'El QR ya no está disponible.';clearInterval(qrPoll);qrPoll=null;}}catch(e){console.warn('QR status',e);}finally{busy=false;}},1800);
  }

  function currentPhoto(folio){return text(folio.fotoManualPath)||text(folio.precaptura?.fotoPath)||'';}
  function renderPhotoBox(row,folio){
    const editArea=row.querySelector('.hs-list-edit-area');
    if(!editArea)return;
    let box=row.querySelector('[data-hs-manual-photo-box]');
    if(!box){box=document.createElement('div');box.className='hs-manual-photo-box';box.dataset.hsManualPhotoBox='1';}
    if(!editArea.contains(box))editArea.appendChild(box);
    const path=currentPhoto(folio),exists=!!path;
    // Keep the controls and chosen file during polling; a new saved path triggers a refresh.
    if(box.dataset.photoPath===path&&box.querySelector('[data-qr]'))return;
    if(path)row.dataset.hsCurrentPhotoPath=path;else delete row.dataset.hsCurrentPhotoPath;
    box.dataset.photoPath=path;
    box.innerHTML='<label>Evidencia fotográfica</label><div class="hs-manual-photo-actions">'+(exists?'<button type="button" class="cc-btn cc-btn-light" data-view-current><i class="fa-solid fa-camera"></i> Ver foto</button>':'')+'<div class="hs-photo-methods"><button type="button" class="cc-btn cc-btn-light" data-upload><i class="fa-solid fa-upload"></i> Subir imagen</button><button type="button" class="cc-btn cc-btn-light" data-qr><i class="fa-solid fa-qrcode"></i> Tomar foto con QR</button><input type="file" accept="image/*" data-file></div></div><div class="hs-manual-photo-status">'+(exists?'Foto cargada. Puedes subir o tomar otra para reemplazarla.':'Sin foto. Puedes subirla desde este equipo o tomarla con QR desde un teléfono.')+'</div>';
    box.querySelector('[data-view-current]')?.addEventListener('click',async()=>{try{await showStoredPhoto(row.dataset.hsCurrentPhotoPath,'Evidencia · '+(folio.folio||''));}catch(e){alert(e?.message||e);}});
    syncListPhoto(row,folio,path);
  }

  function syncListPhoto(row,folio,path){
    const actions=row.querySelector(':scope > .hs104-actions');if(!actions)return;let btn=actions.querySelector('[data-hs-current-photo]');const old=actions.querySelector('[data-hs-list-photo]');if(old)old.style.display='none';if(!path){btn?.remove();return;}if(!btn){btn=document.createElement('button');btn.type='button';btn.className='cc-btn cc-btn-light';btn.dataset.hsCurrentPhoto='1';btn.innerHTML='<i class="fa-solid fa-camera"></i> Ver foto';const edit=actions.querySelector('[data-hs-edit]');edit?edit.after(btn):actions.insertBefore(btn,actions.firstChild);}btn.onclick=async()=>{try{await showStoredPhoto(path,'Evidencia · '+(folio.folio||''));}catch(e){alert(e?.message||e);}};
  }

  async function ensureJsPdf(){if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;let s=document.querySelector('script[data-hs-jspdf]');if(!s){s=document.createElement('script');s.dataset.hsJspdf='1';s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';document.head.appendChild(s);}await new Promise((res,rej)=>{if(window.jspdf?.jsPDF)return res();s.addEventListener('load',res,{once:true});s.addEventListener('error',()=>rej(new Error('No se pudo cargar el generador PDF.')),{once:true});});if(!window.jspdf?.jsPDF)throw new Error('Generador PDF no disponible.');return window.jspdf.jsPDF;}
  async function photoDataUrl(path){if(!path)return null;const {data,error}=await sb().storage.from('app-hojas-servicio').createSignedUrl(path,300);if(error||!data?.signedUrl)return null;const r=await fetch(data.signedUrl);if(!r.ok)return null;const b=await r.blob();return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(b);});}
  function pdfLine(doc,label,value,y){doc.setFont('helvetica','bold');doc.text(label+':',16,y);doc.setFont('helvetica','normal');const parts=doc.splitTextToSize(text(value)||'—',145);doc.text(parts,52,y);return y+Math.max(7,parts.length*5.2);}
  async function exportPdf(c){const JsPDF=await ensureJsPdf();const doc=new JsPDF({unit:'mm',format:'a4'});doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('Comprobación de Hoja de Servicio',16,18);doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text('Tráfico App',16,25);doc.setDrawColor(203,213,225);doc.line(16,29,194,29);let y=38;y=pdfLine(doc,'Folio',c.folio,y);y=pdfLine(doc,'Estatus','COMPROBADA',y);y=pdfLine(doc,'Fecha de uso',c.fechaUso||c.fecha,y);y=pdfLine(doc,'Fecha comprobación',c.fechaComprobacion?new Date(c.fechaComprobacion).toLocaleString('es-MX'):'—',y);y=pdfLine(doc,'Cliente',c.cliente,y);y=pdfLine(doc,'Persona',c.beneficiario||c.operador,y);y=pdfLine(doc,'Tipo de servicio',c.tipoViaje||c.servicio,y);y=pdfLine(doc,'Clasificación',c.clasificacion,y);y=pdfLine(doc,'Responsable',c.responsable,y);y=pdfLine(doc,'Observaciones',c.observaciones||'—',y);if(c.fotoPath){const img=await photoDataUrl(c.fotoPath);if(img){if(y>190){doc.addPage();y=20;}doc.setFont('helvetica','bold');doc.text('Evidencia fotográfica',16,y);y+=6;try{const props=doc.getImageProperties(img);const maxW=178,maxH=95;let w=maxW,h=w*(props.height/props.width);if(h>maxH){h=maxH;w=h*(props.width/props.height);}doc.addImage(img,props.fileType||'JPEG',16,y,w,h);}catch(_){doc.setFont('helvetica','normal');doc.text('La evidencia está disponible en el sistema.',16,y);}}}doc.setFontSize(8);doc.setTextColor(100);doc.text('Generado desde Tráfico App',16,287);doc.save('Comprobacion_'+text(c.folio).replace(/[^a-z0-9_-]+/gi,'_')+'.pdf');}

  function patchHistory(d){const body=document.getElementById('hs104Hist');if(!body)return;const table=body.closest('table');if(!table)return;const head=table.querySelector('thead tr');if(head&&!head.querySelector('[data-hs-pdf-head]')){const th=document.createElement('th');th.dataset.hsPdfHead='1';th.textContent='ACCIONES';head.appendChild(th);}[...body.querySelectorAll('tr')].forEach(tr=>{if(tr.querySelector('[data-hs-pdf-cell]'))return;const cells=tr.querySelectorAll('td');if(!cells.length||cells.length<6)return;const folio=text(cells[0].textContent),c=(d.comprobaciones||[]).find(x=>String(x.tipo||'').toUpperCase()==='UTILIZADA'&&text(x.folio)===folio);if(!c)return;const td=document.createElement('td');td.dataset.hsPdfCell='1';td.innerHTML='<button type="button" class="cc-btn cc-btn-light" data-hs-pdf><i class="fa-solid fa-file-pdf"></i> PDF</button>'+(c.fotoPath?' <button type="button" class="cc-btn cc-btn-light" data-hs-hist-photo><i class="fa-solid fa-camera"></i> Foto</button>':'');tr.appendChild(td);td.querySelector('[data-hs-pdf]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await exportPdf(c);}catch(err){alert(err?.message||err);}finally{b.disabled=false;}};td.querySelector('[data-hs-hist-photo]')?.addEventListener('click',async()=>{try{await showStoredPhoto(c.fotoPath,'Evidencia · '+c.folio);}catch(e){alert(e?.message||e);}});});}

  async function patch(force=false){ensureStyles();const list=document.getElementById('hs104CompList'),hist=document.getElementById('hs104Hist');if(!list&&!hist)return;if(list&&typeof window.hsApplyListMode==='function')window.hsApplyListMode();const rows=list?[...list.querySelectorAll('[data-row]')]:[];if(!sb())return;try{const d=await getData(force);rows.forEach(row=>{if(!row.isConnected)return;const f=(d.foliosAsignadosOperador||[]).find(x=>String(x.id)===String(row.dataset.row));if(f)renderPhotoBox(row,f);});if(hist)patchHistory(d);}catch(e){console.warn('HS FOTO/PDF V2',e);}}
  document.addEventListener('click',async e=>{
    const button=e.target.closest?.('#hs104CompList [data-hs-manual-photo-box] [data-upload], #hs104CompList [data-hs-manual-photo-box] [data-qr]');
    if(!button)return;
    const box=button.closest('[data-hs-manual-photo-box]'),row=button.closest('[data-row]');
    if(!row)return;
    if(button.matches('[data-upload]')){box.querySelector('[data-file]')?.click();return;}
    if(button.disabled)return;
    button.disabled=true;
    try{await openQr(row,{id:row.dataset.row,folio:row.dataset.hsFolio||''},!!row.dataset.hsCurrentPhotoPath);}
    catch(err){const status=box.querySelector('.hs-manual-photo-status');if(status)status.textContent='Error: '+(err?.message||err);alert(err?.message||err);}
    finally{button.disabled=false;}
  },true);
  document.addEventListener('change',async e=>{
    const input=e.target.closest?.('#hs104CompList [data-hs-manual-photo-box] [data-file]');
    if(!input?.files?.[0])return;
    const row=input.closest('[data-row]'),status=input.closest('[data-hs-manual-photo-box]')?.querySelector('.hs-manual-photo-status');
    if(!row||!status)return;
    try{await uploadManualPhoto(row,input.files[0],status,!!row.dataset.hsCurrentPhotoPath);}
    catch(err){status.textContent='Error: '+(err?.message||err);alert(err?.message||err);}
  },true);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v="Comprobacion"]')||e.target.closest?.('#hs104CompShowAll'))setTimeout(()=>patch(true),280);},true);document.addEventListener('change',e=>{if(['hs104CompPerson','hs104CompType','hs104CompShowAll'].includes(e.target?.id))setTimeout(()=>patch(true),240);},true);window.hsPatchManualPhotoPdf=()=>patch(true);setInterval(()=>{if(document.getElementById('hs104CompList')||document.getElementById('hs104Hist'))patch(false);},1600);
})();
