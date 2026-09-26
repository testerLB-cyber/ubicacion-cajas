/* Tráfico App Móvil · Operador UX refresh 2026-09-26 */
(function(){
  'use strict';
  if(window.__MOBILE_OPERATOR_REFRESH_V1__) return;
  window.__MOBILE_OPERATOR_REFRESH_V1__=true;

  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();

  function addStyles(){
    if(document.getElementById('mobileOperatorRefreshStyle'))return;
    const s=document.createElement('style');
    s.id='mobileOperatorRefreshStyle';
    s.textContent=`
      .mobile-global-logout{position:fixed;right:12px;top:calc(10px + env(safe-area-inset-top));z-index:9999;border:0;border-radius:999px;padding:9px 12px;background:#fff;color:#991b1b;font-weight:900;font-size:12px;box-shadow:0 8px 25px #0f172a33;border:1px solid #fecaca}
      .mobile-photo-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
      .mobile-photo-actions button{border:0;border-radius:12px;padding:11px 10px;font-weight:900;font-size:12px}
      .mobile-photo-camera{background:#2563eb;color:#fff}.mobile-photo-gallery{background:#e2e8f0;color:#334155}
      .mobile-photo-ok{margin-top:7px;color:#166534;font-weight:800;font-size:11px}
      .mobile-current-service{margin:8px 0 12px;padding:10px 11px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;color:#475569}
      body:has(#login:not(.hidden)) .mobile-global-logout{display:none}
    `;
    document.head.appendChild(s);
  }

  function addLogout(){
    if(document.getElementById('mobileGlobalLogout'))return;
    const b=document.createElement('button');
    b.type='button'; b.id='mobileGlobalLogout'; b.className='mobile-global-logout'; b.textContent='Cerrar sesión';
    b.onclick=async()=>{try{if(typeof logout==='function')await logout();else{await sb.auth.signOut();location.reload();}}catch(_){location.reload();}};
    document.body.appendChild(b);
  }

  function addPhotoControls(){
    const input=$('hsPhoto'); if(!input || input.dataset.proUx==='1')return;
    input.dataset.proUx='1';
    input.style.display='none';
    const host=input.closest('.photo'); if(!host)return;
    const actions=document.createElement('div'); actions.className='mobile-photo-actions';
    actions.innerHTML='<button type="button" class="mobile-photo-camera" data-hs-camera>📷 Tomar foto</button><button type="button" class="mobile-photo-gallery" data-hs-gallery>🖼️ Elegir foto</button>';
    host.insertBefore(actions,$('hsPhotoInfo'));
    const ok=document.createElement('div'); ok.id='hsPhotoReady'; ok.className='mobile-photo-ok'; ok.style.display='none'; ok.textContent='✓ Foto lista para enviar';
    host.appendChild(ok);

    actions.querySelector('[data-hs-camera]').onclick=()=>{input.setAttribute('capture','environment');input.click();};
    actions.querySelector('[data-hs-gallery]').onclick=()=>{
      input.removeAttribute('capture');
      input.click();
      setTimeout(()=>input.setAttribute('capture','environment'),500);
    };
    input.addEventListener('change',()=>{setTimeout(()=>{const ready=!!window.HS_FILE||!!input.files?.length;ok.style.display=ready?'block':'none';if(ready&&$('hsPhotoInfo'))$('hsPhotoInfo').textContent='Foto preparada y comprimida para la comprobación.';},80);});
  }

  function updateServiceLabels(){
    const trip=$('hsTrip'), cls=$('hsClass'); if(!trip||!cls)return;
    const tripLabel=trip.closest('.field')?.querySelector('label');
    const classLabel=cls.closest('.field')?.querySelector('label');
    if(tripLabel)tripLabel.textContent='Tipo de servicio / concepto *';
    const selected=trip.options?.[trip.selectedIndex]?.textContent||'';
    if(classLabel)classLabel.textContent=norm(selected)==='DEMORA'?'Horas de demora *':'Clasificación *';
    let info=$('hsServiceInfo');
    if(!info){
      info=document.createElement('div');info.id='hsServiceInfo';info.className='mobile-current-service';
      trip.closest('.field')?.insertAdjacentElement('afterend',info);
    }
    if(norm(selected)==='DEMORA') info.innerHTML='<b>Demora:</b> selecciona 1, 2, 3, 4 o 5 horas en el campo siguiente.';
    else info.textContent='Selecciona el tipo de servicio y su clasificación correspondiente.';
  }

  function ensureCurrentCatalogs(){
    const trip=$('hsTrip'); if(!trip || !Array.isArray(window.HS?.tiposViaje))return;
    const current=trip.value;
    const active=HS.tiposViaje||[];
    const ids=new Set([...trip.options].map(o=>String(o.value)));
    active.forEach(x=>{if(!ids.has(String(x.id))){const o=document.createElement('option');o.value=x.id;o.textContent=x.nombre;trip.appendChild(o);}});
    if(current)trip.value=current;
    updateServiceLabels();
  }

  function decorate(){
    addStyles(); addLogout(); addPhotoControls(); updateServiceLabels(); ensureCurrentCatalogs();
    const used=$('hsUsedAt'); if(used){used.required=false;used.removeAttribute('required');used.placeholder='Comentarios opcionales';}
    const save=$('hsSave'); if(save)save.textContent='Guardar comprobación y evidencia';
  }

  document.addEventListener('change',e=>{if(e.target?.id==='hsTrip')setTimeout(updateServiceLabels,0);},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-hs],#goHs,#hsRefresh'))setTimeout(decorate,120);},true);
  const mo=new MutationObserver(()=>decorate());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{decorate();mo.observe(document.body,{childList:true,subtree:true});},{once:true});
  else{decorate();mo.observe(document.body,{childList:true,subtree:true});}
})();