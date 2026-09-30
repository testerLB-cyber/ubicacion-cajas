/* Tráfico App · Matriz de precios · vista compacta + matriz completa */
(function(){
 if(window.__CC_MATRIZ_COBRO_V5__)return;window.__CC_MATRIZ_COBRO_V5__=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let D={clientes:[],servicios:[],tiposViaje:[],tiposUnidad:[],destinos:[],modalidades:[],precios:[]};
 let MODE='COMPACTA', FILTER={tipoViajeId:'',clasificacionId:'',destinoId:''};
 const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));
 const units=()=> (D.tiposUnidad||[]).filter(x=>String(x.categoria||'CARRO').toUpperCase()==='CARRO');
 const nil=v=>String(v||'');
 const legacy=x=>!x.destinoId&&!x.modalidadId;
 const sameBase=(x,cid,tvid,clid)=>String(x.clienteId)===String(cid)&&String(x.tipoViajeId)===String(tvid)&&nil(x.clasificacionId)===nil(clid);

 function ensureUi(){
   const client=document.getElementById('ccMatrizCliente');if(!client)return;
   const host=client.closest('.cc-config-card');if(!host)return;
   if(!document.getElementById('ccMatrizModeBar')){
     const bar=document.createElement('div');bar.id='ccMatrizModeBar';
     bar.style='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px';
     bar.innerHTML='<button type="button" class="cc-btn cc-btn-primary" data-matrix-mode="COMPACTA"><i class="fa-solid fa-filter"></i> Vista compacta</button><button type="button" class="cc-btn cc-btn-light" data-matrix-mode="COMPLETA"><i class="fa-solid fa-table-cells-large"></i> Matriz completa</button><span style="font-size:10px;color:#64748b;font-weight:800">La vista completa conserva la matriz anterior.</span>';
     client.closest('.cc-field').before(bar);
     bar.querySelectorAll('[data-matrix-mode]').forEach(b=>b.onclick=()=>{MODE=b.dataset.matrixMode;paintMode();render();});
   }
   if(!document.getElementById('ccMatrizCompactFilters')){
     const box=document.createElement('div');box.id='ccMatrizCompactFilters';
     box.style='display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:10px;margin:0 0 12px;padding:12px;background:#fff;border:1px solid #dbeafe;border-radius:12px';
     box.innerHTML=
       '<div class="cc-field" style="margin:0"><label>TIPO DE SERVICIO</label><select id="ccMatrizServicio"><option value="">Selecciona servicio</option></select></div>'+
       '<div class="cc-field" style="margin:0"><label>CLASIFICACIÓN ACTUAL</label><select id="ccMatrizClasificacion"><option value="">General / cualquiera</option></select></div>'+
       '<div class="cc-field" style="margin:0"><label>DESTINO</label><div style="display:flex;gap:6px"><select id="ccMatrizDestino" style="flex:1"><option value="">General / sin destino</option></select><button type="button" class="cc-btn cc-btn-light" id="ccMatrizAddDestino" title="Agregar destino">+</button></div></div>'+
       '<div style="grid-column:1/-1;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="cc-btn cc-btn-light" id="ccMatrizAddModalidad"><i class="fa-solid fa-plus"></i> Modalidad</button><span style="font-size:10px;color:#64748b">Las modalidades aparecen como filas; los tipos de unidad como columnas.</span></div>'+
       '<style>@media(max-width:800px){#ccMatrizCompactFilters{grid-template-columns:1fr!important}}</style>';
     document.getElementById('ccMatrizResumen').before(box);
     document.getElementById('ccMatrizServicio').onchange=e=>{FILTER.tipoViajeId=e.target.value;FILTER.clasificacionId='';fillCompactFilters();renderCompact();};
     document.getElementById('ccMatrizClasificacion').onchange=e=>{FILTER.clasificacionId=e.target.value;renderCompact();};
     document.getElementById('ccMatrizDestino').onchange=e=>{FILTER.destinoId=e.target.value;renderCompact();};
     document.getElementById('ccMatrizAddDestino').onclick=()=>addDimension('DESTINO');
     document.getElementById('ccMatrizAddModalidad').onclick=()=>addDimension('MODALIDAD');
   }
   paintMode();
 }
 function paintMode(){
   const bar=document.getElementById('ccMatrizModeBar');
   bar?.querySelectorAll('[data-matrix-mode]').forEach(b=>{const on=b.dataset.matrixMode===MODE;b.classList.toggle('cc-btn-primary',on);b.classList.toggle('cc-btn-light',!on);});
   const cf=document.getElementById('ccMatrizCompactFilters');if(cf)cf.style.display=MODE==='COMPACTA'?'grid':'none';
 }
 async function addDimension(tipo){
   if(!canEdit())return alert('Sin permiso para editar Configuración.');
   const label=tipo==='DESTINO'?'destino':'modalidad';
   const nombre=prompt('Nombre de la nueva '+label+':','');if(nombre===null)return;
   const n=String(nombre).trim();if(!n)return;
   try{
     const r=await sb().rpc('cc_dimension_servicio_save',{p_tipo:tipo,p_nombre:n});
     if(r.error)throw r.error;
     const keep={...FILTER};await load(false);FILTER=keep;fillCompactFilters();
     if(tipo==='DESTINO'&&r.data?.id){FILTER.destinoId=String(r.data.id);document.getElementById('ccMatrizDestino').value=FILTER.destinoId;}
     renderCompact();
   }catch(e){alert('No se pudo agregar '+label+'.\n'+(e.message||e))}
 }
 async function load(reset=false){
  const body=document.getElementById('ccMatrizBody'),sel=document.getElementById('ccMatrizCliente');if(!body||!sel)return;
  ensureUi();
  if(!sb()){body.innerHTML='<tr><td style="padding:24px">Conectando con Supabase…</td></tr>';return setTimeout(()=>load(reset),500)}
  body.innerHTML='<tr><td style="padding:24px">Cargando matriz…</td></tr>';
  try{
   const r=await sb().rpc('cc_matriz_cobro_list');if(r.error)throw r.error;
   D=Object.assign({clientes:[],servicios:[],tiposViaje:[],tiposUnidad:[],destinos:[],modalidades:[],precios:[]},r.data||{});
   const old=reset?'':sel.value;
   sel.innerHTML='<option value="">Selecciona un cliente</option>'+D.clientes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   if(D.clientes.some(x=>String(x.id)===String(old)))sel.value=old;
   fillCompactFilters();
   render();
  }catch(e){console.error(e);body.innerHTML='<tr><td style="padding:24px;color:#b91c1c">No se pudo cargar: '+esc(e.message||e)+'</td></tr>'}
 }
 function fillCompactFilters(){
   ensureUi();
   const ts=document.getElementById('ccMatrizServicio'),cs=document.getElementById('ccMatrizClasificacion'),ds=document.getElementById('ccMatrizDestino');
   if(!ts||!cs||!ds)return;
   const tipos=(D.tiposViaje||[]).filter(x=>!x.clasificacionManual);
   ts.innerHTML='<option value="">Selecciona servicio</option>'+tipos.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   if(tipos.some(x=>String(x.id)===String(FILTER.tipoViajeId)))ts.value=FILTER.tipoViajeId;else FILTER.tipoViajeId='';
   const cls=(D.servicios||[]).filter(x=>String(x.tipoViajeId)===String(FILTER.tipoViajeId)&&x.clasificacionId);
   const seen=new Set(),uniq=cls.filter(x=>{const k=String(x.clasificacionId);if(seen.has(k))return false;seen.add(k);return true});
   cs.innerHTML='<option value="">General / cualquiera</option>'+uniq.map(x=>'<option value="'+esc(x.clasificacionId)+'">'+esc(x.clasificacion)+'</option>').join('');
   if(uniq.some(x=>String(x.clasificacionId)===String(FILTER.clasificacionId)))cs.value=FILTER.clasificacionId;else FILTER.clasificacionId='';
   ds.innerHTML='<option value="">General / sin destino</option>'+(D.destinos||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   if((D.destinos||[]).some(x=>String(x.id)===String(FILTER.destinoId)))ds.value=FILTER.destinoId;else FILTER.destinoId='';
 }
 function render(){ensureUi();if(MODE==='COMPACTA')renderCompact();else renderFull();}
 function detailedExact(cid,uid,mid){
   return D.precios.find(x=>sameBase(x,cid,FILTER.tipoViajeId,FILTER.clasificacionId)&&nil(x.tipoUnidadId)===nil(uid)&&nil(x.destinoId)===nil(FILTER.destinoId)&&nil(x.modalidadId)===nil(mid));
 }
 function inherited(cid,uid,mid){
   const candidates=D.precios.filter(x=>String(x.clienteId)===String(cid)&&String(x.tipoViajeId)===String(FILTER.tipoViajeId)&&nil(x.tipoUnidadId)===nil(uid)&&x.estatus!=='INACTIVO');
   const score=x=>{
     let s=0;
     if(nil(x.clasificacionId)===nil(FILTER.clasificacionId))s+=8; else if(!x.clasificacionId)s+=2; else return -1;
     if(nil(x.destinoId)===nil(FILTER.destinoId))s+=4; else if(!x.destinoId)s+=1; else return -1;
     if(nil(x.modalidadId)===nil(mid))s+=4; else if(!x.modalidadId)s+=1; else return -1;
     return s;
   };
   return candidates.map(x=>({x,s:score(x)})).filter(z=>z.s>=0).sort((a,b)=>b.s-a.s)[0]?.x||null;
 }
 function renderCompact(){
   const cid=document.getElementById('ccMatrizCliente')?.value,body=document.getElementById('ccMatrizBody'),head=document.getElementById('ccMatrizHead'),sum=document.getElementById('ccMatrizResumen'),save=document.getElementById('ccMatrizSaveAll');
   if(!body||!head)return;
   fillCompactFilters();
   const us=units();
   head.innerHTML='<tr><th style="min-width:160px">MODALIDAD</th>'+us.map(u=>'<th style="min-width:160px;text-align:center">'+esc(u.nombre)+'</th>').join('')+'</tr>';
   if(!cid){body.innerHTML='<tr><td colspan="'+(us.length+1)+'" style="text-align:center;padding:28px;color:#64748b">Selecciona un cliente.</td></tr>';if(sum)sum.textContent='';if(save)save.disabled=true;return}
   if(!FILTER.tipoViajeId){body.innerHTML='<tr><td colspan="'+(us.length+1)+'" style="text-align:center;padding:28px;color:#64748b">Selecciona el tipo de servicio para abrir la matriz compacta.</td></tr>';if(sum)sum.textContent='';if(save)save.disabled=true;return}
   const rows=[{id:'',nombre:'GENERAL'}].concat(D.modalidades||[]);
   let exacts=0,heredadas=0;
   body.innerHTML=rows.map(m=>{
     return '<tr data-modalidad="'+esc(m.id||'')+'"><td><strong>'+esc(m.nombre)+'</strong>'+(m.id?'':'<div style="font-size:9px;color:#64748b">Respaldo sin modalidad</div>')+'</td>'+
       us.map(u=>{
         const ex=detailedExact(cid,u.id,m.id||''),fb=ex||inherited(cid,u.id,m.id||'');
         if(ex)exacts++;else if(fb)heredadas++;
         const na=ex?.aplica===false;
         const placeholder=fb&&!ex?(fb.aplica===false?'N/A heredada':('$'+Number(fb.precio||0).toFixed(2)+' heredada')):'0.00';
         return '<td style="vertical-align:top"><div style="display:flex;align-items:center;gap:4px;justify-content:center"><span>$</span><input data-price="'+esc(u.id)+'" type="number" min="0" step="0.01" value="'+(ex&&!na?Number(ex.precio).toFixed(2):'')+'" placeholder="'+esc(placeholder)+'" '+(na?'disabled':'')+' style="width:108px;font-weight:800;text-align:right"></div><label style="display:flex;justify-content:center;gap:5px;align-items:center;font-size:9px;margin-top:4px"><input data-na="'+esc(u.id)+'" type="checkbox" '+(na?'checked':'')+'> N/A</label>'+(!ex&&fb?'<div style="font-size:8px;color:#b45309;text-align:center;margin-top:2px">Usa respaldo mientras no captures aquí</div>':'')+'</td>';
       }).join('')+'</tr>';
   }).join('');
   body.querySelectorAll('tr[data-modalidad]').forEach(tr=>tr.querySelectorAll('[data-na]').forEach(ch=>ch.onchange=()=>{const inp=tr.querySelector('[data-price="'+CSS.escape(ch.dataset.na)+'"]');if(inp){inp.disabled=ch.checked;if(ch.checked)inp.value='';}}));
   const tv=(D.tiposViaje||[]).find(x=>String(x.id)===String(FILTER.tipoViajeId));
   const cl=(D.servicios||[]).find(x=>String(x.clasificacionId)===String(FILTER.clasificacionId));
   const de=(D.destinos||[]).find(x=>String(x.id)===String(FILTER.destinoId));
   if(sum)sum.innerHTML='<b>'+esc(tv?.nombre||'')+'</b> · Clasificación: <b>'+esc(cl?.clasificacion||'GENERAL')+'</b> · Destino: <b>'+esc(de?.nombre||'GENERAL')+'</b> · '+rows.length+' modalidades · '+us.length+' tipos de unidad · '+exacts+' tarifas específicas'+(heredadas?' · '+heredadas+' con respaldo':'');
   if(save)save.disabled=!canEdit();
 }
 function legacyExact(cid,s,uid){return D.precios.find(x=>legacy(x)&&sameBase(x,cid,s.tipoViajeId,s.clasificacionId)&&String(x.tipoUnidadId||'')===String(uid||''))}
 function legacyGeneral(cid,s){return D.precios.find(x=>legacy(x)&&sameBase(x,cid,s.tipoViajeId,s.clasificacionId)&&!x.tipoUnidadId)}
 function behavior(cid,s){return D.precios.find(x=>legacy(x)&&sameBase(x,cid,s.tipoViajeId,s.clasificacionId)&&!x.tipoUnidadId&&(x.cobraCliente!=null||x.comisionaOperador!=null))||D.precios.find(x=>legacy(x)&&sameBase(x,cid,s.tipoViajeId,s.clasificacionId)&&(x.cobraCliente!=null||x.comisionaOperador!=null))}
 function renderFull(){
  const cid=document.getElementById('ccMatrizCliente')?.value,body=document.getElementById('ccMatrizBody'),head=document.getElementById('ccMatrizHead'),sum=document.getElementById('ccMatrizResumen'),saveAll=document.getElementById('ccMatrizSaveAll');
  if(!body||!head)return;const us=units();
  head.innerHTML='<tr><th>TIPO DE VIAJE</th><th>CLASIFICACIÓN</th>'+us.map(u=>'<th style="min-width:150px;text-align:center">'+esc(u.nombre)+'</th>').join('')+'<th style="min-width:150px;text-align:center">COBRA CLIENTE</th><th style="min-width:170px;text-align:center">COMISIONA OPERADOR</th></tr>';
  if(!cid){body.innerHTML='<tr><td colspan="'+(us.length+4)+'" style="text-align:center;padding:28px;color:#64748b">Selecciona un cliente para mostrar la matriz.</td></tr>';if(sum)sum.textContent='';if(saveAll)saveAll.disabled=true;return}
  let specific=0,inherited=0;
  body.innerHTML=(D.servicios||[]).map((s,si)=>{
   const beh=behavior(cid,s),cobra=beh?.cobraCliente??s.cobraClienteDefault??true,comisiona=beh?.comisionaOperador??s.comisionaOperadorDefault??true;
   return '<tr data-service="'+si+'"><td><strong>'+esc(s.tipoViaje)+'</strong></td><td>'+esc(s.clasificacion||'Sin clasificación')+'</td>'+
   us.map(u=>{const p=legacyExact(cid,s,u.id),g=legacyGeneral(cid,s),v=p||g;if(p)specific++;else if(g)inherited++;const na=v?.aplica===false;return '<td style="vertical-align:top"><div style="display:flex;align-items:center;gap:4px;justify-content:center"><span>$</span><input data-price="'+esc(u.id)+'" type="number" min="0" step="0.01" value="'+(!na&&v?Number(v.precio).toFixed(2):'')+'" placeholder="0.00" '+(na?'disabled':'')+' style="width:105px;font-weight:800;text-align:right"></div><label style="display:flex;justify-content:center;gap:5px;align-items:center;font-size:9px;margin-top:4px"><input data-na="'+esc(u.id)+'" type="checkbox" '+(na?'checked':'')+'> N/A</label>'+(!p&&g?'<div style="font-size:8px;color:#b45309;text-align:center;margin-top:2px">General heredada</div>':'')+'</td>'}).join('')+
   '<td style="text-align:center"><input data-cobra type="checkbox" '+(cobra?'checked':'')+' '+(canEdit()?'':'disabled')+'></td>'+
   '<td style="text-align:center"><input data-comisiona type="checkbox" '+(comisiona?'checked':'')+' '+(canEdit()?'':'disabled')+'></td></tr>';
  }).join('');
  body.querySelectorAll('tr[data-service]').forEach(tr=>tr.querySelectorAll('[data-na]').forEach(ch=>ch.onchange=()=>{const inp=tr.querySelector('[data-price="'+CSS.escape(ch.dataset.na)+'"]');inp.disabled=ch.checked;if(ch.checked)inp.value='';}));
  if(sum)sum.textContent='Matriz completa anterior · '+D.servicios.length+' servicios · '+us.length+' tipos de unidad · '+specific+' tarifas específicas · '+inherited+' valores heredados';
  if(saveAll)saveAll.disabled=!canEdit();
 }
 async function saveCompact(){
   if(!canEdit())return alert('Sin permiso para editar Configuración.');
   const cid=document.getElementById('ccMatrizCliente')?.value;if(!cid)return alert('Selecciona un cliente.');
   if(!FILTER.tipoViajeId)return alert('Selecciona el tipo de servicio.');
   const body=document.getElementById('ccMatrizBody'),us=units(),ops=[];
   for(const tr of body.querySelectorAll('tr[data-modalidad]')){
     const mid=tr.dataset.modalidad||'';
     for(const u of us){
       const inp=tr.querySelector('[data-price="'+CSS.escape(u.id)+'"]'),na=tr.querySelector('[data-na="'+CSS.escape(u.id)+'"]')?.checked;
       if(!inp)continue;const raw=inp.value.trim();if(!na&&raw==='')continue;
       const precio=na?0:Number(raw);if(!na&&(!Number.isFinite(precio)||precio<0))return alert('Revisa los importes capturados.');
       ops.push(sb().rpc('cc_matriz_cobro_save',{p_cliente_id:cid,p_tipo_viaje_id:FILTER.tipoViajeId,p_clasificacion_id:FILTER.clasificacionId||null,p_precio:precio,p_aplica:!na,p_tipo_unidad_id:u.id,p_destino_id:FILTER.destinoId||null,p_modalidad_id:mid||null}));
     }
   }
   if(!ops.length)return alert('No hay cambios nuevos para guardar.');
   return runSave(ops);
 }
 async function saveFull(){
  if(!canEdit())return alert('Sin permiso para editar Configuración.');
  const cid=document.getElementById('ccMatrizCliente')?.value;if(!cid)return alert('Selecciona un cliente.');
  const body=document.getElementById('ccMatrizBody'),us=units();let ops=[];
  for(const tr of body.querySelectorAll('tr[data-service]')){
   const s=D.servicios[Number(tr.dataset.service)];
   for(const u of us){
    const inp=tr.querySelector('[data-price="'+CSS.escape(u.id)+'"]'),na=tr.querySelector('[data-na="'+CSS.escape(u.id)+'"]')?.checked;if(!inp)continue;
    const raw=inp.value.trim();if(!na&&raw==='')continue;const precio=na?0:Number(raw);
    if(!na&&(!Number.isFinite(precio)||precio<0))return alert('Revisa los importes capturados en '+s.tipoViaje+'.');
    ops.push(sb().rpc('cc_matriz_cobro_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_precio:precio,p_aplica:!na,p_tipo_unidad_id:u.id}));
   }
   ops.push(sb().rpc('cc_matriz_behavior_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_cobra_cliente:tr.querySelector('[data-cobra]').checked,p_comisiona_operador:tr.querySelector('[data-comisiona]').checked}));
  }
  return runSave(ops);
 }
 async function runSave(ops){
   const btn=document.getElementById('ccMatrizSaveAll');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
   try{
     const rs=await Promise.all(ops),err=rs.find(x=>x.error);if(err)throw err.error;
     btn.innerHTML='<i class="fa-solid fa-check"></i> Guardado';
     const keepClient=document.getElementById('ccMatrizCliente')?.value,keep={...FILTER};await load(false);
     if(keepClient)document.getElementById('ccMatrizCliente').value=keepClient;FILTER=keep;fillCompactFilters();render();
     setTimeout(()=>{btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';btn.disabled=!canEdit();},900);
   }catch(e){alert('No se pudo guardar la matriz.\n'+(e.message||e));btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar cambios'}
 }
 async function saveAll(){return MODE==='COMPACTA'?saveCompact():saveFull()}
 window.ccMatrizCobroCargar=load;window.ccMatrizGuardarTodo=saveAll;
 function wire(){
   ensureUi();
   const sel=document.getElementById('ccMatrizCliente'),ref=document.getElementById('ccMatrizRefresh'),save=document.getElementById('ccMatrizSaveAll');
   if(sel)sel.onchange=render;if(ref)ref.onclick=()=>load(false);if(save)save.onclick=saveAll;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();