/* Tráfico App · Matriz de precios por cliente */
(function(){
 if(window.__CC_MATRIZ_COBRO_V2__)return;window.__CC_MATRIZ_COBRO_V2__=true;
 const sb=()=>window.gmSupabase,esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let D={clientes:[],servicios:[],precios:[]};
 const canEdit=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('configuracion.editar'));
 const key=(a,b)=>String(a)+'|'+String(b||'');
 function price(cid,s){return D.precios.find(x=>String(x.clienteId)===String(cid)&&key(x.tipoViajeId,x.clasificacionId)===key(s.tipoViajeId,s.clasificacionId))}
 async function load(){
  const body=document.getElementById('ccMatrizBody'),sel=document.getElementById('ccMatrizCliente');if(!body||!sel)return;
  if(!sb()){body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px">Conectando con Supabase…</td></tr>';return setTimeout(load,500)}
  body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px">Cargando matriz…</td></tr>';
  try{const r=await sb().rpc('cc_matriz_cobro_list');if(r.error)throw r.error;D=r.data||D;const old=sel.value;sel.innerHTML='<option value="">Selecciona un cliente</option>'+D.clientes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');if(D.clientes.some(x=>String(x.id)===String(old)))sel.value=old;render()}catch(e){console.error(e);body.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center;color:#b91c1c">No se pudo cargar: '+esc(e.message||e)+'</td></tr>'}
 }
 function render(){
  const cid=document.getElementById('ccMatrizCliente')?.value,body=document.getElementById('ccMatrizBody'),sum=document.getElementById('ccMatrizResumen');if(!body)return;
  if(!cid){body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:28px;color:#64748b">Selecciona un cliente arriba para mostrar su matriz completa.</td></tr>';if(sum)sum.textContent='';return}
  let configured=0,na=0;
  body.innerHTML=D.servicios.map((s,i)=>{const p=price(cid,s),aplica=p?.aplica!==false;if(p&&aplica)configured++;if(p&&!aplica)na++;const cobra=p?.cobraCliente??s.cobraClienteDefault??true,comisiona=p?.comisionaOperador??s.comisionaOperadorDefault??true;const suf=s.clasificacionManual?(String(s.tipoViaje||'').toUpperCase()==='RESGUARDO'?' / DÍA':' / HORA'):'';return '<tr data-row="'+i+'"><td><strong>'+esc(s.tipoViaje)+'</strong></td><td>'+esc(s.clasificacion||'Sin clasificación')+'</td><td><div style="display:flex;align-items:center;gap:6px"><span>$</span><input type="number" min="0" step="0.01" data-price value="'+(p&&aplica?Number(p.precio).toFixed(2):'')+'" placeholder="0.00" '+(!aplica?'disabled':'')+' style="width:145px">'+(suf?'<b style="font-size:9px;color:#64748b">'+suf+'</b>':'')+'</div></td><td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800"><input type="checkbox" data-na '+(!aplica?'checked':'')+'> N/A</label></td><td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800"><input type="checkbox" data-cobra '+(cobra?'checked':'')+' '+(canEdit()?'':'disabled')+'> Sí</label></td><td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800"><input type="checkbox" data-comisiona '+(comisiona?'checked':'')+' '+(canEdit()?'':'disabled')+'> Sí</label></td><td><button type="button" class="cc-btn cc-btn-primary" data-save="'+i+'" '+(canEdit()?'':'disabled')+'>Guardar</button></td></tr>'}).join('');
  if(sum)sum.textContent=D.servicios.length+' combinaciones precargadas · '+configured+' con precio · '+na+' marcadas N/A';
  body.querySelectorAll('tr[data-row]').forEach(tr=>{const na=tr.querySelector('[data-na]'),inp=tr.querySelector('[data-price]');na.onchange=()=>{inp.disabled=na.checked;if(na.checked)inp.value=''};tr.querySelector('[data-save]').onclick=()=>save(tr)});
 }
 async function save(tr){
  if(!canEdit())return alert('Sin permiso para editar Configuración.');
  const i=Number(tr.dataset.row),s=D.servicios[i],cid=document.getElementById('ccMatrizCliente').value,na=tr.querySelector('[data-na]').checked,inp=tr.querySelector('[data-price]'),precio=na?0:Number(inp.value),b=tr.querySelector('[data-save]');
  if(!na&&(inp.value===''||!Number.isFinite(precio)||precio<0))return alert('Captura el total o marca N/A.');const cobra=tr.querySelector('[data-cobra]').checked,comisiona=tr.querySelector('[data-comisiona]').checked;
  b.disabled=true;b.textContent='Guardando…';
  try{const r=await sb().rpc('cc_matriz_cobro_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_precio:precio,p_aplica:!na});if(r.error)throw r.error;const rb=await sb().rpc('cc_matriz_behavior_save',{p_cliente_id:cid,p_tipo_viaje_id:s.tipoViajeId,p_clasificacion_id:s.clasificacionId||null,p_cobra_cliente:cobra,p_comisiona_operador:comisiona});if(rb.error)throw rb.error;b.textContent='Guardado ✓';await load()}catch(e){alert('No se pudo guardar.\n'+(e.message||e));b.disabled=false;b.textContent='Guardar'}
 }
 window.ccMatrizCobroCargar=load;
 function wire(){const sel=document.getElementById('ccMatrizCliente'),ref=document.getElementById('ccMatrizRefresh');if(sel)sel.onchange=render;if(ref)ref.onclick=load}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();