/* Tráfico App · UX Comprobación Hojas v2 · 2026-09-23 */
(function(){
  'use strict';
  if(window.__HS_COMPROBACION_UX_V2__) return;
  window.__HS_COMPROBACION_UX_V2__=true;

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('hojas_servicio.comprobar'));
  let showHistory=false, cache=null, qrPoll=null;

  function style(){
    if(document.getElementById('hs-comp-ux-v2-style'))return;
    const s=document.createElement('style');s.id='hs-comp-ux-v2-style';s.textContent=`
      .hs-comp-switch{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding:11px 13px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px}
      .hs-comp-switch label{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:900;color:#1e3a8a;cursor:pointer}
      .hs-comp-switch input[type=checkbox]{width:17px;height:17px}
      .hs-comp-search{min-width:230px;max-width:360px;width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;font-size:12px}
      #hs104CompList .hs104-row{gap:6px!important}
      #hs104CompList .hs-list-row{padding:9px 11px!important;margin-bottom:5px!important}
      #hs104CompList .hs-list-head{gap:10px!important}
      #hs104CompList .hs-list-head-actions{display:flex!important;flex-direction:row!important;align-items:center!important;gap:5px!important;flex-wrap:nowrap!important;overflow-x:auto}
      #hs104CompList .hs-list-head-actions .cc-btn{font-size:10px!important;padding:6px 8px!important;white-space:nowrap!important;min-height:30px!important}
      #hs104CompList .hs-list-head-actions .hs104-pill{white-space:nowrap}
      #hs104Hist .hs-hist-actions-cell{min-width:330px;width:330px;white-space:nowrap}
      #hs104Hist .hs-hist-actions-cell .cc-btn{font-size:10px!important;padding:6px 8px!important;white-space:nowrap!important;min-height:30px!important;border-radius:7px!important}
      .hs-hist-actions{display:flex!important;gap:6px!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:flex-start!important}
      #hs104Hist [data-photo-h][disabled]{opacity:.45;cursor:not-allowed}
      .hs-edit-comp-modal{position:fixed;inset:0;z-index:101050;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:14px}
      .hs-edit-comp-card{width:min(760px,97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 80px #0007}
      .hs-edit-comp-head{background:#0f172a;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .hs-edit-comp-body{padding:16px}
      .hs-edit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .hs-qr-hist-modal{position:fixed;inset:0;z-index:101100;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;padding:14px}
      .hs-qr-hist-card{width:min(500px,96vw);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px #0008}
      .hs-qr-hist-head{background:#0f172a;color:#fff;padding:13px 16px;display:flex;justify-content:space-between;align-items:center}
      .hs-qr-hist-body{padding:18px;text-align:center}
      @media(max-width:700px){.hs-edit-grid{grid-template-columns:1fr}.hs-comp-search{max-width:none}.hs-comp-switch{align-items:stretch}}
    `;document.head.appendChild(s);
  }

  async function data(force=false){
    if(cache&&!force)return cache;
    const {data,error}=await sb().rpc('hs_list');
    if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo cargar Hojas de Servicio.');
    cache=data;return data;
  }

  function cardOf(el){return el?.closest('.hs104-card')||null}

  function ensureSwitch(){
    const view=document.getElementById('hs104View'),list=document.getElementById('hs104CompList'),hist=document.getElementById('hs104Hist');
    if(!view||!list||!hist)return;
    const pendingCard=cardOf(list),histCard=cardOf(hist);
    if(!pendingCard||!histCard)return;

    let box=document.getElementById('hsCompUxSwitch');
    if(!box){
      box=document.createElement('div');box.id='hsCompUxSwitch';box.className='hs-comp-switch';
      box.innerHTML='<label><input id="hsCompUxHistory" type="checkbox"> Mostrar historial de comprobaciones</label><div style="font-size:11px;color:#475569">Solo se muestra una vista a la vez: pendientes o historial.</div>';
      pendingCard.parentNode.insertBefore(box,pendingCard);
      box.querySelector('#hsCompUxHistory').checked=showHistory;
      box.querySelector('#hsCompUxHistory').onchange=e=>{showHistory=!!e.target.checked;applyMode();};
    }
    applyMode();
    ensurePendingSearch(pendingCard);
    ensureHistorySearch(histCard);
  }

  function applyMode(){
    const list=document.getElementById('hs104CompList'),hist=document.getElementById('hs104Hist');
    const pendingCard=cardOf(list),histCard=cardOf(hist);
    if(pendingCard)pendingCard.style.display=showHistory?'none':'';
    if(histCard)histCard.style.display=showHistory?'':'none';
    const ch=document.getElementById('hsCompUxHistory');if(ch)ch.checked=showHistory;
    if(showHistory)setTimeout(()=>patchHistory(true),40);else setTimeout(()=>patchPending(),40);
  }

  function ensurePendingSearch(card){
    if(card.querySelector('#hsCompUxFolioSearch'))return;
    const toolbar=card.querySelector('.cc-toolbar');if(!toolbar)return;
    const wrap=document.createElement('div');wrap.style='margin:8px 0 10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
    wrap.innerHTML='<input id="hsCompUxFolioSearch" class="hs-comp-search" type="search" placeholder="Buscar por hoja / folio..."><span style="font-size:10px;color:#64748b">Escribe el número completo o una parte del folio.</span>';
    toolbar.insertAdjacentElement('afterend',wrap);
    wrap.querySelector('input').oninput=filterPending;
  }
  function filterPending(){
    const q=norm(document.getElementById('hsCompUxFolioSearch')?.value||'');
    document.querySelectorAll('#hs104CompList [data-row]').forEach(r=>{
      const text=norm((r.dataset.hsFolio||'')+' '+(r.dataset.hsPerson||'')+' '+r.textContent);
      r.style.display=!q||text.includes(q)?'':'none';
    });
  }

  function patchPending(){
    document.querySelectorAll('#hs104CompList [data-row]').forEach(row=>{
      const actions=row.querySelector('.hs-list-head-actions'),edit=row.querySelector('[data-hs-edit]'),ret=row.querySelector('[data-return]'),cancel=row.querySelector('[data-hs-cancel]');
      if(!actions||!edit||!ret)return;

      // No reconstruir ni mover botones en cada MutationObserver:
      // un botón que cambia de nodo entre pointerdown/click puede perder el click.
      if(edit.dataset.hsUxPatched!=='1'){
        edit.className='cc-btn cc-btn-light';
        edit.innerHTML='<i class="fa-solid fa-pen"></i> Editar';
        edit.dataset.hsUxPatched='1';
      }
      if(ret.dataset.hsUxPatched!=='1'){
        ret.innerHTML='<i class="fa-solid fa-rotate-left"></i> Registrar sin usar';
        ret.dataset.hsUxPatched='1';
      }
      if(cancel&&cancel.dataset.hsUxPatched!=='1'){
        cancel.innerHTML='<i class="fa-solid fa-ban"></i> Cancelar';
        cancel.dataset.hsUxPatched='1';
      }

      // El orden ya lo genera el módulo base. No mover nodos aquí:
      // así los manejadores onclick originales permanecen intactos.
    });
    filterPending();
  }

  function ensureHistorySearch(card){
    if(card.querySelector('#hsCompUxHistSearch'))return;
    const toolbar=card.querySelector('.cc-toolbar');if(!toolbar)return;
    const inp=document.createElement('input');inp.id='hsCompUxHistSearch';inp.className='hs-comp-search';inp.type='search';inp.placeholder='Buscar historial por hoja, persona o cliente...';
    toolbar.appendChild(inp);inp.oninput=filterHistory;
  }
  function filterHistory(){
    const q=norm(document.getElementById('hsCompUxHistSearch')?.value||'');
    document.querySelectorAll('#hs104Hist tr').forEach(tr=>{
      if(!tr.querySelector('td'))return;
      tr.style.display=!q||norm(tr.textContent).includes(q)?'':'none';
    });
  }

  async function compressHistoryPhoto(file){
    if(!file?.type?.startsWith('image/'))throw new Error('Selecciona una imagen válida.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();
      await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('No se pudo leer la foto.'));img.src=url;});
      let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
      const max=1800;
      if(Math.max(w,h)>max){const r=max/Math.max(w,h);w=Math.round(w*r);h=Math.round(h*r);}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d',{alpha:false}).drawImage(img,0,0,w,h);
      const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.78));
      if(!blob)throw new Error('No se pudo preparar la foto.');
      return blob;
    } finally {URL.revokeObjectURL(url);}
  }

  async function uploadHistoryPhoto(c,file,status){
    if(!c?.folioId)throw new Error('No se identificó el folio de la comprobación.');
    if(c.fotoPath&&!confirm('Esta comprobación ya tiene una foto. ¿Deseas reemplazarla?'))return false;
    status.textContent='Preparando foto…';
    const blob=await compressHistoryPhoto(file);
    const {data:userData,error:userError}=await sb().auth.getUser();
    if(userError||!userData?.user?.id)throw new Error('Sesión no disponible.');
    const path=userData.user.id+'/web-manual/'+c.folioId+'/'+Date.now()+'.jpg';
    status.textContent='Subiendo foto…';
    const {error:upErr}=await sb().storage.from('app-hojas-servicio').upload(path,blob,{contentType:'image/jpeg',upsert:false});
    if(upErr)throw upErr;
    const {data:r,error}=await sb().rpc('hs_set_manual_photo',{p_folio_id:c.folioId,p_foto_path:path});
    if(error||!r?.ok)throw new Error(error?.message||r?.error||'No se pudo ligar la foto a la comprobación.');
    c.fotoPath=path;
    cache=null;
    status.innerHTML='<strong style="color:#166534">Foto cargada correctamente.</strong>';
    return true;
  }

  function closeEdit(){document.querySelector('.hs-edit-comp-modal')?.remove()}
  async function openEdit(c,d){
    if(!canEdit())return alert('Tu usuario no tiene permiso para editar comprobaciones.');
    closeEdit();
    const clients=(d.clientes||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
    const tipos=(d.tiposViaje||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
    const ov=document.createElement('div');ov.className='hs-edit-comp-modal';
    ov.innerHTML=`
      <div class="hs-edit-comp-card">
        <div class="hs-edit-comp-head"><div><strong>Editar comprobación · ${esc(c.folio)}</strong><div style="font-size:10px;color:#cbd5e1;margin-top:2px">La hoja seguirá como COMPROBADA; solo se corrigen sus datos.</div></div><button type="button" data-x style="border:0;background:none;color:#fff;font-size:25px">×</button></div>
        <div class="hs-edit-comp-body">
          <div class="hs-edit-grid">
            <div class="cc-field"><label>Fecha de uso *</label><input data-fecha type="date" value="${esc(String(c.fechaUso||c.fecha||'').slice(0,10))}"></div>
            <div class="cc-field"><label>Cliente *</label><select data-cliente>${clients.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(c.clienteId)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('')}</select></div>
            <div class="cc-field"><label>Tipo de servicio *</label><select data-tipo>${tipos.map(x=>'<option value="'+esc(x.id)+'" data-name="'+esc(x.nombre)+'" '+(norm(x.nombre)===norm(c.tipoViaje||c.servicio)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('')}</select></div>
            <div class="cc-field"><label>Clasificación *</label><select data-clas></select></div>
          </div>
          <div class="cc-field"><label>Observaciones</label><textarea data-obs>${esc(c.observaciones||'')}</textarea></div>
          <div style="margin-top:12px;padding:11px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc">
            <label style="display:block;font-weight:900;color:#334155;margin-bottom:7px">Evidencia fotográfica</label>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button type="button" class="cc-btn cc-btn-light" data-photo-pick><i class="fa-solid fa-upload"></i> ${c.fotoPath?'Reemplazar foto':'Subir foto'}</button>
              <button type="button" class="cc-btn cc-btn-light" data-photo-qr><i class="fa-solid fa-qrcode"></i> QR foto</button>
              <input type="file" accept="image/*" data-photo-file style="display:none">
            </div>
            <div data-photo-status style="margin-top:7px;font-size:10px;color:#64748b">${c.fotoPath?'Esta comprobación ya tiene evidencia. Puedes reemplazarla o cargar otra mediante QR.':'Sin foto cargada. Puedes subirla aquí o mediante QR.'}</div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cerrar</button><button type="button" class="cc-btn cc-btn-primary" data-save>Guardar cambios</button></div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const tipo=ov.querySelector('[data-tipo]'),clas=ov.querySelector('[data-clas]');
    const fillClas=()=>{const tid=tipo.value;const xs=(d.clasificaciones||[]).filter(x=>String(x.tipoViajeId)===String(tid)&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');clas.innerHTML=xs.map(x=>'<option value="'+esc(x.id)+'" data-name="'+esc(x.nombre)+'" '+(norm(x.nombre)===norm(c.clasificacion)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('');};
    tipo.onchange=()=>{c.clasificacion='';fillClas()};fillClas();
    ov.querySelector('[data-x]').onclick=closeEdit;ov.querySelector('[data-cancel]').onclick=closeEdit;ov.onclick=e=>{if(e.target===ov)closeEdit();};
    const photoFile=ov.querySelector('[data-photo-file]'),photoStatus=ov.querySelector('[data-photo-status]');
    ov.querySelector('[data-photo-pick]').onclick=()=>photoFile.click();
    photoFile.onchange=async()=>{
      const file=photoFile.files?.[0];if(!file)return;
      try{
        const ok=await uploadHistoryPhoto(c,file,photoStatus);
        if(ok){ov.querySelector('[data-photo-pick]').innerHTML='<i class="fa-solid fa-upload"></i> Reemplazar foto';}
      }catch(err){photoStatus.textContent='Error: '+(err?.message||err);alert(err?.message||err);}
      finally{photoFile.value='';}
    };
    ov.querySelector('[data-photo-qr]').onclick=async()=>{try{await openHistoryQr(c);}catch(err){alert(err?.message||err);}};
    ov.querySelector('[data-save]').onclick=async e=>{
      const btn=e.currentTarget,fecha=ov.querySelector('[data-fecha]').value,clienteId=ov.querySelector('[data-cliente]').value,tipoId=tipo.value,clasId=clas.value;
      if(!fecha||!clienteId||!tipoId||!clasId)return alert('Completa fecha, cliente, tipo de servicio y clasificación.');
      btn.disabled=true;
      try{
        const {data:r,error}=await sb().rpc('hs_update_comprobacion',{p_item:{comprobacionId:c.id,fechaUso:fecha,clienteId,tipoViajeId:tipoId,clasificacionId:clasId,observaciones:ov.querySelector('[data-obs]').value||''}});
        if(error||!r?.ok)throw new Error(error?.message||r?.error||'No se pudo actualizar la comprobación.');
        closeEdit();cache=null;document.getElementById('hs104Refresh')?.click();setTimeout(()=>{showHistory=true;ensureSwitch();patchHistory(true);},350);
      }catch(err){alert(err?.message||err);btn.disabled=false;}
    };
  }

  async function ensureQrLib(){
    if(window.QRCode)return;
    let s=document.querySelector('script[data-hs-ux-qrcode]');
    if(!s){s=document.createElement('script');s.dataset.hsUxQrcode='1';s.src='assets/js/vendor/qrcode.min.js?v=1.0.0';document.head.appendChild(s);}
    await new Promise((res,rej)=>{if(window.QRCode)return res();s.addEventListener('load',res,{once:true});s.addEventListener('error',()=>rej(new Error('No se pudo cargar QR.')),{once:true});});
  }
  function closeQr(){if(qrPoll){clearInterval(qrPoll);qrPoll=null;}document.querySelector('.hs-qr-hist-modal')?.remove();}
  async function openHistoryQr(c){
    if(!canEdit())return alert('Tu usuario no tiene permiso para agregar evidencia.');
    const {data:r,error}=await sb().rpc('hs_qr_photo_create',{p_folio_id:c.folioId});
    if(error||!r?.ok)throw new Error(error?.message||r?.error||'No se pudo generar QR.');
    const url=new URL('hojas-servicio-foto-qr.html',location.href);url.search='?t='+encodeURIComponent(r.token);
    closeQr();const ov=document.createElement('div');ov.className='hs-qr-hist-modal';
    ov.innerHTML='<div class="hs-qr-hist-card"><div class="hs-qr-hist-head"><strong>Subir foto por QR · '+esc(c.folio)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:25px">×</button></div><div class="hs-qr-hist-body"><div data-code style="display:flex;justify-content:center;min-height:230px;align-items:center">Generando QR…</div><div style="font-size:11px;color:#64748b;margin-top:10px">Escanea con el celular y toma/sube la foto de esta comprobación.</div><div data-status style="margin-top:10px;padding:9px;border-radius:9px;background:#f8fafc;font-size:11px">Esperando fotografía…</div></div></div>';
    document.body.appendChild(ov);ov.querySelector('[data-x]').onclick=closeQr;ov.onclick=e=>{if(e.target===ov)closeQr();};
    try{await ensureQrLib();const el=ov.querySelector('[data-code]');el.innerHTML='';new QRCode(el,{text:url.toString(),width:230,height:230,correctLevel:QRCode.CorrectLevel.M});}catch(_){ov.querySelector('[data-code]').textContent=url.toString();}
    let busy=false;qrPoll=setInterval(async()=>{if(busy||!document.body.contains(ov))return;busy=true;try{const {data:s,error:e}=await sb().rpc('hs_qr_photo_status',{p_token:r.token});if(e)throw e;if(s?.status==='CAPTURADA'){ov.querySelector('[data-status]').innerHTML='<strong style="color:#166534">Foto recibida correctamente.</strong>';clearInterval(qrPoll);qrPoll=null;cache=null;setTimeout(()=>{closeQr();document.getElementById('hs104Refresh')?.click();setTimeout(()=>{showHistory=true;ensureSwitch();patchHistory(true);},350);},650);}else if(s?.status!=='PENDIENTE'){ov.querySelector('[data-status]').textContent='El QR ya no está disponible.';clearInterval(qrPoll);qrPoll=null;}}catch(err){ov.querySelector('[data-status]').textContent='Error: '+(err?.message||err);}finally{busy=false;}},1800);
  }

  async function patchHistory(force=false){
    const body=document.getElementById('hs104Hist');if(!body||!sb())return;
    try{
      const d=await data(force);
      const hist=(d.comprobaciones||[]).filter(x=>String(x.tipo||'').toUpperCase()==='UTILIZADA');

      body.querySelectorAll('tr[data-hs-hist-row]').forEach(tr=>{
        const folio=String(tr.dataset.hsHistFolio||'').trim();
        const c=hist.find(x=>String(x.folio||'').trim()===folio);
        if(!c)return;
        const photo=tr.querySelector('[data-photo-h]');
        if(photo){
          photo.disabled=!c.fotoPath;
          photo.title=c.fotoPath?'Ver evidencia fotográfica':'Esta comprobación todavía no tiene fotografía';
        }
        tr.dataset.hsHistPhoto=c.fotoPath||'';
      });
      filterHistory();
    }catch(e){console.warn('HS COMPROBACION UX V2',e);}
  }

  function patch(){
    style();
    ensureSwitch();patchPending();if(showHistory)patchHistory(false);
  }

  let patchTimer=null;
  const obs=new MutationObserver(mutations=>{
    const relevant=mutations.some(m=>!m.target.closest?.('#hs104Hist'));
    if(!relevant)return;
    clearTimeout(patchTimer);
    patchTimer=setTimeout(patch,80);
  });
  function start(){obs.observe(document.body,{childList:true,subtree:true});patch();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('click',e=>{
    const edit=e.target.closest?.('#hs104CompList [data-hs-edit]');
    if(edit){
      const row=edit.closest('[data-row]');
      const list=document.getElementById('hs104CompList');
      if(row&&list){
        list.querySelectorAll('.hs-list-modal-open').forEach(other=>{if(other!==row)other.classList.remove('hs-list-modal-open');});
        row.classList.add('hs-list-modal-open');
        document.body.style.overflow='hidden';
        setTimeout(()=>{try{window.hsPatchPrecapture?.();window.hsPatchManualPhotoPdf?.();}catch(_){}},0);
      }
    }
    const histBtn=e.target.closest?.('#hs104Hist [data-edit-h],#hs104Hist [data-qr-h],#hs104Hist [data-pdf-h],#hs104Hist [data-photo-h]');
    if(histBtn){
      const tr=histBtn.closest('tr[data-hs-hist-row]');
      const folio=String(tr?.dataset.hsHistFolio||'').trim();
      if(folio){
        (async()=>{
          try{
            const d=await data(false);
            const c=(d.comprobaciones||[]).find(x=>String(x.tipo||'').toUpperCase()==='UTILIZADA'&&String(x.folio||'').trim()===folio);
            if(!c)throw new Error('No se encontró la comprobación.');
            if(histBtn.matches('[data-edit-h]')) return openEdit(c,d);
            if(histBtn.matches('[data-qr-h]')) return openHistoryQr(c);
            if(histBtn.matches('[data-pdf-h]')){
              histBtn.disabled=true;
              try{
                if(typeof window.hsHistoryExportPdf!=='function')throw new Error('El generador PDF todavía no está disponible.');
                await window.hsHistoryExportPdf(c);
              } finally {histBtn.disabled=false;}
              return;
            }
            if(histBtn.matches('[data-photo-h]')){
              if(!c.fotoPath)return;
              if(typeof window.hsHistoryShowPhoto!=='function')throw new Error('El visor de foto todavía no está disponible.');
              return window.hsHistoryShowPhoto(c.fotoPath,'Evidencia · '+c.folio);
            }
          }catch(err){alert(err?.message||err);}
        })();
      }
    }
    if(e.target.closest?.('[data-v="Comprobacion"],#ccTabHojasServicio,#hs104Refresh')){
      cache=null;setTimeout(patch,250);
    }
  },true);
  /* Historial: sin intervalos que reconstruyan o alteren la botonera. */
})();