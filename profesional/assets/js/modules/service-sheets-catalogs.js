(function(){
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let DATA={tiposViaje:[],clasificaciones:[]};
  async function load(){
    const {data,error}=await sb().rpc('cc_hs_catalogs_data');
    if(error||!data?.ok) throw new Error(error?.message||data?.error||'No se pudieron cargar los catálogos');
    DATA=data; render('TIPO_VIAJE'); render('CLASIFICACION');
  }
  function rows(tipo){return tipo==='TIPO_VIAJE'?(DATA.tiposViaje||[]): (DATA.clasificaciones||[])}
  function render(tipo){
    const id=tipo==='TIPO_VIAJE'?'ccHsTiposViajeList':'ccHsClasificacionesList'; const box=document.getElementById(id); if(!box)return;
    const xs=rows(tipo);
    if(tipo==='TIPO_VIAJE'){
      box.innerHTML=xs.length?'<div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>NOMBRE</th><th>CLASIFICACIONES</th><th>ESTATUS</th><th>ACCIÓN</th></tr></thead><tbody>'+xs.map(x=>{const n=(DATA.clasificaciones||[]).filter(c=>c.tipoViajeId===x.id).length;return '<tr><td><strong>'+esc(x.nombre)+'</strong></td><td>'+n+'</td><td>'+esc(x.estatus||'ACTIVO')+'</td><td><button class="cc-btn cc-btn-light" data-edit="'+esc(x.id)+'" data-tipo="'+tipo+'">Editar</button></td></tr>'}).join('')+'</tbody></table></div>':'<div class="cc-note" style="padding:16px">Sin tipos de viaje. Agrega el primero.</div>';
    }else{
      box.innerHTML=xs.length?'<div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>TIPO DE VIAJE</th><th>CLASIFICACIÓN</th><th>ESTATUS</th><th>ACCIÓN</th></tr></thead><tbody>'+xs.map(x=>'<tr><td><strong>'+esc(x.tipoViaje||'SIN RELACIONAR')+'</strong></td><td>'+esc(x.nombre)+'</td><td>'+esc(x.estatus||'ACTIVO')+'</td><td><button class="cc-btn cc-btn-light" data-edit="'+esc(x.id)+'" data-tipo="'+tipo+'">Editar</button></td></tr>').join('')+'</tbody></table></div>':'<div class="cc-note" style="padding:16px">Sin clasificaciones. Agrega la primera y relaciónala con un tipo de viaje.</div>';
    }
    box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openForm(b.dataset.tipo,b.dataset.edit));
  }
  function selectTipo(actual=''){
    const tipos=(DATA.tiposViaje||[]).filter(x=>x.estatus==='ACTIVO'||x.id===actual);
    if(!tipos.length){alert('Primero debes crear al menos un Tipo de viaje activo.');return null;}
    const lines=tipos.map((x,i)=>(i+1)+'. '+x.nombre+(x.id===actual?' (actual)':'')).join('\n');
    const r=prompt('Selecciona el Tipo de viaje para esta clasificación:\n\n'+lines, String(Math.max(1,tipos.findIndex(x=>x.id===actual)+1)));
    if(r===null)return null;
    const idx=Number(r)-1;
    if(!Number.isInteger(idx)||idx<0||idx>=tipos.length){alert('Selección no válida.');return null;}
    return tipos[idx].id;
  }
  function openForm(tipo,id=''){
    const x=rows(tipo).find(r=>String(r.id)===String(id));
    const nombre=prompt((tipo==='TIPO_VIAJE'?'Tipo de viaje':'Clasificación')+' - nombre:',x?.nombre||''); if(nombre===null)return;
    let tipoViajeId=null;
    if(tipo==='CLASIFICACION'){
      tipoViajeId=selectTipo(x?.tipoViajeId||'');
      if(!tipoViajeId)return;
    }
    save(tipo,id,nombre,x?.estatus||'ACTIVO',tipoViajeId);
  }
  async function save(tipo,id,nombre,estatus,tipoViajeId){
    try{
      const {data,error}=await sb().rpc('cc_hs_catalog_save',{p_tipo:tipo,p_id:id||null,p_nombre:nombre,p_estatus:estatus||'ACTIVO',p_tipo_viaje_id:tipoViajeId||null});
      if(error||!data?.ok) throw new Error(error?.message||data?.error||'No se pudo guardar');
      await load();
    }catch(e){alert(e.message||String(e));}
  }
  function section(tipo){
    document.querySelectorAll('#ccPanelConfiguracion .cc-config-section').forEach(x=>x.style.display='none');
    document.querySelectorAll('#ccPanelConfiguracion .cc-config-nav-btn').forEach(x=>x.classList.remove('active'));
    const id=tipo==='TIPO_VIAJE'?'ccConfigHsTiposViaje':'ccConfigHsClasificaciones';
    document.getElementById(id).style.display='block';
    document.querySelector('[data-hs-config="'+tipo+'"]')?.classList.add('active');
    load().catch(e=>alert(e.message||String(e)));
  }
  function install(){
    const panel=document.getElementById('ccPanelConfiguracion'),nav=panel?.querySelector('.cc-config-nav'); if(!panel||!nav||document.getElementById('ccConfigHsTiposViaje'))return;
    const b1=document.createElement('button');b1.type='button';b1.className='cc-config-nav-btn';b1.dataset.hsConfig='TIPO_VIAJE';b1.innerHTML='<i class="fa-solid fa-road"></i><span>Tipos de viaje</span><small>Catálogo para hojas de servicio</small>';b1.onclick=()=>section('TIPO_VIAJE');nav.appendChild(b1);
    const b2=document.createElement('button');b2.type='button';b2.className='cc-config-nav-btn';b2.dataset.hsConfig='CLASIFICACION';b2.innerHTML='<i class="fa-solid fa-tags"></i><span>Clasificaciones</span><small>Ligadas a Tipo de viaje</small>';b2.onclick=()=>section('CLASIFICACION');nav.appendChild(b2);
    const s1=document.createElement('div');s1.id='ccConfigHsTiposViaje';s1.className='cc-config-section';s1.style.display='none';s1.innerHTML='<div class="cc-config-card"><div class="cc-toolbar"><div><strong>Tipos de viaje</strong><div class="cc-note">Cada tipo de viaje puede tener únicamente las clasificaciones que tú le relaciones.</div></div><button class="cc-btn cc-btn-primary" id="ccHsAddTipoViaje">Agregar</button></div><div id="ccHsTiposViajeList"></div></div>';panel.appendChild(s1);s1.querySelector('#ccHsAddTipoViaje').onclick=()=>openForm('TIPO_VIAJE');
    const s2=document.createElement('div');s2.id='ccConfigHsClasificaciones';s2.className='cc-config-section';s2.style.display='none';s2.innerHTML='<div class="cc-config-card"><div class="cc-toolbar"><div><strong>Clasificaciones por Tipo de viaje</strong><div class="cc-note">Al crear una clasificación debes indicar a qué Tipo de viaje pertenece. La app móvil respetará esta relación.</div></div><button class="cc-btn cc-btn-primary" id="ccHsAddClasificacion">Agregar</button></div><div id="ccHsClasificacionesList"></div></div>';panel.appendChild(s2);s2.querySelector('#ccHsAddClasificacion').onclick=()=>openForm('CLASIFICACION');
  }
  window.ccHsCatalogOpen=section;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));
  setTimeout(install,1800);
})();