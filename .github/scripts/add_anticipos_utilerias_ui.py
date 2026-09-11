from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists():
    raise SystemExit('No existe anticipos-profesional-flow.js')

extra=r'''

/* Tráfico App Profesional · Utilerías de carga histórica de anticipos */
(function(){
  if(window.__ccAntUtileriasV1)return;
  window.__ccAntUtileriasV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const fmt=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  let state={base:{},extra:{},hist:[]};
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');

  async function load(){
    const [a,b,c]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list'),sb().rpc('cc_ant_util_list')]);
    if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
    state={base:a.data||{},extra:b.data||{},hist:c.data?.registros||[]};
    return state;
  }

  function modal(title,body,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100080;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(980px,98vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+body+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget),e.currentTarget);close();await window.ccAntLoad?.(true);await refresh()}catch(err){alert(err.message||err);b.disabled=false}};
    return ov;
  }

  function commonData(){
    const cuentas=active(state.extra?.cuentas||state.base?.cuentas||[]),ops=active(state.base?.operadores||[]),resps=active(state.extra?.responsables||[]),dests=active(state.base?.destinos||[]),methods=active(state.base?.metodosDeposito||[]),units=state.base?.unidadesCarro||[],types=active(state.base?.tiposUnidadAnticipos||[]);
    return {cuentas,ops,resps,dests,methods,units,types};
  }
  const opt=(xs,label)=>xs.map(x=>'<option value="'+esc(x.id)+'">'+esc(label(x))+'</option>').join('');

  async function saveOne(modo,fd){
    const tipo=String(fd.get('tipoBeneficiario')||'OPERADOR');
    const item={modo,tipoBeneficiario:tipo,cuentaId:String(fd.get('cuentaId')||''),operadorId:tipo==='OPERADOR'?String(fd.get('beneficiarioId')||''):'',responsableId:tipo==='RESPONSABLE'?String(fd.get('beneficiarioId')||''):'',monto:Number(fd.get('monto')||0),fecha:new Date(String(fd.get('fecha'))+'T12:00:00').toISOString(),referencia:String(fd.get('referencia')||''),observaciones:String(fd.get('observaciones')||''),viaje:String(fd.get('viaje')||''),unidadId:String(fd.get('unidadId')||''),destinoId:String(fd.get('destinoId')||''),metodoDepositoId:String(fd.get('metodoDepositoId')||''),tipoUnidadAnticipoId:String(fd.get('tipoUnidadAnticipoId')||'')};
    const r=await sb().rpc('cc_ant_util_import',{p_item:item});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo cargar');
  }

  function beneficiaryScript(ov){
    const type=ov.querySelector('[name=tipoBeneficiario]'),sel=ov.querySelector('[name=beneficiarioId]');
    if(!type||!sel)return;const {ops,resps}=commonData();
    const fill=()=>{const xs=type.value==='RESPONSABLE'?resps:ops;sel.innerHTML='<option value="">Seleccionar</option>'+opt(xs,x=>x.nombre+(x.numero_empleado?' · '+x.numero_empleado:''));};
    type.onchange=fill;fill();
  }

  function saldoPersona(){
    const d=commonData();
    const ov=modal('Saldo inicial por comprobar por persona','<div class="cc-config-alert" style="margin-bottom:12px"><strong>No modifica el saldo de la cuenta.</strong> Registra únicamente el importe que ya había sido entregado antes de usar el sistema y sigue pendiente de comprobar.</div><div class="cc-grid"><div class="cc-field"><label>Cuenta *</label><select name="cuentaId" required><option value="">Seleccionar</option>'+opt(d.cuentas,x=>x.nombre)+'</select></div><div class="cc-field"><label>Tipo de persona *</label><select name="tipoBeneficiario"><option value="OPERADOR">Operador</option><option value="RESPONSABLE">Responsable</option></select></div><div class="cc-field"><label>Persona *</label><select name="beneficiarioId" required></select></div><div class="cc-field"><label>Monto pendiente *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Fecha de corte *</label><input name="fecha" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="cc-field"><label>Referencia</label><input name="referencia" placeholder="Saldo inicial / corte"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="observaciones"></textarea></div>',fd=>saveOne('SALDO_PERSONA',fd));
    beneficiaryScript(ov);
  }

  function anticipoAnterior(){
    const d=commonData();
    const ov=modal('Migrar anticipo abierto anterior','<div class="cc-config-alert" style="margin-bottom:12px"><strong>Para anticipos anteriores con detalle conocido.</strong> Se conserva la fecha original y queda listo para recibir comprobaciones, sin volver a descontar la cuenta.</div><div class="cc-grid"><div class="cc-field"><label>Cuenta *</label><select name="cuentaId" required><option value="">Seleccionar</option>'+opt(d.cuentas,x=>x.nombre)+'</select></div><div class="cc-field"><label>Tipo de persona *</label><select name="tipoBeneficiario"><option value="OPERADOR">Operador</option><option value="RESPONSABLE">Responsable</option></select></div><div class="cc-field"><label>Persona *</label><select name="beneficiarioId" required></select></div><div class="cc-field"><label>Monto entregado pendiente *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Fecha original *</label><input name="fecha" type="date" required></div><div class="cc-field"><label>Unidad</label><select name="unidadId"><option value="">Sin unidad</option>'+opt(d.units,x=>x.numero+(x.descripcion?' · '+x.descripcion:''))+'</select></div><div class="cc-field"><label>Destino</label><select name="destinoId"><option value="">Sin destino</option>'+opt(d.dests,x=>x.nombre)+'</select></div><div class="cc-field"><label>Método depósito</label><select name="metodoDepositoId"><option value="">Sin método</option>'+opt(d.methods,x=>x.nombre)+'</select></div><div class="cc-field"><label>Tipo unidad anticipo</label><select name="tipoUnidadAnticipoId"><option value="">Sin tipo</option>'+opt(d.types,x=>x.nombre)+'</select></div><div class="cc-field"><label>Viaje</label><input name="viaje"></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="observaciones"></textarea></div>',fd=>saveOne('ANTICIPO_ABIERTO',fd));
    beneficiaryScript(ov);
  }

  function cargaAgrupada(){
    const d=commonData();
    const ov=modal('Carga inicial agrupada','<div class="cc-config-alert" style="margin-bottom:12px"><strong>Carga rápida de varios pendientes.</strong> Selecciona una cuenta y tipo de persona; agrega una fila por cada saldo pendiente. Ninguna fila descuenta nuevamente la cuenta.</div><div class="cc-grid"><div class="cc-field"><label>Cuenta *</label><select name="cuentaId" required><option value="">Seleccionar</option>'+opt(d.cuentas,x=>x.nombre)+'</select></div><div class="cc-field"><label>Tipo de persona *</label><select name="tipoBeneficiario" id="ccUtilGroupType"><option value="OPERADOR">Operador</option><option value="RESPONSABLE">Responsable</option></select></div><div class="cc-field"><label>Fecha de corte *</label><input name="fecha" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="cc-field"><label>Referencia general</label><input name="referencia" value="Carga inicial agrupada"></div></div><div style="margin-top:12px"><div class="cc-toolbar"><strong>Personas y montos</strong><button type="button" class="cc-btn cc-btn-light" data-add-row>Agregar fila</button></div><div id="ccUtilGroupRows"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones generales</label><textarea name="observaciones"></textarea></div>',async(fd,form)=>{
      const rows=[...form.querySelectorAll('[data-group-row]')];if(!rows.length)throw new Error('Agrega al menos una fila.');
      for(const row of rows){const p=row.querySelector('[data-person]').value,m=Number(row.querySelector('[data-amount]').value||0);if(!p||m<=0)throw new Error('Completa persona y monto en todas las filas.');const fake=new FormData();['cuentaId','tipoBeneficiario','fecha','referencia','observaciones'].forEach(k=>fake.set(k,fd.get(k)||''));fake.set('beneficiarioId',p);fake.set('monto',String(m));await saveOne('CARGA_AGRUPADA',fake);}
    });
    const rows=ov.querySelector('#ccUtilGroupRows'),type=ov.querySelector('#ccUtilGroupType');
    const add=()=>{const xs=type.value==='RESPONSABLE'?d.resps:d.ops;const r=document.createElement('div');r.dataset.groupRow='1';r.style='display:grid;grid-template-columns:1fr 180px 42px;gap:8px;margin:7px 0';r.innerHTML='<select data-person required><option value="">Seleccionar persona</option>'+opt(xs,x=>x.nombre+(x.numero_empleado?' · '+x.numero_empleado:''))+'</select><input data-amount type="number" min="0.01" step="0.01" placeholder="Monto" required><button type="button" class="cc-btn cc-btn-danger" data-rm>×</button>';r.querySelector('[data-rm]').onclick=()=>r.remove();rows.appendChild(r);};
    ov.querySelector('[data-add-row]').onclick=add;type.onchange=()=>{rows.innerHTML='';add()};add();
  }

  function ensureView(){
    const panel=document.getElementById('ccPanelAnticipos'),nav=panel?.querySelector('.cc-ant-nav');if(!panel||!nav)return;
    let btn=nav.querySelector('[data-antv="utilerias"]');if(!btn){btn=document.createElement('button');btn.className='cc-btn cc-btn-light';btn.dataset.antv='utilerias';btn.innerHTML='<i class="fa-solid fa-screwdriver-wrench mr-1"></i>Utilerías';nav.appendChild(btn);}
    let view=document.getElementById('ccAntViewUtilerias');if(!view){view=document.createElement('div');view.id='ccAntViewUtilerias';view.className='cc-ant-view';view.style.display='none';view.innerHTML='<div class="cc-ant-report-grid"><div class="cc-config-card"><strong>Saldo inicial por comprobar por persona</strong><div class="cc-note" style="margin:7px 0 12px">Para capturar el pendiente previo de un operador o responsable sin tocar el saldo actual de la cuenta.</div><button class="cc-btn cc-btn-primary" data-u1>Configurar</button></div><div class="cc-config-card"><strong>Migrar anticipos abiertos anteriores</strong><div class="cc-note" style="margin:7px 0 12px">Para migrar anticipos previos con fecha, cuenta y datos conocidos y seguirlos comprobando normalmente.</div><button class="cc-btn cc-btn-primary" data-u2>Configurar</button></div><div class="cc-config-card"><strong>Carga inicial agrupada</strong><div class="cc-note" style="margin:7px 0 12px">Para cargar rápidamente varios pendientes por cuenta y persona en una sola operación.</div><button class="cc-btn cc-btn-primary" data-u3>Configurar</button></div></div><div class="cc-config-card" style="margin-top:14px"><div class="cc-toolbar"><div><strong>Historial de cargas históricas</strong><div class="cc-note">Todos estos registros están marcados como no afectables al saldo inicial de cuenta.</div></div><button class="cc-btn cc-btn-light" data-refresh>Actualizar</button></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>FECHA</th><th>MODALIDAD</th><th>CUENTA</th><th>PERSONA</th><th>MONTO</th><th>COMPROBADO</th><th>PENDIENTE</th><th>ESTATUS</th></tr></thead><tbody id="ccUtilHistBody"></tbody></table></div></div>';panel.appendChild(view);}
    const open=()=>{panel.querySelectorAll('.cc-ant-view').forEach(v=>v.style.display='none');view.style.display='block';nav.querySelectorAll('[data-antv]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');refresh().catch(e=>alert(e.message||e));};
    btn.onclick=open;view.querySelector('[data-u1]').onclick=saldoPersona;view.querySelector('[data-u2]').onclick=anticipoAnterior;view.querySelector('[data-u3]').onclick=cargaAgrupada;view.querySelector('[data-refresh]').onclick=()=>refresh().catch(e=>alert(e.message||e));
  }

  function renderHistory(){
    const b=document.getElementById('ccUtilHistBody');if(!b)return;const names={SALDO_PERSONA:'Saldo por persona',ANTICIPO_ABIERTO:'Anticipo anterior',CARGA_AGRUPADA:'Carga agrupada'};
    b.innerHTML=state.hist.length?state.hist.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+fmt(x.fecha)+'</td><td>'+esc(names[x.modo]||x.modo||'')+'</td><td>'+esc(x.cuenta||'—')+'</td><td>'+esc(x.beneficiario||'—')+'<div style="font-size:9px;color:#64748b">'+esc(x.tipoBeneficiario||'')+'</div></td><td>'+money(x.monto)+'</td><td>'+money(x.comprobado)+'</td><td><strong>'+money(x.pendiente)+'</strong></td><td>'+esc(x.estatus||'')+'</td></tr>').join(''):'<tr><td colspan="9" style="padding:22px;text-align:center;color:#94a3b8">Aún no hay cargas históricas.</td></tr>';
  }

  async function refresh(){await load();ensureView();renderHistory();}
  function install(){ensureView();refresh().catch(e=>console.warn('Utilerías anticipos',e));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
'''

text=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Utilerías de carga histórica de anticipos */'
if marker not in text:
    P.write_text(text+extra,encoding='utf-8')
print('Utilerías de carga histórica agregadas')
