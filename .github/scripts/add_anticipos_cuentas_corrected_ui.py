from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists():
    raise SystemExit('No existe anticipos-profesional-flow.js')

extra=r'''

/* Tráfico App Profesional · Modelo corregido: cuentas + operador/responsable */
(function(){
  if(window.__ccAntCuentasCorrectedV1)return;
  window.__ccAntCuentasCorrectedV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  let cache={base:null,extra:null};

  async function load(){
    const [a,b]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);
    if(a.error)throw a.error;if(b.error)throw b.error;
    cache={base:a.data||{},extra:b.data||{}};return cache;
  }
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const exact=(xs,v,fn)=>{v=String(v||'').trim().toLowerCase();return (xs||[]).find(x=>String(fn(x)||'').trim().toLowerCase()===v)};
  const opLabel=x=>x.nombre+(x.numero_empleado?' · '+x.numero_empleado:'');
  const unitLabel=x=>x.numero+(x.descripcion?' · '+x.descripcion:'');
  const respLabel=x=>x.nombre+(x.numero_empleado?' · '+x.numero_empleado:'');

  function hideWrongViews(){
    ['cajachica','cajaspro','traspasos','catalogospro'].forEach(id=>{
      document.querySelector('.cc-ant-nav [data-antv="'+id+'"]')?.remove();
      const v=document.getElementById('ccAntView'+id.charAt(0).toUpperCase()+id.slice(1));if(v)v.style.display='none';
    });
    const cajaBtn=document.querySelector('.cc-ant-nav [data-antv="caja"]');if(cajaBtn)cajaBtn.textContent='Cuentas / movimientos';
    const catCard=[...document.querySelectorAll('#ccAntViewCatalogos .cc-config-card')].find(x=>(x.textContent||'').includes('Cuentas / cajas'));
    if(catCard){const s=catCard.querySelector('strong');if(s)s.textContent='Cuentas';const note=catCard.querySelector('.cc-note');if(note)note.textContent='Administra cuentas separadas para anticipos a Operadores o Beneficiarios.';}
  }

  function accountPanel(){
    const view=document.getElementById('ccAntViewCaja');if(!view)return;
    let p=document.getElementById('ccCuentaMasterPanel');
    if(!p){p=document.createElement('div');p.id='ccCuentaMasterPanel';p.className='cc-config-card';p.style='margin-bottom:14px';view.prepend(p);}
    const qs=active(cache.extra?.cuentas||[]);
    const transfers=cache.extra?.traspasos||[];
    p.innerHTML='<div class="cc-toolbar"><div><strong>Cuentas y balances</strong><div class="cc-note">No son cajas separadas del módulo: son cuentas de origen de fondos.</div></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="cc-btn cc-btn-primary" data-new-account>Nueva cuenta</button><button class="cc-btn cc-btn-light" data-transfer>Traspaso entre cuentas</button></div></div>'+
      '<div class="cc-ant-kpis">'+(qs.length?qs.map(q=>'<div class="cc-ant-kpi"><small>'+esc(q.nombre)+'</small><strong>'+money(q.saldo)+'</strong><div style="font-size:9px;color:#64748b">'+(q.usoOperadores?'Operadores':'')+(q.usoCajaChica?'Beneficiarios':'')+'</div><button class="cc-btn cc-btn-light" style="margin-top:7px" data-edit-account="'+esc(q.id)+'">Editar</button></div>').join(''):'<div class="cc-note">No hay cuentas activas.</div>')+'</div>'+
      '<div style="margin-top:12px"><strong>Últimos traspasos</strong><div class="cc-inv-wrap" style="max-height:220px"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>ORIGEN</th><th>DESTINO</th><th>MONTO</th><th>REFERENCIA</th></tr></thead><tbody>'+(transfers.length?transfers.slice(0,20).map(x=>'<tr><td>'+esc(String(x.fecha||'').slice(0,10))+'</td><td>'+esc(x.origen||'')+'</td><td>'+esc(x.destino||'')+'</td><td>'+money(x.monto)+'</td><td>'+esc(x.referencia||'')+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;color:#94a3b8">Sin traspasos.</td></tr>')+'</tbody></table></div></div>';
    p.querySelector('[data-new-account]').onclick=()=>accountForm();
    p.querySelector('[data-transfer]').onclick=transferForm;
    p.querySelectorAll('[data-edit-account]').forEach(b=>b.onclick=()=>accountForm((cache.extra.cuentas||[]).find(x=>x.id===b.dataset.editAccount)||{}));
  }

  function modal(title,html,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100050;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(980px,98vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;
    ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;try{await onSubmit(new FormData(e.currentTarget),e.currentTarget);close();await window.ccAntLoad?.(true);await refresh()}catch(err){alert(err.message||err);btn.disabled=false}};
    return ov;
  }

  function accountForm(q={}){
    const usoActual=q.usoOperadores&&!q.usoCajaChica?'OPERADORES':(!q.usoOperadores&&q.usoCajaChica?'BENEFICIARIOS':'');
    modal(q.id?'Editar cuenta':'Nueva cuenta','<div class="cc-grid"><div class="cc-field"><label>Nombre de la cuenta *</label><input name="nombre" required value="'+esc(q.nombre||'')+'"></div><div class="cc-field"><label>Saldo inicial</label><input name="saldo" type="number" step="0.01" value="'+Number(q.saldoInicial||0)+'"></div><div class="cc-field"><label>Uso de la cuenta *</label><select name="uso" required><option value="">Seleccionar</option><option value="OPERADORES" '+(usoActual==='OPERADORES'?'selected':'')+'>Anticipos a Operadores</option><option value="BENEFICIARIOS" '+(usoActual==='BENEFICIARIOS'?'selected':'')+'>Anticipos a Beneficiarios</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(q.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(q.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div class="cc-config-alert" style="margin-top:12px"><strong>Separación de cuentas:</strong> cada cuenta se asigna a un solo flujo. Las cuentas de Operadores solo aparecerán en anticipos de Operador y las de Beneficiarios solo en anticipos de Beneficiario.</div>',async fd=>{const uso=String(fd.get('uso')||'');if(!uso)throw new Error('Selecciona si la cuenta es para Operadores o Beneficiarios.');const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CUENTA',p_item:{id:q.id||'',nombre:String(fd.get('nombre')||''),tipo:'CUENTA',saldoInicial:Number(fd.get('saldo')||0),estatus:String(fd.get('estatus')||'ACTIVO'),usoOperadores:uso==='OPERADORES',usoCajaChica:uso==='BENEFICIARIOS'}});if(r.error)throw r.error;});
  }

  function transferForm(){
    const qs=active(cache.extra?.cuentas||[]);if(qs.length<2){alert('Necesitas al menos dos cuentas activas.');return;}
    const opts=qs.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');
    modal('Traspaso entre cuentas','<div class="cc-grid"><div class="cc-field"><label>Cuenta origen *</label><select name="origen" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Cuenta destino *</label><select name="destino" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Referencia</label><input name="ref"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="obs"></textarea></div>',async fd=>{if(fd.get('origen')===fd.get('destino'))throw new Error('Origen y destino deben ser diferentes.');const r=await sb().rpc('cc_ant_transfer_funds',{p_item:{cuentaOrigenId:fd.get('origen'),cuentaDestinoId:fd.get('destino'),monto:Number(fd.get('monto')||0),referencia:String(fd.get('ref')||''),observaciones:String(fd.get('obs')||'')}});if(r.error)throw r.error;});
  }

  function patchMainList(){
    const cc=new Map((cache.extra?.cajaChica||[]).map(x=>[x.id,x]));
    const rows=[...document.querySelectorAll('#ccAntBody tr')],data=window.ccAntFiltered||[];
    rows.forEach((tr,i)=>{const a=data[i],r=a&&cc.get(a.id);if(!a)return;tr.style.display='';if(!r)return;const tds=tr.querySelectorAll('td');if(tds[2])tds[2].innerHTML='<strong>'+esc(r.responsable||'Responsable')+'</strong><div style="font-size:9px;color:#64748b">RESPONSABLE</div>';if(tds[4])tds[4].innerHTML='<span class="cc-badge">Caja chica</span>';if(tds[5])tds[5].textContent='RESPONSABLE';});
  }

  async function newAdvance(){
    await load();
    const base=cache.base||{},extra=cache.extra||{};
    const accounts=active(extra.cuentas||[]);if(!accounts.length){alert('Primero registra una cuenta activa.');return;}
    const ops=active(base.operadores||[]),units=base.unidadesCarro||[],resps=active(extra.responsables||[]),concepts=active(base.conceptos||[]),dests=active(base.destinos||[]),methods=active(base.metodosDeposito||[]),types=active(base.tiposUnidadAnticipos||[]);
    const accountOpts=accounts.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');
    const ov=modal('Nuevo anticipo','<div class="cc-grid"><div class="cc-field"><label>Cuenta de origen *</label><select name="cuenta" id="ccCAcct" required><option value="">Seleccionar cuenta</option>'+accountOpts+'</select></div><div class="cc-field" id="ccCBenefTypeWrap"><label>Beneficiario *</label><select name="benefType" id="ccCBenefType"><option value="OPERADOR">Operador</option><option value="RESPONSABLE">Responsable</option></select></div><div class="cc-field" id="ccCOperatorWrap"><label>Operador *</label><input name="operadorText" list="ccCOps" autocomplete="off"><datalist id="ccCOps">'+ops.map(x=>'<option value="'+esc(opLabel(x))+'"></option>').join('')+'</datalist></div><div class="cc-field" id="ccCRespWrap" style="display:none"><label>Responsable *</label><input name="respText" list="ccCResps" autocomplete="off"><datalist id="ccCResps">'+resps.map(x=>'<option value="'+esc(respLabel(x))+'"></option>').join('')+'</datalist></div><div class="cc-field" id="ccCUnitWrap"><label>Unidad *</label><input name="unitText" list="ccCUnits" autocomplete="off"><datalist id="ccCUnits">'+units.map(x=>'<option value="'+esc(unitLabel(x))+'"></option>').join('')+'</datalist></div><div class="cc-field" id="ccCTypeWrap"><label>Tipo anticipo</label><select name="tipoUnidad"><option value="">Seleccionar</option>'+types.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Destino</label><select name="destino"><option value="">Sin destino</option>'+dests.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Método depósito</label><select name="metodo"><option value="">Sin método</option>'+methods.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Concepto *</label><select name="concepto" required><option value="">Seleccionar</option>'+concepts.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Monto autorizado *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Monto entregado *</label><input name="entregado" type="number" min="0" step="0.01" required></div><div class="cc-field"><label>Viaje</label><input name="viaje"></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="obs"></textarea></div>',async(fd,form)=>{
      const q=accounts.find(x=>x.id===fd.get('cuenta'));if(!q)throw new Error('Selecciona una cuenta válida.');
      const mode=String(fd.get('benefType')||'OPERADOR');const isResp=mode==='RESPONSABLE';
      if(isResp&&!q.usoCajaChica)throw new Error('Esta cuenta no está destinada a anticipos de responsables.');
      if(!isResp&&!q.usoOperadores)throw new Error('Esta cuenta no está destinada a anticipos de operadores.');
      let op=null,resp=null,unit=null;
      if(isResp){resp=exact(resps,fd.get('respText'),respLabel);if(!resp)throw new Error('El responsable debe existir en el catálogo.');}
      else{op=exact(ops,fd.get('operadorText'),opLabel);if(!op)throw new Error('El operador debe existir en el catálogo.');unit=exact(units,fd.get('unitText'),unitLabel);if(!unit)throw new Error('La unidad debe existir y ser tipo Carro.');}
      const monto=Number(fd.get('monto')||0),ent=Number(fd.get('entregado')||0);if(monto<=0)throw new Error('Monto inválido.');if(ent<0||ent>monto)throw new Error('El entregado no puede exceder el autorizado.');
      const r=await sb().rpc('cc_ant_create',{p_item:{esCajaChica:isResp,responsableId:resp?.id||'',operadorId:op?.id||'',unidadId:unit?.id||'',tipoUnidadAnticipoId:isResp?'':String(fd.get('tipoUnidad')||''),destinoId:String(fd.get('destino')||''),metodoDepositoId:String(fd.get('metodo')||''),cuentaId:q.id,viaje:String(fd.get('viaje')||''),referencia:String(fd.get('referencia')||''),montoEntregado:ent,observaciones:String(fd.get('obs')||''),detalles:[{conceptoId:String(fd.get('concepto')||''),monto:monto,observaciones:''}]}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo crear el anticipo');
    });
    const account=ov.querySelector('#ccCAcct'),type=ov.querySelector('#ccCBenefType');
    function sync(){const q=accounts.find(x=>x.id===account.value);if(q){if(q.usoOperadores&&!q.usoCajaChica)type.value='OPERADOR';else if(!q.usoOperadores&&q.usoCajaChica)type.value='RESPONSABLE';}const isResp=type.value==='RESPONSABLE';ov.querySelector('#ccCOperatorWrap').style.display=isResp?'none':'';ov.querySelector('#ccCUnitWrap').style.display=isResp?'none':'';ov.querySelector('#ccCTypeWrap').style.display=isResp?'none':'';ov.querySelector('#ccCRespWrap').style.display=isResp?'':'none';}
    account.onchange=sync;type.onchange=sync;sync();
  }

  async function refresh(){try{await load();hideWrongViews();accountPanel();patchMainList()}catch(e){console.warn('Modelo cuentas anticipos',e)}}

  function install(){
    hideWrongViews();
    window.ccAntNuevoAnticipo=newAdvance;
    if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__cuentasCorrected){const o=window.ccAntRender;const w=function(){const r=o.apply(this,arguments);setTimeout(()=>{hideWrongViews();patchMainList();},0);return r};w.__cuentasCorrected=true;window.ccAntRender=w;}
    if(typeof window.ccAntView==='function'&&!window.ccAntView.__cuentasCorrected){const o=window.ccAntView;const w=function(v,b){const r=o.apply(this,arguments);if(v==='caja')setTimeout(accountPanel,0);return r};w.__cuentasCorrected=true;window.ccAntView=w;}
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
'''

text=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Modelo corregido: cuentas + operador/responsable */'
if marker not in text:
    P.write_text(text+extra,encoding='utf-8')
print('Modelo de anticipos corregido a cuentas + operador/responsable')
