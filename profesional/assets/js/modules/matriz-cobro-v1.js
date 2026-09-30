/* Tráfico App · Matriz de precios horizontal por tipo de unidad */
(function(){
 if(window.__CC_MATRIZ_COBRO_V4__)return;window.__CC_MATRIZ_COBRO_V4__=true;
 const sb=()=>window.gmSupabase,esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let D={clientes:[],servicios:[],tiposUnidad:[],precios:[]};
 const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));
 const key=(a,b)=>String(a)+'|'+String(b||'');
 const units=()=> (D.tiposUnidad||[]).filter(x=>String(x.categoria||'CARRO').toUpperCase()==='CARRO');
 function sameService(x,cid,s){return String(x.clienteId)===String(cid)&&key(x.tipoViajeId,x.clasificacionId)===key(s.tipoViajeId,s.clasificacionId)}
 function exact(cid,s,uid){return D.precios.find(x=>sameService(x,cid,s)&&String(x.tipoUnidadId||'')===String(uid||''))}
 function general(cid,s){return D.precios.find(x=>sameService(x,cid,s)&&!x.tipoUnidadId)}
 function behavior(cid,s){return D.precios.find(x=>sameService(x,cid,s)&&!x.tipoUnidadId&&(x.cobraCliente!=null||x.comisionaOperador!=null))||D.precios.find(x=>sameService(x,cid,s)&&(x.cobraCliente!=null||x.comisionaOperador!=null))}
 async function load(){
  const body=document.getElementById('ccMatrizBody'),sel=document.getElementById('ccMatrizCliente');if(!body||!sel)return;
  if(!sb()){body.innerHTML='<tr><td style="padding:24px">Conectando con Supabase…</td></tr>';return setTimeout(load,500)}
  body.innerHTML='<tr><td style="padding:24px">Cargando matriz…</td></tr>';
  try{
   const r=await sb().rpc('cc_matriz_cobro_list');if(r.error)throw r.error;
   D=Object.assign({clientes:[],servicios:[],tiposUnidad:[],precios:[]},r.data||{});
   const old=sel.value;
   sel.innerHTML='<option value="">Selecciona un cliente</option>'+D.clientes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   if(D.clientes.some(x=>String(x.id)===String(old)))sel.value=old;
   render();
  }catch(e){console.error(e);body.innerHTML='<tr><td style="padding:24px;color:#b91c1c">No se pudo cargar: '+esc(e.message||e)+'</td></tr>'}
 }
 function render(){
  const cid=document.getElementById('ccMatrizCliente')?.value,body=document.getElementById('ccMatrizBody'),head=document.getElementById('ccMatrizHead'),sum=document.getElementById('ccMatrizResumen'),saveAll=document.getElementById('ccMatrizSaveAll');
  if(!body||!head)return;
  const us=units();
  head.innerHTML='<tr><th>TIPO DE VIAJE</th><th>CLASIFICACIÓN</th>'+us.map(u=>'<th style="min-width:150px;text-align:center">'+esc(u.nombre)+'</th>').join('')+'<th style="min-width:150px;text-align:center">COBRA CLIENTE</th><th style="min-width:170px;text-align:center">COMISIONA OPERADOR</th></tr>';
  if(!cid){body.innerHTML='<tr><td colspan="'+(us.length+4)+'" style="text-align:center;padding:28px;color:#64748b">Selecciona un cliente para mostrar la matriz.</td></tr>';if(sum)sum.textContent='';if(saveAll)saveAll.disabled=true;return}
  if(!us.length){body.innerHTML='<tr><td colspan="4" style="text-align:center;padding:28px;color:#b45309">No hay tipos de unidad CARRO activos.</td></tr>';if(sum)sum.textContent='';if(saveAll)saveAll.disabled=true;return}
  let specific=0,inherited=0;
  const serviciosVisibles=(D.servicios||[]).filter(s=>{const tipo=String(s.tipoViaje||'').trim().toUpperCase(),clas=String(s.clasificacion||'').trim().toUpperCase();if(tipo==='FORANEO'||tipo==='FORÁNEO')return false;if((tipo==='EXPO'||tipo==='IMPO')&&(clas==='CARGADO'||clas==='CARGADA'||clas==='QUIMICO'||clas==='QUÍMICO'))return false;return true;});
  body.innerHTML=serviciosVisibles.map((s,si)=>{
   const beh=behavior(cid,s),cobra=beh?.cobraCliente??s.cobraClienteDefault??true,comisiona=beh?.comisionaOperador??s.comisionaOperadorDefault??true;
   return '<tr data-service="'+si+'"><td><strong>'+esc(s.tipoViaje)+'</strong></td><td>'+esc(s.clasificacion||'Sin clasificación')+'</td>'+
   us.map(u=>{const p=exact(cid,s,u.id),g=general(cid,s),v=p||g;if(p)specific++;else if(g)inherited++;const na=v?.aplica===false;return '<td style="vertical-align:top"><div style="display:flex;align-items:center;gap:4px;justify-content:center"><span>$</span><input data-price="'+esc(u.id)+'" type="number" min="0" step="0.01" value="'+(!na&&v?Number(v.precio).toFixed(2):'')+'" placeholder="0.00" '+(na?'disabled':'')+' style="width:105px;font-weight:800;text-align:right"></div><label style="display:flex;justify-content:center;gap:5px;align-items:center;font-size:9px;margin-top:4px"><input data-na="'+esc(u.id)+'" type="checkbox" '+(na?'checked':'')+'> N/A</label>'+(!p&&g?'<div style="font-size:8px;color:#b45309;text-align:center;margin-top:2px">General heredada</div>':'')+'</td>'}).join('')+
   '<td style="text-align:center"><input data-cobra type="checkbox" '+(cobra?'checked':'')+' '+(canEdit()?'':'disabled')+'></td>'+
   '<td style="text-align:center"><input data-comisiona type="checkbox" '+(comisiona?'checked':'')+' '+(canEdit()?'':'disabled')+'></td></tr>';
  }).join('');
  body.querySelectorAll('tr[data-service]').forEach(tr=>{tr.querySelectorAll('[data-na]').forEach(ch=>ch.onchange=()=>{const inp=tr.querySelector('[data-price="'+CSS.escape(ch.dataset.na)+'"]');inp.disabled=ch.checked;if(ch.checked)inp.value='';});});
  if(sum)sum.textContent=serviciosVisibles.length+' servicios · '+us.length+' tipos de unidad · '+specific+' tarifas específicas · '+inherited+' valores heredados';
  if(saveAll)saveAll.disabled=!canEdit();
 }
 async function saveAll(){
  if(!canEdit())return alert('Sin permiso para editar Configuración.');
  const cid=document.getElementById('ccMatrizCliente')?.value;if(!cid)return alert('Selecciona un cliente.');
  const btn=document.getElementById('ccMatrizSaveAll'),body=document.getElementById('ccMatrizBody'),us=units();let ops=[];
  for(const tr of body.querySelectorAll('tr[data-service]')){
   const serviciosVisibles=(D.servicios||[]).filter(s=>{const tipo=String(s.tipoViaje||'').trim().toUpperCase(),clas=String(s.clasificacion||'').trim().toUpperCase();if(tipo==='FORANEO'||tipo==='FORÁNEO')return false;if((tipo==='EXPO'||tipo==='IMPO')&&(clas==='CARGADO'||clas==='CARGADA'||clas==='QUIMICO'||clas==='QUÍMICO'))return false;return true;});
   const s=serviciosVisibles[Number(tr.dataset.service)];
   for(const u of us){
    const inp=tr.querySelector('[data-price="'+CSS.escape(u.id)+'"]'),na=tr.querySelector('[data-na="'+CSS.escape(u.id)+'"]')?.checked;
    if(!inp)continue;
    const raw=inp.value.trim();
    if(!na&&raw==='')continue;
    const precio=na?0:Number(raw);
    if(!na&&(!Number.isFinite(precio)||precio<0))return alert('Revisa los importes capturados en '+s.tipoViaje+'.');
    ops.push(sb().rpc('cc_matriz_cobro_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_precio:precio,p_aplica:!na,p_tipo_unidad_id:u.id}));
   }
   ops.push(sb().rpc('cc_matriz_behavior_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_cobra_cliente:tr.querySelector('[data-cobra]').checked,p_comisiona_operador:tr.querySelector('[data-comisiona]').checked}));
  }
  btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
  try{
   const rs=await Promise.all(ops);const err=rs.find(x=>x.error);if(err)throw err.error;
   btn.innerHTML='<i class="fa-solid fa-check"></i> Guardado';setTimeout(()=>{btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';},1200);await load();
  }catch(e){alert('No se pudo guardar la matriz.\n'+(e.message||e));btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar cambios'}
 }
 window.ccMatrizCobroCargar=load;window.ccMatrizGuardarTodo=saveAll;
 function wire(){const sel=document.getElementById('ccMatrizCliente'),ref=document.getElementById('ccMatrizRefresh'),save=document.getElementById('ccMatrizSaveAll');if(sel)sel.onchange=render;if(ref)ref.onclick=load;if(save)save.onclick=saveAll}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();