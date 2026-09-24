(function(){
  'use strict';
  if(window.__HS_PRECAPTURE_V2__) return;
  window.__HS_PRECAPTURE_V2__=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let DATA=null,loading=null;

  async function data(force=false){
    if(DATA&&!force)return DATA;
    if(loading)return loading;
    loading=(async()=>{
      try{
        const {data,error}=await sb().rpc('hs_list');
        if(error||!data?.ok)throw new Error(error?.message||data?.error||'No se pudo cargar la precaptura');
        DATA=data;
        return DATA;
      }finally{loading=null;}
    })();
    return loading;
  }

  function options(xs,selected,label){
    return '<option value="">'+label+'</option>'+(xs||[]).map(x=>'<option value="'+esc(x.nombre)+'" data-id="'+esc(x.id)+'" '+(String(x.nombre)===String(selected)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('');
  }

  function ensurePhotoModal(){
    let modal=document.getElementById('hsMobilePhotoModal');
    if(modal)return modal;

    const style=document.createElement('style');
    style.id='hs-mobile-photo-modal-style';
    style.textContent=`
      #hsMobilePhotoModal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.76);backdrop-filter:blur(4px)}
      #hsMobilePhotoModal.is-open{display:flex}
      #hsMobilePhotoModal .hs-photo-modal-card{position:relative;width:min(94vw,980px);max-height:92vh;background:#fff;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.34);overflow:hidden;display:flex;flex-direction:column}
      #hsMobilePhotoModal .hs-photo-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e2e8f0;background:#fff}
      #hsMobilePhotoModal .hs-photo-modal-head strong{font-size:13px;color:#0f172a}
      #hsMobilePhotoModal .hs-photo-modal-close{border:0;background:#f1f5f9;color:#0f172a;border-radius:9px;width:34px;height:34px;cursor:pointer;font-size:18px;display:grid;place-items:center}
      #hsMobilePhotoModal .hs-photo-modal-body{min-height:220px;display:flex;align-items:center;justify-content:center;background:#0f172a;overflow:auto}
      #hsMobilePhotoModal .hs-photo-modal-body img{display:block;max-width:100%;max-height:80vh;object-fit:contain;margin:auto}
      #hsMobilePhotoModal .hs-photo-modal-loading{padding:34px;color:#e2e8f0;font-size:13px}
      @media(max-width:640px){
        #hsMobilePhotoModal{padding:8px}
        #hsMobilePhotoModal .hs-photo-modal-card{width:100%;max-height:96vh;border-radius:12px}
        #hsMobilePhotoModal .hs-photo-modal-body img{max-height:84vh}
      }
    `;
    document.head.appendChild(style);

    modal=document.createElement('div');
    modal.id='hsMobilePhotoModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Foto precargada desde app móvil');
    modal.innerHTML=`
      <div class="hs-photo-modal-card">
        <div class="hs-photo-modal-head">
          <strong><i class="fa-solid fa-camera"></i> Foto precargada desde app móvil</strong>
          <button type="button" class="hs-photo-modal-close" data-hs-photo-close aria-label="Cerrar">&times;</button>
        </div>
        <div class="hs-photo-modal-body" data-hs-photo-body>
          <div class="hs-photo-modal-loading">Cargando foto…</div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close=()=>{
      modal.classList.remove('is-open');
      const body=modal.querySelector('[data-hs-photo-body]');
      if(body)body.innerHTML='<div class="hs-photo-modal-loading">Cargando foto…</div>';
      document.body.style.overflow='';
    };
    modal.querySelector('[data-hs-photo-close]')?.addEventListener('click',close);
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))close();});
    modal._hsClose=close;
    return modal;
  }

  async function photo(path){
    const modal=ensurePhotoModal();
    const body=modal.querySelector('[data-hs-photo-body]');
    modal.classList.add('is-open');
    document.body.style.overflow='hidden';
    if(body)body.innerHTML='<div class="hs-photo-modal-loading"><i class="fa-solid fa-spinner fa-spin"></i> Cargando foto…</div>';
    try{
      const {data,error}=await sb().storage.from('app-hojas-servicio').createSignedUrl(path,900);
      if(error)throw error;
      if(body)body.innerHTML='<img src="'+esc(data.signedUrl)+'" alt="Evidencia de hoja de servicio">';
    }catch(e){
      if(body)body.innerHTML='<div class="hs-photo-modal-loading">No se pudo cargar la foto: '+esc(e.message||String(e))+'</div>';
    }
  }

  function patchRow(row,d){
    if(!row||row.dataset.precaptureV2==='1')return;
    const f=(d.foliosAsignadosOperador||[]).find(x=>String(x.id)===String(row.dataset.row));if(!f)return;
    const pre=f.precaptura||null,tipo=row.querySelector('[data-tipo]'),clas=row.querySelector('[data-clas]'),cliente=row.querySelector('[data-cliente]'),obs=row.querySelector('[data-obs]');
    if(!tipo||!clas||!cliente)return;
    const tipoSel=document.createElement('select');tipoSel.dataset.tipo='';tipoSel.className=tipo.className||'';tipoSel.innerHTML=options(d.tiposViaje||[],pre?.tipoViaje||'','Seleccionar tipo de viaje…');tipo.replaceWith(tipoSel);
    let clasSel=document.createElement('select');clasSel.dataset.clas='';clasSel.className=clas.className||'';clas.replaceWith(clasSel);
    const fill=(selected='')=>{const tid=tipoSel.selectedOptions[0]?.dataset.id||'';const tv=(d.tiposViaje||[]).find(x=>String(x.id)===String(tid));if(tv?.clasificacionManual){const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:7px;align-items:center';const inp=document.createElement('input');inp.type='number';inp.min='0.01';inp.step='0.01';inp.inputMode='decimal';inp.placeholder=String(tv.nombre||'').toUpperCase()==='RESGUARDO'?'Cantidad':'Cantidad de horas';inp.dataset.clas='';inp.dataset.cantidadCobro='';inp.className=clasSel.className||'';const n=String(selected||'').match(/[0-9]+(?:[.,][0-9]+)?/);if(n)inp.value=n[0].replace(',','.');wrap.appendChild(inp);if(String(tv.nombre||'').toUpperCase()==='RESGUARDO'){const unit=document.createElement('select');unit.dataset.unidadCobro='';unit.className=clasSel.className||'';unit.style.maxWidth='130px';unit.innerHTML='<option value="DIA">Días</option><option value="HORA">Horas</option>';if(/HORA/i.test(selected||''))unit.value='HORA';wrap.appendChild(unit);}clasSel.replaceWith(wrap);clasSel=inp;return;}if(clasSel.tagName!=='SELECT'){const s=document.createElement('select');s.dataset.clas='';s.className=clasSel.className||'';clasSel.replaceWith(s);clasSel=s;}const xs=(d.clasificaciones||[]).filter(x=>String(x.tipoViajeId||'')===String(tid));clasSel.innerHTML=options(xs,selected,'Seleccionar clasificación…');};
    tipoSel.onchange=()=>fill('');fill(pre?.clasificacion||'');
    if(pre){
      cliente.value=pre.clienteId||'';
      if(obs&&!String(obs.value||'').trim()&&pre.dondeUtilizado)obs.value='Dónde se utilizó: '+pre.dondeUtilizado;
      const pill=row.querySelector('.hs104-pill');if(pill){pill.textContent='PRECARGADA APP';pill.classList.remove('hs104-danger');pill.classList.add('hs104-ok');}
      const note=document.createElement('div');note.className='hs104-note';note.style.cssText='margin:10px 0;padding:9px 10px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:9px;color:#166534';
      note.innerHTML='<strong>Precarga móvil lista para revisar:</strong> '+esc(pre.cliente||'—')+' · '+esc(pre.tipoViaje||'—')+' · '+esc(pre.clasificacion||'—')+(pre.dondeUtilizado?' · '+esc(pre.dondeUtilizado):'')+(pre.fotoPath?' <button type="button" class="cc-btn cc-btn-light" data-mobile-photo style="margin-left:6px"><i class="fa-solid fa-camera"></i> Ver foto</button>':'');
      row.querySelector('.hs104-actions')?.insertAdjacentElement('beforebegin',note);
      note.querySelector('[data-mobile-photo]')?.addEventListener('click',()=>photo(pre.fotoPath));
    }
    row.dataset.precaptureV2='1';
  }

  async function patch(force=false){
    const list=document.getElementById('hs104CompList');if(!list||!sb())return;
    const rows=[...list.querySelectorAll('[data-row]')];if(!rows.length)return;
    try{const d=await data(force);rows.forEach(r=>patchRow(r,d));}catch(e){console.warn('HS PRECAPTURA V2',e);}
  }

  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v="Comprobacion"]'))setTimeout(()=>patch(true),180);},true);
  document.addEventListener('change',e=>{if(e.target?.id==='hs104CompPerson'||e.target?.id==='hs104CompType')setTimeout(()=>patch(true),80);},true);
  window.hsPatchPrecapture=()=>patch(true);
})();
