/* Tráfico App · Configuración · catálogo de clientes directo desde Supabase v1 */
(function(){
  'use strict';
  if(window.__CC_CONFIG_CLIENTES_V1__)return;
  window.__CC_CONFIG_CLIENTES_V1__=true;

  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let cache=[];
  const sb=()=>window.gmSupabase;
  const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));

  async function load(){
    const c=sb(); if(!c) throw new Error('Supabase no está disponible.');
    const {data,error}=await c.rpc('cc_client_catalogs');
    if(error) throw error;
    cache=(Array.isArray(data?.clientes)?data.clientes:[]).filter(x=>String(x?.nombre||'').trim());
    window.__CC_CLIENTES_CATALOGO__=cache;
    return cache;
  }

  function paint(xs){
    const el=document.getElementById('ccClientesList'); if(!el)return;
    const rows=(xs||[]).filter(x=>String(x?.nombre||'').trim());
    el.innerHTML=rows.length?rows.map((x,i)=>`<tr>
      <td>${i+1}</td>
      <td><strong>${esc(x.nombre||'—')}</strong>${x.razonSocial?`<div style="font-size:9px;color:#64748b">${esc(x.razonSocial)}</div>`:''}</td>
      <td>${esc(x.rfc||x.razonSocial||'—')}</td>
      <td>${esc(x.telefono||'—')}</td>
      <td>${esc(x.email||'—')}</td>
      <td><span class="cc-badge ${String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus||'ACTIVO')}</span></td>
      <td><button class="cc-btn cc-btn-light" data-client-edit="${esc(x.id)}" ${canEdit()?'':'disabled'}>Editar</button></td>
    </tr>`).join(''):'<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8">No hay clientes registrados.</td></tr>';
    el.querySelectorAll('[data-client-edit]').forEach(b=>b.onclick=()=>openEditor(cache.find(x=>String(x.id)===String(b.dataset.clientEdit))||{}));
  }

  async function render(){
    const el=document.getElementById('ccClientesList'); if(!el)return;
    el.innerHTML='<tr><td colspan="7" style="padding:22px;text-align:center;color:#64748b">Cargando clientes…</td></tr>';
    try{paint(await load());}catch(e){console.error('CLIENTES CATALOGO:',e);el.innerHTML='<tr><td colspan="7" style="padding:22px;text-align:center;color:#b91c1c">No se pudo cargar el catálogo de clientes.</td></tr>';}
  }

  function openEditor(x={}){
    if(!canEdit())return alert('Sin permiso para modificar Configuración.');
    document.getElementById('ccClientCatalogModal')?.remove();
    const ov=document.createElement('div');ov.id='ccClientCatalogModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:100900;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML=`<div style="background:#fff;width:min(760px,97vw);max-height:94vh;overflow:auto;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.3)"><div style="padding:14px 17px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>${x.id?'Editar':'Nuevo'} cliente</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="${esc(x.nombre||'')}"></div><div class="cc-field"><label>Razón social</label><input name="razonSocial" value="${esc(x.razonSocial||'')}"></div><div class="cc-field"><label>RFC</label><input name="rfc" value="${esc(x.rfc||'')}"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="${esc(x.telefono||'')}"></div><div class="cc-field"><label>Correo</label><input name="email" type="email" value="${esc(x.email||'')}"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO'?'selected':''}>ACTIVO</option><option ${String(x.estatus||'').toUpperCase()==='INACTIVO'?'selected':''}>INACTIVO</option></select></div></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cliente</button></div></form></div>`;
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;try{const f=new FormData(e.currentTarget);const {data,error}=await sb().rpc('cc_client_save',{p_tipo:'CLIENTE',p_item:{id:x.id||'',nombre:String(f.get('nombre')||'').trim(),razonSocial:String(f.get('razonSocial')||'').trim(),rfc:String(f.get('rfc')||'').trim(),telefono:String(f.get('telefono')||'').trim(),email:String(f.get('email')||'').trim(),estatus:f.get('estatus'),tieneDivisiones:false}});if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo guardar');close();await render();window.ccLogActivity?.(x.id?'MODIFICACION':'ALTA','Configuración','Cliente '+(x.id?'actualizado':'creado'),data?.id||x.id||null,'Clientes');}catch(err){alert(err.message||err);btn.disabled=false;}};
  }

  window.ccRenderClientes=render;
  window.ccNuevoCliente=function(id){const x=id?cache.find(a=>String(a.id)===String(id))||{}:{};openEditor(x);};

  function wire(){
    const panel=document.getElementById('ccConfigClientes');
    if(panel){const add=panel.querySelector('button[onclick*="ccNuevoCliente"]');if(add)add.onclick=()=>openEditor({});}
  }
  function boot(){if(!window.CC_AUTH_READY||!sb())return setTimeout(boot,350);wire();setTimeout(render,50);const old=window.ccRenderConfiguracion;if(typeof old==='function'&&!old.__clientesDirectos){const wrap=function(){const r=old.apply(this,arguments);setTimeout(()=>{wire();render();},40);return r};wrap.__clientesDirectos=true;window.ccRenderConfiguracion=wrap;}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
