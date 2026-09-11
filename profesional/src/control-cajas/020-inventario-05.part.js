 const visibles=rows.slice(0,300);
 body.innerHTML=visibles.length?visibles.map(x=>`<tr>
   <td>${esc(x.entrada)}</td>
   <td>${esc(x.salida)}</td>
   <td><strong>${esc(x.caja)}</strong></td>
   <td>${esc(x.cliente)}</td>
   <td>${esc(x.responsable)}</td>
   <td><span class="cc-badge ${x.estatus==='ACTIVA'?'cc-ok':''}">${x.estatus}</span></td>
   <td>${esc(x.observaciones||'—')}</td>
 </tr>`).join(''):'<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8">No hay movimientos con los filtros seleccionados.</td></tr>';
 if(rows.length>300)body.insertAdjacentHTML('beforeend',`<tr><td colspan="7" style="padding:10px;text-align:center;color:#64748b">Mostrando 300 de ${rows.length} movimientos. Usa los filtros por caja o cliente para reducir el listado.</td></tr>`);

 const k=document.getElementById('ccHistKpis');
 if(k)k.innerHTML=`<div class="cc-hist-kpi"><small>Movimientos</small><strong>${rows.length}</strong></div><div class="cc-hist-kpi"><small>Cajas</small><strong>${new Set(rows.map(x=>x.caja)).size}</strong></div><div class="cc-hist-kpi"><small>Clientes</small><strong>${new Set(rows.map(x=>x.cliente)).size}</strong></div><div class="cc-hist-kpi"><small>Activas</small><strong>${rows.filter(x=>x.estatus==='ACTIVA').length}</strong></div>`;
 window.ccHistorialData={eventos:rows,rows,box:bc,cliente:cl,responsable:rp};
};
window.ccLimpiarHistorial=function(){['ccHistCaja','ccHistCliente','ccHistResponsable'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});ccRenderHistorial();};
window.ccExportarExcelHistorial=function(){const d=window.ccHistorialData;if(!d){ccRenderHistorial();return;}try{const rows=(d.rows||[]).map((x,i)=>({'#':i+1,'Entrada a renta':x.entrada,'Salida de renta':x.salida,'Caja':x.caja,'Cliente':x.cliente,'Responsable':x.responsable,'Estatus':x.estatus,'Observaciones':x.observaciones||''}));const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=[{wch:5},{wch:16},{wch:16},{wch:14},{wch:26},{wch:24},{wch:14},{wch:45}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Historial Renta');XLSX.writeFile(wb,`Historial_Renta_${new Date().toISOString().slice(0,10)}.xlsx`);}catch(e){console.error(e);alert('No fue posible exportar el historial a Excel.');}};
window.ccGenerarPDFHistorial=function(){const d=window.ccHistorialData;if(!d){ccRenderHistorial();return;}try{const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'letter'});const box=d.box?(cajas.find(x=>x.id===d.box)?.numero||''):'Todas las cajas';const cliente=d.cliente?(clientes.find(x=>x.id===d.cliente)?.nombre||''):'Todos los clientes';doc.setFillColor(15,23,42);doc.rect(0,0,280,24,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('HISTORIAL DE MOVIMIENTOS DE RENTA',14,11);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text(`Caja: ${box} | Cliente: ${cliente}`,14,18);doc.setTextColor(15,23,42);doc.autoTable({startY:30,head:[['Entrada','Salida','Caja','Cliente','Responsable','Estatus','Observaciones']],body:(d.rows||[]).map(x=>[x.entrada,x.salida,x.caja,x.cliente,x.responsable,x.estatus,x.observaciones||'']),theme:'striped',styles:{fontSize:7,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[30,64,175],textColor:255,fontStyle:'bold'},margin:{left:8,right:8,bottom:10}});doc.save(`Historial_Renta_${new Date().toISOString().slice(0,10)}.pdf`);}catch(e){console.error(e);alert('No fue posible generar el PDF del historial.');}};
window.ccUnitCategory=function(x){
    return String(x?.categoriaUnidad||x?.tipoUnidadNombre||'CAJA').toUpperCase();
};
window.ccTipoMatches=function(x,tipo){
    if(tipo==='TODOS') return true;
    return ccUnitCategory(x)===tipo || String(x?.tipoUnidadNombre||'').toUpperCase()===String(tipo).toUpperCase();
};
window.ccRenderTipoButtons=function(){
    const tipos=ccGetUnitTypes();
    const dash=document.getElementById('ccDashTipoExtra'), inv=document.getElementById('ccInvTipoExtra');
    if(dash) dash.innerHTML=tipos.filter(t=>!['CAJA','CARRO'].includes(String(t.categoria||t.nombre).toUpperCase())).map(t=>`<button type="button" class="cc-btn cc-btn-light ccDashTipoBtn" data-tipo="${esc(t.nombre)}" onclick="ccDashboardTipo('${esc(t.nombre)}')">${esc(t.nombre)}</button>`).join('');
    if(inv) inv.innerHTML=tipos.filter(t=>!['CAJA','CARRO'].includes(String(t.categoria||t.nombre).toUpperCase())).map(t=>`<button type="button" class="cc-btn cc-btn-light ccInvTipoBtn" data-tipo="${esc(t.nombre)}" onclick="ccFiltrarInventarioTipo('${esc(t.nombre)}')">${esc(t.nombre)}</button>`).join('');
};
window.ccDashboardTipo=function(tipo){
    window.ccDashboardTipoActual=tipo||'TODOS';
    document.querySelectorAll('.ccDashTipoBtn').forEach(b=>{const active=b.dataset.tipo===window.ccDashboardTipoActual;b.classList.toggle('cc-btn-primary',active);b.classList.toggle('cc-btn-light',!active);});
    if(typeof ccRenderDashboard==='function') ccRenderDashboard();
};
window.ccFiltrarInventarioTipo=function(tipo){
    window.ccInventarioTipoActual=tipo||'TODOS';
    document.querySelectorAll('.ccInvTipoBtn').forEach(b=>{const active=b.dataset.tipo===window.ccInventarioTipoActual;b.classList.toggle('cc-btn-primary',active);b.classList.toggle('cc-btn-light',!active);});
    if(typeof ccRenderInventario==='function') ccRenderInventario();
};
window.ccRenderDashboard=function(){const tipoDash=window.ccDashboardTipoActual||'TODOS';const unidadesDash=cajas.filter(x=>ccTipoMatches(x,tipoDash));const cajasDash=unidadesDash.filter(x=>ccUnitCategory(x)==='CAJA');const carrosDash=unidadesDash.filter(x=>ccUnitCategory(x)==='CARRO');const el=document.getElementById('ccDashboardContent');if(!el)return;const hoy=iso(new Date()),total=unidadesDash.length,act=unidadesDash.filter(x=>x.estatus!=='INACTIVO').length,mant=unidadesDash.filter(x=>x.estatus==='MANTENIMIENTO').length,rentadas=unidadesDash.filter(x=>x.estatus!=='MANTENIMIENTO'&&x.estatus!=='INACTIVO'&&rentas.some(r=>r.cajaId===x.id&&rentFor(r.id,hoy))).length,disponibles=Math.max(0,act-mant-rentadas),mex=unidadesDash.filter(x=>(x.origen||'MEXICANA')==='MEXICANA').length,usa=unidadesDash.filter(x=>x.origen==='USA').length,clientesAct=clientes.filter(c=>c.estatus!=='INACTIVO').length;const cliMap={};rentas.filter(r=>rentFor(r.id,hoy)).forEach(r=>{const n=clientes.find(c=>c.id===r.clienteId)?.nombre||'SIN CLIENTE';cliMap[n]=(cliMap[n]||0)+1;});const max=Math.max(1,...Object.values(cliMap));const util=act?((rentadas/act)*100):0;el.innerHTML=`<div class="cc-pro-hero"><div style="font-size:9px;font-weight:900;letter-spacing:.16em;color:#93c5fd">CENTRO DE CONTROL · UNIDADES</div><h3>Control total de tus unidades.</h3><p>Vista ejecutiva para saber en segundos cuántas cajas tienes, cuántas están rentadas, disponibles o fuera de servicio por mantenimiento, y qué clientes concentran las rentas.</p><div class="cc-pro-pills"><span class="cc-pro-pill">${total} unidades registradas</span><span class="cc-pro-pill">${clientesAct} clientes activos</span><span class="cc-pro-pill">${mant} en mantenimiento</span><span class="cc-pro-pill">Corte: ${fmtDate(hoy)}</span></div></div><div class="cc-pro-kpis"><div class="cc-pro-kpi total"><small>Total inventario</small><strong>${total}</strong><span>unidades registradas</span></div><div class="cc-pro-kpi rent"><small>Rentadas hoy</small><strong>${rentadas}</strong><span>${util.toFixed(0)}% del inventario activo</span></div><div class="cc-pro-kpi free"><small>Disponibles</small><strong>${disponibles}</strong><span>listas para asignar</span></div><div class="cc-pro-kpi maint"><small>Mantenimiento</small><strong>${mant}</strong><span>fuera de servicio</span></div><div class="cc-pro-kpi"><small>Mexicanas</small><strong>${mex}</strong><span>del inventario</span></div><div class="cc-pro-kpi"><small>USA</small><strong>${usa}</strong><span>del inventario</span></div></div><div class="cc-pro-grid"><div class="cc-pro-card"><h4>Rentas por cliente</h4><div class="sub">Cajas con renta activa al día de hoy</div>${Object.keys(cliMap).length?Object.entries(cliMap).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="cc-pro-bar"><span title="${esc(n)}">${esc(n)}</span><span class="cc-pro-track"><span class="cc-pro-fill" style="width:${(v/max)*100}%"></span></span><b>${v}</b></div>`).join(''):'<div class="cc-note">No hay rentas activas hoy.</div>'}</div><div class="cc-pro-card"><h4>Salud del inventario</h4><div class="sub">Distribución actual de las cajas activas</div><div class="cc-pro-mini-grid"><div class="cc-pro-mini"><small>Disponibles</small><strong>${disponibles}</strong></div><div class="cc-pro-mini"><small>Rentadas</small><strong>${rentadas}</strong></div><div class="cc-pro-mini"><small>Mantenimiento</small><strong>${mant}</strong></div></div><div class="cc-pro-bar"><span>Disponibilidad</span><span class="cc-pro-track"><span class="cc-pro-fill" style="width:${act?disponibles/act*100:0}%"></span></span><b>${act?Math.round(disponibles/act*100):0}%</b></div><div class="cc-pro-bar"><span>Utilización</span><span class="cc-pro-track"><span class="cc-pro-fill" style="width:${Math.min(100,util)}%"></span></span><b>${util.toFixed(0)}%</b></div><div class="cc-pro-actions"><button class="primary" onclick="ccTab('inventario',document.querySelector('#controlCajasSection .cc-tab:nth-child(2)'))">Ver inventario</button><button class="warn" onclick="ccTab('mantenimiento',document.querySelector('#controlCajasSection .cc-tab:nth-child(6)'))">Ver mantenimiento</button></div></div></div><div class="cc-pro-card" style="margin-top:14px"><h4>Alertas de control</h4><div class="sub">Indicadores que requieren atención</div>${mant?`<div class="cc-pro-alert"><div><strong>🔧 ${mant} caja(s) fuera de servicio</strong><span>Revisar mantenimiento y fecha de liberación.</span></div><button class="cc-btn cc-btn-light" onclick="ccTab('mantenimiento',document.querySelector('#controlCajasSection .cc-tab:nth-child(6)'))">Revisar</button></div>`:''}${!disponibles&&act?`<div class="cc-pro-alert"><div><strong>⚠️ Sin cajas disponibles</strong><span>Todas las cajas activas están rentadas o en mantenimiento.</span></div></div>`:''}${!mant&&!(!disponibles&&act)?`<div style="font-size:11px;color:#64748b;padding:12px;background:#f8fafc;border-radius:10px">✓ No hay alertas críticas de inventario en este momento.</div>`:''}</div>`;};
window.ccConfigSection=function(section,btn){
document.querySelectorAll('#ccPanelConfiguracion .cc-config-nav-btn').forEach(b=>b.classList.remove('active'));
document.querySelectorAll('#ccPanelConfiguracion .cc-config-section').forEach(x=>x.classList.remove('active'));
if(btn)btn.classList.add('active');
const el=document.getElementById('ccConfig'+section.charAt(0).toUpperCase()+section.slice(1));
if(el)el.classList.add('active');
if(section==='clientes')ccRenderClientes();
if(section==='responsables')ccRenderResponsables();
if(section==='remitente'||section==='destinatarios')ccRenderConfiguracion();
if(section==='tarifas')ccRenderTarifas();if(section==='tiposUnidad')ccRenderTiposUnidad();if(section==='tiposUsoCaja')ccRenderTiposUsoCaja();
};
window.ccRenderTiposUnidad=function(){const el=document.getElementById('ccTiposUnidadList');if(!el)return;const arr=configuracion.tiposUnidad||[];el.innerHTML=arr.length?arr.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td>${esc(x.categoria||x.nombre)}</td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus||'ACTIVO')}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoTipoUnidad('${x.id}')">Editar</button><button class="cc-btn cc-btn-danger" onclick="ccDeleteTipoUnidad('${x.id}')">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="5" style="padding:30px;text-align:center;color:#94a3b8">No hay tipos configurados.</td></tr>';};
window.ccNuevoTipoUnidad=function(id){const x=(configuracion.tiposUnidad||[]).find(a=>a.id===id)||{};modal(id?'Editar tipo de unidad':'Nuevo tipo de unidad',`<div class="cc-grid"><div class="cc-field"><label>Nombre del tipo</label><input name="nombre" required placeholder="Ej. CARRO, CAJA REFRIGERADA..." value="${esc(x.nombre)}"></div><div class="cc-field"><label>Categoría</label><select name="categoria"><option ${x.categoria==='CAJA'||!x.categoria?'selected':''}>CAJA</option><option ${x.categoria==='CARRO'?'selected':''}>CARRO</option><option ${x.categoria==='OTRO'?'selected':''}>OTRO</option></select></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div></div>`,f=>{const nombre=String(f.get('nombre')||'').trim().toUpperCase();if(!nombre)return;if((configuracion.tiposUnidad||[]).some(a=>a.id!==id&&String(a.nombre).toUpperCase()===nombre)){alert('Ese tipo de unidad ya existe.');return;}const o={...x,id:x.id||uid(),nombre,categoria:f.get('categoria'),estatus:f.get('estatus')};if(id)configuracion.tiposUnidad=configuracion.tiposUnidad.map(a=>a.id===id?o:a);else configuracion.tiposUnidad.push(o);});};
window.ccDeleteTipoUnidad=function(id){const x=(configuracion.tiposUnidad||[]).find(a=>a.id===id);if(!x)return;if(['tipo_caja','tipo_carro'].includes(id)){alert('Los tipos CAJA y CARRO son base del sistema y no se pueden eliminar. Puedes desactivarlos.');return;}if(cajas.some(u=>u.tipoUnidadId===id)){alert('No se puede eliminar un tipo que ya está asignado a unidades. Puedes desactivarlo.');return;}if(!confirm(`¿Eliminar el tipo ${x.nombre}?`))return;configuracion.tiposUnidad=configuracion.tiposUnidad.filter(a=>a.id!==id);ccAudit({operacionId:ccAuditId('TIPO'),accion:'ELIMINAR_TIPO_UNIDAD',modulo:'CONFIGURACION',submodulo:'TIPOS_UNIDAD',idRegistro:id,datosAnteriores:x,detalle:'Tipo de unidad eliminado'});save();ccRenderTiposUnidad();};

window.ccRenderTiposUsoCaja=function(){
  const el=document.getElementById('ccTiposUsoCajaList');if(!el)return;
  const arr=configuracion.tiposUsoCaja||[];
  el.innerHTML=arr.length?arr.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${esc(x.nombre)}</strong></td><td><span class="cc-badge ${x.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(x.estatus||'ACTIVO')}</span></td><td><button class="cc-btn cc-btn-light" onclick="ccNuevoTipoUsoCaja('${x.id}')">Editar</button></td></tr>`).join(''):'<tr><td colspan="4" style="padding:30px;text-align:center;color:#94a3b8">No hay tipos de uso configurados.</td></tr>';
};
window.ccNuevoTipoUsoCaja=function(id){
  const x=(configuracion.tiposUsoCaja||[]).find(a=>a.id===id)||{};
  modal(id?'Editar tipo de uso':'Nuevo tipo de uso',`<div class="cc-grid"><div class="cc-field"><label>Nombre</label><input name="nombre" required value="${esc(x.nombre)}" placeholder="Ej. Cruce"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option ${x.estatus==='ACTIVO'||!x.estatus?'selected':''}>ACTIVO</option><option ${x.estatus==='INACTIVO'?'selected':''}>INACTIVO</option></select></div></div>`,f=>{
    const nombre=String(f.get('nombre')||'').trim();
    if(!nombre)return;
    if((configuracion.tiposUsoCaja||[]).some(a=>a.id!==id&&String(a.nombre).trim().toUpperCase()===nombre.toUpperCase()))throw new Error('Ese tipo de uso ya existe.');
    const o={...x,id:x.id||uid(),nombre,estatus:f.get('estatus')};
    if(id)configuracion.tiposUsoCaja=configuracion.tiposUsoCaja.map(a=>a.id===id?o:a);
    else (configuracion.tiposUsoCaja||(configuracion.tiposUsoCaja=[])).push(o);
  });
};
window.ccDescargarTemplateUnidades=function(){const h=['Tipo de unidad','Identificador / Número','Descripción','Largo (ft)','Ancho (ft)','Alto (ft)','Largo','Ancho','Alto','Placas MX','Placas USA','Tipo de uso de caja','Marca','Modelo / Año','Tamaño','Tipo / Configuración','Origen','Cliente','Capacidad','Estatus','Observaciones'];const e=['CAJA','CAJ-001','Ejemplo','','','','53','8.5','9','ABC1234','','Cruce','Utility','2026','53 FT','Caja seca','MEXICANA','','26 TON','ACTIVO',''];const ws=XLSX.utils.aoa_to_sheet([h,e]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Unidades');XLSX.writeFile(wb,'Template_Importacion_Unidades.xlsx');};
window.ccAbrirImportarUnidades=function(){
  modal('Importar unidades desde Excel / CSV',`
    <div class="cc-import-note">
      <b>Importación directa a Supabase.</b> Una fila por unidad. Columnas reconocidas:
      Tipo de unidad, Identificador / Número, Descripción, Largo, Ancho, Alto,
      Placas, Placas MX, Placas USA, Tipo de uso de caja, Marca, Modelo / Año,
      Tamaño, Tipo / Configuración, Origen, Cliente, Capacidad, Estatus y Observaciones.
      <br><b>Importante:</b> el Identificador / Número no puede estar repetido.
    </div>
    <div class="cc-field"><label>Archivo Excel / CSV</label><input id="ccImportFile" type="file" accept=".xlsx,.xls,.csv" required></div>
    <div id="ccImportPreview" style="margin-top:12px"></div>
  `,async f=>{
    const input=document.getElementById('ccImportFile');
    if(!input?.files?.[0])throw new Error('Selecciona un archivo Excel o CSV.');
    const r=await ccProcesarImportacionUnidades(input.files[0]);
    if(!r?.ok)throw new Error(r?.error||'No se pudo importar el archivo.');
  });
};

window.ccProcesarImportacionUnidades=async function(file){
  const readFile=()=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('No fue posible leer el archivo.'));
    reader.onload=()=>resolve(reader.result);
    reader.readAsArrayBuffer(file);
  });
  try{
    showStatus?.('Leyendo archivo de unidades...','info');
    const buffer=await readFile();
    const wb=XLSX.read(buffer,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    if(!rows.length)throw new Error('El archivo no contiene filas para importar.');

