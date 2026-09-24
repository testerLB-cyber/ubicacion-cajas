/* Tráfico App Móvil · Hojas · Unidad + Remolque v1 */
(function(){
  if(window.__MOBILE_HS_UNIT_TRAILER_V1__)return;
  window.__MOBILE_HS_UNIT_TRAILER_V1__=true;
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const units=()=>Array.isArray(HS?.unidades)?HS.unidades:[];
  const unitByNumber=v=>units().find(x=>norm(x.numero)===norm(v))||null;
  const boxes=()=>units().filter(x=>x.esCaja);
  let ADMIN_FOLIO='';

  function addStyle(){if(document.getElementById('hsUnitTrailerStyle'))return;const s=document.createElement('style');s.id='hsUnitTrailerStyle';s.textContent='.unit-valid{border-color:#16a34a!important;background:#f0fdf4!important;box-shadow:0 0 0 2px rgba(22,163,74,.12)!important}.unit-invalid{border-color:#ef4444!important;background:#fef2f2!important}.unit-status{font-size:11px;margin-top:5px;font-weight:800}.unit-status.ok{color:#15803d}.unit-status.bad{color:#b91c1c}.unit-status.muted{color:#64748b}';document.head.appendChild(s)}
  function fillLists(){
    const dl=document.getElementById('mobileHsUnitList');if(dl)dl.innerHTML=units().map(x=>'<option value="'+esc(x.numero)+'" label="'+esc((x.tipoUnidad||x.categoria||'')+(x.descripcion?' · '+x.descripcion:''))+'"></option>').join('');
    const tl=document.getElementById('mobileHsTrailerList');if(tl)tl.innerHTML=boxes().map(x=>'<option value="'+esc(x.numero)+'" label="'+esc(x.descripcion||'Caja')+'"></option>').join('');
  }
  function ensureOperatorFields(){
    const form=document.getElementById('hsForm');if(!form||document.getElementById('hsUnit'))return;
    const used=document.getElementById('hsUsedAt')?.closest('.field');if(!used)return;
    const client=document.getElementById('hsClient');if(client)client.required=true;if(client&&client.tagName==='SELECT'){const input=document.createElement('input');input.id='hsClientAuto';input.autocomplete='off';input.required=true;input.placeholder='Escribe mínimo 2 letras del cliente';const dl=document.createElement('div');dl.id='mobileHsClientSuggest';dl.style.cssText='display:none;border:1px solid #cbd5e1;border-radius:12px;margin-top:6px;max-height:220px;overflow:auto;background:#fff;position:relative;z-index:30';client.style.display='none';client.insertAdjacentElement('afterend',input);input.insertAdjacentElement('afterend',dl);const render=()=>{const q=norm(input.value);client.value='';if(q.length<2){dl.style.display='none';dl.innerHTML='';return;}const os=[...client.options].filter(o=>o.value&&norm(o.textContent).includes(q)).slice(0,30);dl.innerHTML=os.length?os.map(o=>'<button type="button" data-client-id="'+esc(o.value)+'" data-client-name="'+esc(o.textContent)+'" style="display:block;width:100%;padding:12px;text-align:left;border:0;border-bottom:1px solid #e2e8f0;background:#fff;font:inherit">'+esc(o.textContent)+'</button>').join(''):'<div style="padding:12px;color:#64748b">Sin coincidencias</div>';dl.style.display='block';};input.addEventListener('input',render);dl.addEventListener('click',e=>{const b=e.target.closest('[data-client-id]');if(!b)return;client.value=b.dataset.clientId;input.value=b.dataset.clientName;dl.style.display='none';});}
    const wrap=document.createElement('div');wrap.innerHTML='<div class="field"><label>Unidad *</label><input id="hsUnit" list="mobileHsUnitList" autocomplete="off" required placeholder="Escribe o selecciona unidad"><datalist id="mobileHsUnitList"></datalist><div id="hsUnitStatus" class="unit-status muted">Escribe y selecciona una unidad del catálogo.</div></div><div class="field hidden" id="hsTrailerField"><label>Caja *</label><input id="hsTrailer" autocomplete="off" placeholder="Escribe número de caja/remolque"><div class="muted" style="font-size:11px;margin-top:5px">Captura la caja/remolque manualmente.</div></div>';
    const nodes=[...wrap.children];nodes.forEach(n=>used.parentNode.insertBefore(n,used));
    ['input','change','blur'].forEach(ev=>document.getElementById('hsUnit').addEventListener(ev,syncOperatorUnit));
    fillLists();
  }
  function syncInput(input,status,trailerField,trailerInput){
    const u=unitByNumber(input.value);input.classList.remove('unit-valid','unit-invalid');status.className='unit-status muted';
    if(u){input.dataset.unitId=String(u.id||'');input.dataset.tracto=u.esTracto?'1':'0';input.classList.add('unit-valid');status.className='unit-status ok';status.textContent='✓ Unidad del catálogo · '+(u.tipoUnidad||u.categoria||'');trailerField.classList.toggle('hidden',!u.esTracto);trailerInput.required=!!u.esTracto;if(!u.esTracto)trailerInput.value='';return u;}
    input.dataset.unitId='';input.dataset.tracto='0';trailerField.classList.add('hidden');trailerInput.required=false;if(input.value.trim()){input.classList.add('unit-invalid');status.className='unit-status bad';status.textContent='Selecciona una unidad válida del catálogo.';}else status.textContent='Escribe y selecciona una unidad del catálogo.';return null;
  }
  function syncOperatorUnit(){return syncInput(document.getElementById('hsUnit'),document.getElementById('hsUnitStatus'),document.getElementById('hsTrailerField'),document.getElementById('hsTrailer'))}
  function prefillOperator(){ensureOperatorFields();fillLists();const ev=HS_CURRENT?.evidencia||{};const i=document.getElementById('hsUnit'),t=document.getElementById('hsTrailer');if(i){i.value=ev.unidadNumero||'';t.value=ev.remolqueNumero||'';syncOperatorUnit();}}

  const prevOpenHs=typeof openHs==='function'?openHs:null;
  if(prevOpenHs){openHs=function(id){const r=prevOpenHs(id);setTimeout(prefillOperator,0);return r;};}
  ensureOperatorFields();addStyle();

  document.addEventListener('submit',async e=>{
    if(e.target?.id!=='hsForm')return;
    e.preventDefault();e.stopImmediatePropagation();
    const b=document.getElementById('hsSave');if(b.disabled)return;b.disabled=true;
    let path='';
    try{
      const cv=String(document.getElementById('hsClient')?.value||'').trim();if(!cv)throw new Error('Selecciona un cliente válido del catálogo.');const u=syncOperatorUnit();if(!u)throw new Error('La Unidad es obligatoria. Selecciona una unidad válida del catálogo.');
      const rem=String(document.getElementById('hsTrailer')?.value||'').trim();if(u.esTracto&&!rem)throw new Error('La Caja es obligatoria cuando la unidad es Tracto-camión. Selecciona una caja.');
      if(!HS_FILE)throw new Error('La foto es obligatoria.');
      const au=await sb.auth.getUser(),uid=au.data?.user?.id;path=uid+'/'+HS_CURRENT.id+'/'+Date.now()+'.jpg';
      let r=await sb.storage.from('app-hojas-servicio').upload(path,HS_FILE,{contentType:'image/jpeg'});if(r.error)throw r.error;
      r=await sb.rpc('app_mobile_save_evidence_v3',{p_folio_id:HS_CURRENT.id,p_cliente_id:document.getElementById('hsClient').value,p_tipo_viaje_id:document.getElementById('hsTrip').value,p_clasificacion_id:document.getElementById('hsClass').value,p_donde_utilizado:document.getElementById('hsUsedAt').value.trim(),p_foto_path:path,p_unidad_id:u.id,p_remolque_numero:u.esTracto?rem:''});
      if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo guardar');
      msg('hsMsg','Evidencia guardada con unidad'+(u.esTracto?' y remolque':'')+'. Pendiente de comprobación web.','oktxt');await loadAll(false);setTimeout(renderHs,250);
    }catch(err){msg('hsMsg',err.message||err,'err')}finally{b.disabled=false;}
  },true);

  function decorateAdminModal(){
    const modal=document.getElementById('admHojaModal');if(!modal||modal.dataset.unitTrailer==='1')return;
    const card=modal.querySelector('.admin-modal-card'),obs=document.getElementById('admObs');if(!card||!obs)return;modal.dataset.unitTrailer='1';
    const block=document.createElement('div');block.innerHTML='<label>Unidad</label><input id="admUnidad" list="admUnitList" autocomplete="off" placeholder="Escribe número de unidad"><datalist id="admUnitList"></datalist><div id="admUnidadStatus" class="unit-status muted">Escribe y selecciona una unidad del catálogo.</div><div id="admTrailerField" class="hidden"><label>Número de remolque</label><input id="admTrailer" list="admTrailerList" autocomplete="off" placeholder="Ej. LB245 o cualquier remolque"><datalist id="admTrailerList"></datalist><div class="muted" style="font-size:11px;margin-top:5px">Campo libre; LB muestra sugerencias del catálogo.</div></div>';
    obs.previousElementSibling?.insertAdjacentElement('beforebegin',block);
    const ui=document.getElementById('admUnidad'),ul=document.getElementById('admUnitList'),tl=document.getElementById('admTrailerList');ul.innerHTML=units().map(x=>'<option value="'+esc(x.numero)+'"></option>').join('');tl.innerHTML=boxes().map(x=>'<option value="'+esc(x.numero)+'"></option>').join('');
    const ev=(HS?.folios||[]).find(x=>String(x.id)===String(ADMIN_FOLIO))?.evidencia||{};ui.value=ev.unidadNumero||'';document.getElementById('admTrailer').value=ev.remolqueNumero||'';
    ['input','change','blur'].forEach(x=>ui.addEventListener(x,syncAdminUnit));syncAdminUnit();
  }
  function syncAdminUnit(){return syncInput(document.getElementById('admUnidad'),document.getElementById('admUnidadStatus'),document.getElementById('admTrailerField'),document.getElementById('admTrailer'))}
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-adm-hoja]');if(b){ADMIN_FOLIO=b.dataset.admHoja||'';setTimeout(decorateAdminModal,0);}},true);
  const mo=new MutationObserver(()=>{if(document.getElementById('admHojaModal'))decorateAdminModal();if(document.getElementById('hsCapture'))ensureOperatorFields();});mo.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('click',async e=>{
    const b=e.target.closest?.('#admConfirm');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();if(b.disabled)return;b.disabled=true;
    try{
      const u=syncAdminUnit();if(!u)throw new Error('Selecciona una unidad válida del catálogo.');const rem=String(document.getElementById('admTrailer')?.value||'').trim();if(u.esTracto&&!rem)throw new Error('Captura el número de remolque para el Tracto-camión.');
      const c=document.getElementById('admCliente'),t=document.getElementById('admTipo'),cl=document.getElementById('admClas');if(!c.value||!t.value||!cl.value)throw new Error('Completa cliente, tipo y clasificación.');
      const r=await sb.rpc('hs_mark_used',{p_item:{folioId:ADMIN_FOLIO,fechaUso:document.getElementById('admFecha').value,clienteId:c.value,tipoViajeId:t.value,clasificacionId:cl.value,observaciones:document.getElementById('admObs').value.trim(),unidadId:u.id,unidadNumero:u.numero,remolqueNumero:u.esTracto?rem:''}});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo comprobar');
      document.getElementById('admHojaModal')?.remove();await loadAll(false);document.getElementById('adminRefresh')?.click();alert('Hoja comprobada correctamente.');
    }catch(err){alert(err.message||err);b.disabled=false;}
  },true);
})();
