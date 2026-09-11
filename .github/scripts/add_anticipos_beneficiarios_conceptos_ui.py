from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Beneficiarios por concepto v1 */'
if marker in s:
    print('beneficiarios por concepto ya aplicado'); raise SystemExit(0)
js=r'''

/* Tráfico App Profesional · Beneficiarios por concepto v1 */
(function(){
 if(window.__ccAntBenefConceptV1)return;window.__ccAntBenefConceptV1=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
 let cache={base:null,extra:null}, originalNew=null;
 const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
 async function load(){const [a,b]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);if(a.error)throw a.error;if(b.error)throw b.error;cache={base:a.data||{},extra:b.data||{}};return cache;}
 function modal(title,html,onSubmit,submit='Guardar'){
  const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:100180;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="background:#fff;width:min(980px,98vw);max-height:94vh;overflow:auto;border-radius:18px;box-shadow:0 28px 80px #0f172a66"><div style="background:#0f172a;color:#fff;padding:16px 18px;display:flex;justify-content:space-between;align-items:center"><div><strong>'+esc(title)+'</strong><div style="font-size:10px;color:#cbd5e1;margin-top:3px">Control de Anticipos</div></div><button type="button" data-x style="border:0;background:none;color:white;font-size:23px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" data-cancel class="cc-btn cc-btn-light">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">'+esc(submit)+'</button></div></form></div>';
  document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
  ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget),e.currentTarget);close();await window.ccAntLoad?.(true);await refresh()}catch(err){alert(err.message||err);b.disabled=false}};
  return ov;
 }
 function renameLabels(){
  const root=document.getElementById('ccAnticiposPanel')||document;
  root.querySelectorAll('label,strong,th,button,option,.cc-note,small').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(t==='Responsables')el.textContent='Beneficiarios';
    else if(t==='Responsable')el.textContent='Beneficiario';
    else if(t.includes('responsables (caja chica)'))el.textContent=t.replace('responsables (caja chica)','beneficiarios');
    else if(t.includes('Responsables / caja chica'))el.textContent=t.replace('Responsables / caja chica','Beneficiarios');
  });
 }
 function beneficiaryCatalogCard(){
  const view=document.getElementById('ccAntViewCatalogos');if(!view)return;
  let card=document.getElementById('ccAntBenefConceptCard');
  if(!card){card=document.createElement('div');card.id='ccAntBenefConceptCard';card.className='cc-config-card';card.style='margin-top:14px';view.appendChild(card);}
  const xs=cache.extra?.conceptosBeneficiario||[];
  card.innerHTML='<div class="cc-toolbar"><div><strong>Conceptos de anticipos a beneficiarios</strong><div class="cc-note">Cada concepto puede tener un monto sugerido. Si se deja vacío, el monto se captura al generar el anticipo.</div></div><button class="cc-btn cc-btn-primary" data-new>Nuevo concepto</button></div><div class="cc-inv-wrap" style="max-height:300px"><table class="cc-ant-table"><thead><tr><th>CONCEPTO</th><th>MONTO DEFAULT</th><th>COMPROBANTE</th><th>ESTATUS</th><th></th></tr></thead><tbody>'+(xs.length?xs.map(x=>'<tr><td><strong>'+esc(x.nombre)+'</strong></td><td>'+(x.montoDefault==null?'<span style="color:#64748b">Captura manual</span>':money(x.montoDefault))+'</td><td>'+(x.requiereComprobante?'Sí':'No')+'</td><td>'+esc(x.estatus||'ACTIVO')+'</td><td><button class="cc-btn cc-btn-light" data-edit="'+esc(x.id)+'">Editar</button></td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Sin conceptos para beneficiarios.</td></tr>')+'</tbody></table></div>';
  card.querySelector('[data-new]').onclick=()=>conceptForm();
  card.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>conceptForm(xs.find(x=>x.id===b.dataset.edit)||{}));
 }
 function conceptForm(x={}){
  modal(x.id?'Editar concepto de beneficiario':'Nuevo concepto de beneficiario','<div class="cc-grid"><div class="cc-field"><label>Concepto *</label><input name="nombre" required value="'+esc(x.nombre||'')+'" placeholder="Ej. Viáticos, casetas, hospedaje..."></div><div class="cc-field"><label>Monto default</label><input name="monto" type="number" min="0" step="0.01" value="'+(x.montoDefault==null?'':Number(x.montoDefault))+'" placeholder="Vacío = captura manual"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div><div class="cc-field" style="display:flex;align-items:end"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="comp" '+(x.requiereComprobante!==false?'checked':'')+'> Requiere comprobante</label></div></div>',async fd=>{const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CONCEPTO_BENEFICIARIO',p_item:{id:x.id||'',nombre:String(fd.get('nombre')||''),montoDefault:String(fd.get('monto')||''),estatus:String(fd.get('estatus')||'ACTIVO'),requiereComprobante:!!fd.get('comp')}});if(r.error)throw r.error;});
 }
 function chooseType(){
  const ov=modal('Nuevo anticipo','<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"><button type="button" class="cc-config-card" data-type="OP" style="text-align:left;cursor:pointer;border:2px solid #dbeafe"><strong style="font-size:16px">Operador</strong><div class="cc-note" style="margin-top:6px">Anticipo por destino, unidad y conceptos operativos.</div></button><button type="button" class="cc-config-card" data-type="BEN" style="text-align:left;cursor:pointer;border:2px solid #ddd6fe"><strong style="font-size:16px">Beneficiario</strong><div class="cc-note" style="margin-top:6px">Anticipo por conceptos. Sin unidad y sin destino.</div></button></div>',async()=>{},'');
  const form=ov.querySelector('form');form.querySelector('[type=submit]')?.remove();
  ov.querySelector('[data-type="OP"]').onclick=()=>{ov.remove(); if(originalNew){originalNew();setTimeout(()=>{const sel=document.getElementById('ccCBenefType');if(sel){sel.value='OPERADOR';sel.disabled=true;sel.dispatchEvent(new Event('change',{bubbles:true}));const resp=sel.querySelector('option[value="RESPONSABLE"]');if(resp)resp.remove();}},250);}};
  ov.querySelector('[data-type="BEN"]').onclick=()=>{ov.remove();beneficiaryAdvance();};
 }
 async function beneficiaryAdvance(){
  await load();const e=cache.extra||{},b=cache.base||{};
  const beneficiaries=active(e.beneficiarios||e.responsables||[]),accounts=active(e.cuentas||[]).filter(q=>q.usoCajaChica),concepts=active(e.conceptosBeneficiario||[]),methods=active(b.metodosDeposito||[]);
  if(!beneficiaries.length)return alert('Primero registra un Beneficiario en Catálogos.');
  if(!accounts.length)return alert('No hay cuentas habilitadas para anticipos a beneficiarios.');
  if(!concepts.length)return alert('Primero registra conceptos de anticipos a beneficiarios.');
  const benOpts=beneficiaries.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre+(x.numero_empleado?' · '+x.numero_empleado:''))+'</option>').join('');
  const accOpts=accounts.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+' · '+money(x.saldo)+'</option>').join('');
  const methodOpts=methods.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
  const conceptOpts='<option value="">Seleccionar concepto…</option>'+concepts.map(x=>'<option value="'+esc(x.id)+'" data-default="'+(x.montoDefault==null?'':esc(x.montoDefault))+'">'+esc(x.nombre)+(x.montoDefault==null?' · monto manual':' · '+money(x.montoDefault))+'</option>').join('');
  const ov=modal('Nuevo anticipo a beneficiario','<div style="padding:11px 13px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;margin-bottom:14px"><strong>Anticipo por conceptos</strong><div class="cc-note">Para beneficiarios no se solicita Unidad ni Destino.</div></div><div class="cc-grid"><div class="cc-field"><label>Cuenta de origen *</label><select name="cuenta" required><option value="">Seleccionar…</option>'+accOpts+'</select></div><div class="cc-field"><label>Beneficiario *</label><select name="beneficiario" required><option value="">Seleccionar…</option>'+benOpts+'</select></div><div class="cc-field"><label>Fecha *</label><input type="date" name="fecha" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="cc-field"><label>Método de depósito</label><select name="metodo"><option value="">Sin método</option>'+methodOpts+'</select></div></div><div style="margin-top:16px"><div class="cc-toolbar"><strong>Conceptos del anticipo</strong><button type="button" class="cc-btn cc-btn-light" data-add>+ Agregar concepto</button></div><div data-rows></div></div><div class="cc-grid" style="margin-top:14px"><div class="cc-field"><label>Monto entregado *</label><input type="number" min="0" step="0.01" name="entregado" required></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="obs"></textarea></div>',async(fd,form)=>{
    const rows=[...form.querySelectorAll('[data-concept-row]')];if(!rows.length)throw new Error('Agrega al menos un concepto.');
    const detalles=rows.map(r=>({conceptoId:r.querySelector('[name=concepto]').value,monto:Number(r.querySelector('[name=monto]').value||0)}));
    if(detalles.some(x=>!x.conceptoId||x.monto<=0))throw new Error('Todos los conceptos deben tener concepto y monto mayor a cero.');
    const total=detalles.reduce((a,x)=>a+x.monto,0),ent=Number(fd.get('entregado')||0);if(ent<0||ent>total)throw new Error('El monto entregado no puede exceder el autorizado.');
    const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:true,responsableId:String(fd.get('beneficiario')||''),cuentaId:String(fd.get('cuenta')||''),fecha:String(fd.get('fecha')||''),metodoDepositoId:String(fd.get('metodo')||''),montoEntregado:ent,referencia:String(fd.get('referencia')||''),observaciones:String(fd.get('obs')||''),detalles}});if(r.error)throw r.error;alert('Anticipo a beneficiario '+(r.data?.folio||'')+' creado.');
  },'Crear anticipo');
  const rows=ov.querySelector('[data-rows]');
  function addRow(){const d=document.createElement('div');d.dataset.conceptRow='1';d.style='display:grid;grid-template-columns:minmax(220px,1fr) 180px auto;gap:8px;align-items:end;margin:8px 0';d.innerHTML='<div class="cc-field"><label>Concepto *</label><select name="concepto" required>'+conceptOpts+'</select></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><button type="button" class="cc-btn cc-btn-light" data-del>Quitar</button>';rows.appendChild(d);const sel=d.querySelector('select'),amt=d.querySelector('[name=monto]');sel.onchange=()=>{const v=sel.selectedOptions[0]?.dataset.default;if(v!==undefined&&v!=='')amt.value=Number(v).toFixed(2);else amt.value='';syncDelivered();};amt.oninput=syncDelivered;d.querySelector('[data-del]').onclick=()=>{d.remove();syncDelivered()};}
  function syncDelivered(){const vals=[...rows.querySelectorAll('[name=monto]')].reduce((a,i)=>a+Number(i.value||0),0);const input=ov.querySelector('[name=entregado]');if(input&&!input.dataset.touched)input.value=vals?vals.toFixed(2):'';}
  const ent=ov.querySelector('[name=entregado]');ent.addEventListener('input',()=>ent.dataset.touched='1');ov.querySelector('[data-add]').onclick=addRow;addRow();
 }
 function patchMainList(){
  const map=new Map((cache.extra?.cajaChica||[]).map(x=>[x.id,x]));const data=window.ccAntFiltered||[];[...document.querySelectorAll('#ccAntBody tr')].forEach((tr,i)=>{const a=data[i],x=a&&map.get(a.id);if(!x)return;const t=tr.querySelectorAll('td');if(t[2])t[2].innerHTML='<strong>'+esc(x.beneficiario||x.responsable||'Beneficiario')+'</strong><div style="font-size:9px;color:#7c3aed;font-weight:800">BENEFICIARIO</div>';if(t[4])t[4].innerHTML='<span class="cc-badge">Por concepto</span>';if(t[5])t[5].textContent='BENEFICIARIO';});
 }
 async function refresh(){try{await load();renameLabels();beneficiaryCatalogCard();patchMainList()}catch(e){console.warn('Beneficiarios por concepto',e)}}
 function install(){originalNew=window.ccAntNuevoAnticipo;window.ccAntNuevoAnticipo=chooseType;renameLabels();refresh();if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__benefConcept){const o=window.ccAntRender,w=function(){const r=o.apply(this,arguments);setTimeout(()=>{renameLabels();patchMainList();},0);return r};w.__benefConcept=true;window.ccAntRender=w;}if(typeof window.ccAntView==='function'&&!window.ccAntView.__benefConcept){const o=window.ccAntView,w=function(v,b){const r=o.apply(this,arguments);if(v==='catalogos')setTimeout(()=>{renameLabels();beneficiaryCatalogCard()},0);return r};w.__benefConcept=true;window.ccAntView=w;}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1200));else setTimeout(install,1200);
})();
'''
s += js
P.write_text(s,encoding='utf-8')
print('Beneficiarios por concepto agregado')
