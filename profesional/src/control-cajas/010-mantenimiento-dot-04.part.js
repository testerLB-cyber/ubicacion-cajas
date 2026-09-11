window.ccMostrarDotControl=async function(){
  if(!ccPerm('mantenimiento.ver_dot')){alert('Tu usuario no tiene permiso para ver Control DOT.');return;}
  const sec=document.getElementById('ccDotSection');if(!sec)return;
  const mant=document.getElementById('ccMaintenanceView');if(mant)mant.style.display='none';
  sec.style.display='block';
  const desde=document.getElementById('ccDotDesde'),hasta=document.getElementById('ccDotHasta');
  if(desde&&!desde.value){const d=new Date();d.setDate(1);desde.value=iso(d);}
  if(hasta&&!hasta.value)hasta.value=iso(new Date());
  const selU=document.getElementById('ccDotUnidad'),selC=document.getElementById('ccDotCliente');
  if(selU){
    const cur=selU.value;
    selU.innerHTML='<option value="">Todas las unidades</option>'+cajas.map(x=>`<option value="${x.id}">${esc(x.numero||x.descripcion||'CARRO')}</option>`).join('');
    selU.value=cur;
  }
  if(selC){
    const cur=selC.value;
    selC.innerHTML='<option value="">Todos los clientes</option>'+clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    selC.value=cur;
  }
  await ccCargarDot();  sec.scrollIntoView({behavior:'smooth',block:'start'});
};
window.ccOcultarDotControl=function(){ccMostrarMantenimientoHistorial();};
window.ccLimpiarDotFiltros=function(){
  const d=document.getElementById('ccDotDesde'),h=document.getElementById('ccDotHasta'),u=document.getElementById('ccDotUnidad'),c=document.getElementById('ccDotCliente');
  if(d)d.value='';if(h)h.value='';if(u)u.value='';if(c)c.value='';ccCargarDot();
};
window.ccCargarDot=async function(){
  const body=document.getElementById('ccDotBody');if(!body)return;
  body.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center;color:#64748b">Cargando registros DOT...</td></tr>';
  try{
    const desde=document.getElementById('ccDotDesde')?.value||null,hasta=document.getElementById('ccDotHasta')?.value||null;
    const unidad=document.getElementById('ccDotUnidad')?.value||null,cliente=document.getElementById('ccDotCliente')?.value||null;
    const {data,error}=await gmSupabase.rpc('cc_dot_list',{p_desde:desde,p_hasta:hasta,p_unidad_id:unidad,p_cliente_id:cliente});
    if(error)throw error;if(data?.ok===false)throw new Error(data.error||'No se pudo consultar DOT');
    const rows=Array.isArray(data?.registros)?data.registros:[];
    ccMapaUnidadesRows=rows;
    ccMapaUnidadesMarkers.clear();
    window.ccDotData=rows;
    const carros=new Set(rows.map(r=>r.unidadId)).size,clientesDot=new Set(rows.filter(r=>r.clienteId).map(r=>r.clienteId)).size;
    const k=document.getElementById('ccDotKpis');if(k)k.innerHTML=`<div class="cc-dot-kpi"><small>Entradas DOT</small><strong>${rows.length}</strong></div><div class="cc-dot-kpi"><small>Unidades distintas</small><strong>${carros}</strong></div><div class="cc-dot-kpi"><small>Clientes relacionados</small><strong>${clientesDot}</strong></div>`;
    body.innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${fmtDate(r.fecha)}</strong></td><td><strong>${esc(r.unidad||'—')}</strong></td><td>${esc(r.descripcionUnidad||'—')}</td><td>${esc(r.cliente||'—')}</td><td>${esc(r.descripcion||'—')}</td><td>${r.evidenciaUrl?`<a class="cc-btn cc-btn-light" href="${esc(r.evidenciaUrl)}" target="_blank" rel="noopener"><i class="fa-solid fa-image mr-1"></i>Ver foto</a>`:'—'}</td><td>${ccPerm('mantenimiento.editar_dot')?'<button class="cc-btn cc-btn-light" onclick="ccEditarDot(\''+r.id+'\')"><i class="fa-solid fa-pen mr-1"></i>Editar</button>':'—'}</td></tr>`).join(''):'<tr><td colspan="8" style="padding:28px;text-align:center;color:#94a3b8">No hay registros DOT con los filtros seleccionados.</td></tr>';
  }catch(err){
    console.error('DOT LIST:',err);body.innerHTML=`<tr><td colspan="7" style="padding:28px;text-align:center;color:#b91c1c">Error al cargar DOT: ${esc(err.message||err)}</td></tr>`;
  }
};


window.ccEditarDot=function(id){
  if(!ccPerm('mantenimiento.editar_dot')){alert('Tu usuario no tiene permiso para editar registros DOT.');return;}
  const r=(window.ccDotData||[]).find(x=>x.id===id);
  if(!r){alert('No se encontró el registro DOT.');return;}

  document.getElementById('ccDotEditModal')?.remove();
  const ov=document.createElement('div');
  ov.id='ccDotEditModal';
  ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  const clientesOpts=clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}" ${c.id===r.clienteId?'selected':''}>${esc(c.nombre)}</option>`).join('');

  ov.innerHTML=`<div style="background:#fff;width:min(620px,96vw);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)">
    <div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between;align-items:center">
      <strong>EDITAR REGISTRO DOT · ${esc(r.unidad||'UNIDAD')}</strong>
      <button type="button" id="ccDotEditClose" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
    </div>
    <form id="ccDotEditForm" style="padding:18px">
      <div class="cc-grid">
        <div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="${esc(r.fecha||'')}"></div>
        <div class="cc-field"><label>Cliente (opcional)</label><select name="clienteId"><option value="">Sin cliente</option>${clientesOpts}</select></div>
      </div>
      <div class="cc-field" style="margin-top:10px"><label>Descripción DOT *</label><textarea name="descripcion" required>${esc(r.descripcion||'')}</textarea></div>
      <div class="cc-field" style="margin-top:10px"><label>Nueva foto de evidencia (opcional)</label><input name="evidencia" type="file" accept="image/jpeg,image/png,image/webp"><div class="cc-note">Si no seleccionas una nueva foto, se conserva la evidencia actual.</div></div>
      ${r.evidenciaUrl?`<div class="cc-note" style="margin-top:10px"><a href="${esc(r.evidenciaUrl)}" target="_blank" rel="noopener"><i class="fa-solid fa-image mr-1"></i>Ver evidencia actual</a></div>`:''}
      <div id="ccDotEditPreview" style="display:none;margin-top:10px"><img style="max-width:100%;max-height:260px;border-radius:10px;border:1px solid #e2e8f0"></div>
      <div id="ccDotEditStatus" class="cc-note" style="margin-top:10px">Los cambios se guardarán directamente en Supabase.</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="cc-btn cc-btn-light" id="ccDotEditCancel">Cancelar</button>
        <button type="submit" class="cc-btn cc-btn-primary" id="ccDotEditSave"><i class="fa-solid fa-floppy-disk mr-1"></i>Guardar cambios</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(ov);

  const close=()=>ov.remove();
  ov.querySelector('#ccDotEditClose').onclick=close;
  ov.querySelector('#ccDotEditCancel').onclick=close;

  const input=ov.querySelector('input[name="evidencia"]');
  input.onchange=()=>{
    const file=input.files?.[0],box=ov.querySelector('#ccDotEditPreview');
    if(!file){box.style.display='none';return;}
    box.querySelector('img').src=URL.createObjectURL(file);
    box.style.display='block';
  };

  ov.querySelector('#ccDotEditForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const btn=ov.querySelector('#ccDotEditSave');
    const status=ov.querySelector('#ccDotEditStatus');
    btn.disabled=true;
    btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Guardando...';

    try{
      let evidenciaUrl='';
      const file=input.files?.[0]||null;
      if(file){
        status.textContent='Subiendo nueva evidencia...';
        evidenciaUrl=await ccDotUpload(file,r.unidadId);
      }

