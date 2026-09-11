from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists():
    raise SystemExit('No existe anticipos-profesional-flow.js')

extra=r'''

/* Tráfico App Profesional · Responsables y tipos de comprobante dentro de Catálogos */
(function(){
  if(window.__ccAntCatalogosCleanupV1)return;
  window.__ccAntCatalogosCleanupV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function removeCajaChica(){
    document.querySelector('.cc-ant-nav [data-antv="cajachica"]')?.remove();
    const v=document.getElementById('ccAntViewCajachica');if(v)v.style.display='none';
    document.querySelector('.cc-ant-nav [data-antv="catalogospro"]')?.remove();
    const vp=document.getElementById('ccAntViewCatalogospro');if(vp)vp.style.display='none';
  }

  function modal(title,html,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100060;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget));close();await render()}catch(err){alert(err.message||err);b.disabled=false}};
  }

  async function save(tipo,item){const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:tipo,p_item:item});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo guardar');}

  function formResponsable(x={}){
    modal(x.id?'Editar responsable':'Nuevo responsable','<div class="cc-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Número empleado</label><input name="numero" value="'+esc(x.numero_empleado||'')+'"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="'+esc(x.telefono||'')+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div>',fd=>save('RESPONSABLE',{id:x.id||'',nombre:String(fd.get('nombre')||''),numeroEmpleado:String(fd.get('numero')||''),telefono:String(fd.get('telefono')||''),estatus:String(fd.get('estatus')||'ACTIVO')}));
  }

  function formTipo(x={}){
    modal(x.id?'Editar tipo de comprobante':'Nuevo tipo de comprobante','<div class="cc-grid"><div class="cc-field"><label>Tipo de comprobante *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div>',fd=>save('TIPO_COMPROBANTE',{id:x.id||'',nombre:String(fd.get('nombre')||''),estatus:String(fd.get('estatus')||'ACTIVO')}));
  }

  async function render(){
    removeCajaChica();
    const root=document.getElementById('ccAntViewCatalogos');if(!root||!sb())return;
    let grid=root.querySelector('.cc-ant-report-grid');if(!grid){grid=document.createElement('div');grid.className='cc-ant-report-grid';root.appendChild(grid)}
    const r=await sb().rpc('cc_ant_prof_extra_list');if(r.error)throw r.error;const d=r.data||{};
    let resp=document.getElementById('ccAntCatResponsablesCard');if(!resp){resp=document.createElement('div');resp.id='ccAntCatResponsablesCard';resp.className='cc-config-card';grid.appendChild(resp)}
    let tipos=document.getElementById('ccAntCatTiposCompCard');if(!tipos){tipos=document.createElement('div');tipos.id='ccAntCatTiposCompCard';tipos.className='cc-config-card';grid.appendChild(tipos)}
    const rs=d.responsables||[],ts=d.tiposComprobante||[];
    resp.innerHTML='<div class="cc-toolbar"><strong>Responsables</strong><button class="cc-btn cc-btn-primary" data-add-resp>Agregar</button></div><div>'+(rs.length?rs.map(x=>'<div style="padding:8px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.numero_empleado||'')+' · '+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-resp="'+esc(x.id)+'">Editar</button></div>').join(''):'<div class="cc-note">Sin responsables registrados.</div>')+'</div>';
    tipos.innerHTML='<div class="cc-toolbar"><strong>Tipos de comprobante</strong><button class="cc-btn cc-btn-primary" data-add-tipo>Agregar</button></div><div>'+(ts.length?ts.map(x=>'<div style="padding:8px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-tipo="'+esc(x.id)+'">Editar</button></div>').join(''):'<div class="cc-note">Sin tipos de comprobante.</div>')+'</div>';
    resp.querySelector('[data-add-resp]').onclick=()=>formResponsable();resp.querySelectorAll('[data-edit-resp]').forEach(b=>b.onclick=()=>formResponsable(rs.find(x=>x.id===b.dataset.editResp)||{}));
    tipos.querySelector('[data-add-tipo]').onclick=()=>formTipo();tipos.querySelectorAll('[data-edit-tipo]').forEach(b=>b.onclick=()=>formTipo(ts.find(x=>x.id===b.dataset.editTipo)||{}));
  }

  function install(){removeCajaChica();render().catch(e=>console.warn('Catálogos anticipos',e));if(typeof window.ccAntView==='function'&&!window.ccAntView.__catalogosRespTipo){const o=window.ccAntView,w=function(v,b){const r=o.apply(this,arguments);if(v==='catalogos')setTimeout(()=>render().catch(console.warn),0);removeCajaChica();return r};w.__catalogosRespTipo=true;window.ccAntView=w}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
'''

text=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Responsables y tipos de comprobante dentro de Catálogos */'
if marker not in text:
    P.write_text(text+extra,encoding='utf-8')
print('Responsables/tipos integrados en Catálogos y botón Caja chica eliminado')
