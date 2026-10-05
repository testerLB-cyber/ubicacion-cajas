/* Historial Hojas · editor unificado con Registrar comprobación · v1 */
(function(){
'use strict';
if(window.__HS_HISTORY_UNIFIED_EDIT_V1__)return;window.__HS_HISTORY_UNIFIED_EDIT_V1__=true;
const sb=()=>window.gmSupabase;
const txt=v=>String(v??'').trim();
const esc=v=>txt(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

function close(){document.querySelector('.hs-edit-comp-modal[data-unified-edit="1"]')?.remove();document.body.style.overflow='';}
async function compress(file){
 if(!file?.type?.startsWith('image/'))throw new Error('Selecciona una imagen válida.');
 const u=URL.createObjectURL(file);
 try{
  const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('No se pudo leer la foto.'));img.src=u});
  let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;const max=1600,target=250*1024;
  if(Math.max(w,h)>max){const r=max/Math.max(w,h);w=Math.round(w*r);h=Math.round(h*r)}
  for(let pass=0;pass<5;pass++){
   const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d',{alpha:false}).drawImage(img,0,0,w,h);
   for(const q of [.72,.64,.56,.48,.40]){const b=await new Promise(res=>cv.toBlob(res,'image/jpeg',q));if(b&&b.size<=target)return b}
   w=Math.max(900,Math.round(w*.86));h=Math.max(900,Math.round(h*.86));
  }
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d',{alpha:false}).drawImage(img,0,0,w,h);
  const b=await new Promise(res=>cv.toBlob(res,'image/jpeg',.36));if(!b)throw new Error('No se pudo preparar la foto.');return b;
 }finally{URL.revokeObjectURL(u)}
}
async function uploadPhoto(c,file,status){
 if(c.foto_path||c.fotoPath){if(!confirm('Esta comprobación ya tiene una foto. ¿Deseas reemplazarla?'))return false}
 status.textContent='Preparando foto…';const blob=await compress(file);
 const ud=await sb().auth.getUser();if(ud.error||!ud.data?.user?.id)throw new Error('Sesión no disponible.');
 const path=ud.data.user.id+'/web-manual/'+(c.folio_id||c.folioId)+'/'+Date.now()+'.jpg';
 status.textContent='Subiendo foto…';const up=await sb().storage.from('app-hojas-servicio').upload(path,blob,{contentType:'image/jpeg',upsert:false});if(up.error)throw up.error;
 const r=await sb().rpc('hs_set_manual_photo',{p_folio_id:(c.folio_id||c.folioId),p_foto_path:path});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo ligar la foto.');
 c.foto_path=path;c.fotoPath=path;status.innerHTML='<strong style="color:#166534">✓ Evidencia actualizada.</strong>';return true;
}

