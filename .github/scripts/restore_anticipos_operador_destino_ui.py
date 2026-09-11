from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists(): raise SystemExit('No existe anticipos-profesional-flow.js')
s=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Restaurar operador por destino v1 */'
if marker in s:
    print('restauración operador ya aplicada'); raise SystemExit(0)
js=r'''

/* Tráfico App Profesional · Restaurar operador por destino v1 */
(function(){
 if(window.__ccAntOperatorDestinationRestoreV1)return;window.__ccAntOperatorDestinationRestoreV1=true;
 const sb=()=>window.gmSupabase;
 const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
 const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
 let previousNew=null,D=null;
 async function load(){const r=await sb().rpc('cc_ant_list');if(r.error)throw r.error;D=r.data||{};return D;}
 function modal(title,html,onSubmit,submit='Guardar'){
   const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:100220;display:flex;align-items:center;justify-content:center;padding:16px';
   ov.innerHTML='<div style="background:#fff;width:min(1050px,98vw);max-height:94vh;overflow:auto;border-radius:18px;box-shadow:0 28px 80px #0f172a66"><div style="background:#0f172a;color:#fff;padding:16px 18px;display:flex;justify-content:space-between;align-items:center"><div><strong>'+esc(title)+'</strong><div style="font-size:10px;color:#cbd5e1;margin-top:3px">Control de Anticipos</div></div><button type="button" data-x style="border:0;background:none;color:#fff;font-size:23px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button>'+(submit?'<button type="submit" class="cc-btn cc-btn-primary">'+esc(submit)+'</button>':'')+'</div></form></div>';
   document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
   if(submit)ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget),e.currentTarget);close();await window.ccAntLoad?.(true)}catch(err){alert(err.message||err);b.disabled=false}};
   return ov;
 }
 function openBeneficiaryViaPrevious(){
   if(!previousNew)return alert('No se encontró el flujo de Beneficiario.');
   previousNew();
   setTimeout(()=>{
     const candidates=[...document.querySelectorAll('[data-type="BEN"]')];
     const b=candidates[candidates.length-1];
     if(b)b.click();else alert('No se pudo abrir el formulario de Beneficiario.');
   },60);
 }
 function chooseType(){
   const ov=modal('Nuevo anticipo','<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px"><button type="button" class="cc-config-card" data-op style="text-align:left;cursor:pointer;border:2px solid #bfdbfe;background:#eff6ff"><strong style="font-size:17px">Operador</strong><div class="cc-note" style="margin-top:6px">Conserva el flujo original: Unidad + Destino + Tipo, cargando automáticamente los conceptos configurados por destino.</div></button><button type="button" class="cc-config-card" data-ben style="text-align:left;cursor:pointer;border:2px solid #ddd6fe;background:#f5f3ff"><strong style="font-size:17px">Beneficiario</strong><div class="cc-note" style="margin-top:6px">Sin Unidad y sin Destino. Usa exclusivamente conceptos del catálogo de Beneficiarios.</div></button></div>',async()=>{},'');
   ov.querySelector('[data-op]').onclick=()=>{ov.remove();operatorAdvance()};
   ov.querySelector('[data-ben]').onclick=()=>{ov.remove();openBeneficiaryViaPrevious()};
 }
 async function operatorAdvance(){
   await load();
   const ops=active(D.operadores||[]),units=D.unidadesCarro||[],dests=active(D.destinos||[]),types=active(D.tiposUnidadAnticipos||[]),methods=active(D.metodosDeposito||[]),accounts=active(D.cuentas||[]).filter(q=>q.uso_operadores!==false&&q.usoOperadores!==false),concepts=active(D.conceptos||[]).filter(c=>String(c.ambito||'OPERADOR').toUpperCase()!=='BENEFICIARIO');
   if(!ops.length)return alert('No hay operadores activos.');
   if(!units.length)return alert('No hay unidades tipo Carro disponibles en catálogo.');
   if(!dests.length)return alert('No hay destinos activos configurados.');
   if(!types.length)return alert('No hay tipos de anticipo activos configurados.');
   if(!accounts.length)return alert('No hay cuentas habilitadas para anticipos a operadores.');
   const opOpts=ops.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre+(x.numero_empleado?' · '+x.numero_empleado:''))+'</option>').join('');
   const unitOpts=units.map(x=>'<option value="'+esc(x.id)+'">'+esc((x.numero||'')+(x.descripcion?' · '+x.descripcion:''))+'</option>').join('');
   const destOpts=dests.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   const typeOpts=types.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   const methodOpts=methods.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   const accOpts=accounts.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');
   const ov=modal('Nuevo anticipo a operador','<div style="padding:11px 13px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:14px"><strong>Flujo por destino</strong><div class="cc-note">Al seleccionar Destino y Tipo de anticipo se cargan automáticamente los conceptos configurados para esa combinación.</div></div><div class="cc-grid"><div class="cc-field"><label>Cuenta de origen *</label><select name="cuenta" required><option value="">Seleccionar…</option>'+accOpts+'</select></div><div class="cc-field"><label>Operador *</label><select name="operador" required><option value="">Seleccionar…</option>'+opOpts+'</select></div><div class="cc-field"><label>Unidad *</label><select name="unidad" required><option value="">Seleccionar…</option>'+unitOpts+'</select></div><div class="cc-field"><label>Destino *</label><select name="destino" data-dest required><option value="">Seleccionar…</option>'+destOpts+'</select></div><div class="cc-field"><label>Tipo de anticipo *</label><select name="tipoUnidad" data-type required><option value="">Seleccionar…</option>'+typeOpts+'</select></div><div class="cc-field"><label>Método de depósito</label><select name="metodo"><option value="">Sin método</option>'+methodOpts+'</select></div><div class="cc-field"><label>Fecha *</label><input type="date" name="fecha" value="'+new Date().toISOString().slice(0,10)+'" required></div><div class="cc-field"><label>Viaje</label><input name="viaje"></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-config-card" style="margin-top:14px"><div class="cc-toolbar"><div><strong>Conceptos del destino</strong><div class="cc-note">Se cargan desde la configuración existente del Destino.</div></div><span data-total style="font-weight:900;font-size:16px">$0.00</span></div><div data-concepts></div></div><div class="cc-grid" style="margin-top:14px"><div class="cc-field"><label>Monto entregado *</label><input type="number" min="0" step="0.01" name="entregado" required></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="obs"></textarea></div>',async(fd,form)=>{
      const rows=[...form.querySelectorAll('[data-auto-row]')];if(!rows.length)throw new Error('El Destino y Tipo seleccionados no tienen conceptos configurados.');
      const detalles=rows.map(r=>({conceptoId:r.dataset.conceptId,monto:Number(r.querySelector('[name=monto]').value||0)}));
      if(detalles.some(x=>!x.conceptoId||x.monto<0))throw new Error('Revisa los montos de los conceptos.');
      const total=detalles.reduce((a,x)=>a+x.monto,0);if(total<=0)throw new Error('El anticipo debe tener un monto mayor a cero.');
      const ent=Number(fd.get('entregado')||0);if(ent<0||ent>total)throw new Error('El monto entregado no puede exceder el autorizado.');
      const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:false,operadorId:String(fd.get('operador')||''),unidadId:String(fd.get('unidad')||''),destinoId:String(fd.get('destino')||''),tipoUnidadAnticipoId:String(fd.get('tipoUnidad')||''),cuentaId:String(fd.get('cuenta')||''),metodoDepositoId:String(fd.get('metodo')||''),fecha:String(fd.get('fecha')||''),viaje:String(fd.get('viaje')||''),referencia:String(fd.get('referencia')||''),montoEntregado:ent,observaciones:String(fd.get('obs')||''),detalles}});if(r.error)throw r.error;alert('Anticipo '+(r.data?.folio||'')+' creado.');
   },'Crear anticipo');
   const box=ov.querySelector('[data-concepts]'),totalEl=ov.querySelector('[data-total]'),ent=ov.querySelector('[name=entregado]');
   function syncTotal(){const total=[...box.querySelectorAll('[name=monto]')].reduce((a,i)=>a+Number(i.value||0),0);totalEl.textContent=money(total);if(!ent.dataset.touched)ent.value=total?total.toFixed(2):'';}
   ent.addEventListener('input',()=>ent.dataset.touched='1');
   function renderConcepts(){
      const dest=ov.querySelector('[data-dest]').value,type=ov.querySelector('[data-type]').value;
      if(!dest||!type){box.innerHTML='<div class="cc-note" style="padding:14px;text-align:center">Selecciona Destino y Tipo de anticipo.</div>';syncTotal();return;}
      const mapped=(D.destinoConceptos||[]).filter(x=>x.destinoId===dest&&x.tipoUnidadAnticipoId===type&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO'&&x.esDefault!==false);
      if(!mapped.length){box.innerHTML='<div style="padding:14px;border:1px dashed #f59e0b;border-radius:10px;color:#92400e;background:#fffbeb">No hay conceptos default configurados para este Destino y Tipo de anticipo.</div>';syncTotal();return;}
      box.innerHTML=mapped.map(x=>{const c=concepts.find(z=>z.id===x.conceptoId);return '<div data-auto-row data-concept-id="'+esc(x.conceptoId)+'" style="display:grid;grid-template-columns:minmax(240px,1fr) 180px;gap:10px;align-items:end;padding:9px 0;border-bottom:1px solid #e2e8f0"><div><strong>'+esc(c?.nombre||x.concepto||'Concepto')+'</strong><div class="cc-note">Configurado por destino</div></div><div class="cc-field"><label>Monto</label><input name="monto" type="number" min="0" step="0.01" value="'+Number(x.monto||0).toFixed(2)+'"></div></div>'}).join('');
      box.querySelectorAll('[name=monto]').forEach(i=>i.addEventListener('input',syncTotal));syncTotal();
   }
   ov.querySelector('[data-dest]').addEventListener('change',renderConcepts);ov.querySelector('[data-type]').addEventListener('change',renderConcepts);renderConcepts();
 }
 function install(){previousNew=window.ccAntNuevoAnticipo;window.ccAntNuevoAnticipo=chooseType;}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1400));else setTimeout(install,1400);
})();
'''
s+=js
P.write_text(s,encoding='utf-8')
print('Restauración de anticipos a operador aplicada')
