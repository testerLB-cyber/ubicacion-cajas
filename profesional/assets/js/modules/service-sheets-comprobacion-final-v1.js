/* Tráfico App Profesional · Comprobación Hojas · corrección final de interfaz 2026-09-22 */
(function(){
  'use strict';
  if(window.__HS_COMPROBACION_FINAL_V1__) return;
  window.__HS_COMPROBACION_FINAL_V1__=true;

  function ensureRow(row){
    if(!row) return;

    const headActions=row.querySelector('.hs-list-head-actions');
    const edit=row.querySelector('[data-hs-edit]');
    const modal=row.querySelector('.hs-list-edit-area');
    const body=modal?.querySelector('.hs-list-dialog-body')||modal;

    // "Regresar sin usar" siempre debe vivir en el listado principal.
    let ret=row.querySelector('[data-return]');
    if(ret&&headActions&&!headActions.contains(ret)){
      ret.innerHTML='<i class="fa-solid fa-rotate-left"></i> Regresar sin usar';
      ret.classList.add('cc-btn','cc-btn-light');
      if(edit) headActions.insertBefore(ret,edit); else headActions.appendChild(ret);
    }

    // Garantizar bloque de evidencia visible dentro del modal.
    if(body){
      let box=body.querySelector('[data-hs-manual-photo-box]');
      if(!box){
        box=document.createElement('div');
        box.className='hs-manual-photo-box';
        box.dataset.hsManualPhotoBox='1';
        box.dataset.photoPath='';
        box.innerHTML=
          '<label style="display:block;font-weight:800;color:#334155;margin-bottom:7px">Evidencia fotográfica</label>'+
          '<div class="hs-photo-methods" style="display:flex!important;align-items:center;gap:8px;flex-wrap:wrap">'+
            '<button type="button" class="cc-btn cc-btn-light" data-upload style="display:inline-flex!important;align-items:center;gap:6px"><i class="fa-solid fa-upload"></i> Subir imagen</button>'+
            '<button type="button" class="cc-btn cc-btn-light" data-qr style="display:inline-flex!important;align-items:center;gap:6px"><i class="fa-solid fa-qrcode"></i> Tomar foto con QR</button>'+
            '<input type="file" accept="image/*" data-file style="display:none">'+
          '</div>'+
          '<div class="hs-manual-photo-status" style="margin-top:7px;color:#64748b">Sube una foto desde este equipo o usa el QR para tomarla desde tu teléfono.</div>';
        body.insertBefore(box,body.firstChild);
      }else{
        let methods=box.querySelector('.hs-photo-methods');
        if(!methods){
          methods=document.createElement('div');
          methods.className='hs-photo-methods';
          box.appendChild(methods);
        }
        methods.style.setProperty('display','flex','important');
        methods.style.alignItems='center';
        methods.style.gap='8px';
        methods.style.flexWrap='wrap';

        if(!box.querySelector('[data-upload]')){
          const upload=document.createElement('button');
          upload.type='button';upload.className='cc-btn cc-btn-light';upload.dataset.upload='';
          upload.innerHTML='<i class="fa-solid fa-upload"></i> Subir imagen';
          methods.appendChild(upload);
        }
        if(!box.querySelector('[data-qr]')){
          const qr=document.createElement('button');
          qr.type='button';qr.className='cc-btn cc-btn-light';qr.dataset.qr='';
          qr.innerHTML='<i class="fa-solid fa-qrcode"></i> Tomar foto con QR';
          methods.appendChild(qr);
        }
        if(!box.querySelector('[data-file]')){
          const file=document.createElement('input');
          file.type='file';file.accept='image/*';file.dataset.file='';file.style.display='none';
          methods.appendChild(file);
        }
        box.querySelectorAll('[data-upload],[data-qr]').forEach(b=>{
          b.style.setProperty('display','inline-flex','important');
          b.style.alignItems='center';
          b.style.gap='6px';
        });
      }
    }
  }

  function patch(){
    const list=document.getElementById('hs104CompList');
    if(!list) return;
    list.querySelectorAll('[data-row]').forEach(ensureRow);
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest?.('#hs104CompList [data-hs-edit]');
    if(edit){
      const row=edit.closest('[data-row]');
      setTimeout(()=>{ensureRow(row);},0);
    }
    if(e.target.closest?.('[data-v="Comprobacion"],#ccTabHojasServicio')){
      setTimeout(patch,120);
      setTimeout(patch,500);
    }
  },true);

  const obs=new MutationObserver(()=>patch());
  function start(){
    obs.observe(document.body,{childList:true,subtree:true});
    patch();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  setInterval(patch,1200);
  window.hsPatchComprobacionFinal=patch;
})();