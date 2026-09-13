/* Tráfico App · Tipos de unidad generales para CARRO · aditivo, sin alterar flujo existente */
(function(){
  if(window.__CC_TIPO_UNIDAD_GENERAL_V1__)return;
  window.__CC_TIPO_UNIDAD_GENERAL_V1__=true;
  let catalogo=[], mapa=new Map(), cargando=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sb=()=>window.gmSupabase;
  const carSelected=sel=>String(sel?.selectedOptions?.[0]?.textContent||'').trim().toUpperCase()==='CARRO';

  async function cargarDatos(){
    if(cargando||!sb())return;
    cargando=true;
    try{
      const [c,m]=await Promise.all([sb().rpc('cc_unit_type_catalog_list'),sb().rpc('cc_car_unit_type_map')]);
      if(!c.error&&c.data?.ok)catalogo=Array.isArray(c.data.rows)?c.data.rows:[];
      if(!m.error&&m.data?.ok)mapa=new Map((m.data.rows||[]).map(x=>[String(x.numero||'').trim().toUpperCase(),x]));
      renderCatalogo();decorarInventario();mejorarModales();
    }catch(e){console.warn('Tipos unidad general:',e)}finally{cargando=false;}
  }

  function opciones(actual=''){
    const rows=catalogo.filter(x=>x.estatus==='ACTIVO'||String(x.id)===String(actual));
    return '<option value="">Selecciona tipo de unidad</option>'+rows.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(actual)?'selected':'')+'>'+esc(x.nombre)+(x.estatus==='INACTIVO'?' (INACTIVO)':'')+'</option>').join('');
  }

  function mejorarModal(modal){
    if(!modal||modal.dataset.ccTipoUnidadGeneral==='1')return;
    const form=modal.querySelector('form');
    const tipoSel=form?.querySelector('[name="tipoUnidadId"]');
    const numero=form?.querySelector('[name="numero"]');
    if(!form||!tipoSel||!numero)return;
    modal.dataset.ccTipoUnidadGeneral='1';
    let field=form.querySelector('[data-cc-tipo-unidad-general]');
    if(!field){
      field=document.createElement('div');
      field.className='cc-field';field.dataset.ccTipoUnidadGeneral='1';
      field.innerHTML='<label>Tipo unidad</label><select name="tipoUnidadGeneralId"></select><div style="font-size:9px;color:#64748b;margin-top:4px">Catálogo general de Configuración</div>';
      const anchor=tipoSel.closest('.cc-field');
      anchor?.insertAdjacentElement('afterend',field);
    }
    const detail=field.querySelector('select');
    const sync=()=>{
      const key=String(numero.value||'').trim().toUpperCase();
      const actual=mapa.get(key)?.tipoUnidadGeneralId||detail.value||'';
      detail.innerHTML=opciones(actual);
      field.style.display=carSelected(tipoSel)?'block':'none';
      detail.required=carSelected(tipoSel);
    };
    tipoSel.addEventListener('change',sync);numero.addEventListener('change',sync);sync();
  }

  function mejorarModales(){
    mejorarModal(document.getElementById('ccFormModal'));
    mejorarModal(document.getElementById('ccEditUnitModal'));
  }

  async function persistir(numero,tipoId){
    if(!sb()||!numero)return;
    const {data,error}=await sb().rpc('cc_set_car_unit_type',{p_numero:numero,p_tipo_id:tipoId||''});
    if(error||data?.ok===false)throw new Error(error?.message||data?.error||'No se pudo guardar el tipo de unidad');
    await cargarDatos();
  }

  document.addEventListener('submit',e=>{
    const form=e.target;if(!(form instanceof HTMLFormElement))return;
    const modal=form.closest('#ccFormModal,#ccEditUnitModal');if(!modal)return;
    const tipoSel=form.querySelector('[name="tipoUnidadId"]');const numero=form.querySelector('[name="numero"]');
    const detail=form.querySelector('[name="tipoUnidadGeneralId"]');if(!tipoSel||!numero)return;
    const numeroFinal=String(numero.value||'').trim();const tipoFinal=carSelected(tipoSel)?String(detail?.value||''):'';
    if(carSelected(tipoSel)&&!tipoFinal){e.preventDefault();e.stopImmediatePropagation();alert('Selecciona el Tipo unidad del carro.');return;}
    let intentos=0;
    const esperar=()=>{intentos++;if(!document.body.contains(modal)){persistir(numeroFinal,tipoFinal).catch(err=>alert('La unidad se guardó, pero no se pudo guardar Tipo unidad.\n\n'+(err.message||err)));return;}if(intentos<30)setTimeout(esperar,250);};
    setTimeout(esperar,300);
  },true);

  function asegurarConfig(){
    const panel=document.getElementById('ccPanelConfiguracion');if(!panel||document.getElementById('ccTiposUnidadGeneralCard'))return;
    const card=document.createElement('div');card.id='ccTiposUnidadGeneralCard';card.className='cc-card';
    card.style.cssText='margin-top:14px;padding:15px;border:1px solid #dbeafe;border-radius:14px;background:#fff';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><strong><i class="fa-solid fa-truck mr-1"></i>Tipos de unidad</strong><div class="cc-note">Catálogo general usado por unidades de categoría CARRO.</div></div></div><form id="ccTipoUnidadGeneralForm" style="display:grid;grid-template-columns:minmax(180px,1fr) 130px auto;gap:8px;margin-top:12px"><input type="hidden" name="id"><input name="nombre" required placeholder="Ej. Tractocamión, Rabón, Torton..." style="border:1px solid #cbd5e1;border-radius:9px;padding:9px"><select name="estatus" style="border:1px solid #cbd5e1;border-radius:9px;padding:9px"><option>ACTIVO</option><option>INACTIVO</option></select><button class="cc-btn cc-btn-primary" type="submit">Guardar</button></form><div id="ccTiposUnidadGeneralList" style="margin-top:10px"></div>';
    panel.appendChild(card);
    card.querySelector('form').onsubmit=guardarCatalogo;
    renderCatalogo();
  }

  async function guardarCatalogo(e){
    e.preventDefault();const f=e.currentTarget;const b=f.querySelector('button[type=submit]');b.disabled=true;
    try{
      const item={id:String(f.id.value||''),nombre:String(f.nombre.value||'').trim(),estatus:String(f.estatus.value||'ACTIVO')};
      const {data,error}=await sb().rpc('cc_unit_type_catalog_save',{p_item:item});
      if(error||data?.ok===false)throw new Error(error?.message||data?.error||'No se pudo guardar');
      f.reset();f.id.value='';f.estatus.value='ACTIVO';await cargarDatos();
    }catch(err){alert(err.message||err)}finally{b.disabled=false;}
  }

  function renderCatalogo(){
    const root=document.getElementById('ccTiposUnidadGeneralList');if(!root)return;
    root.innerHTML=catalogo.length?catalogo.map(x=>'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 4px;border-top:1px solid #e2e8f0"><div><b>'+esc(x.nombre)+'</b><div style="font-size:9px;color:'+(x.estatus==='ACTIVO'?'#15803d':'#94a3b8')+'">'+esc(x.estatus)+'</div></div><button type="button" class="cc-btn cc-btn-light" data-edit-tug="'+esc(x.id)+'">Editar</button></div>').join(''):'<div class="cc-note" style="padding:10px 0">Aún no hay tipos configurados.</div>';
    root.querySelectorAll('[data-edit-tug]').forEach(b=>b.onclick=()=>{const x=catalogo.find(r=>String(r.id)===String(b.dataset.editTug));const f=document.getElementById('ccTipoUnidadGeneralForm');if(!x||!f)return;f.id.value=x.id;f.nombre.value=x.nombre;f.estatus.value=x.estatus;f.nombre.focus();});
  }

  function decorarInventario(){
    const body=document.getElementById('ccInventarioBody');if(!body)return;
    [...body.querySelectorAll('tr')].forEach(tr=>{
      const tds=tr.children;if(tds.length<3)return;
      const numero=String(tds[2]?.textContent||'').trim().toUpperCase();const x=mapa.get(numero);let tag=tds[1]?.querySelector('.cc-car-type-detail');
      if(x?.tipoUnidadGeneralNombre){if(!tag){tag=document.createElement('div');tag.className='cc-car-type-detail';tag.style.cssText='font-size:9px;color:#1d4ed8;font-weight:900;margin-top:4px';tds[1].appendChild(tag);}tag.textContent='Tipo unidad: '+x.tipoUnidadGeneralNombre;}else tag?.remove();
    });
  }

  function kick(){asegurarConfig();mejorarModales();decorarInventario();cargarDatos();}
  document.addEventListener('DOMContentLoaded',kick);
  document.addEventListener('click',e=>{const tab=e.target.closest?.('#controlCajasSection .cc-tab');if(tab){const on=tab.getAttribute('onclick')||'';if(on.includes("ccTab('inventario'")||on.includes("ccTab('configuracion'"))setTimeout(kick,80);}},true);
  const mo=new MutationObserver(()=>{asegurarConfig();mejorarModales();decorarInventario();});
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(kick,250);setTimeout(kick,1000);
})();
