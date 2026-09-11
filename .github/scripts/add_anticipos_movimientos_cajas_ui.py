from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Movimientos cajas v1 */'
if marker in s:
    print('movimientos cajas ya aplicado'); raise SystemExit(0)
js=r'''

/* Tráfico App Profesional · Movimientos cajas v1 */
(function(){
 if(window.__ccAntMovCajasV1)return; window.__ccAntMovCajasV1=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
 const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
 let C={base:null,extra:null},filters={cuenta:'',tipo:'',desde:'',hasta:'',q:''};
 const inTypes=['DEPOSITO','DEVOLUCION','AJUSTE_ENTRADA'];
 const outTypes=['ANTICIPO','AJUSTE_SALIDA'];
 async function load(){
   const [a,b]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);
   if(a.error)throw a.error;if(b.error)throw b.error;C={base:a.data||{},extra:b.data||{}};return C;
 }
 function modal(title,html,onSubmit,label='Guardar'){
   const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:100300;display:flex;align-items:center;justify-content:center;padding:16px';
   ov.innerHTML='<div style="width:min(760px,97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:18px"><div style="background:#0f172a;color:#fff;padding:16px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">'+esc(label)+'</button></div></form></div>';
   document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
   ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget));close();await load();render()}catch(err){alert(err.message||err);b.disabled=false}};
 }
 function ensureNav(){
   const nav=document.querySelector('.cc-ant-nav');if(!nav)return;
   if(!nav.querySelector('[data-antv="movcajas"]')){
     const b=document.createElement('button');b.className='cc-btn cc-btn-light';b.dataset.antv='movcajas';b.innerHTML='<i class="fa-solid fa-right-left mr-1"></i> Movimientos cajas';
     const cat=nav.querySelector('[data-antv="catalogos"]');if(cat)nav.insertBefore(b,cat);else nav.appendChild(b);
     b.onclick=()=>show();
   }
   if(!document.getElementById('ccAntViewMovcajas')){
     const host=document.getElementById('ccAnticiposPanel')||nav.parentElement; const v=document.createElement('div');v.id='ccAntViewMovcajas';v.className='cc-ant-view';v.style.display='none';host.appendChild(v);
   }
 }
 function movementRows(){
   let rows=(C.base?.movimientos||[]).filter(x=>String(x.estatus||'ACTIVO')==='ACTIVO');
   rows=rows.filter(x=>{const d=String(x.fecha||'').slice(0,10);if(filters.cuenta&&x.cuenta_id!==filters.cuenta)return false;if(filters.tipo&&String(x.tipo||'')!==filters.tipo)return false;if(filters.desde&&d<filters.desde)return false;if(filters.hasta&&d>filters.hasta)return false;if(filters.q&&!String((x.referencia||'')+' '+(x.observaciones||'')+' '+(x.tipo||'')).toLowerCase().includes(filters.q.toLowerCase()))return false;return true});
   return rows.sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')));
 }
 function calcBalance(q){return Number(q.saldoInicial??q.saldo_inicial??0)+Number((C.base?.movimientos||[]).filter(m=>m.cuenta_id===q.id&&m.estatus==='ACTIVO').reduce((s,m)=>s+(inTypes.includes(m.tipo)?Number(m.monto||0):outTypes.includes(m.tipo)?-Number(m.monto||0):0),0));}
 function transfer(){
   const qs=(C.extra?.cuentas||[]).filter(x=>x.estatus==='ACTIVO');if(qs.length<2)return alert('Necesitas al menos dos cuentas activas.');
   const opts=qs.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo??calcBalance(q))+'</option>').join('');
   modal('Movimiento entre cajas / cuentas','<div style="padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:12px"><strong>Traspaso interno</strong><div class="cc-note">El movimiento queda registrado en origen y destino.</div></div><div class="cc-grid"><div class="cc-field"><label>Cuenta origen *</label><select name="origen" required><option value="">Seleccionar…</option>'+opts+'</select></div><div class="cc-field"><label>Cuenta destino *</label><select name="destino" required><option value="">Seleccionar…</option>'+opts+'</select></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Referencia</label><input name="ref"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="obs"></textarea></div>',async fd=>{if(fd.get('origen')===fd.get('destino'))throw new Error('Origen y destino deben ser distintos.');const r=await sb().rpc('cc_ant_transfer_funds',{p_item:{cuentaOrigenId:String(fd.get('origen')),cuentaDestinoId:String(fd.get('destino')),monto:Number(fd.get('monto')||0),referencia:String(fd.get('ref')||''),observaciones:String(fd.get('obs')||'')}});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data?.error||'No se pudo realizar el traspaso');});
 }
 function csv(){
   const rows=movementRows(),qs=new Map((C.extra?.cuentas||[]).map(x=>[x.id,x.nombre]));
   const data=[['Fecha','Cuenta','Tipo','Entrada','Salida','Referencia','Observaciones']].concat(rows.map(x=>[String(x.fecha||'').slice(0,10),qs.get(x.cuenta_id)||'',x.tipo||'',inTypes.includes(x.tipo)?Number(x.monto||0):'',outTypes.includes(x.tipo)?Number(x.monto||0):'',x.referencia||'',x.observaciones||'']));
   const blob=new Blob([data.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='movimientos-cajas-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
 }
 function printReport(){
   const rows=movementRows(),qs=new Map((C.extra?.cuentas||[]).map(x=>[x.id,x.nombre]));let ent=0,sal=0;rows.forEach(x=>{if(inTypes.includes(x.tipo))ent+=Number(x.monto||0);if(outTypes.includes(x.tipo))sal+=Number(x.monto||0)});
   const w=window.open('','_blank');if(!w)return alert('Permite ventanas emergentes para generar el reporte.');w.document.write('<html><head><title>Reporte movimientos cajas</title><style>body{font-family:Arial;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left}.k{display:flex;gap:18px;margin:14px 0}.k div{border:1px solid #ddd;border-radius:8px;padding:10px}</style></head><body><h2>Reporte de movimientos de cajas</h2><div>Generado: '+new Date().toLocaleString('es-MX')+'</div><div class="k"><div>Movimientos<br><b>'+rows.length+'</b></div><div>Entradas<br><b>'+money(ent)+'</b></div><div>Salidas / utilizado<br><b>'+money(sal)+'</b></div><div>Neto<br><b>'+money(ent-sal)+'</b></div></div><table><thead><tr><th>Fecha</th><th>Cuenta</th><th>Tipo</th><th>Entrada</th><th>Salida / utilizado</th><th>Referencia</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+date(x.fecha)+'</td><td>'+esc(qs.get(x.cuenta_id)||'—')+'</td><td>'+esc(x.tipo||'')+'</td><td>'+(inTypes.includes(x.tipo)?money(x.monto):'—')+'</td><td>'+(outTypes.includes(x.tipo)?money(x.monto):'—')+'</td><td>'+esc(x.referencia||'—')+'</td></tr>').join('')+'</tbody></table></body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),250);
 }
 function render(){
   ensureNav();const v=document.getElementById('ccAntViewMovcajas');if(!v)return;const rows=movementRows(),qs=C.extra?.cuentas||[];let ent=0,sal=0;rows.forEach(x=>{if(inTypes.includes(x.tipo))ent+=Number(x.monto||0);if(outTypes.includes(x.tipo))sal+=Number(x.monto||0)});
   const qmap=new Map(qs.map(x=>[x.id,x.nombre]));
   v.innerHTML='<div class="cc-toolbar"><div><strong style="font-size:17px">Movimientos de cajas</strong><div class="cc-note">Consulta todo lo que entró, salió, se utilizó y los traspasos entre cuentas.</div></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="cc-btn cc-btn-primary" data-transfer><i class="fa-solid fa-right-left mr-1"></i> Movimiento entre cajas</button><button class="cc-btn cc-btn-light" data-print>Reporte</button><button class="cc-btn cc-btn-light" data-csv>Exportar CSV</button></div></div><div class="cc-ant-kpis"><div class="cc-ant-kpi"><small>Movimientos</small><strong>'+rows.length+'</strong></div><div class="cc-ant-kpi"><small>Entradas</small><strong>'+money(ent)+'</strong></div><div class="cc-ant-kpi"><small>Salidas / utilizado</small><strong>'+money(sal)+'</strong></div><div class="cc-ant-kpi"><small>Neto</small><strong>'+money(ent-sal)+'</strong></div></div><div class="cc-config-card" style="margin-top:12px"><div class="cc-grid"><div class="cc-field"><label>Cuenta</label><select data-f="cuenta"><option value="">Todas</option>'+qs.filter(x=>x.estatus==='ACTIVO').map(x=>'<option value="'+esc(x.id)+'" '+(filters.cuenta===x.id?'selected':'')+'>'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Tipo</label><select data-f="tipo"><option value="">Todos</option>'+[...new Set((C.base?.movimientos||[]).map(x=>x.tipo).filter(Boolean))].sort().map(x=>'<option '+(filters.tipo===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div><div class="cc-field"><label>Desde</label><input type="date" data-f="desde" value="'+esc(filters.desde)+'"></div><div class="cc-field"><label>Hasta</label><input type="date" data-f="hasta" value="'+esc(filters.hasta)+'"></div><div class="cc-field"><label>Buscar</label><input data-f="q" value="'+esc(filters.q)+'" placeholder="Referencia, observación, tipo..."></div></div></div><div class="cc-inv-wrap" style="margin-top:12px;max-height:520px"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>CUENTA</th><th>TIPO</th><th>ENTRADA</th><th>SALIDA / UTILIZADO</th><th>REFERENCIA</th><th>OBSERVACIONES</th></tr></thead><tbody>'+(rows.length?rows.map(x=>'<tr><td>'+date(x.fecha)+'</td><td><strong>'+esc(qmap.get(x.cuenta_id)||'—')+'</strong></td><td>'+esc(x.tipo||'—')+'</td><td>'+(inTypes.includes(x.tipo)?money(x.monto):'—')+'</td><td>'+(outTypes.includes(x.tipo)?money(x.monto):'—')+'</td><td>'+esc(x.referencia||'—')+'</td><td>'+esc(x.observaciones||'—')+'</td></tr>').join(''):'<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8">Sin movimientos con estos filtros.</td></tr>')+'</tbody></table></div>';
   v.querySelector('[data-transfer]').onclick=transfer;v.querySelector('[data-print]').onclick=printReport;v.querySelector('[data-csv]').onclick=csv;v.querySelectorAll('[data-f]').forEach(el=>el.onchange=el.oninput=()=>{filters[el.dataset.f]=el.value;render()});
 }
 async function show(){
   try{await load();document.querySelectorAll('[id^="ccAntView"]').forEach(x=>x.style.display='none');document.getElementById('ccAntViewMovcajas').style.display='';document.querySelectorAll('.cc-ant-nav [data-antv]').forEach(x=>x.classList.remove('cc-btn-primary'));document.querySelector('.cc-ant-nav [data-antv="movcajas"]')?.classList.add('cc-btn-primary');render()}catch(e){alert(e.message||e)}
 }
 function install(){ensureNav();const old=window.ccAntView;if(typeof old==='function'&&!old.__movCajas){const w=function(v,b){if(v==='movcajas')return show();const r=old.apply(this,arguments);document.getElementById('ccAntViewMovcajas')&&(document.getElementById('ccAntViewMovcajas').style.display='none');return r};w.__movCajas=true;window.ccAntView=w;}load().then(render).catch(()=>{});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1200));else setTimeout(install,1200);
})();
'''
s+=js
P.write_text(s,encoding='utf-8')
print('Movimientos cajas agregado')
