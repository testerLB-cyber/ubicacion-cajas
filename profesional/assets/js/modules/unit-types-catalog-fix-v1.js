/* Tráfico App · Fix catálogo Tipos de unidad v1 · 2026-09-13 */
(function(){
  if(window.__CC_UNIT_TYPES_FIX_V1__) return;
  window.__CC_UNIT_TYPES_FIX_V1__=true;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const sb=()=>window.gmSupabase;
  async function loadState(){
    const s=sb(); if(!s) throw new Error('Supabase no está disponible.');
    const {data,error}=await s.rpc('cc_load_all'); if(error) throw error;
    return {state:data?.state||{},revision:Number(data?.revision||0)};
  }
  async function saveState(state,revision,op){
    const s=sb(); if(!s) throw new Error('Supabase no está disponible.');
    for(let i=0;i<2;i++){
      const {data,error}=await s.rpc('cc_save_all',{p_state:state,p_operation:op||'TIPOS_UNIDAD',p_client_time:new Date().toISOString(),p_expected_revision:revision});
      if(error) throw error;
      if(data?.ok!==false) return data;
      if(data?.error==='CONFLICTO_DE_VERSION'&&i===0){
        const fresh=await loadState(); state=fresh.state; revision=fresh.revision; continue;
      }
      throw new Error(data?.error||'No se pudo guardar');
    }
  }
  function modal(title,item,onSave){
    document.getElementById('ccUnitTypeFixModal')?.remove();
    const ov=document.createElement('div'); ov.id='ccUnitTypeFixModal'; ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100900;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.3)"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Nombre del tipo *</label><input name="nombre" required value="'+esc(item?.nombre||'')+'" placeholder="Ej. ESTAQUITA"></div><div class="cc-field"><label>Categoría *</label><select name="categoria"><option value="CAJA" '+(String(item?.categoria||'').toUpperCase()==='CAJA'?'selected':'')+'>CAJA</option><option value="CARRO" '+(String(item?.categoria||'').toUpperCase()==='CARRO'?'selected':'')+'>CARRO</option><option value="OTRO" '+(!['CAJA','CARRO'].includes(String(item?.categoria||'').toUpperCase())?'selected':'')+'>OTRO</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option value="ACTIVO" '+(item?.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option value="INACTIVO" '+(item?.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div class="cc-note" style="margin-top:10px">Este catálogo alimenta el campo <b>Tipo de unidad</b> al crear o editar unidades.</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-c>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov); const close=()=>ov.remove(); ov.querySelector('[data-x]').onclick=close; ov.querySelector('[data-c]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;b.textContent='Guardando...';try{await onSave(new FormData(e.currentTarget));close();await render();}catch(err){alert('No se pudo guardar.\n\n'+(err.message||err));b.disabled=false;b.textContent='Guardar';}};
  }
  async function editType(item){
    modal(item?'Editar tipo de unidad':'Nuevo tipo de unidad',item||{},async fd=>{
      const loaded=await loadState(); const st=loaded.state; st.configuracion=st.configuracion||{}; const list=Array.isArray(st.configuracion.tiposUnidad)?st.configuracion.tiposUnidad:[];
      const nombre=String(fd.get('nombre')||'').trim().toUpperCase(); if(!nombre) throw new Error('Captura el nombre.');
      const dup=list.find(x=>String(x.nombre||'').trim().toUpperCase()===nombre&&String(x.id)!==String(item?.id||'')); if(dup) throw new Error('Ya existe un tipo con ese nombre.');
      const obj={id:item?.id||('tipo_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)),nombre,categoria:String(fd.get('categoria')||'OTRO').toUpperCase(),estatus:String(fd.get('estatus')||'ACTIVO').toUpperCase()};
      const idx=list.findIndex(x=>String(x.id)===String(obj.id)); if(idx>=0) list[idx]={...list[idx],...obj}; else list.push(obj); st.configuracion.tiposUnidad=list;
      const out=await saveState(st,loaded.revision,item?'EDITAR_TIPO_UNIDAD':'CREAR_TIPO_UNIDAD'); if(out?.state&&typeof window.ccReloadFromDatabase==='function') await window.ccReloadFromDatabase();
    });
  }
  async function render(){
    const box=document.getElementById('ccTiposUnidadFixList'); if(!box) return;
    box.innerHTML='<div class="cc-note">Cargando tipos de unidad…</div>';
    try{
      const {state}=await loadState(); const list=Array.isArray(state.configuracion?.tiposUnidad)?state.configuracion.tiposUnidad:[];
      box.innerHTML=list.length?'<div style="overflow:auto"><table class="cc-table"><thead><tr><th>Tipo</th><th>Categoría</th><th>Estatus</th><th></th></tr></thead><tbody>'+list.map(x=>'<tr><td><strong>'+esc(x.nombre||'')+'</strong></td><td>'+esc(x.categoria||'OTRO')+'</td><td><span class="cc-badge '+(x.estatus==='INACTIVO'?'cc-off':'cc-ok')+'">'+esc(x.estatus||'ACTIVO')+'</span></td><td style="text-align:right"><button type="button" class="cc-btn cc-btn-light" data-ut-edit="'+esc(x.id)+'">Editar</button></td></tr>').join('')+'</tbody></table></div>':'<div class="cc-note">No hay tipos de unidad configurados.</div>';
      box.querySelectorAll('[data-ut-edit]').forEach(b=>{const x=list.find(i=>String(i.id)===String(b.dataset.utEdit));b.onclick=()=>editType(x);});
    }catch(err){box.innerHTML='<div class="cc-config-alert" style="color:#991b1b">No se pudo cargar el catálogo: '+esc(err.message||err)+'</div>';}
  }
  function ensureSection(){
    const p=document.getElementById('ccPanelConfiguracion'); if(!p) return false;
    let sec=document.getElementById('ccConfigTiposUnidad');
    if(!sec){
      sec=document.createElement('div'); sec.className='cc-config-section'; sec.id='ccConfigTiposUnidad';
      sec.innerHTML='<div class="cc-config-card"><div class="cc-config-section-head"><div><h4>🚚 Catálogo de tipos de unidad</h4><p>Define los tipos que podrán asignarse a cada unidad, por ejemplo ESTAQUITA, TORTON, CAJA, CARRO o los que necesites.</p></div><button type="button" id="ccNuevoTipoUnidadFix" class="cc-btn cc-btn-primary"><i class="fa-solid fa-plus mr-1"></i>Agregar tipo</button></div><div id="ccTiposUnidadFixList" style="margin-top:14px"></div></div>';
      p.appendChild(sec); sec.querySelector('#ccNuevoTipoUnidadFix').onclick=()=>editType(null);
    }
    const nav=p.querySelector('[data-config="tiposUnidad"]'); if(nav){nav.style.display=''; nav.onclick=function(){window.ccConfigSection?.('tiposUnidad',nav);setTimeout(render,20);};}
    return true;
  }
  const oldConfigSection=window.ccConfigSection;
  window.ccConfigSection=function(key,btn){
    ensureSection();
    if(typeof oldConfigSection==='function') oldConfigSection.call(this,key,btn);
    if(key==='tiposUnidad'){
      document.querySelectorAll('#ccPanelConfiguracion .cc-config-section').forEach(x=>x.classList.remove('active'));
      document.getElementById('ccConfigTiposUnidad')?.classList.add('active');
      document.querySelectorAll('#ccPanelConfiguracion .cc-config-nav-btn').forEach(x=>x.classList.remove('active')); btn?.classList.add('active');
      render();
    }
  };
  function emphasizeUnitTypeModal(){
    const forms=[document.querySelector('#ccFormModal form'),document.querySelector('#ccEditUnitModal form')].filter(Boolean);
    forms.forEach(f=>{
      const sel=f.querySelector('select[name="tipoUnidadId"]'); if(sel){const field=sel.closest('.cc-field');if(field){field.style.border='2px solid #2563eb';field.style.borderRadius='10px';field.style.padding='8px';field.style.background='#eff6ff';const lab=field.querySelector('label');if(lab)lab.textContent='Tipo de unidad *';}}
    });
  }
  const mo=new MutationObserver(()=>{ensureSection();emphasizeUnitTypeModal();}); mo.observe(document.documentElement,{childList:true,subtree:true});
  const timer=setInterval(()=>{if(ensureSection()){clearInterval(timer);emphasizeUnitTypeModal();}},500); setTimeout(()=>clearInterval(timer),15000);
})();