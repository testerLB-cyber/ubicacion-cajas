/* Tráfico App Profesional · Control de Hojas de Servicio · v104 ÚNICA */
(function(){
  'use strict';
  if(window.__HS_V104__) return;
  window.__HS_V104__='104';

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const six=v=>String(Math.max(0,Number(v)||0)).padStart(6,'0');
  const fmt=v=>v?new Date(v).toLocaleString('es-MX'):'—';
  const today=()=>new Date().toISOString().slice(0,10);
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const perm=p=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('hojas_servicio.'+p));
  const options=(xs,label,selected='')=>'<option value="">Seleccionar…</option>'+xs.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(label(x))+'</option>').join('');

  let D={series:[],anios:[],responsables:[],operadores:[],beneficiarios:[],clientes:[],resumen:{},asignacionesResponsable:[],foliosAsignadosOperador:[],asignacionesOperador:[],comprobaciones:[],ultimosFolios:[]};
  let currentView='Control';

  async function rpc(name,args={}){
    if(!sb()) throw new Error('Supabase no está disponible.');
    const r=await sb().rpc(name,args);
    if(r.error) throw r.error;
    if(r.data?.ok===false) throw new Error(r.data.error||'Operación no disponible.');
    return r.data;
  }
  async function load(){ D=await rpc('hs_list'); renderAll(); return D; }

  function modal(title,body,{width='820px',saveLabel='',onSave=null}={}){
    const ov=document.createElement('div');
    ov.className='hs104-modal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100500;display:flex;align-items:center;justify-content:center;padding:14px';
    ov.innerHTML='<div style="width:min('+width+',97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px #0f172a55">'+
      '<div style="background:#0f172a;color:white;padding:14px 16px;display:flex;justify-content:space-between;gap:10px;align-items:center"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:white;font-size:23px;cursor:pointer">×</button></div>'+
      '<div data-body style="padding:16px">'+body+'</div></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();
    ov.querySelector('[data-x]').onclick=close;
    ov.addEventListener('click',e=>{if(e.target===ov)close()});
    if(onSave){
      const form=ov.querySelector('form');
      form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;try{await onSave(new FormData(form),form);close();await load()}catch(err){alert(err?.message||err);if(btn)btn.disabled=false}};
      const b=form.querySelector('[type=submit]');if(b&&saveLabel)b.textContent=saveLabel;
    }
    ov.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=close);
    return ov;
  }

  function acceptanceUrl(token){const u=new URL('hojas-servicio-aceptar.html',location.href);u.search='?t='+encodeURIComponent(token);return u.toString()}
  async function copy(text){try{await navigator.clipboard.writeText(text);return true}catch(_){return false}}
  async function sendAssignmentEmail(assignmentId,token){
    const url=acceptanceUrl(token);
    let emailed=false, msg='';
    try{
      const r=await sb().functions.invoke('cc-send-service-sheet-email',{body:{assignmentId,acceptanceUrl:url}});
      if(r.error) throw r.error;
      if(r.data?.ok){emailed=true;msg='Correo enviado a '+(r.data.to||'responsable')+'.'}
      else throw new Error(r.data?.message||r.data?.error||'No se pudo enviar correo.');
    }catch(e){ msg=e?.message||String(e); }
    await copy(url);
    alert(emailed?msg+'\n\nEl enlace también quedó copiado.':'Asignación creada. No se envió correo automáticamente: '+msg+'\n\nEl enlace quedó copiado para compartirlo manualmente.');
    if(!emailed) prompt('Enlace de aceptación:',url);
  }

  function installStyles(){
    if(document.getElementById('hs104-style'))return;
    const st=document.createElement('style');st.id='hs104-style';st.textContent=`
      #ccPanelHojasServicio .hs104-nav{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
      #ccPanelHojasServicio .hs104-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px;box-shadow:0 7px 18px #0f172a0a}
      #ccPanelHojasServicio .hs104-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px}
      #ccPanelHojasServicio .hs-manual-photo-box{margin:0 0 12px;padding:10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}
      #ccPanelHojasServicio .hs-manual-photo-box label{display:block;font-weight:800;color:#334155;margin-bottom:7px}
      #ccPanelHojasServicio .hs-photo-methods{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:auto}
      #ccPanelHojasServicio .hs-photo-methods .cc-btn{width:auto;min-width:0;min-height:36px;white-space:nowrap;font-size:12px;padding:8px 11px}
      #ccPanelHojasServicio .hs-photo-methods [data-file]{display:none}
      #ccPanelHojasServicio .hs-manual-photo-status{margin-top:7px;color:#64748b}
      #ccPanelHojasServicio .hs104-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      #ccPanelHojasServicio .hs104-note{font-size:10px;color:#64748b;margin-top:3px}
      #ccPanelHojasServicio .hs104-pill{display:inline-block;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;background:#f1f5f9;color:#334155}
      #ccPanelHojasServicio .hs104-danger{background:#fff7ed;color:#9a3412}
      #ccPanelHojasServicio .hs104-ok{background:#dcfce7;color:#166534}
      #ccPanelHojasServicio .hs104-row{display:grid;gap:10px;margin-bottom:10px}
      #hs104CompList .hs-list-row{padding:11px 13px;margin-bottom:7px;box-shadow:none;border-radius:10px}
      #hs104CompList .hs-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      #hs104CompList .hs-list-info{min-width:0}
      #hs104CompList .hs-list-info strong{font-size:13px;color:#0f172a}
      #hs104CompList .hs-list-info .hs104-note{font-size:11px;line-height:1.5}
      #hs104CompList .hs-list-head-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
      #hs104CompList .hs-list-edit-area{display:none;position:fixed;inset:0;z-index:100700;padding:14px;background:rgba(15,23,42,.78);align-items:center;justify-content:center}
      #hs104CompList .hs-list-modal-open .hs-list-edit-area{display:flex}
      #hs104CompList .hs-list-dialog{width:min(780px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 70px #0005}
      #hs104CompList .hs-list-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;background:#0f172a;color:#fff}
      #hs104CompList .hs-list-dialog-body{padding:16px}
      #hs104CompList .hs-list-dialog-close{border:0;background:transparent;color:#fff;font-size:25px;cursor:pointer}
      #hs104CompList .hs-list-modal-open{position:static}
      #hs104CompList .hs-list-dialog-body>.cc-field{margin:10px 0}
      #hs104CompList .hs-list-dialog-body>.hs104-actions{margin-top:12px}
      @media(max-width:700px){#ccPanelHojasServicio .cc-toolbar{align-items:flex-start;gap:8px}#ccPanelHojasServicio .hs104-actions{justify-content:flex-start}}
      @media(max-width:460px){#hs104CompList .hs-list-head{align-items:flex-start}#hs104CompList .hs-list-head-actions{flex-direction:column;align-items:flex-end}#hs104CompList .hs-list-edit-area{padding:6px}#hs104CompList .hs-list-dialog{max-height:98vh}#ccPanelHojasServicio .hs-photo-methods .cc-btn{font-size:11px;padding:7px 8px}}
    `;document.head.appendChild(st);
  }

  function install(){
    installStyles();
    const root=document.getElementById('controlCajasSection'), tabs=root?.querySelector('.cc-tabs');
    if(!root||!tabs)return false;
    document.querySelectorAll('#ccTabHojasServicio,#ccPanelHojasServicio').forEach(x=>x.remove());
    const btn=document.createElement('button');btn.id='ccTabHojasServicio';btn.className='cc-tab';btn.innerHTML='<i class="fa-solid fa-file-lines mr-1"></i>Control de Hojas de Servicio';
    const ant=[...tabs.querySelectorAll('.cc-tab')].find(x=>(x.textContent||'').includes('Control de Anticipos'));ant?ant.after(btn):tabs.appendChild(btn);
    const p=document.createElement('div');p.id='ccPanelHojasServicio';p.className='cc-panel';
    p.innerHTML='<div class="cc-toolbar"><div><strong>Control de Hojas de Servicio</strong><div class="cc-note">Versión única v104 · folios, custodia, entrega y comprobación.</div></div><button class="cc-btn cc-btn-light" id="hs104Refresh"><i class="fa-solid fa-rotate"></i> Actualizar</button></div><div id="hs104Kpis" class="cc-ant-kpis"></div><div class="hs104-nav" id="hs104Nav"></div><div id="hs104View"></div>';
    root.appendChild(p);
    btn.style.display=perm('ver')?'':'none';
    btn.onclick=()=>{if(!perm('ver'))return alert('Sin permiso para Hojas de Servicio.');root.querySelectorAll('.cc-tab').forEach(x=>x.classList.remove('active'));root.querySelectorAll('.cc-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');p.classList.add('active');load().catch(e=>alert(e.message||e));};
    p.querySelector('#hs104Refresh').onclick=()=>load().catch(e=>alert(e.message||e));
    window.ccHsOpen=()=>btn.click();
    return true;
  }

  const navItems=[['Control','fa-location-crosshairs'],['Folios','fa-file-lines'],['Responsables','fa-user-shield'],['Operadores','fa-users'],['Comprobacion','fa-clipboard-check'],['Catalogos','fa-list']];
  function renderNav(){const n=document.getElementById('hs104Nav');if(!n)return;n.innerHTML=navItems.map(([v,i])=>'<button class="cc-btn '+(currentView===v?'cc-btn-primary':'cc-btn-light')+'" data-v="'+v+'"><i class="fa-solid '+i+' mr-1"></i>'+({Comprobacion:'Comprobación'}[v]||v)+'</button>').join('');n.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{currentView=b.dataset.v;renderNav();renderView()})}
  function renderKpis(){const r=D.resumen||{},k=document.getElementById('hs104Kpis');if(!k)return;k.innerHTML=[['Total',r.total],['Nuevas',r.nuevos],['Pend. aceptación',r.pendienteAceptacion],['Con responsable',r.enCustodia],['Pend. comprobar',r.asignadosOperador],['Comprobadas',r.utilizados]].map(x=>'<div class="cc-ant-kpi"><small>'+x[0]+'</small><strong>'+Number(x[1]||0).toLocaleString('es-MX')+'</strong></div>').join('')}
  function renderAll(){renderKpis();renderNav();renderView()}
  function renderView(){if(document.querySelector('#hs104CompList .hs-list-modal-open'))document.body.style.overflow='';({Control:renderControl,Folios:renderFolios,Responsables:renderResponsables,Operadores:renderOperadores,Comprobacion:renderComprobacion,Catalogos:renderCatalogos}[currentView]||renderControl)()}
  const view=()=>document.getElementById('hs104View');

  function renderControl(){
    const v=view();if(!v)return;v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Rastreo general</strong><div class="hs104-note">Busca por folio, responsable, operador, beneficiario o servicio.</div></div><div class="hs104-actions"><select id="hs104CtlStatus" class="cc-input"><option value="">Todos los estados</option><option value="NUEVO">Nuevas</option><option value="PENDIENTE_ACEPTACION">Pend. aceptación</option><option value="EN_CUSTODIA">Con responsable</option><option value="ASIGNADO_OPERADOR">Pend. comprobar</option><option value="UTILIZADO">Comprobadas</option></select><input id="hs104CtlSearch" class="cc-input" type="search" placeholder="Buscar..."></div></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>ESTADO</th><th>RESPONSABLE</th><th>PERSONA</th><th>SERVICIO / CLIENTE</th></tr></thead><tbody id="hs104CtlBody"></tbody></table></div></div>';
    const draw=()=>{const q=norm(v.querySelector('#hs104CtlSearch').value),st=v.querySelector('#hs104CtlStatus').value;let rows=D.ultimosFolios||[];rows=rows.filter(x=>(!st||x.estatus===st)&&(!q||norm([x.folio,x.responsable_nombre,x.operador_nombre,x.beneficiario_nombre,x.servicio,x.cliente_nombre].join(' ')).includes(q)));v.querySelector('#hs104CtlBody').innerHTML=rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td><span class="hs104-pill">'+esc(x.estatus)+'</span></td><td>'+esc(x.responsable_nombre||'—')+'</td><td>'+esc(x.beneficiario_nombre||x.operador_nombre||'—')+'</td><td>'+esc(x.servicio||'—')+'<div class="hs104-note">'+esc(x.cliente_nombre||'')+'</div></td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;padding:22px">Sin resultados.</td></tr>'};
    v.querySelector('#hs104CtlSearch').oninput=draw;v.querySelector('#hs104CtlStatus').onchange=draw;draw();
  }

  function renderFolios(){
    const v=view();if(!v)return;v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Folios</strong><div class="hs104-note">Genera un folio o un rango continuo.</div></div><button class="cc-btn cc-btn-primary" id="hs104Generate">Generar folios</button></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>ESTATUS</th><th>RESPONSABLE</th><th>PERSONA</th><th>CREADO</th></tr></thead><tbody>'+((D.ultimosFolios||[]).map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.estatus)+'</td><td>'+esc(x.responsable_nombre||'—')+'</td><td>'+esc(x.beneficiario_nombre||x.operador_nombre||'—')+'</td><td>'+fmt(x.created_at)+'</td></tr>').join('')||'<tr><td colspan="5" style="text-align:center;padding:20px">Sin folios.</td></tr>')+'</tbody></table></div></div>';
    v.querySelector('#hs104Generate').onclick=openGenerate;
  }
  function openGenerate(){if(!perm('generar'))return alert('Sin permiso para generar folios.');const ss=active(D.series),ys=active(D.anios);if(!ss.length||!ys.length)return alert('Primero agrega Serie y Año en Catálogos.');modal('Generar folios','<form><div class="hs104-grid"><div class="cc-field"><label>Serie *</label><select name="serieId" required>'+options(ss,x=>x.codigo)+'</select></div><div class="cc-field"><label>Año *</label><select name="anioId" required>'+options(ys,x=>x.anio)+'</select></div><div class="cc-field"><label>Desde *</label><input name="desde" type="number" min="0" max="999999" required></div><div class="cc-field"><label>Hasta *</label><input name="hasta" type="number" min="0" max="999999" required></div></div><div class="hs104-actions" style="margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Generar</button></div></form>',{onSave:async fd=>{const d=Number(fd.get('desde')),h=Number(fd.get('hasta'));if(h<d)throw new Error('El folio Hasta no puede ser menor que Desde.');const r=await rpc('hs_generate_folios',{p_item:{serieId:fd.get('serieId'),anioId:fd.get('anioId'),desde:d,hasta:h}});alert('Folios generados: '+Number(r.generados||0))}})}

  function renderResponsables(){
    const v=view();if(!v)return;const rows=D.asignacionesResponsable||[];v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Custodia por responsable</strong><div class="hs104-note">Asigna rangos, acepta manualmente o reenvía el enlace por correo.</div></div><button class="cc-btn cc-btn-primary" id="hs104AssignResp">Asignar rango</button></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>RANGO</th><th>RESPONSABLE</th><th>ESTATUS</th><th>ACEPTADO</th><th>ACCIONES</th></tr></thead><tbody id="hs104RespBody"></tbody></table></div></div>';
    v.querySelector('#hs104RespBody').innerHTML=rows.length?rows.map(x=>'<tr><td>'+esc(x.serie)+'-'+esc(x.anio)+' · '+six(x.desde)+' → '+six(x.hasta)+'</td><td><strong>'+esc(x.responsableNombre)+'</strong><div class="hs104-note">'+esc(x.responsableEmail||'Sin correo')+'</div></td><td>'+esc(x.estatus)+'</td><td>'+fmt(x.aceptadoAt)+'</td><td><div class="hs104-actions">'+(x.estatus==='ACEPTADA'?'<span class="hs104-pill hs104-ok">Aceptada</span>':'<button class="cc-btn cc-btn-light" data-accept="'+esc(x.id)+'">Aceptar manual</button><button class="cc-btn cc-btn-primary" data-resend="'+esc(x.id)+'">Reenviar enlace</button>')+'</div></td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;padding:20px">Sin asignaciones.</td></tr>';
    v.querySelector('#hs104AssignResp').onclick=openAssignResponsible;
    v.querySelectorAll('[data-accept]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Aceptar manualmente esta asignación?'))return;try{await rpc('hs_accept_assignment_manual',{p_asignacion_id:b.dataset.accept});await load()}catch(e){alert(e.message||e)}});
    v.querySelectorAll('[data-resend]').forEach(b=>b.onclick=()=>reissue(b.dataset.resend));
  }
  function openAssignResponsible(){if(!perm('asignar_responsable'))return alert('Sin permiso.');const rs=active(D.responsables),ss=active(D.series),ys=active(D.anios);if(!rs.length)return alert('Primero agrega un responsable en Catálogos.');modal('Asignar rango a responsable','<form><div class="hs104-grid"><div class="cc-field"><label>Serie *</label><select name="serieId" required>'+options(ss,x=>x.codigo)+'</select></div><div class="cc-field"><label>Año *</label><select name="anioId" required>'+options(ys,x=>x.anio)+'</select></div><div class="cc-field"><label>Desde *</label><input name="desde" type="number" min="0" max="999999" required></div><div class="cc-field"><label>Hasta *</label><input name="hasta" type="number" min="0" max="999999" required></div><div class="cc-field"><label>Responsable *</label><select name="responsableId" required>'+options(rs,x=>x.nombre+(x.numeroEmpleado?' · '+x.numeroEmpleado:'')+(x.correo?' · '+x.correo:''))+'</select></div></div><div class="hs104-actions" style="margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Asignar y enviar enlace</button></div></form>',{onSave:async fd=>{const r=await rpc('hs_create_responsible_assignment',{p_item:{serieId:fd.get('serieId'),anioId:fd.get('anioId'),desde:Number(fd.get('desde')),hasta:Number(fd.get('hasta')),responsableId:fd.get('responsableId'),hours:168}});await sendAssignmentEmail(r.id,r.token)}})}
  async function reissue(id){try{const r=await rpc('hs_reissue_assignment_link',{p_asignacion_id:id});if(r.aceptada)return alert('La asignación ya fue aceptada.');await sendAssignmentEmail(id,r.token)}catch(e){alert(e.message||e)}}

  function renderOperadores(){
    const v=view();if(!v)return;v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Folios entregados</strong><div class="hs104-note">Entrega hojas a Operadores o Beneficiarios desde una custodia aceptada.</div></div><div class="hs104-actions"><select id="hs104OpType" class="cc-input"><option value="OPERADOR">Operadores</option><option value="BENEFICIARIO">Beneficiarios</option></select><input id="hs104OpSearch" class="cc-input" type="search" placeholder="Buscar persona..."><button class="cc-btn cc-btn-primary" id="hs104AssignOp">Asignar rango</button></div></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>PERSONA</th><th>RESPONSABLE</th><th>FECHA</th><th>ESTATUS</th></tr></thead><tbody id="hs104OpBody"></tbody></table></div></div>';
    const draw=()=>{const t=v.querySelector('#hs104OpType').value,q=norm(v.querySelector('#hs104OpSearch').value);const rows=(D.asignacionesOperador||[]).filter(x=>String(x.tipoPersona||'OPERADOR')===t).filter(x=>!q||norm(x.persona||x.beneficiario||x.operador).includes(q));v.querySelector('#hs104OpBody').innerHTML=rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.persona||x.beneficiario||x.operador||'—')+'</td><td>'+esc(x.responsable||'—')+'</td><td>'+fmt(x.fecha)+'</td><td>'+esc(x.estatus||'ACTIVA')+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;padding:20px">Sin resultados.</td></tr>'};
    v.querySelector('#hs104OpType').onchange=draw;v.querySelector('#hs104OpSearch').oninput=draw;v.querySelector('#hs104AssignOp').onclick=openAssignPerson;draw();
  }
  function openAssignPerson(){if(!perm('asignar_operador'))return alert('Sin permiso.');const aa=(D.asignacionesResponsable||[]).filter(x=>x.estatus==='ACEPTADA');if(!aa.length)return alert('No hay rangos aceptados por responsables.');const body='<form><div class="hs104-grid"><div class="cc-field"><label>Tipo *</label><select name="tipoPersona"><option value="OPERADOR">Operador</option><option value="BENEFICIARIO">Beneficiario</option></select></div><div class="cc-field"><label>Persona *</label><select name="personaId" required></select></div><div class="cc-field"><label>Custodia *</label><select name="asignacionId" required>'+options(aa,x=>x.responsableNombre+' · '+x.serie+'-'+x.anio+' · '+six(x.desde)+' a '+six(x.hasta))+'</select></div><div class="cc-field"><label>Desde *</label><input name="desde" type="number" min="0" max="999999" required></div><div class="cc-field"><label>Hasta *</label><input name="hasta" type="number" min="0" max="999999" required></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div><div class="hs104-actions"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Asignar hojas</button></div></form>';
    const o=modal('Asignar hojas a persona',body,{onSave:async fd=>{await rpc('hs_assign_operator_range',{p_item:{asignacionId:fd.get('asignacionId'),tipoPersona:fd.get('tipoPersona'),personaId:fd.get('personaId'),operadorId:fd.get('personaId'),desde:Number(fd.get('desde')),hasta:Number(fd.get('hasta')),observaciones:fd.get('observaciones')}})}});const f=o.querySelector('form'),sel=f.personaId;const fill=()=>{const xs=f.tipoPersona.value==='BENEFICIARIO'?active(D.beneficiarios):active(D.operadores);sel.innerHTML=options(xs,x=>x.nombre+(x.numeroEmpleado?' · '+x.numeroEmpleado:''))};f.tipoPersona.onchange=fill;fill();
  }

  function personType(x){return String(x.tipoPersona||'OPERADOR').toUpperCase()==='BENEFICIARIO'?'BENEFICIARIO':'OPERADOR'}
  function personName(x){return personType(x)==='BENEFICIARIO'?(x.beneficiario||x.beneficiarioNombre||x.operador||''):(x.operador||'')}
  function renderComprobacion(){
    const v=view();if(!v)return;v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Comprobación por persona</strong><div class="hs104-note">Selecciona Operador o Beneficiario y comprueba cada hoja con cliente, Tipo de servicio y Clasificación.</div></div><div class="hs104-actions"><select id="hs104CompType" class="cc-input"><option value="OPERADOR">Operadores</option><option value="BENEFICIARIO">Beneficiarios</option></select><input id="hs104CompPersonSearch" class="cc-input" type="search" autocomplete="off" list="hs104CompPersonList" placeholder="Buscar operador..." style="min-width:260px"><datalist id="hs104CompPersonList"></datalist><select id="hs104CompPerson" class="cc-input" style="display:none"></select></div></div><div id="hs104CompList"></div></div><div class="hs104-card" style="margin-top:12px"><div class="cc-toolbar"><strong>Historial de comprobaciones</strong></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>FECHA USO</th><th>CLIENTE</th><th>PERSONA</th><th>TIPO SERVICIO</th><th>CLASIFICACIÓN</th><th>ACCIONES</th></tr></thead><tbody id="hs104Hist"></tbody></table></div></div>';
    const type=v.querySelector('#hs104CompType'),person=v.querySelector('#hs104CompPerson'),personSearch=v.querySelector('#hs104CompPersonSearch'),personList=v.querySelector('#hs104CompPersonList');
    const syncPersonFromSearch=()=>{const q=norm(personSearch.value),opts=[...person.options].filter(o=>o.value);if(!q){person.value='';person.dispatchEvent(new Event('change',{bubbles:true}));return;}let match=opts.find(o=>norm(o.textContent)===q);if(!match){const starts=opts.filter(o=>norm(o.textContent).startsWith(q));if(starts.length===1)match=starts[0];}if(!match){const contains=opts.filter(o=>norm(o.textContent).includes(q));if(contains.length===1)match=contains[0];}if(match){person.value=match.value;personSearch.value=match.textContent.trim();person.dispatchEvent(new Event('change',{bubbles:true}));}};
    const fillPeople=()=>{const t=type.value, rows=(D.foliosAsignadosOperador||[]).filter(x=>personType(x)===t),map=new Map();rows.forEach(x=>{const id=t==='BENEFICIARIO'?x.beneficiarioId:x.operadorId;if(id&&!map.has(String(id)))map.set(String(id),{id,name:personName(x),count:0});if(id)map.get(String(id)).count++});const people=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));person.innerHTML='<option value="">Seleccionar '+(t==='BENEFICIARIO'?'beneficiario':'operador')+'…</option>'+people.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+p.count+' pendiente(s)</option>').join('');personList.innerHTML=people.map(p=>'<option value="'+esc(p.name+' · '+p.count+' pendiente(s)')+'"></option>').join('');personSearch.value='';personSearch.placeholder=t==='BENEFICIARIO'?'Buscar beneficiario...':'Buscar operador...';drawCards();drawHist()};
    const drawCards=()=>{
      const id=person.value,t=type.value,list=v.querySelector('#hs104CompList');
      if(list.querySelector('.hs-list-modal-open'))document.body.style.overflow='';
      if(!id){list.innerHTML='<div style="padding:26px;text-align:center;color:#64748b">Selecciona una persona para ver sus hojas pendientes.</div>';return;}
      const rows=(D.foliosAsignadosOperador||[]).filter(x=>personType(x)===t&&String(t==='BENEFICIARIO'?x.beneficiarioId:x.operadorId)===String(id));
      list.innerHTML='<div class="hs104-row">'+rows.map(x=>{
        const pre=x.precaptura;
        return `
        <div class="hs104-card hs-list-row" data-row="${esc(x.id)}" data-hs-folio="${esc(x.folio)}" data-hs-person="${esc(personName(x))}">
          <div class="hs-list-head">
            <div class="hs-list-info"><strong>${esc(x.folio)}</strong><div class="hs104-note">${esc(personName(x))} · ${pre?esc([pre.cliente,pre.tipoViaje,pre.clasificacion].filter(Boolean).join(' · ')||'Datos precargados'):esc(x.responsable||'—')}</div></div>
            <div class="hs-list-head-actions"><span class="hs104-pill ${pre?'hs104-ok':'hs104-danger'}">${pre?'PRECARGADA APP':'PENDIENTE'}</span><button type="button" class="cc-btn cc-btn-light" data-hs-edit aria-haspopup="dialog"><i class="fa-solid fa-pen"></i> Editar</button><button type="button" class="cc-btn cc-btn-light" data-return><i class="fa-solid fa-rotate-left"></i> Registrar sin usar</button></div>
          </div>
          <div class="hs-list-edit-area" role="dialog" aria-modal="true" aria-label="${pre?'Revisar y comprobar':'Editar'} hoja ${esc(x.folio)}">
            <div class="hs-list-dialog"><div class="hs-list-dialog-head"><strong>${pre?'Revisar y comprobar':'Llenar hoja'} · ${esc(x.folio)}</strong><button type="button" class="hs-list-dialog-close" data-hs-close aria-label="Cerrar">×</button></div>
              <div class="hs-list-dialog-body">
                <div class="hs-manual-photo-box" data-hs-manual-photo-box="1" data-photo-path=""><label>Evidencia fotográfica</label><div class="hs-photo-methods"><button type="button" class="cc-btn cc-btn-light" data-upload><i class="fa-solid fa-upload"></i> Subir imagen</button><button type="button" class="cc-btn cc-btn-light" data-qr><i class="fa-solid fa-qrcode"></i> Tomar foto con QR</button><input type="file" accept="image/*" data-file></div><div class="hs-manual-photo-status">Sube una foto o muestra el QR para tomarla desde tu teléfono.</div></div>
                <div class="hs104-grid"><div class="cc-field"><label>Fecha de uso *</label><input data-fecha type="date" value="${today()}"></div><div class="cc-field"><label>Cliente *</label><select data-cliente>${options(D.clientes||[],c=>c.nombre+(c.razonSocial&&c.razonSocial!==c.nombre?' · '+c.razonSocial:''))}</select></div><div class="cc-field"><label>Tipo de servicio *</label><input data-tipo placeholder="Ej. Exportación, Importación, Cruce..."></div><div class="cc-field"><label>Clasificación *</label><input data-clas placeholder="Ej. Cargado, Vacío, Foráneo..."></div></div>
                <div class="cc-field"><label>Observaciones</label><textarea data-obs placeholder="Opcional"></textarea></div>
                <div class="hs104-actions"><button type="button" class="cc-btn cc-btn-primary" data-save>Comprobar hoja</button></div>
              </div>
            </div>
          </div>
        </div>`;}).join('')+'</div>';
      list.querySelectorAll('[data-row]').forEach(row=>{
        const area=row.querySelector('.hs-list-edit-area');
        const close=()=>{row.classList.remove('hs-list-modal-open');if(!list.querySelector('.hs-list-modal-open'))document.body.style.overflow='';};
        row.querySelector('[data-hs-edit]').onclick=()=>{list.querySelectorAll('.hs-list-modal-open').forEach(other=>other.classList.remove('hs-list-modal-open'));row.classList.add('hs-list-modal-open');document.body.style.overflow='hidden';window.hsPatchPrecapture?.();window.hsPatchManualPhotoPdf?.();};
        row.querySelector('[data-hs-close]').onclick=close;
        area.onclick=e=>{if(e.target===area)close();};
        row.querySelector('[data-save]').onclick=()=>saveUsed(row);
        row.querySelector('[data-return]').onclick=()=>returnBlank(row);
      });
    };
    const drawHist=()=>{const t=type.value,rows=(D.comprobaciones||[]).filter(x=>String(x.tipo||'').toUpperCase()==='UTILIZADA').filter(x=>personType(x)===t);v.querySelector('#hs104Hist').innerHTML=rows.length?rows.map(x=>'<tr data-hs-hist-row="1" data-hs-hist-folio="'+esc(x.folio)+'"><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.fechaUso||x.fecha||'—')+'</td><td>'+esc(x.cliente||'—')+'</td><td>'+esc(personName(x)||'—')+'</td><td>'+esc(x.tipoViaje||x.servicio||'—')+'</td><td>'+esc(x.clasificacion||'—')+'</td><td class="hs-hist-actions-cell"><div class="hs-hist-actions"><button type="button" class="cc-btn cc-btn-light" data-edit-h><i class="fa-solid fa-pen"></i> Editar</button><button type="button" class="cc-btn cc-btn-light" data-qr-h><i class="fa-solid fa-qrcode"></i> QR foto</button><button type="button" class="cc-btn cc-btn-light" data-pdf-h><i class="fa-solid fa-file-pdf"></i> PDF</button><button type="button" class="cc-btn cc-btn-light" data-photo-h><i class="fa-solid fa-camera"></i> Foto</button></div></td></tr>').join(''):'<tr><td colspan="7" style="text-align:center;padding:20px">Sin comprobaciones.</td></tr>'};
    type.onchange=fillPeople;person.onchange=drawCards;personSearch.addEventListener('change',syncPersonFromSearch);personSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();syncPersonFromSearch();}});personSearch.addEventListener('input',()=>{const q=norm(personSearch.value);if(!q&&person.value){person.value='';person.dispatchEvent(new Event('change',{bubbles:true}));return;}const exact=[...person.options].filter(o=>o.value).find(o=>norm(o.textContent)===q);if(exact&&person.value!==exact.value){person.value=exact.value;person.dispatchEvent(new Event('change',{bubbles:true}));}});fillPeople();
  }
  async function saveUsed(row){const val=s=>String(row.querySelector(s)?.value||'').trim(),folioId=row.dataset.row,fechaUso=val('[data-fecha]'),clienteId=val('[data-cliente]'),tipoViaje=val('[data-tipo]'),clasificacion=val('[data-clas]'),observaciones=val('[data-obs]');if(!fechaUso)return alert('Captura la fecha de uso.');if(!clienteId)return alert('Selecciona un cliente.');if(!tipoViaje)return alert('Captura el Tipo de servicio.');if(!clasificacion)return alert('Captura la Clasificación.');const btn=row.querySelector('[data-save]');btn.disabled=true;try{await rpc('hs_mark_used',{p_item:{folioId,fechaUso,clienteId,tipoViaje,clasificacion,servicio:tipoViaje,observaciones}});await load()}catch(e){alert(e.message||e);btn.disabled=false}}
  async function returnBlank(row){const folioId=row.dataset.row,fecha=String(row.querySelector('[data-fecha]')?.value||today());if(!confirm('¿Confirmas que esta hoja regresó SIN USAR?\n\nVolverá al responsable y podrá asignarse nuevamente.'))return;const btn=row.querySelector('[data-return]');btn.disabled=true;try{await rpc('hs_return_blank',{p_item:{folioId,fecha,observaciones:'Regresada sin usar desde Control de Hojas v104'}});await load()}catch(e){alert(e.message||e);btn.disabled=false}}

  function renderCatalogos(){
    const v=view();if(!v)return;v.innerHTML='<div class="cc-ant-report-grid"><div class="hs104-card"><div class="cc-toolbar"><strong>Series</strong><button class="cc-btn cc-btn-primary" data-add-serie>Agregar</button></div><div id="hs104Series"></div></div><div class="hs104-card"><div class="cc-toolbar"><strong>Años</strong><button class="cc-btn cc-btn-primary" data-add-anio>Agregar</button></div><div id="hs104Anios"></div></div></div><div class="hs104-card" style="margin-top:12px"><div class="cc-toolbar"><div><strong>Responsables</strong><div class="hs104-note">Captura correo para enviar automáticamente el enlace de aceptación.</div></div><button class="cc-btn cc-btn-primary" data-add-resp>Agregar responsable</button></div><div id="hs104RespCat"></div></div>';
    v.querySelector('#hs104Series').innerHTML=(D.series||[]).map(x=>catRow(x.codigo,x.estatus,'SERIE',x.id)).join('')||'<div class="cc-note">Sin series.</div>';
    v.querySelector('#hs104Anios').innerHTML=(D.anios||[]).map(x=>catRow(x.anio,x.estatus,'ANIO',x.id)).join('')||'<div class="cc-note">Sin años.</div>';
    v.querySelector('#hs104RespCat').innerHTML=(D.responsables||[]).map(x=>'<div style="padding:9px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.numeroEmpleado||'')+(x.correo?' · '+esc(x.correo):' · SIN CORREO')+' · '+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-resp="'+esc(x.id)+'">Editar</button></div>').join('')||'<div class="cc-note">Sin responsables.</div>';
    v.querySelector('[data-add-serie]').onclick=()=>editCatalog('SERIE');v.querySelector('[data-add-anio]').onclick=()=>editCatalog('ANIO');v.querySelector('[data-add-resp]').onclick=()=>editCatalog('RESPONSABLE');
    v.querySelectorAll('[data-edit-cat]').forEach(b=>b.onclick=()=>editCatalog(b.dataset.type,(b.dataset.type==='SERIE'?D.series:D.anios).find(x=>String(x.id)===String(b.dataset.editCat))));v.querySelectorAll('[data-edit-resp]').forEach(b=>b.onclick=()=>editCatalog('RESPONSABLE',(D.responsables||[]).find(x=>String(x.id)===String(b.dataset.editResp))));
  }
  function catRow(label,status,type,id){return '<div style="padding:9px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(label)+'</strong><small style="display:block;color:#64748b">'+esc(status||'ACTIVO')+'</small></span><button class="cc-btn cc-btn-light" data-edit-cat="'+esc(id)+'" data-type="'+type+'">Editar</button></div>'}
  function editCatalog(type,x={}){if(!perm('catalogos'))return alert('Sin permiso para catálogos.');let body='';if(type==='SERIE')body='<div class="cc-field"><label>Serie *</label><input name="codigo" required value="'+esc(x.codigo||'')+'"></div><div class="cc-field"><label>Descripción</label><input name="descripcion" value="'+esc(x.descripcion||'')+'"></div>';else if(type==='ANIO')body='<div class="cc-field"><label>Año *</label><input name="anio" type="number" min="2000" max="2100" required value="'+esc(x.anio||new Date().getFullYear())+'"></div>';else body='<div class="hs104-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Número empleado</label><input name="numeroEmpleado" value="'+esc(x.numeroEmpleado||'')+'"></div><div class="cc-field"><label>Correo</label><input name="correo" type="email" value="'+esc(x.correo||'')+'"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="'+esc(x.telefono||'')+'"></div></div>';body='<form>'+body+'<div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div><div class="hs104-actions"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form>';modal((x.id?'Editar ':'Agregar ')+type,body,{onSave:async fd=>{let item={id:x.id||'',estatus:fd.get('estatus')};if(type==='SERIE')item={...item,codigo:fd.get('codigo'),descripcion:fd.get('descripcion')};else if(type==='ANIO')item={...item,anio:Number(fd.get('anio'))};else item={...item,nombre:fd.get('nombre'),numeroEmpleado:fd.get('numeroEmpleado'),correo:fd.get('correo'),telefono:fd.get('telefono')};await rpc('hs_save_catalog',{p_tipo:type,p_item:item})}})}

  function boot(){if(!window.CC_AUTH_READY||!window.gmSupabase||!document.getElementById('controlCajasSection'))return setTimeout(boot,400);if(!install())return setTimeout(boot,400);load().catch(e=>console.warn('Hojas v104',e));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,700));else setTimeout(boot,700);
})();
