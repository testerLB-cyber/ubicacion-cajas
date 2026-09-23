/* Tráfico App Profesional · Hojas de Servicio · Cancelación con motivo/evidencia */
(function(){
  'use strict';
  if(window.__HS_CANCEL_V1__) return;
  window.__HS_CANCEL_V1__=true;

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureStyle(){
    if(document.getElementById('hs-cancel-v1-style')) return;
    const s=document.createElement('style');
    s.id='hs-cancel-v1-style';
    s.textContent=`
      #hs104CompList [data-hs-cancel]{border-color:#fecaca!important;background:#fff1f2!important;color:#be123c!important}
      .hs-cancel-overlay{position:fixed;inset:0;z-index:100980;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:14px}
      .hs-cancel-card{width:min(560px,96vw);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px #0006}
      .hs-cancel-head{background:#991b1b;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px}
      .hs-cancel-body{padding:16px}.hs-cancel-body textarea{width:100%;min-height:110px;resize:vertical}
      .hs-cancel-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}
      .hs-cancel-evidence{margin-top:12px;padding:10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}
      .hs-cancel-status{font-size:10px;color:#64748b;margin-top:6px}
    `;
    document.head.appendChild(s);
  }

  async function compressImage(file){
    if(!file?.type?.startsWith('image/')) throw new Error('Selecciona una imagen válida.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();
      await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('No se pudo leer la foto.'));img.src=url;});
      let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
      const max=1800;
      if(Math.max(w,h)>max){const r=max/Math.max(w,h);w=Math.round(w*r);h=Math.round(h*r);}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d',{alpha:false}).drawImage(img,0,0,w,h);
      const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',.8));
      if(!blob) throw new Error('No se pudo preparar la foto.');
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }

  async function uploadEvidence(folioId,file,status){
    if(!file) return '';
    status.textContent='Preparando evidencia…';
    const blob=await compressImage(file);
    const {data:userData,error:userError}=await sb().auth.getUser();
    if(userError||!userData?.user?.id) throw new Error('Sesión no disponible.');
    const path=userData.user.id+'/cancelaciones/'+folioId+'/'+Date.now()+'.jpg';
    status.textContent='Subiendo evidencia…';
    const {error}=await sb().storage.from('app-hojas-servicio').upload(path,blob,{contentType:'image/jpeg',upsert:false});
    if(error) throw error;
    return path;
  }

  function openCancel(row){
    const folioId=row.dataset.row,folio=row.dataset.hsFolio||'';
    if(!folioId) return alert('No se identificó la hoja.');
    document.querySelector('.hs-cancel-overlay')?.remove();
    const ov=document.createElement('div');
    ov.className='hs-cancel-overlay';
    ov.innerHTML=`
      <div class="hs-cancel-card">
        <div class="hs-cancel-head">
          <strong>Cancelar hoja · ${esc(folio)}</strong>
          <button type="button" data-x style="border:0;background:none;color:#fff;font-size:25px;cursor:pointer">×</button>
        </div>
        <div class="hs-cancel-body">
          <div style="padding:10px 12px;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:12px;margin-bottom:12px">
            Esta acción marcará la hoja como <strong>CANCELADA</strong> y dejará de aparecer como pendiente de comprobación.
          </div>
          <div class="cc-field">
            <label>Motivo de cancelación *</label>
            <textarea data-motivo placeholder="Escribe el motivo por el que se cancela esta hoja..." required></textarea>
          </div>
          <div class="hs-cancel-evidence">
            <label style="display:block;font-weight:800;color:#334155;margin-bottom:7px">Evidencia fotográfica (opcional)</label>
            <button type="button" class="cc-btn cc-btn-light" data-pick><i class="fa-solid fa-camera"></i> Seleccionar foto</button>
            <input type="file" accept="image/*" data-file style="display:none">
            <div class="hs-cancel-status" data-status>Sin evidencia seleccionada.</div>
          </div>
          <div class="hs-cancel-actions">
            <button type="button" class="cc-btn cc-btn-light" data-close>No cancelar</button>
            <button type="button" class="cc-btn" data-confirm style="background:#b91c1c;color:#fff;border-color:#b91c1c"><i class="fa-solid fa-ban"></i> Confirmar cancelación</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const close=()=>ov.remove();
    ov.querySelector('[data-x]').onclick=close;
    ov.querySelector('[data-close]').onclick=close;
    ov.onclick=e=>{if(e.target===ov)close();};
    const input=ov.querySelector('[data-file]'),status=ov.querySelector('[data-status]');
    ov.querySelector('[data-pick]').onclick=()=>input.click();
    input.onchange=()=>{status.textContent=input.files?.[0]?'Evidencia seleccionada: '+input.files[0].name:'Sin evidencia seleccionada.';};

    ov.querySelector('[data-confirm]').onclick=async e=>{
      const motivo=String(ov.querySelector('[data-motivo]').value||'').trim();
      if(!motivo) return alert('Captura el motivo de cancelación.');
      if(!confirm('¿Confirmas que deseas cancelar la hoja '+folio+'?')) return;
      const btn=e.currentTarget;btn.disabled=true;
      try{
        const fotoPath=await uploadEvidence(folioId,input.files?.[0],status);
        status.textContent='Registrando cancelación…';
        const {data,error}=await sb().rpc('hs_cancel_sheet',{p_item:{folioId,motivo,fotoPath}});
        if(error||!data?.ok) throw new Error(error?.message||data?.error||'No se pudo cancelar la hoja.');
        close();
        alert('Hoja '+folio+' cancelada correctamente.');
        document.getElementById('hs104Refresh')?.click();
      }catch(err){
        status.textContent='Error: '+(err?.message||err);
        alert(err?.message||err);
        btn.disabled=false;
      }
    };
  }

  function patchRow(row){
    const actions=row.querySelector('.hs-list-head-actions');
    const edit=row.querySelector('[data-hs-edit]');
    if(!actions||!edit||actions.querySelector('[data-hs-cancel]')) return;
    const b=document.createElement('button');
    b.type='button';b.className='cc-btn cc-btn-light';b.dataset.hsCancel='1';
    b.innerHTML='<i class="fa-solid fa-ban"></i> Cancelar hoja';
    edit.after(b);
    b.onclick=()=>openCancel(row);
  }

  function patch(){
    ensureStyle();
    document.querySelectorAll('#hs104CompList [data-row]').forEach(patchRow);
  }

  const obs=new MutationObserver(()=>patch());
  function start(){obs.observe(document.body,{childList:true,subtree:true});patch();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v="Comprobacion"],#ccTabHojasServicio'))setTimeout(patch,180);},true);
  setInterval(()=>{if(document.getElementById('hs104CompList'))patch();},1200);
})();