window.hsHistoryOpenEditUnified=async function(item,d){
 if(!item?.id)return alert('No se identificó la comprobación.');
 close();
 let c={...item};
 try{const q=await sb().from('hs_comprobaciones').select('*').eq('id',item.id).maybeSingle();if(q.error)throw q.error;if(q.data)c={...item,...q.data,folio:item.folio};}catch(e){console.warn('Detalle comprobación',e)}
 let units=[];
 try{const u=await sb().rpc('hs_unit_catalog');if(!u.error&&u.data?.ok)units=Array.isArray(u.data.unidades)?u.data.unidades:[];}catch(e){console.warn('Catálogo unidades',e)}
 const clients=(d.clientes||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
 const tipos=(d.tiposViaje||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
 const ops=(d.operadores||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
 const ov=document.createElement('div');ov.className='hs-edit-comp-modal';ov.dataset.unifiedEdit='1';
 ov.innerHTML=`
 <div class="hs-edit-comp-card" style="width:min(980px,97vw)">
  <div class="hs-edit-comp-head"><div><div style="font-size:10px;opacity:.75;font-weight:900">COMPROBACIÓN DE HOJA · MODO EDICIÓN</div><strong>Editar comprobación · ${esc(c.folio)}</strong><div style="font-size:10px;color:#cbd5e1;margin-top:2px">Misma captura de comprobación; conserva el estatus COMPROBADA.</div></div><button type="button" data-x style="border:0;background:none;color:#fff;font-size:25px">×</button></div>
  <div class="hs-edit-comp-body">
   <div style="padding:9px 11px;margin-bottom:12px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;font-size:11px"><b>Edición de datos registrados</b><div>Corrige solo lo necesario. La evidencia y los datos existentes se conservan si no los modificas.</div></div>
   <div style="font-size:10px;font-weight:900;color:#64748b;margin:10px 0 6px">EVIDENCIA FOTOGRÁFICA</div>
   <div style="padding:11px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
     <button type="button" class="cc-btn cc-btn-light" data-photo-view ${(c.foto_path||c.fotoPath)?'':'disabled'}><i class="fa-solid fa-camera"></i> Ver foto</button>
     <button type="button" class="cc-btn cc-btn-light" data-photo-pick><i class="fa-solid fa-upload"></i> ${(c.foto_path||c.fotoPath)?'Reemplazar foto':'Subir foto'}</button>
     <button type="button" class="cc-btn cc-btn-light" data-photo-qr><i class="fa-solid fa-qrcode"></i> QR foto</button>
     <input type="file" accept="image/*" data-photo-file style="display:none">
    </div>
    <div data-photo-status class="hs104-note" style="margin-top:7px">${(c.foto_path||c.fotoPath)?'✓ Evidencia disponible. Solo se descarga al abrirla.':'Sin foto cargada.'}</div>
   </div>

   <div style="font-size:10px;font-weight:900;color:#64748b;margin:14px 0 6px">DATOS DEL SERVICIO</div>
   <div class="hs104-grid hs-edit-grid">
    <div class="cc-field"><label>Fecha de uso *</label><input data-fecha type="date" value="${esc(String(c.fecha_uso||c.fechaUso||c.fecha||'').slice(0,10))}"></div>
    <div class="cc-field"><label>Cliente *</label><input data-client-search list="hsHistClientList" autocomplete="off" placeholder="Escribe mínimo 3 letras"><input type="hidden" data-cliente><datalist id="hsHistClientList"></datalist><div data-client-status class="hs104-note"></div></div>
    <div class="cc-field"><label>Tipo de servicio *</label><select data-tipo><option value="">Seleccionar…</option>${tipos.map(x=>'<option value="'+esc(x.id)+'" '+(norm(x.nombre)===norm(c.tipo_viaje||c.tipoViaje||c.servicio)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('')}</select></div>
    <div class="cc-field" data-clas-wrap><label>Clasificación *</label><div data-clas-host></div></div>
    <div class="cc-field"><label>Operador</label><input data-operador-search list="hsHistOpList" autocomplete="off" value="${esc(c.operador_nombre||c.operador||'')}"><input type="hidden" data-operador-id><datalist id="hsHistOpList"></datalist><div data-op-status class="hs104-note">Conserva el operador actual o selecciona otro del catálogo.</div></div>
    <div class="cc-field"><label>Unidad</label><input data-unidad-search list="hsHistUnitList" autocomplete="off" value="${esc(c.unidad_numero||c.unidadNumero||c.unidad||'')}"><input type="hidden" data-unidad-id><datalist id="hsHistUnitList"></datalist><div data-unit-status class="hs104-note">Puedes conservar la unidad histórica o seleccionar otra.</div></div>
    <div class="cc-field"><label>Remolque / caja</label><input data-remolque value="${esc(c.remolque_numero||c.remolqueNumero||c.remolque||'')}" placeholder="Captura libre"></div>
    <div class="cc-field"><label>Tipo de unidad</label><input data-unidad-tipo value="${esc(c.unidad_tipo||c.unidadTipo||'')}" placeholder="Se completa al seleccionar unidad"></div>
   </div>
   <div style="font-size:10px;font-weight:900;color:#64748b;margin:14px 0 6px">CIERRE</div>
   <div class="cc-field"><label>Observaciones</label><textarea data-obs>${esc(c.observaciones||'')}</textarea></div>
   <div class="hs104-actions" style="justify-content:flex-end;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cerrar</button><button type="button" class="cc-btn cc-btn-primary" data-save><i class="fa-solid fa-floppy-disk"></i> Guardar cambios</button></div>
  </div>
 </div>`;
 document.body.appendChild(ov);document.body.style.overflow='hidden';

 const clientSearch=ov.querySelector('[data-client-search]'),clientId=ov.querySelector('[data-cliente]'),clientList=ov.querySelector('#hsHistClientList'),clientStatus=ov.querySelector('[data-client-status]');
 const clientLabel=x=>String(x.nombre||'')+(x.razonSocial&&x.razonSocial!==x.nombre?' · '+x.razonSocial:'');
 function chooseClient(x){clientId.value=String(x.id);clientSearch.value=clientLabel(x);clientStatus.textContent='✓ '+clientLabel(x);clientStatus.style.color='#15803d'}
 const currentClient=clients.find(x=>String(x.id)===String(c.cliente_id||c.clienteId));if(currentClient)chooseClient(currentClient);else{clientSearch.value=c.cliente_nombre||c.cliente||'';clientId.value=c.cliente_id||c.clienteId||''}
 function syncClient(){const q=norm(clientSearch.value);clientId.value='';if(q.length<3){clientList.innerHTML='';clientStatus.textContent='Escribe 3 letras para buscar.';return}const hits=clients.filter(x=>norm(clientLabel(x)).includes(q)).slice(0,30);clientList.innerHTML=hits.map(x=>'<option value="'+esc(clientLabel(x))+'"></option>').join('');const m=clients.find(x=>norm(clientLabel(x))===q)||clients.find(x=>norm(x.nombre)===q);if(m)chooseClient(m);else clientStatus.textContent=hits.length+' coincidencia(s). Selecciona una opción válida.'}
 clientSearch.addEventListener('input',syncClient);clientSearch.addEventListener('change',syncClient);

 const opSearch=ov.querySelector('[data-operador-search]'),opId=ov.querySelector('[data-operador-id]'),opList=ov.querySelector('#hsHistOpList'),opStatus=ov.querySelector('[data-op-status]');
 const opLabel=x=>String(x.nombre||'')+(x.numeroEmpleado?' · '+x.numeroEmpleado:'');
 opList.innerHTML=ops.map(x=>'<option value="'+esc(opLabel(x))+'"></option>').join('');
 function syncOp(){const q=norm(opSearch.value);const m=ops.find(x=>norm(opLabel(x))===q)||ops.find(x=>norm(x.nombre)===q);opId.value=m?String(m.id):'';opStatus.textContent=m?'✓ Operador del catálogo':'Se conservará/capturará el nombre indicado.';opStatus.style.color=m?'#15803d':'#64748b'}
 syncOp();opSearch.addEventListener('input',syncOp);opSearch.addEventListener('change',syncOp);

 const unitSearch=ov.querySelector('[data-unidad-search]'),unitId=ov.querySelector('[data-unidad-id]'),unitList=ov.querySelector('#hsHistUnitList'),unitStatus=ov.querySelector('[data-unit-status]'),unitType=ov.querySelector('[data-unidad-tipo]');
 const unitLabel=x=>String(x.numero||'')+(x.tipoUnidad||x.categoria?' · '+String(x.tipoUnidad||x.categoria):'');
 unitList.innerHTML=units.map(x=>'<option value="'+esc(unitLabel(x))+'"></option>').join('');
 function syncUnit(){const q=norm(unitSearch.value);const m=units.find(x=>norm(unitLabel(x))===q)||units.find(x=>norm(x.numero)===q);unitId.value=m?String(m.id):'';if(m){unitSearch.value=m.numero;unitType.value=m.tipoUnidad||m.categoria||unitType.value;unitStatus.textContent='✓ Unidad del catálogo';unitStatus.style.color='#15803d'}else{unitStatus.textContent=unitSearch.value?'Unidad histórica/libre; se conservará el texto.':'Sin unidad capturada.';unitStatus.style.color='#64748b'}}
 syncUnit();unitSearch.addEventListener('change',syncUnit);unitSearch.addEventListener('blur',syncUnit);

 const tipo=ov.querySelector('[data-tipo]'),host=ov.querySelector('[data-clas-host]');
 function selectedTipo(){return tipos.find(x=>String(x.id)===String(tipo.value))}
 function renderClas(keep=true){
  const tv=selectedTipo();host.innerHTML='';if(!tv)return;
  if(tv.clasificacionManual){
   const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:7px;align-items:center';
   const inp=document.createElement('input');inp.type='number';inp.min='0.01';inp.step='0.01';inp.inputMode='decimal';inp.dataset.cantidad='1';inp.placeholder=norm(tv.nombre)==='RESGUARDO'?'Cantidad':'Cantidad de horas';
   const old=keep?(c.cantidad_cobro??c.cantidadCobro):'';if(old!==''&&old!=null)inp.value=old;else{const n=String(c.clasificacion||'').match(/[0-9]+(?:[.,][0-9]+)?/);if(n&&keep)inp.value=n[0].replace(',','.')}
   wrap.appendChild(inp);
   if(norm(tv.nombre)==='RESGUARDO'){const u=document.createElement('select');u.dataset.unidadCobro='1';u.innerHTML='<option value="DIA">Días</option><option value="HORA">Horas</option>';u.value=String(c.unidad_cobro||c.unidadCobro||'DIA').toUpperCase()==='HORA'?'HORA':'DIA';wrap.appendChild(u)}
   host.appendChild(wrap);
  }else{
   const s=document.createElement('select');s.dataset.clasId='1';s.innerHTML='<option value="">Seleccionar clasificación…</option>';
   const xs=(d.clasificaciones||[]).filter(x=>String(x.tipoViajeId)===String(tv.id)&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
   s.innerHTML+=xs.map(x=>'<option value="'+esc(x.id)+'" '+(keep&&norm(x.nombre)===norm(c.clasificacion)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('');host.appendChild(s);
  }
 }
 tipo.addEventListener('change',()=>renderClas(false));renderClas(true);

 ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
 const pf=ov.querySelector('[data-photo-file]'),ps=ov.querySelector('[data-photo-status]');
 ov.querySelector('[data-photo-pick]').onclick=()=>pf.click();
 pf.onchange=async()=>{const f=pf.files?.[0];if(!f)return;try{if(await uploadPhoto(c,f,ps)){ov.querySelector('[data-photo-view]').disabled=false;ov.querySelector('[data-photo-pick]').innerHTML='<i class="fa-solid fa-upload"></i> Reemplazar foto'}}catch(e){alert(e.message||e)}finally{pf.value=''}};
 ov.querySelector('[data-photo-view]').onclick=()=>{const p=c.foto_path||c.fotoPath;if(p&&typeof window.hsHistoryShowPhoto==='function')window.hsHistoryShowPhoto(p,'Evidencia · '+c.folio)};
 ov.querySelector('[data-photo-qr]').onclick=()=>window.hsHistoryAction?.('qr',c.folio);

 ov.querySelector('[data-save]').onclick=async e=>{
  const btn=e.currentTarget,fecha=txt(ov.querySelector('[data-fecha]')?.value),cid=txt(clientId.value),tid=txt(tipo.value),tv=selectedTipo();
  if(!fecha||!cid||!tid)return alert('Completa fecha, cliente y tipo de servicio.');
  const payload={comprobacionId:c.id,fechaUso:fecha,clienteId:cid,tipoViajeId:tid,observaciones:txt(ov.querySelector('[data-obs]')?.value),operadorId:txt(opId.value),operadorNombre:txt(opSearch.value),unidadId:txt(unitId.value),unidadNumero:txt(unitSearch.value),unidadTipo:txt(unitType.value),remolqueNumero:txt(ov.querySelector('[data-remolque]')?.value)};
  if(tv?.clasificacionManual){const qty=Number(ov.querySelector('[data-cantidad]')?.value||0);if(!(qty>0))return alert(norm(tv.nombre)==='DEMORA'?'Captura la cantidad de horas.':'Captura la cantidad.');payload.cantidadCobro=qty;payload.unidadCobro=norm(tv.nombre)==='DEMORA'?'HORA':txt(ov.querySelector('[data-unidad-cobro]')?.value||'DIA');payload.clasificacionManual=qty+' '+payload.unidadCobro;}
  else{const cl=txt(ov.querySelector('[data-clas-id]')?.value);if(!cl)return alert('Selecciona la clasificación.');payload.clasificacionId=cl;}
  btn.disabled=true;btn.textContent='Guardando…';
  try{const r=await sb().rpc('hs_update_comprobacion',{p_item:payload});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo actualizar la comprobación.');close();document.getElementById('hs104Refresh')?.click();setTimeout(()=>window.hsSetComprobacionHistory?.(true),450)}
  catch(err){alert(err.message||err);btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar cambios'}
 };
};
})();