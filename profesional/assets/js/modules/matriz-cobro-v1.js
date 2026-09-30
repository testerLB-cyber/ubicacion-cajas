/* Tráfico App · Matriz de precios por cliente + tipo de unidad */
(function(){
 if(window.__CC_MATRIZ_COBRO_V3__)return;window.__CC_MATRIZ_COBRO_V3__=true;
 const sb=()=>window.gmSupabase,esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let D={clientes:[],servicios:[],tiposUnidad:[],precios:[]};
 const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));
 const key=(a,b)=>String(a)+'|'+String(b||'');
 function sameService(x,cid,s){return String(x.clienteId)===String(cid)&&key(x.tipoViajeId,x.clasificacionId)===key(s.tipoViajeId,s.clasificacionId)}
 function priceExact(cid,s,uid){return D.precios.find(x=>sameService(x,cid,s)&&String(x.tipoUnidadId||'')===String(uid||''))}
 function priceGeneral(cid,s){return D.precios.find(x=>sameService(x,cid,s)&&!x.tipoUnidadId)}
 function behavior(cid,s){return D.precios.find(x=>sameService(x,cid,s)&&!x.tipoUnidadId&&(x.cobraCliente!=null||x.comisionaOperador!=null))||D.precios.find(x=>sameService(x,cid,s)&&(x.cobraCliente!=null||x.comisionaOperador!=null))}
 async function load(){
  const body=document.getElementById('ccMatrizBody'),sel=document.getElementById('ccMatrizCliente');if(!body||!sel)return;
  if(!sb()){body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px">Conectando con Supabase…</td></tr>';return setTimeout(load,500)}
  body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px">Cargando matriz…</td></tr>';
  try{
   const r=await sb().rpc('cc_matriz_cobro_list');if(r.error)throw r.error;
   D=Object.assign({clientes:[],servicios:[],tiposUnidad:[],precios:[]},r.data||{});
   const old=sel.value;
   sel.innerHTML='<option value="">Selecciona un cliente</option>'+D.clientes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   if(D.clientes.some(x=>String(x.id)===String(old)))sel.value=old;
   render();
  }catch(e){console.error(e);body.innerHTML='<tr><td colspan="8" style="padding:24px;text-align:center;color:#b91c1c">No se pudo cargar: '+esc(e.message||e)+'</td></tr>'}
 }
 function render(){
  const cid=document.getElementById('ccMatrizCliente')?.value,body=document.getElementById('ccMatrizBody'),sum=document.getElementById('ccMatrizResumen');if(!body)return;
  if(!cid){body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:28px;color:#64748b">Selecciona un cliente arriba para mostrar su matriz completa.</td></tr>';if(sum)sum.textContent='';return}
  const units=(D.tiposUnidad||[]).filter(x=>String(x.categoria||'CARRO').toUpperCase()==='CARRO');
  if(!units.length){body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:28px;color:#b45309">No hay tipos de unidad CARRO activos en Configuración → Tipos de unidad.</td></tr>';if(sum)sum.textContent='';return}
  const rows=[];
  (D.servicios||[]).forEach((s,si)=>units.forEach((u,ui)=>rows.push({s,u,si,ui})));
  let specific=0,inherited=0,na=0;
  body.innerHTML=rows.map((r,i)=>{
   const s=r.s,u=r.u,px=priceExact(cid,s,u.id),gen=priceGeneral(cid,s),p=px||gen,aplica=p?.aplica!==false;
   if(px&&aplica)specific++;else if(!px&&gen)inherited++;
   if(p&&!aplica)na++;
   const beh=behavior(cid,s),cobra=beh?.cobraCliente??s.cobraClienteDefault??true,comisiona=beh?.comisionaOperador??s.comisionaOperadorDefault??true;
   const suf=s.clasificacionManual?(String(s.tipoViaje||'').toUpperCase()==='RESGUARDO'?' / DÍA':' / HORA'):'';
   const inheritedNote=!px&&gen?'<div style="font-size:9px;color:#b45309;margin-top:3px;font-weight:800">Tarifa general heredada</div>':'';
   return '<tr data-row="'+i+'"><td><strong>'+esc(s.tipoViaje)+'</strong></td><td>'+esc(s.clasificacion||'Sin clasificación')+'</td><td><span class="cc-badge" style="white-space:nowrap">'+esc(u.nombre)+'</span></td><td><div style="display:flex;align-items:center;gap:6px"><span>$</span><input type="number" min="0" step="0.01" data-price value="'+(p&&aplica?Number(p.precio).toFixed(2):'')+'" placeholder="0.00" '+(!aplica?'disabled':'')+' style="width:145px">'+(suf?'<b style="font-size:9px;color:#64748b">'+suf+'</b>':'')+'</div>'+inheritedNote+'</td><td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800"><input type="checkbox" data-na '+(!aplica?'checked':'')+'> N/A</label></td><td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800"><input type="checkbox" data-cobra '+(cobra?'checked':'')+' '+(canEdit()?'':'disabled')+'> Sí</label></td><td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800"><input type="checkbox" data-comisiona '+(comisiona?'checked':'')+' '+(canEdit()?'':'disabled')+'> Sí</label></td><td><button type="button" class="cc-btn cc-btn-primary" data-save="'+i+'" '+(canEdit()?'':'disabled')+'>Guardar</button></td></tr>';
  }).join('');
  if(sum)sum.textContent=D.servicios.length+' servicios × '+units.length+' tipos de unidad = '+rows.length+' combinaciones · '+specific+' tarifas específicas · '+inherited+' usando tarifa general · '+na+' N/A';
  body.querySelectorAll('tr[data-row]').forEach(tr=>{
   const naEl=tr.querySelector('[data-na]'),inp=tr.querySelector('[data-price]');
   naEl.onchange=()=>{inp.disabled=naEl.checked;if(naEl.checked)inp.value=''};
   tr.querySelector('[data-save]').onclick=()=>save(tr,rows[Number(tr.dataset.row)]);
  });
 }
 async function save(tr,row){
  if(!canEdit())return alert('Sin permiso para editar Configuración.');
  const s=row.s,u=row.u,cid=document.getElementById('ccMatrizCliente').value,na=tr.querySelector('[data-na]').checked,inp=tr.querySelector('[data-price]'),precio=na?0:Number(inp.value),b=tr.querySelector('[data-save]');
  if(!na&&(inp.value===''||!Number.isFinite(precio)||precio<0))return alert('Captura el total o marca N/A.');
  const cobra=tr.querySelector('[data-cobra]').checked,comisiona=tr.querySelector('[data-comisiona]').checked;
  b.disabled=true;b.textContent='Guardando…';
  try{
   const r=await sb().rpc('cc_matriz_cobro_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_precio:precio,p_aplica:!na,p_tipo_unidad_id:u.id});
   if(r.error)throw r.error;
   const rb=await sb().rpc('cc_matriz_behavior_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_cobra_cliente:cobra,p_comisiona_operador:comisiona});
   if(rb.error)throw rb.error;
   b.textContent='Guardado ✓';await load();
  }catch(e){alert('No se pudo guardar.\n'+(e.message||e));b.disabled=false;b.textContent='Guardar'}
 }
 window.ccMatrizCobroCargar=load;
 function wire(){
  const sel=document.getElementById('ccMatrizCliente'),ref=document.getElementById('ccMatrizRefresh');
  if(sel)sel.onchange=render;if(ref)ref.onclick=load;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();