(function(){
  let ADMIN_DATA=null, ADMIN_TAB='PENDIENTES', ADMIN_QUERY='';
  const escA=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=v=>{try{return new Date(v).toLocaleDateString('es-MX')}catch(_){return '—'}};
  const fmtMoney=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const matchOp=v=>!ADMIN_QUERY||norm(v).includes(norm(ADMIN_QUERY));
  function isAdmin(){return !!(HS?.usuario?.esAdminGlobal||ANT?.usuario?.esAdminGlobal||HIST?.usuario?.esAdminGlobal);}
  function ensureUi(){
    if(document.getElementById('adminOps'))return;
    const style=document.createElement('style');
    style.textContent='.admin-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.admin-kpi{background:#f8fafc;border:1px solid #dbeafe;border-radius:14px;padding:11px}.admin-kpi b{display:block;font-size:20px}.admin-kpi span{font-size:9px;font-weight:900;color:#64748b}.admin-search{display:flex;gap:7px;margin:0 0 10px}.admin-search input{flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:12px;padding:11px 12px;font-size:14px;background:#fff}.admin-search button{border:0;border-radius:12px;padding:0 13px;background:#e2e8f0;color:#334155;font-weight:900}.admin-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.admin-tabs button{border:1px solid #cbd5e1;background:#fff;border-radius:11px;padding:9px 6px;font-weight:900;font-size:11px}.admin-tabs button.active{background:#1e3a8a;color:#fff;border-color:#1e3a8a}.admin-row{border:1px solid #dbeafe;border-radius:15px;padding:12px;margin-bottom:9px;background:#fff}.admin-row h4{margin:0 0 5px;font-size:14px}.admin-row small{display:block;color:#64748b;margin-top:3px}.admin-row .op{font-weight:900;color:#1d4ed8}.admin-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.admin-actions button{border:0;border-radius:10px;padding:8px 10px;font-size:10px;font-weight:900}.a-primary{background:#2563eb;color:#fff}.a-green{background:#15803d;color:#fff}.a-red{background:#b91c1c;color:#fff}.a-light{background:#e2e8f0;color:#334155}.admin-empty{text-align:center;padding:24px 8px;color:#64748b}.admin-modal{position:fixed;inset:0;background:#0f172aaa;z-index:99999;padding:18px;display:flex;align-items:center;justify-content:center}.admin-modal-card{width:min(520px,100%);max-height:88dvh;overflow:auto;background:#fff;border-radius:20px;padding:16px}.admin-modal-card h3{margin:0 0 12px}.admin-modal-card label{display:block;font-size:11px;font-weight:900;color:#475569;margin:9px 0 5px}.admin-modal-card input,.admin-modal-card select,.admin-modal-card textarea{width:100%;border:1px solid #cbd5e1;border-radius:11px;padding:10px;font-size:14px}.admin-modal-card textarea{min-height:70px}@media(max-width:420px){.admin-kpis{grid-template-columns:1fr 1fr}.admin-tabs{grid-template-columns:1fr}}';
    document.head.appendChild(style);
    const s=document.createElement('section');s.id='adminOps';s.className='card hidden';
    s.innerHTML='<div class="head"><h2>Panel ADMIN</h2><p>Todos los operadores · operación móvil</p></div><div class="body"><button id="adminCasetasTest" class="btn green" type="button" style="margin-bottom:12px">🧾 Prueba lectura · Casetas</button><div id="adminKpis" class="admin-kpis"></div><div class="admin-search"><input id="adminOperatorSearch" type="search" placeholder="Buscar operador" autocomplete="off"><button id="adminOperatorClear" type="button">Limpiar</button></div><div class="admin-tabs"><button id="admPend" class="active">Pendientes</button><button id="admHistH">Hist. hojas</button><button id="admHistA">Hist. anticipos</button></div><div id="adminRows"></div><button id="adminRefresh" class="btn secondary" type="button">Actualizar</button><button id="adminLogout" class="btn secondary" type="button" style="margin-top:8px">Cerrar sesión</button></div>';
    document.querySelector('.shell').appendChild(s);
    screens.push('adminOps');
    document.getElementById('admPend').onclick=()=>{ADMIN_TAB='PENDIENTES';renderAdminRows()};
    document.getElementById('admHistH').onclick=()=>{ADMIN_TAB='HOJAS';renderAdminRows()};
    document.getElementById('admHistA').onclick=()=>{ADMIN_TAB='ANT';renderAdminRows()};
    document.getElementById('adminOperatorSearch').oninput=e=>{ADMIN_QUERY=e.target.value||'';renderAdminRows()};
    document.getElementById('adminOperatorClear').onclick=()=>{ADMIN_QUERY='';const i=document.getElementById('adminOperatorSearch');if(i)i.value='';renderAdminRows()};
    document.getElementById('adminRefresh').onclick=()=>loadAdmin(true).catch(e=>alert(e.message||e));
    document.getElementById('adminLogout').onclick=logout;document.getElementById('adminCasetasTest').onclick=openCasetasTest;
  }
  async function loadAdmin(showScreen){
    const r=await sb.rpc('app_mobile_admin_dashboard');
    if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo cargar panel ADMIN');
    ADMIN_DATA=r.data;renderAdminKpis();renderAdminRows();if(showScreen)show('adminOps');
  }
  function renderAdminKpis(){
    const h=ADMIN_DATA?.hojasPendientes||[],p=ADMIN_DATA?.precapturasPendientes||[];
    const conEv=h.filter(x=>x.evidencia).length;
    document.getElementById('adminKpis').innerHTML='<div class="admin-kpi"><b>'+h.length+'</b><span>HOJAS ASIGNADAS</span></div><div class="admin-kpi"><b>'+conEv+'</b><span>HOJAS CON EVIDENCIA</span></div><div class="admin-kpi"><b>'+p.length+'</b><span>PRECAPTURAS PEND.</span></div>';
  }
  function setTabButtons(){
    document.getElementById('admPend').classList.toggle('active',ADMIN_TAB==='PENDIENTES');
    document.getElementById('admHistH').classList.toggle('active',ADMIN_TAB==='HOJAS');
    document.getElementById('admHistA').classList.toggle('active',ADMIN_TAB==='ANT');
  }
  function renderAdminRows(){
    if(!ADMIN_DATA)return;setTabButtons();const root=document.getElementById('adminRows');
    if(ADMIN_TAB==='PENDIENTES'){
      const hs=(ADMIN_DATA.hojasPendientes||[]).filter(x=>matchOp(x.operadorNombre)), ps=(ADMIN_DATA.precapturasPendientes||[]).filter(x=>matchOp(x.operadorNombre));
      root.innerHTML='<div class="section-title">HOJAS POR COMPROBAR ('+hs.length+')</div>'+(hs.length?hs.map(x=>'<div class="admin-row"><h4>📄 '+escA(x.folio)+'</h4><small class="op">Operador: '+escA(x.operadorNombre||'—')+'</small><small>Responsable: '+escA(x.responsable||'—')+'</small><small>'+(x.evidencia?'✅ Evidencia cargada · '+escA(x.evidencia.cliente||'')+' · '+escA(x.evidencia.tipoViaje||''):'⚠️ Sin evidencia móvil')+'</small><div class="admin-actions"><button class="a-green" data-adm-hoja="'+escA(x.folioId)+'">Comprobar hoja</button><button class="a-light" data-adm-blanco="'+escA(x.folioId)+'">Devuelta en blanco</button></div></div>').join(''):'<div class="admin-empty">'+(ADMIN_QUERY?'Sin hojas pendientes para este operador.':'Sin hojas pendientes.')+'</div>')+'<div class="section-title">PRECAPTURAS DE ANTICIPOS ('+ps.length+')</div>'+(ps.length?ps.map(x=>'<div class="admin-row"><h4>💳 '+escA(x.anticipoFolio||'Anticipo')+' · '+fmtMoney(x.monto)+'</h4><small class="op">Operador: '+escA(x.operadorNombre||'—')+'</small><small>'+escA(x.concepto||'—')+' · '+escA(x.tipoDocumento||'—')+'</small><small>'+escA(x.destino||'')+(x.unidad?' · Unidad '+escA(x.unidad):'')+'</small>'+(x.observaciones?'<small>Obs: '+escA(x.observaciones)+'</small>':'')+'<div class="admin-actions"><button class="a-green" data-adm-accept="'+escA(x.id)+'">Aceptar</button><button class="a-red" data-adm-reject="'+escA(x.id)+'">Rechazar</button></div></div>').join(''):'<div class="admin-empty">'+(ADMIN_QUERY?'Sin precapturas pendientes para este operador.':'Sin precapturas pendientes.')+'</div>');
      root.querySelectorAll('[data-adm-hoja]').forEach(b=>b.onclick=()=>openHojaModal(b.dataset.admHoja));
      root.querySelectorAll('[data-adm-blanco]').forEach(b=>b.onclick=()=>returnBlank(b.dataset.admBlanco));
      root.querySelectorAll('[data-adm-accept]').forEach(b=>b.onclick=()=>acceptPre(b.dataset.admAccept));
      root.querySelectorAll('[data-adm-reject]').forEach(b=>b.onclick=()=>rejectPre(b.dataset.admReject));
    }else if(ADMIN_TAB==='HOJAS'){
      const rows=(ADMIN_DATA.historialHojas||[]).filter(x=>matchOp(x.operador));root.innerHTML=rows.length?rows.map(x=>'<div class="admin-row"><h4>📄 '+escA(x.folio||'Hoja')+'</h4><small class="op">'+escA(x.operador||'—')+'</small><small>'+fmtDate(x.fecha)+' · '+escA(x.tipo||'')+'</small><small>'+escA(x.cliente||'—')+' · '+escA(x.tipoViaje||'—')+' · '+escA(x.clasificacion||'—')+'</small></div>').join(''):'<div class="admin-empty">'+(ADMIN_QUERY?'Sin historial de hojas para este operador.':'Sin historial de hojas.')+'</div>';
    }else{
      const rows=(ADMIN_DATA.historialAnticipos||[]).filter(x=>matchOp(x.operador));root.innerHTML=rows.length?rows.map(x=>'<div class="admin-row"><h4>💳 '+escA(x.folio||'Anticipo')+' · '+fmtMoney(x.monto)+'</h4><small class="op">'+escA(x.operador||'—')+'</small><small>'+fmtDate(x.fecha)+' · '+escA(x.concepto||'—')+'</small><small>'+escA(x.tipoDocumento||'—')+' · '+escA(x.estatus||'')+'</small></div>').join(''):'<div class="admin-empty">'+(ADMIN_QUERY?'Sin historial de anticipos para este operador.':'Sin historial de anticipos.')+'</div>';
    }
  }
  function openHojaModal(id){
    const x=(ADMIN_DATA?.hojasPendientes||[]).find(r=>String(r.folioId)===String(id));if(!x)return;
    const ev=x.evidencia||{};const ov=document.createElement('div');ov.className='admin-modal';ov.id='admHojaModal';
    const clientes=HS?.clientes||[], tipos=HS?.tiposViaje||[], clas=HS?.clasificaciones||[];
    ov.innerHTML='<div class="admin-modal-card"><h3>Comprobar '+escA(x.folio)+'</h3><div class="operator">Operador: <b>'+escA(x.operadorNombre||'—')+'</b><br>'+(ev.id?'Evidencia móvil disponible':'Sin evidencia móvil')+'</div><label>Fecha de uso</label><input id="admFecha" type="date" value="'+today()+'"><label>Cliente</label><select id="admCliente">'+opts(clientes,'cliente')+'</select><label>Tipo de viaje</label><select id="admTipo">'+opts(tipos,'tipo')+'</select><label>Clasificación</label><select id="admClas"></select><label>Observaciones</label><textarea id="admObs">'+escA(ev.dondeUtilizado||'')+'</textarea><div class="actions"><button id="admCancel" class="btn secondary" type="button">Cancelar</button><button id="admConfirm" class="btn green" type="button">Comprobar</button></div></div>';
    document.body.appendChild(ov);
    const c=document.getElementById('admCliente'),t=document.getElementById('admTipo'),cl=document.getElementById('admClas');
    if(ev.clienteId)c.value=ev.clienteId;if(ev.tipoViajeId)t.value=ev.tipoViajeId;
    const fillClas=()=>{const xs=clas.filter(z=>String(z.tipoViajeId)===String(t.value));cl.innerHTML=opts(xs,'clasificación');if(ev.clasificacionId&&xs.some(z=>String(z.id)===String(ev.clasificacionId)))cl.value=ev.clasificacionId;};fillClas();t.onchange=fillClas;
    document.getElementById('admCancel').onclick=()=>ov.remove();
    document.getElementById('admConfirm').onclick=async()=>{const b=document.getElementById('admConfirm');b.disabled=true;try{if(!c.value||!t.value||!cl.value)throw new Error('Completa cliente, tipo y clasificación.');const r=await sb.rpc('hs_mark_used',{p_item:{folioId:x.folioId,fechaUso:document.getElementById('admFecha').value,clienteId:c.value,tipoViajeId:t.value,clasificacionId:cl.value,observaciones:document.getElementById('admObs').value.trim()}});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo comprobar');ov.remove();await Promise.all([loadAll(false),loadAdmin(false)]);alert('Hoja comprobada correctamente.');}catch(e){alert(e.message||e)}finally{b.disabled=false;}};
  }
  function openCasetasTest(){
    if(!isAdmin())return;
    const ov=document.createElement('div');ov.className='admin-modal';ov.id='admCasetasTest';
    ov.innerHTML='<div class="admin-modal-card"><h3>🧾 Prueba lectura de Caseta</h3><div class="operator"><b>Modo de prueba ADMIN</b><br>Esta prueba no afecta Caja Casetas, anticipos ni saldos. Toma una foto y revisa los datos detectados.</div><label>Foto del ticket *</label><div class="photo"><input id="casTestPhoto" type="file" accept="image/*" capture="environment"><div id="casTestInfo" class="muted">Toma una foto clara del comprobante.</div><img id="casTestPreview"></div><button id="casTestRead" class="btn green" type="button" style="margin-top:10px" disabled>Leer ticket</button><div id="casTestFields" class="hidden"><label>Fecha</label><input id="casTestDate" type="date"><label>Importe</label><input id="casTestAmount" type="number" min="0" step=".01"><label>Folio</label><input id="casTestFolio"><label>Código / cadena de facturación</label><input id="casTestCode" autocapitalize="characters"><label>Plaza / caseta</label><input id="casTestPlaza"><label>Texto detectado / observaciones</label><textarea id="casTestText"></textarea><div class="notice">Revisa y corrige cualquier dato. En esta etapa no se guarda ni se descuenta saldo.</div></div><div class="actions"><button id="casTestClose" class="btn secondary" type="button">Cerrar</button><button id="casTestAnother" class="btn secondary hidden" type="button">Otra foto</button></div></div>';
    document.body.appendChild(ov);let file=null;
    const inp=document.getElementById('casTestPhoto'),read=document.getElementById('casTestRead'),preview=document.getElementById('casTestPreview'),info=document.getElementById('casTestInfo');
    inp.onchange=async()=>{try{file=inp.files[0]?await compress(inp.files[0]):null;if(!file)return;preview.src=URL.createObjectURL(file);preview.style.display='block';info.textContent='Foto lista para prueba.';read.disabled=false}catch(e){alert(e.message||e)}};
    read.onclick=async()=>{if(!file)return;read.disabled=true;read.textContent='Analizando…';try{
      /* Primera prueba: lectura local asistida. BarcodeDetector puede leer QR/códigos cuando el navegador lo soporta. */
      let code='',raw='';if('BarcodeDetector' in window){try{const det=new BarcodeDetector({formats:['qr_code']});const im=await createImageBitmap(file);const rs=await det.detect(im);if(im.close)im.close();if(rs&&rs[0]){code=rs[0].rawValue||'';raw='QR detectado: '+code}}catch(_){}}
      document.getElementById('casTestCode').value=code;document.getElementById('casTestText').value=raw||'No se detectó QR automáticamente. Captura/corrige los datos visibles para evaluar el flujo.';document.getElementById('casTestFields').classList.remove('hidden');document.getElementById('casTestAnother').classList.remove('hidden');info.textContent=code?'Código QR detectado. Revisa los demás campos.':'Foto procesada. Revisa/captura los campos para esta prueba.';
    }catch(e){alert(e.message||e)}finally{read.disabled=false;read.textContent='Leer ticket'}};
    document.getElementById('casTestAnother').onclick=()=>{inp.value='';file=null;preview.style.display='none';read.disabled=true;document.getElementById('casTestFields').classList.add('hidden');document.getElementById('casTestAnother').classList.add('hidden');info.textContent='Toma una foto clara del comprobante.'};
    document.getElementById('casTestClose').onclick=()=>ov.remove();
  }
  async function returnBlank(id){if(!confirm('¿Marcar esta hoja como devuelta en blanco?'))return;try{const r=await sb.rpc('hs_return_blank',{p_item:{folioId:id,fecha:today(),observaciones:'Devuelta en blanco desde app móvil ADMIN'}});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo devolver');await Promise.all([loadAll(false),loadAdmin(false)]);}catch(e){alert(e.message||e)}}
  async function acceptPre(id){if(!confirm('¿Aceptar esta precaptura y pasarla a comprobación?'))return;try{const r=await sb.rpc('cc_ant_mobile_accept_precapture',{p_id:id});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo aceptar');await Promise.all([loadAll(false),loadAdmin(false)]);}catch(e){alert(e.message||e)}}
  async function rejectPre(id){const motivo=prompt('Motivo del rechazo:','Corregir información');if(motivo===null)return;try{const r=await sb.rpc('cc_ant_mobile_reject_precapture',{p_id:id,p_motivo:motivo});if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'No se pudo rechazar');await Promise.all([loadAll(false),loadAdmin(false)]);}catch(e){alert(e.message||e)}}
  ensureUi();
  const prev=renderMenu;renderMenu=function(){prev();if(isAdmin())loadAdmin(true).catch(e=>{show('menu');alert(e.message||e)});};
  const sess=sb.auth.getSession();sess.then(r=>{if(r.data?.session&&isAdmin())loadAdmin(true).catch(()=>{});});
})();