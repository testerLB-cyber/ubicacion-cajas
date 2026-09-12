/* Tráfico App Profesional · Anticipos v29 ESTABLE · Operadores / Beneficiarios + configuración por destino */
(function(){
  'use strict';
  if(window.__ccAntV29Stable)return;
  window.__ccAntV29Stable=true;

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  const today=()=>new Date().toISOString().slice(0,10);
  const active=a=>(a||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const can=p=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('anticipos.'+p));
  let DATA={};
  let modo='OPERADOR';
  let loading=false;

  async function rpc(name,args={}){
    if(!sb()||typeof sb().rpc!=='function')throw new Error('Supabase no está disponible.');
    const r=await sb().rpc(name,args);
    if(r.error)throw r.error;
    if(r.data?.ok===false)throw new Error(r.data.error||'Operación no disponible.');
    return r.data;
  }
  async function loadV29(){
    if(loading)return DATA;
    loading=true;
    try{DATA=await rpc('cc_ant_list_v28');return DATA}finally{loading=false}
  }

  const isBen=a=>String(a?.tipoPersona||'').toUpperCase()==='BENEFICIARIO'||a?.esBeneficiario===true||a?.esCajaChica===true;
  const person=a=>isBen(a)?(a.beneficiario||a.persona||'Beneficiario'):(a.operador||a.persona||'Operador');
  const details=id=>(DATA.detalles||[]).filter(x=>x.anticipoId===id&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const comps=id=>(DATA.comprobaciones||[]).filter(x=>x.anticipo_id===id&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const opts=(xs,label,selected='')=>'<option value="">Seleccionar…</option>'+xs.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(label(x))+'</option>').join('');

  function installStyle(){
    if(document.getElementById('ccAntV29Style'))return;
    const s=document.createElement('style');s.id='ccAntV29Style';s.textContent=`
      #ccAntV28Switch{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 10px}
      #ccAntV28Switch .cc-btn.active{background:#1d4ed8!important;color:#fff!important;border-color:#1d4ed8!important}
      #ccAntV28ModeNote{font-size:10px;color:#64748b;margin:0 0 10px}
      #ccAntBody tr[data-v29-kind="BENEFICIARIO"]{box-shadow:inset 4px 0 0 #7c3aed}
      #ccAntBody tr[data-v29-kind="OPERADOR"]{box-shadow:inset 4px 0 0 #2563eb}
      .cc-ant-v29-total{min-width:250px;text-align:right;padding:12px 15px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px}
      .cc-ant-v29-total small{display:block;font-size:10px;font-weight:900;color:#475569}
      .cc-ant-v29-total strong{display:block;font-size:23px;color:#1d4ed8;margin-top:2px}
      .cc-ant-v29-concept{display:grid;grid-template-columns:auto minmax(180px,1fr) 145px 38px;gap:8px;align-items:center;padding:8px;border:1px solid #e2e8f0;border-radius:9px;background:#fff}
      .cc-ant-v29-config-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:10px}
      .cc-ant-v29-config-card{border:1px solid #dbe3ee;border-radius:12px;background:#fff;padding:11px}
      .cc-ant-v29-config-row{display:grid;grid-template-columns:auto minmax(150px,1fr) 125px 95px;gap:8px;align-items:center;padding:7px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}
      @media(max-width:700px){.cc-ant-v29-concept,.cc-ant-v29-config-row{grid-template-columns:auto 1fr 105px}.cc-ant-v29-concept>button,.cc-ant-v29-config-row>label:last-child{grid-column:3}.cc-ant-v29-total{width:100%}}
    `;document.head.appendChild(s);
  }

  function shell(id,title,sub,width='980px'){
    document.getElementById(id)?.remove();
    const o=document.createElement('div');o.id=id;o.style='position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:14px';
    o.innerHTML='<div style="background:#fff;width:min('+width+',98vw);max-height:96vh;overflow:auto;border-radius:18px;box-shadow:0 30px 90px rgba(15,23,42,.48)"><div style="position:sticky;top:0;z-index:4;background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between;gap:12px"><div><strong>'+esc(title)+'</strong><div style="font-size:10px;color:#cbd5e1;margin-top:3px">'+esc(sub||'')+'</div></div><button data-x type="button" style="background:none;border:0;color:#fff;font-size:25px;cursor:pointer">×</button></div><div data-body style="padding:18px"></div></div>';
    document.body.appendChild(o);o.querySelector('[data-x]').onclick=()=>o.remove();return o;
  }

  function ensureSwitch(){
    const body=document.getElementById('ccAntBody');if(!body)return;
    const wrap=body.closest('.cc-inv-wrap')||body.parentElement;if(!wrap)return;
    let sw=document.getElementById('ccAntV28Switch'),note=document.getElementById('ccAntV28ModeNote');
    if(!sw){
      sw=document.createElement('div');sw.id='ccAntV28Switch';sw.innerHTML='<button type="button" class="cc-btn cc-btn-light" data-v29-mode="OPERADOR"><i class="fa-solid fa-truck-fast mr-1"></i>Anticipos de operadores</button><button type="button" class="cc-btn cc-btn-light" data-v29-mode="BENEFICIARIO"><i class="fa-solid fa-user-check mr-1"></i>Anticipos de beneficiarios</button>';
      note=document.createElement('div');note.id='ccAntV28ModeNote';wrap.parentElement?.insertBefore(sw,wrap);sw.insertAdjacentElement('afterend',note);
      sw.onclick=e=>{const b=e.target.closest('[data-v29-mode]');if(!b)return;modo=b.dataset.v29Mode;applyList()};
    }
    sw.querySelectorAll('[data-v29-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v29Mode===modo));
    if(note)note.textContent=modo==='OPERADOR'?'Anticipos de operadores: los conceptos Default se cargan por Destino + Tipo de unidad y puedes agregar conceptos adicionales.':'Anticipos de beneficiarios: mismo flujo de PDF, enlaces, comprobación, extras, devolución, cancelación y reapertura.';
  }

  function actionHtml(a){
    const p=Number(a.pendiente||0),st=String(a.estatus||'').toUpperCase();
    let h='<button class="cc-btn cc-btn-light" data-v29="detail" data-id="'+esc(a.id)+'">Detalle</button> <button class="cc-btn cc-btn-light" data-v29="pdf" data-id="'+esc(a.id)+'">PDF</button> ';
    if(st==='CERRADO')return h+'<button class="cc-btn cc-btn-primary" data-v29="reopen" data-id="'+esc(a.id)+'"><i class="fa-solid fa-lock-open mr-1"></i>Abrir anticipo</button>';
    if(st!=='CANCELADO'){
      if(can('editar'))h+='<button class="cc-btn cc-btn-light" data-v29="links" data-id="'+esc(a.id)+'">Enlaces</button> ';
      if(can('comprobar'))h+='<button class="cc-btn cc-btn-light" data-v29="comp" data-id="'+esc(a.id)+'">Comprobar</button> ';
      if(can('editar'))h+='<button class="cc-btn cc-btn-primary" data-v29="extra" data-id="'+esc(a.id)+'">Añadir extra</button> ';
      if(can('caja')&&p>0)h+='<button class="cc-btn cc-btn-light" data-v29="dev" data-id="'+esc(a.id)+'">Devolución</button> ';
      if(can('cancelar'))h+='<button class="cc-btn cc-btn-danger" data-v29="can" data-id="'+esc(a.id)+'">Cancelar</button>';
    }
    return h;
  }

  function applyList(){
    const body=document.getElementById('ccAntBody');if(!body)return;ensureSwitch();
    const de=document.getElementById('ccAntDesde')?.value||'',ha=document.getElementById('ccAntHasta')?.value||'',es=document.getElementById('ccAntEstatusFiltro')?.value||'';
    let rows=(DATA.anticipos||[]).filter(a=>modo==='BENEFICIARIO'?isBen(a):!isBen(a)).filter(a=>{const d=String(a.fecha||'').slice(0,10);return(!de||d>=de)&&(!ha||d<=ha)&&(!es||a.estatus===es)});
    const filter=document.getElementById('ccAntOperadorFiltro');
    if(filter){
      const old=filter.dataset.v29mode===modo?filter.value:'',people=new Map();rows.forEach(a=>{const id=isBen(a)?a.beneficiarioId:a.operadorId;if(id)people.set(String(id),person(a))});filter.dataset.v29mode=modo;filter.innerHTML='<option value="">Todos</option>'+[...people].sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([id,n])=>'<option value="'+esc(id)+'">'+esc(n)+'</option>').join('');if(old&&people.has(String(old)))filter.value=old;if(filter.value)rows=rows.filter(a=>String(isBen(a)?a.beneficiarioId:a.operadorId)===String(filter.value));const lab=filter.closest('div')?.querySelector('label');if(lab)lab.textContent=modo==='BENEFICIARIO'?'Beneficiario':'Operador';
    }
    window.ccAntFiltered=rows;
    const th=body.closest('table')?.querySelectorAll('thead th');if(th?.length>=5){th[2].textContent=modo==='BENEFICIARIO'?'BENEFICIARIO':'OPERADOR';th[4].textContent='TIPO DE UNIDAD'}
    body.innerHTML=rows.length?rows.map(a=>{const ds=details(a.id),res=ds.map(z=>esc(z.concepto)+' '+money(z.monto)+(z.origen==='EXTRA'?' +EXTRA':'')).join(' · ');return '<tr data-v29-kind="'+(isBen(a)?'BENEFICIARIO':'OPERADOR')+'"><td><strong>'+esc(a.folio)+'</strong><div style="font-size:9px;color:#64748b">'+esc(a.tipoPersona||'')+'</div></td><td>'+date(a.fecha)+'</td><td><strong>'+esc(person(a))+'</strong></td><td><strong>'+esc(a.destino||'—')+'</strong><div style="font-size:9px;color:#64748b;max-width:290px">'+(res||'Sin conceptos')+'</div></td><td>'+esc(a.tipoUnidadAnticipo||'—')+'</td><td>'+esc(a.metodoDeposito||'—')+'</td><td>'+esc(a.viaje||'—')+'</td><td>'+money(a.montoAutorizado??a.monto)+'</td><td>'+money(a.comprobado)+'</td><td><strong>'+money(a.pendiente)+'</strong></td><td>'+esc(a.estatus)+'</td><td><div style="display:flex;gap:5px;flex-wrap:wrap">'+actionHtml(a)+'</div></td></tr>'}).join(''):'<tr><td colspan="12" style="padding:26px;text-align:center;color:#94a3b8">Sin anticipos de '+(modo==='BENEFICIARIO'?'beneficiarios':'operadores')+'.</td></tr>';
    body.onclick=e=>{const b=e.target.closest('[data-v29]');if(!b)return;const id=b.dataset.id,a=b.dataset.v29;if(a==='detail')return openDetail(id);if(a==='pdf')return window.ccAntPDFById?.(id);if(a==='links')return window.ccAntLinks?.(id);if(a==='comp')return window.ccAntComprobar?.(id);if(a==='extra')return window.ccAntExtra?.(id);if(a==='dev')return window.ccAntDevolucion?.(id);if(a==='can')return window.ccAntCancelar?.(id);if(a==='reopen')return window.ccAntReabrir?.(id)};
  }

  function openDetail(id){
    const a=(DATA.anticipos||[]).find(x=>x.id===id);if(!a)return;const ds=details(id),cs=comps(id),o=shell('ccAntV29Detail','Detalle completo · '+a.folio,(isBen(a)?'Beneficiario':'Operador')+' · '+person(a),'1050px'),body=o.querySelector('[data-body]');
    const field=(k,v)=>'<div style="padding:7px 9px;border-bottom:1px solid #e2e8f0"><span style="font-size:9px;color:#64748b;font-weight:800">'+esc(k)+'</span><div style="font-size:12px;font-weight:800">'+esc(v??'—')+'</div></div>';
    body.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">'+field('Folio',a.folio)+field('Fecha',date(a.fecha))+field(isBen(a)?'Beneficiario':'Operador',person(a))+field('Cuenta',a.cuenta)+field('Método depósito',a.metodoDeposito)+field('Destino',a.destino)+field('Tipo de unidad',a.tipoUnidadAnticipo)+field('Unidad',a.unidad)+field('Viaje',a.viaje)+field('Referencia',a.referencia)+field('Estatus',a.estatus)+field('Firma',a.firmaEstatus||'—')+'</div><div class="cc-config-alert" style="margin-top:12px"><strong>Autorizado:</strong> '+money(a.montoAutorizado??a.monto)+' · <strong>Entregado:</strong> '+money(a.montoEntregado)+' · <strong>Comprobado:</strong> '+money(a.comprobado)+' · <strong>Devuelto:</strong> '+money(a.devuelto)+' · <strong>Pendiente:</strong> '+money(a.pendiente)+'</div><div class="cc-toolbar" style="margin-top:14px"><strong>Conceptos</strong></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>CONCEPTO</th><th>MONTO</th><th>ORIGEN</th></tr></thead><tbody>'+(ds.map(x=>'<tr><td>'+esc(x.concepto)+'</td><td>'+money(x.monto)+'</td><td>'+esc(x.origen||'BASE')+'</td></tr>').join('')||'<tr><td colspan="3">Sin conceptos</td></tr>')+'</tbody></table></div><div class="cc-toolbar" style="margin-top:14px"><strong>Comprobaciones</strong></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>CONCEPTO</th><th>TIPO</th><th>FOLIO</th><th>MONTO</th></tr></thead><tbody>'+(cs.map(x=>'<tr><td>'+date(x.fecha)+'</td><td>'+esc(x.concepto||'—')+'</td><td>'+esc(x.tipo_documento||'—')+'</td><td>'+esc(x.folio_documento||'—')+'</td><td>'+money(x.monto)+'</td></tr>').join('')||'<tr><td colspan="5">Sin comprobaciones</td></tr>')+'</tbody></table></div><div style="margin-top:14px"><strong>Observaciones</strong><div style="margin-top:5px;padding:9px;background:#f8fafc;border-radius:8px">'+esc(a.observaciones||'Sin observaciones')+'</div></div><div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-top:16px"><button class="cc-btn cc-btn-light" data-act="pdf">PDF</button>'+(can('editar')&&a.estatus!=='CERRADO'&&a.estatus!=='CANCELADO'?'<button class="cc-btn cc-btn-light" data-act="links">Enlaces</button>':'')+(can('comprobar')&&a.estatus!=='CERRADO'&&a.estatus!=='CANCELADO'?'<button class="cc-btn cc-btn-primary" data-act="comp">Comprobar</button>':'')+'<button class="cc-btn cc-btn-light" data-act="close">Cerrar</button></div>';
    body.onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;if(b.dataset.act==='close')return o.remove();if(b.dataset.act==='pdf')return window.ccAntPDFById?.(id);if(b.dataset.act==='links')return window.ccAntLinks?.(id);if(b.dataset.act==='comp'){o.remove();return window.ccAntComprobar?.(id)}};
  }

  async function openOperatorV29(){
    if(!can('crear'))return alert('Sin permiso para crear anticipos.');
    const o=shell('ccAntOpV29','Nuevo anticipo · Operador','Los conceptos Default se cargan por Destino + Tipo de unidad. Puedes agregar cualquier concepto activo adicional.'),body=o.querySelector('[data-body]');
    try{await loadV29()}catch(e){body.innerHTML='<div class="cc-config-alert">'+esc(e.message||e)+'</div>';return}
    const accounts=active(DATA.cuentas).filter(x=>x.uso_operadores===true),ops=active(DATA.operadores),units=active(DATA.unidadesCarro),dest=active(DATA.destinos),types=active(DATA.tiposUnidadAnticipos),methods=active(DATA.metodosDeposito),concepts=active(DATA.conceptos).filter(x=>x.uso_operadores!==false);
    body.innerHTML='<form id="ccOpV29Form"><div class="cc-grid"><div class="cc-field"><label>Cuenta *</label><select name="cuentaId" required>'+opts(accounts,x=>x.nombre)+'</select></div><div class="cc-field"><label>Operador *</label><select name="operadorId" required>'+opts(ops,x=>x.nombre+(x.numero_empleado?' · '+x.numero_empleado:''))+'</select></div><div class="cc-field"><label>Unidad *</label><select name="unidadId" required>'+opts(units,x=>(x.numero||'')+(x.descripcion?' · '+x.descripcion:''))+'</select></div><div class="cc-field"><label>Destino *</label><select name="destinoId" required>'+opts(dest,x=>x.nombre)+'</select></div><div class="cc-field"><label>Tipo de unidad *</label><select name="tipoUnidadAnticipoId" required>'+opts(types,x=>x.nombre)+'</select></div><div class="cc-field"><label>Método *</label><select name="metodoDepositoId" required>'+opts(methods,x=>x.nombre)+'</select></div><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" value="'+today()+'" required></div><div class="cc-field"><label>Viaje</label><input name="viaje"></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div><div class="cc-toolbar" style="margin-top:14px"><div><strong>Conceptos del anticipo</strong><div class="cc-note">Los Default aparecen seleccionados. Los demás configurados quedan disponibles y puedes agregar conceptos fuera de la configuración.</div></div><button type="button" class="cc-btn cc-btn-light" data-add><i class="fa-solid fa-plus mr-1"></i>Agregar otro concepto</button></div><div id="ccOpV29Rows" style="display:grid;gap:7px"></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><div class="cc-ant-v29-total"><small>TOTAL DEL ANTICIPO</small><strong id="ccOpV29Total">$0.00</strong></div></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Crear anticipo</button></div></form>';
    const f=body.querySelector('#ccOpV29Form'),box=body.querySelector('#ccOpV29Rows'),totalEl=body.querySelector('#ccOpV29Total');body.querySelector('[data-cancel]').onclick=()=>o.remove();
    const row=(c,amt,checked,extra=false)=>'<div class="cc-ant-v29-concept" data-row="'+esc(c.id)+'"><input type="checkbox" data-c="'+esc(c.id)+'" '+(checked?'checked':'')+'><div><strong>'+esc(c.nombre)+'</strong>'+(extra?'<div class="cc-note" style="color:#7c3aed">Concepto adicional</div>':'')+'</div><input type="number" min="0" step="0.01" data-m="'+esc(c.id)+'" value="'+Number(amt||0)+'" placeholder="Monto"><button type="button" class="cc-btn cc-btn-light" data-rm title="Quitar">×</button></div>';
    function calc(){const total=[...box.querySelectorAll('[data-c]:checked')].reduce((s,c)=>s+Number(box.querySelector('[data-m="'+CSS.escape(c.dataset.c)+'"]')?.value||0),0);totalEl.textContent=money(total);return total}
    function renderConfigured(){const did=f.destinoId.value,tid=f.tipoUnidadAnticipoId.value,cfg=(DATA.destinoConceptos||[]).filter(x=>x.destinoId===did&&x.tipoUnidadAnticipoId===tid&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');box.innerHTML=cfg.map(x=>{const c=concepts.find(z=>z.id===x.conceptoId);return c?row(c,x.monto,!!(x.esDefault??x.es_default),false):''}).join('')||'<div class="cc-note" data-empty>No hay conceptos configurados para esta combinación. Puedes agregar conceptos manualmente.</div>';calc()}
    f.destinoId.onchange=renderConfigured;f.tipoUnidadAnticipoId.onchange=renderConfigured;renderConfigured();
    box.addEventListener('input',calc);box.addEventListener('change',calc);box.onclick=e=>{const rm=e.target.closest('[data-rm]');if(rm){rm.closest('[data-row]')?.remove();calc()}};
    body.querySelector('[data-add]').onclick=()=>{const used=new Set([...box.querySelectorAll('[data-row]')].map(x=>x.dataset.row)),avail=concepts.filter(x=>!used.has(String(x.id)));if(!avail.length)return alert('No hay más conceptos disponibles.');const m=shell('ccOpV29AddConcept','Agregar concepto al anticipo','Puede ser un concepto que no esté configurado por Default para este destino.','620px'),mb=m.querySelector('[data-body]');mb.innerHTML='<div class="cc-field"><label>Concepto *</label><input id="ccOpV29Search" class="cc-input" list="ccOpV29List" placeholder="Escribe para buscar"><datalist id="ccOpV29List">'+avail.map(x=>'<option value="'+esc(x.nombre)+'"></option>').join('')+'</datalist></div><div class="cc-field"><label>Monto *</label><input id="ccOpV29Amount" type="number" min="0.01" step="0.01"></div><div style="text-align:right;margin-top:12px"><button class="cc-btn cc-btn-primary" id="ccOpV29AddBtn">Agregar</button></div>';mb.querySelector('#ccOpV29AddBtn').onclick=()=>{const name=mb.querySelector('#ccOpV29Search').value.trim().toLowerCase(),c=avail.find(x=>String(x.nombre).trim().toLowerCase()===name),amt=Number(mb.querySelector('#ccOpV29Amount').value||0);if(!c||amt<=0)return alert('Selecciona un concepto válido y captura un monto mayor a cero.');box.querySelector('[data-empty]')?.remove();box.insertAdjacentHTML('beforeend',row(c,amt,true,true));m.remove();calc()}};
    f.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(f),det=[...box.querySelectorAll('[data-c]:checked')].map(c=>({conceptoId:c.dataset.c,monto:Number(box.querySelector('[data-m="'+CSS.escape(c.dataset.c)+'"]')?.value||0)})).filter(x=>x.monto>0);if(!det.length)return alert('Selecciona al menos un concepto con monto mayor a cero.');const total=det.reduce((s,x)=>s+x.monto,0),btn=f.querySelector('[type=submit]');btn.disabled=true;try{const r=await rpc('cc_ant_create',{p_item:{esCajaChica:false,cuentaId:fd.get('cuentaId'),operadorId:fd.get('operadorId'),unidadId:fd.get('unidadId'),destinoId:fd.get('destinoId'),tipoUnidadAnticipoId:fd.get('tipoUnidadAnticipoId'),metodoDepositoId:fd.get('metodoDepositoId'),fecha:new Date(fd.get('fecha')+'T12:00:00').toISOString(),viaje:fd.get('viaje'),referencia:fd.get('referencia'),observaciones:fd.get('observaciones'),montoEntregado:total,detalles:det}});o.remove();await window.ccAntLoad?.(true);if(typeof window.ccAntPostCreateComun==='function')window.ccAntPostCreateComun(r);else alert('Anticipo creado: '+(r.folio||''))}catch(e){alert(e.message||e);btn.disabled=false}};
  }

  async function openConfig(destinoId,tipoId=''){
    if(!can('catalogos'))return alert('Sin permiso para editar catálogos de Anticipos.');
    await loadV29();const d=(DATA.destinos||[]).find(x=>x.id===destinoId);if(!d)return alert('Destino no encontrado.');
    const types=active(DATA.tiposUnidadAnticipos),concepts=active(DATA.conceptos).filter(x=>x.uso_operadores!==false),o=shell('ccAntCfgV29Modal',(tipoId?'Editar':'Nueva')+' configuración · '+d.nombre,'Una configuración corresponde a Destino + Tipo de unidad y puede contener varios conceptos.','900px'),body=o.querySelector('[data-body]');
    body.innerHTML='<form id="ccAntCfgV29Form"><div class="cc-field"><label>Tipo de unidad *</label><select name="tipo" required>'+opts(types,x=>x.nombre,tipoId)+'</select></div><div class="cc-field" style="margin-top:10px"><label>Buscar concepto</label><input type="search" id="ccAntCfgV29Search" class="cc-input" placeholder="Escribe para filtrar conceptos..."></div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:10px 0 7px"><div><strong>Conceptos de la configuración</strong><div class="cc-note">Selecciona todos los que apliquen; cada uno puede tener monto y opción Default.</div></div><button type="button" class="cc-btn cc-btn-light" id="ccAntCfgV29All">Seleccionar visibles</button></div><div id="ccAntCfgV29Rows" style="display:grid;gap:6px"></div><div style="text-align:right;margin-top:14px"><button class="cc-btn cc-btn-primary" type="submit">Guardar configuración</button></div></form>';
    const f=body.querySelector('#ccAntCfgV29Form'),box=body.querySelector('#ccAntCfgV29Rows'),search=body.querySelector('#ccAntCfgV29Search');
    function fill(){const tid=f.tipo.value,cfg=(DATA.destinoConceptos||[]).filter(x=>x.destinoId===d.id&&x.tipoUnidadAnticipoId===tid),mp=new Map(cfg.map(x=>[String(x.conceptoId),x]));box.innerHTML=concepts.map(c=>{const x=mp.get(String(c.id)),on=x&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO';return '<div class="cc-ant-v29-config-row" data-name="'+esc(String(c.nombre).toLowerCase())+'"><input type="checkbox" data-use="'+esc(c.id)+'" '+(on?'checked':'')+'><strong>'+esc(c.nombre)+'</strong><input type="number" min="0" step="0.01" data-amt="'+esc(c.id)+'" value="'+Number(x?.monto||0)+'" placeholder="Monto"><label style="font-size:10px;font-weight:800"><input type="checkbox" data-def="'+esc(c.id)+'" '+(x?.esDefault||x?.es_default?'checked':'')+'> Default</label></div>'}).join('');filter()}
    function filter(){const q=(search.value||'').toLowerCase().trim();[...box.children].forEach(r=>r.style.display=!q||r.dataset.name.includes(q)?'':'none')}
    f.tipo.onchange=fill;search.oninput=filter;fill();
    body.querySelector('#ccAntCfgV29All').onclick=()=>[...box.children].filter(r=>r.style.display!=='none').forEach(r=>r.querySelector('[data-use]').checked=true);
    f.onsubmit=async ev=>{ev.preventDefault();const tid=f.tipo.value;if(!tid)return alert('Selecciona Tipo de unidad.');const btn=f.querySelector('[type=submit]');btn.disabled=true;try{for(const c of concepts){const use=!!box.querySelector('[data-use="'+CSS.escape(String(c.id))+'"]')?.checked,amt=Number(box.querySelector('[data-amt="'+CSS.escape(String(c.id))+'"]')?.value||0),def=!!box.querySelector('[data-def="'+CSS.escape(String(c.id))+'"]')?.checked;await rpc('cc_ant_save_destination_concept',{p_item:{destinoId:d.id,conceptoId:c.id,tipoUnidadAnticipoId:tid,monto:amt,esDefault:use&&def,estatus:use?'ACTIVO':'INACTIVO'}})}o.remove();await loadV29();renderConfigPanel()}catch(e){alert(e.message||e);btn.disabled=false}};
  }

  function renderConfigPanel(){
    const view=document.getElementById('ccAntViewCatalogos');if(!view)return;
    let host=document.getElementById('ccAntCfgV29');if(!host){host=document.createElement('div');host.id='ccAntCfgV29';host.style='margin:14px 0';const old=document.getElementById('ccAntCatalogV12');old?.insertAdjacentElement('afterend',host)}
    const destinations=active(DATA.destinos),cfg=DATA.destinoConceptos||[];
    host.innerHTML='<div class="cc-toolbar"><div><strong>Configuración por destino</strong><div class="cc-note">Cada destino puede tener varias configuraciones por Tipo de unidad. Cada configuración puede incluir varios conceptos.</div></div></div><div class="cc-ant-v29-config-grid">'+(destinations.map(d=>{const rows=cfg.filter(x=>x.destinoId===d.id&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO'),groups={};rows.forEach(x=>(groups[x.tipoUnidadAnticipoId]??=[]).push(x));const blocks=Object.entries(groups).map(([tid,xs])=>'<div style="margin-top:9px;padding-top:9px;border-top:1px solid #e2e8f0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong style="font-size:11px">'+esc(xs[0]?.tipoUnidadAnticipo||'Tipo de unidad')+'</strong>'+(can('catalogos')?'<button class="cc-btn cc-btn-light" data-v29-editcfg="'+esc(d.id)+'" data-tipo="'+esc(tid)+'">Editar</button>':'')+'</div>'+xs.map(x=>'<div style="padding:4px 0 0 9px;font-size:10px">• '+esc(x.concepto)+' · '+money(x.monto)+(x.esDefault||x.es_default?' · <b>DEFAULT</b>':'')+'</div>').join('')+'</div>').join('');return '<div class="cc-ant-v29-config-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><strong>'+esc(d.nombre)+'</strong><div class="cc-note">'+Object.keys(groups).length+' configuración(es) · '+rows.length+' concepto(s)</div></div>'+(can('catalogos')?'<button class="cc-btn cc-btn-primary" data-v29-newcfg="'+esc(d.id)+'">+ Configuración</button>':'')+'</div>'+(blocks||'<div class="cc-note" style="margin-top:9px">Sin configuración. Agrega Tipo de unidad y conceptos.</div>')+'</div>'}).join('')||'<div class="cc-note">Primero crea un destino.</div>')+'</div>';
    host.onclick=e=>{const n=e.target.closest('[data-v29-newcfg]'),ed=e.target.closest('[data-v29-editcfg]');if(n)return openConfig(n.dataset.v29Newcfg);if(ed)return openConfig(ed.dataset.v29Editcfg,ed.dataset.tipo)};
    const legacy=document.getElementById('ccAntCatalogV12');if(legacy){[...legacy.querySelectorAll(':scope > div')].forEach(x=>{const t=x.textContent||'';if(/Configuración por destino/i.test(t)&&!x.querySelector('.cc-ant-report-grid:first-child'))x.style.display='none'})}
  }

  function renameCatalogs(){
    const root=document.getElementById('ccPanelAnticipos');if(!root)return;root.querySelectorAll('label,strong,.cc-note').forEach(el=>{if(el.children.length)return;const t=el.textContent||'',n=t.replace(/Tipo de viaje\s*\/\s*anticipo/ig,'Tipo de unidad').replace(/^Tipos de viaje\s*\/\s*anticipo$/i,'Tipos de unidad');if(n!==t)el.textContent=n});
  }

  function wrapCore(){
    if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__v29){const old=window.ccAntRender,w=function(){const r=old.apply(this,arguments);setTimeout(()=>{try{applyList();renameCatalogs()}catch(e){console.warn('Anticipos v29 render',e)}},0);return r};w.__v29=true;window.ccAntRender=w}
    if(typeof window.ccAntLoad==='function'&&!window.ccAntLoad.__v29){const old=window.ccAntLoad,w=async function(){const r=await old.apply(this,arguments);try{await loadV29();applyList();renameCatalogs();renderConfigPanel()}catch(e){console.warn('Anticipos v29 load',e)}return r};w.__v29=true;window.ccAntLoad=w}
    window.ccAntOpenOperatorForm=openOperatorV29;
  }

  async function refresh(){try{await loadV29();applyList();renameCatalogs();renderConfigPanel()}catch(e){console.warn('Anticipos v29',e)}}

  async function boot(){
    installStyle();if(!window.gmSupabase||!window.CC_AUTH_READY)return setTimeout(boot,400);wrapCore();await refresh();
    document.addEventListener('change',e=>{if(['ccAntOperadorFiltro','ccAntEstatusFiltro','ccAntDesde','ccAntHasta'].includes(e.target?.id))setTimeout(applyList,0)},true);
    document.addEventListener('click',e=>{if(e.target.closest?.('#ccPanelAnticipos [data-antv="catalogos"]'))setTimeout(()=>{loadV29().then(()=>{renameCatalogs();renderConfigPanel()}).catch(()=>{})},140);if(e.target.closest?.('#ccAntNuevoBtn'))setTimeout(()=>{window.ccAntOpenOperatorForm=openOperatorV29},40);if(e.target.closest?.('#ccTabAnticipos,[data-antv="anticipos"]'))setTimeout(refresh,120)},true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200));else setTimeout(boot,1200);
})();
