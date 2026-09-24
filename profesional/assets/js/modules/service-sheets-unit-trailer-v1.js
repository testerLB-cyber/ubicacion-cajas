/* Tráfico App · Hojas de Servicio · Unidad + Remolque v1 */
(function(){
  'use strict';
  if(window.__HS_UNIT_TRAILER_V1__) return;
  window.__HS_UNIT_TRAILER_V1__=true;

  const sb=()=>window.gmSupabase;
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let UNITS=[], EVIDENCE=new Map(), loading=false;

  function unitByNumber(v){const n=norm(v);return UNITS.find(x=>norm(x.numero)===n)||null;}
  function boxUnits(){return UNITS.filter(x=>x.esCaja);}
  function ensureLists(){
    let dl=document.getElementById('hsUnitCatalogList');
    if(!dl){dl=document.createElement('datalist');dl.id='hsUnitCatalogList';document.body.appendChild(dl);}
    dl.innerHTML=UNITS.map(x=>'<option value="'+esc(x.numero)+'" label="'+esc((x.tipoUnidad||x.categoria||'')+(x.descripcion?' · '+x.descripcion:''))+'"></option>').join('');
    let tl=document.getElementById('hsTrailerCatalogList');
    if(!tl){tl=document.createElement('datalist');tl.id='hsTrailerCatalogList';document.body.appendChild(tl);}
    tl.innerHTML=boxUnits().map(x=>'<option value="'+esc(x.numero)+'" label="'+esc(x.descripcion||'Caja')+'"></option>').join('');
  }

  async function loadData(){
    if(loading||!sb())return;
    loading=true;
    try{
      const [u,e]=await Promise.all([sb().rpc('hs_unit_catalog'),sb().rpc('hs_mobile_evidence_units')]);
      if(u.error)throw u.error;
      if(u.data?.ok===false)throw new Error(u.data.error||'No se cargaron unidades');
      UNITS=Array.isArray(u.data?.unidades)?u.data.unidades:[];
      if(!e.error&&e.data?.ok)EVIDENCE=new Map((e.data.rows||[]).map(x=>[String(x.folioId),x]));
      ensureLists();decorateAll();
    }catch(err){console.warn('Hojas · catálogo de unidades:',err)}finally{loading=false;}
  }

  function setUnitState(row,allowPrefill=true){
    const input=row.querySelector('[data-hs-unidad]'),status=row.querySelector('[data-hs-unidad-status]'),trailerWrap=row.querySelector('[data-hs-remolque-wrap]'),trailer=row.querySelector('[data-hs-remolque]');
    if(!input||!status||!trailerWrap)return null;
    const found=unitByNumber(input.value);
    if(found){
      input.dataset.unitId=String(found.id||'');
      input.dataset.tracto=found.esTracto?'1':'0';
      input.style.borderColor='#16a34a';input.style.background='#f0fdf4';input.style.boxShadow='0 0 0 2px rgba(22,163,74,.12)';
      status.style.color='#15803d';status.textContent='✓ Unidad del catálogo · '+(found.tipoUnidad||found.categoria||'');
      trailerWrap.style.display=found.esTracto?'block':'none';
      if(found.esTracto){trailer.required=true;}else{trailer.required=false;trailer.value='';}
      return found;
    }
    input.dataset.unitId='';input.dataset.tracto='0';input.style.borderColor=input.value.trim()?'#ef4444':'#cbd5e1';input.style.background=input.value.trim()?'#fef2f2':'#fff';input.style.boxShadow='none';
    status.style.color=input.value.trim()?'#b91c1c':'#64748b';status.textContent=input.value.trim()?'Selecciona una unidad válida del catálogo.':'Escribe para buscar y selecciona una unidad.';
    trailerWrap.style.display='none';trailer.required=false;
    return null;
  }

  function confirmPreloaded(row,ev){
    const pre=ev?.precaptura||null;
    const val=s=>String(row.querySelector(s)?.value||'').trim();
    const unit=ev?.unidadNumero||val('[data-hs-unidad]')||'—';
    const trailer=ev?.remolqueNumero||val('[data-hs-remolque]')||'';
    const cliente=pre?.cliente||row.querySelector('[data-cliente]')?.selectedOptions?.[0]?.textContent?.trim()||'—';
    const tipo=pre?.tipoViaje||val('[data-tipo]')||'—';
    const clas=pre?.clasificacion||val('[data-clas]')||'—';
    const usado=pre?.dondeUtilizado||val('[data-obs]')||'—';
    return confirm('¿Seguro que deseas COMPROBAR esta hoja con la información precargada?\n\n'+
      'Folio: '+(row.dataset.hsFolio||'—')+'\n'+
      'Cliente: '+cliente+'\n'+
      'Tipo de servicio: '+tipo+'\n'+
      'Clasificación: '+clas+'\n'+
      'Unidad: '+unit+'\n'+
      (trailer?'Remolque: '+trailer+'\n':'')+
      'Dónde se utilizó / comentarios: '+usado+'\n\n'+
      'Al confirmar, esta información será aceptada y la hoja quedará comprobada.');
  }

  function decorateRow(row){
    if(!row||row.dataset.hsUnitTrailer==='1'||!UNITS.length)return;
    const grid=row.querySelector('.hs104-grid');if(!grid)return;
    row.dataset.hsUnitTrailer='1';
    const unitField=document.createElement('div');unitField.className='cc-field';
    unitField.innerHTML='<label>Unidad *</label><input data-hs-unidad list="hsUnitCatalogList" autocomplete="off" placeholder="Escribe número de unidad"><div data-hs-unidad-status class="hs104-note">Escribe para buscar y selecciona una unidad.</div>';
    grid.appendChild(unitField);
    const trailerField=document.createElement('div');trailerField.className='cc-field';trailerField.dataset.hsRemolqueWrap='1';trailerField.style.display='none';
    trailerField.innerHTML='<label>Número de remolque *</label><input data-hs-remolque list="hsTrailerCatalogList" autocomplete="off" placeholder="Ej. LB245 o cualquier remolque"><div class="hs104-note">Campo libre. Si escribes LB se sugieren cajas del catálogo; no se valida que exista.</div>';
    grid.appendChild(trailerField);
    const input=unitField.querySelector('[data-hs-unidad]');
    const ev=EVIDENCE.get(String(row.dataset.row));
    if(ev?.unidadNumero){
      input.value=ev.unidadNumero;
      trailerField.querySelector('[data-hs-remolque]').value=ev.remolqueNumero||'';
      const info=row.querySelector('.hs-list-info');
      if(info&&!info.querySelector('[data-hs-unit-summary]')){
        const summary=document.createElement('div');
        summary.dataset.hsUnitSummary='1';
        summary.className='hs104-note';
        summary.style.cssText='margin-top:4px;font-weight:800;color:#334155';
        summary.innerHTML='<span><i class="fa-solid fa-truck"></i> Unidad: '+esc(ev.unidadNumero)+'</span>'+(ev.remolqueNumero?' <span style="margin-left:8px"><i class="fa-solid fa-trailer"></i> Remolque: '+esc(ev.remolqueNumero)+'</span>':'');
        info.appendChild(summary);
      }
    }
    ['input','change','blur'].forEach(evt=>input.addEventListener(evt,()=>setUnitState(row,false)));
    setUnitState(row);

    const preloaded=!!(ev?.precaptura||row.querySelector('.hs104-pill.hs104-ok'));
    const actions=row.querySelector('.hs-list-head-actions');
    if(preloaded&&actions&&!actions.querySelector('[data-hs-direct-check]')){
      const direct=document.createElement('button');
      direct.type='button';
      direct.className='cc-btn cc-btn-primary';
      direct.dataset.hsDirectCheck='1';
      direct.innerHTML='<i class="fa-solid fa-check"></i> Comprobar';
      actions.insertBefore(direct,actions.querySelector('[data-hs-edit]')||null);
    }
  }
  function decorateAll(){document.querySelectorAll('#hs104CompList [data-row]').forEach(decorateRow);}

  async function save(row){
    const val=s=>String(row.querySelector(s)?.value||'').trim();
    const folioId=String(row.dataset.row||''),fechaUso=val('[data-fecha]'),clienteId=val('[data-cliente]'),tipoViaje=val('[data-tipo]'),clasificacion=val('[data-clas]'),observaciones=val('[data-obs]');
    const unit=setUnitState(row,false),remolqueNumero=val('[data-hs-remolque]');
    if(!fechaUso)throw new Error('Captura la fecha de uso.');
    if(!clienteId)throw new Error('Selecciona un cliente.');
    if(!tipoViaje)throw new Error('Captura el Tipo de servicio.');
    if(!clasificacion)throw new Error('Captura la Clasificación.');
    if(!unit)throw new Error('Selecciona una unidad válida del catálogo.');
    if(unit.esTracto&&!remolqueNumero)throw new Error('Captura el número de remolque para el Tracto-camión.');
    const r=await sb().rpc('hs_mark_used',{p_item:{folioId,fechaUso,clienteId,tipoViaje,clasificacion,servicio:tipoViaje,observaciones,unidadId:unit.id,unidadNumero:unit.numero,remolqueNumero:unit.esTracto?remolqueNumero:''}});
    if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo comprobar la hoja.');
    return r.data;
  }

  document.addEventListener('click',async e=>{
    const direct=e.target.closest?.('#hs104CompList [data-hs-direct-check]');
    if(direct){
      const row=direct.closest('[data-row]');if(!row||row.dataset.hsUnitTrailer!=='1')return;
      e.preventDefault();e.stopImmediatePropagation();
      const ev=EVIDENCE.get(String(row.dataset.row));
      if(!confirmPreloaded(row,ev))return;
      if(direct.disabled)return;direct.disabled=true;const old=direct.innerHTML;direct.textContent='Comprobando...';
      try{await save(row);document.getElementById('hs104Refresh')?.click();}
      catch(err){alert(err?.message||err);direct.disabled=false;direct.innerHTML=old;}
      return;
    }
    const btn=e.target.closest?.('#hs104CompList [data-save]');if(!btn)return;
    const row=btn.closest('[data-row]');if(!row||row.dataset.hsUnitTrailer!=='1')return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.disabled)return;btn.disabled=true;const old=btn.textContent;btn.textContent='Comprobando...';
    try{await save(row);document.getElementById('hs104Refresh')?.click();}
    catch(err){alert(err?.message||err);btn.disabled=false;btn.textContent=old;}
  },true);

  const observer=new MutationObserver(()=>decorateAll());
  function boot(){
    const root=document.getElementById('controlCajasSection')||document.body;
    observer.observe(root,{childList:true,subtree:true});
    loadData();setInterval(()=>{if(document.getElementById('hs104CompList'))loadData()},45000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
