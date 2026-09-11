window.ccRenderTarifas=function(){
 const el=document.getElementById('ccTarifasList');if(!el)return;
 el.innerHTML=clientes.length?clientes.map((c,i)=>{const t=Object.assign({diario:0,semanal:0,mensual:0},configuracion.tarifasRenta[c.id]||{});return `<tr><td>${i+1}</td><td><strong>${esc(c.nombre)}</strong></td><td><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"><label style="font-size:9px;color:#64748b">Diario<input type="number" min="0" step="0.01" data-tarifa-d="${c.id}" value="${Number(t.diario).toFixed(2)}" style="width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:7px"></label><label style="font-size:9px;color:#64748b">Semanal<input type="number" min="0" step="0.01" data-tarifa-s="${c.id}" value="${Number(t.semanal).toFixed(2)}" style="width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:7px"></label><label style="font-size:9px;color:#64748b">Mensual<input type="number" min="0" step="0.01" data-tarifa-m="${c.id}" value="${Number(t.mensual).toFixed(2)}" style="width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:7px"></label></div></td><td><span class="cc-badge ${c.estatus==='ACTIVO'?'cc-ok':'cc-off'}">${esc(c.estatus||'ACTIVO')}</span></td><td><button type="button" class="cc-btn cc-btn-primary" onclick="ccGuardarTarifa('${c.id}')">Guardar</button></td></tr>`}).join(''):'<tr><td colspan="5" style="padding:30px;text-align:center;color:#94a3b8">Primero registra clientes.</td></tr>';
};
window.ccGuardarTarifa=function(clienteId){
 const n=id=>Math.max(0,Number(document.querySelector(`[data-tarifa-${id}="${clienteId}"]`)?.value)||0);
 const anterior=JSON.parse(JSON.stringify(configuracion.tarifasRenta[clienteId]||{}));const nueva={diario:n('d'),semanal:n('s'),mensual:n('m')};configuracion.tarifasRenta[clienteId]=nueva;const cli=clientes.find(c=>c.id===clienteId);ccAudit({operacionId:ccAuditId('TAR'),accion:'ACTUALIZAR_TARIFA',modulo:'CONFIGURACION',submodulo:'TARIFAS',idRegistro:clienteId,idCliente:clienteId,cliente:cli?.nombre||'',datosAnteriores:anterior,datosNuevos:nueva,detalle:'Tarifa diaria/semanal/mensual actualizada'});save();ccRenderTarifas();
};
window.ccRenderProforma=function(){
const hoy=iso(new Date());const d=document.getElementById('ccProformaDesde'),h=document.getElementById('ccProformaHasta'),sel=document.getElementById('ccProformaCliente');
if(!d||!h||!sel)return;if(!d.value)d.value=hoy;if(!h.value)h.value=hoy;
const current=sel.value;sel.innerHTML='<option value="">Todos los clientes</option>'+clientes.filter(c=>c.estatus!=='INACTIVO').map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('');sel.value=current;
ccCalcularProforma(false);
};
function ccDaysBetween(desde,hasta){const out=[];if(!desde||!hasta||desde>hasta)return out;let d=new Date(desde+'T12:00:00'),end=new Date(hasta+'T12:00:00');while(d<=end){out.push(iso(d));d.setDate(d.getDate()+1);}return out;}
window.ccCalcularProforma=function(showAlert=true){
  ccAudit({operacionId:ccAuditId('PRO'),accion:'CALCULAR_PROFORMA',modulo:'PROFORMA',submodulo:'CALCULO',detalle:'Se calculó proforma',datosNuevos:{desde:document.getElementById('ccProformaDesde')?.value||'',hasta:document.getElementById('ccProformaHasta')?.value||'',cliente:document.getElementById('ccProformaCliente')?.value||''}});
 const desde=document.getElementById('ccProformaDesde')?.value,hasta=document.getElementById('ccProformaHasta')?.value,clienteFiltro=document.getElementById('ccProformaCliente')?.value||'';
 if(!desde||!hasta||desde>hasta){if(showAlert)alert('Selecciona un rango de fechas válido.');return;}
 const ds=ccDaysBetween(desde,hasta),detalle=[];
 rentas.filter(r=>!clienteFiltro||r.clienteId===clienteFiltro).forEach(r=>{
   const c=clientes.find(x=>x.id===r.clienteId),u=cajas.find(x=>x.id===r.cajaId);if(!c||!u||r.estatus==='CANCELADA')return;
   let dias=0;ds.forEach(d=>{if(rentFor(r.id,d))dias++;});if(!dias)return;
   const metodo=r.metodoCobro||'DIARIO',t=Object.assign({diario:0,semanal:0,mensual:0},configuracion.tarifasRenta[r.clienteId]||{});
   const tarifa=Number(t[metodo.toLowerCase()]||r.totalTarifa||0);
   const periodos=metodo==='MENSUAL'?Math.ceil(dias/30):metodo==='SEMANAL'?Math.ceil(dias/7):dias;
   const importe=tarifa*periodos;
   detalle.push({rentaId:r.id,cliente:c.nombre,clienteId:c.id,unidad:u.numero||u.descripcion||'Sin unidad',tipo:u.tipoUnidadNombre||u.categoriaUnidad||'CAJA',responsable:responsables.find(x=>x.id===r.responsableId)?.nombre||'—',fechaInicio:r.fechaInicio||'',fechaFin:r.fechaFin||'',dias,metodo,tarifa,periodos,importe,observaciones:r.observaciones||''});
 });
 const byClient={};detalle.forEach(d=>{if(!byClient[d.clienteId])byClient[d.clienteId]={cliente:d.cliente,unidades:new Set(),dias:0,importe:0,detalle:[]};byClient[d.clienteId].unidades.add(d.unidad);byClient[d.clienteId].dias+=d.dias;byClient[d.clienteId].importe+=d.importe;byClient[d.clienteId].detalle.push(d);});
 const rows=Object.values(byClient).sort((a,b)=>b.importe-a.importe);
 const total=detalle.reduce((s,x)=>s+x.importe,0),totalDias=detalle.reduce((s,x)=>s+x.dias,0),unidadesCount=new Set(detalle.map(x=>x.unidad)).size;
 const body=document.getElementById('ccProformaBody');
 if(body)body.innerHTML=detalle.length?detalle.map((d,i)=>`<tr><td>${i+1}</td><td><strong>${esc(d.cliente)}</strong></td><td><strong>${esc(d.unidad)}</strong></td><td>${esc(d.tipo)}</td><td>${d.dias}</td><td><span class="cc-method">${esc(d.metodo)}</span></td><td class="cc-money">$${d.tarifa.toLocaleString('es-MX',{minimumFractionDigits:2})}</td><td>${d.periodos}</td><td class="cc-money">$${d.importe.toLocaleString('es-MX',{minimumFractionDigits:2})}</td></tr>`).join(''):'<tr><td colspan="9" style="padding:30px;text-align:center;color:#94a3b8">No hay rentas para el periodo seleccionado.</td></tr>';
 const foot=document.getElementById('ccProformaFoot');if(foot)foot.innerHTML=detalle.length?`<tr><td colspan="4">TOTAL GENERAL</td><td>${totalDias}</td><td colspan="3"></td><td class="cc-money">$${total.toLocaleString('es-MX',{minimumFractionDigits:2})}</td></tr>`:'';
 document.getElementById('ccProformaKpis').innerHTML=`<div class="cc-proforma-kpi"><small>Clientes</small><strong>${rows.length}</strong></div><div class="cc-proforma-kpi"><small>Unidades rentadas</small><strong>${unidadesCount}</strong></div><div class="cc-proforma-kpi"><small>Días rentados</small><strong>${totalDias}</strong></div><div class="cc-proforma-kpi"><small>TOTAL A COBRAR</small><strong>$${total.toLocaleString('es-MX',{minimumFractionDigits:2})}</strong></div>`;
 const summary=document.getElementById('ccProformaSummary');if(summary)summary.innerHTML=`<div class="cc-pro-summary-card"><div class="label">Total de la proforma</div><div class="value">$${total.toLocaleString('es-MX',{minimumFractionDigits:2})}</div><div class="sub">Importe total estimado del periodo</div></div><div class="cc-pro-summary-card light"><div class="label">Desglose por cliente</div><div style="margin-top:8px">${rows.length?rows.map(x=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #eef2f7"><span>${esc(x.cliente)}</span><b>$${x.importe.toLocaleString('es-MX',{minimumFractionDigits:2})}</b></div>`).join(''):'Sin datos'}</div></div><div class="cc-pro-summary-card light"><div class="label">Periodo</div><div class="value" style="font-size:20px">${desde} → ${hasta}</div><div class="sub">${detalle.length} movimientos de renta considerados</div></div>`;
 window.ccProformaData={desde,hasta,rows,detalle,totalDias,total,unidadesCount};if(showAlert&&typeof showStatus==='function')showStatus('Proforma calculada correctamente.','success');
};
window.ccGenerarPDFProforma=function(){
 if(!window.ccProformaData)ccCalcularProforma(false);const data=window.ccProformaData;if(!data){alert('Primero calcula la proforma.');return;}
 try{const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'letter'});const emision=new Date().toLocaleDateString('es-MX');
 doc.setFillColor(15,23,42);doc.rect(0,0,280,24,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('PROFORMA DE RENTA DE UNIDADES',14,11);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text(`Periodo: ${data.desde} al ${data.hasta} | Emisión: ${emision}`,14,18);
 doc.setTextColor(15,23,42);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(`Clientes: ${data.rows.length} | Unidades: ${data.unidadesCount} | Días rentados: ${data.totalDias} | TOTAL A COBRAR: $${data.total.toLocaleString('es-MX',{minimumFractionDigits:2})}`,14,32);
 const rows=[];data.detalle.forEach((x,i)=>rows.push([i+1,x.cliente,x.unidad,x.tipo,x.responsable,x.dias,x.metodo,`$${x.tarifa.toLocaleString('es-MX',{minimumFractionDigits:2})}`,x.periodos,`$${x.importe.toLocaleString('es-MX',{minimumFractionDigits:2})}`]));
 doc.autoTable({startY:38,head:[['#','CLIENTE','UNIDAD RENTADA','TIPO','RESPONSABLE','DÍAS','COBRO','TARIFA','PERIODOS','IMPORTE']],body:rows,theme:'striped',styles:{fontSize:7,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[30,64,175],textColor:255,fontStyle:'bold',halign:'center'},margin:{left:8,right:8,top:38,bottom:12},didDrawPage:function(){const hh=doc.internal.pageSize.getHeight();doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text('Proforma de renta — Tráfico App',8,hh-6);doc.text(`Página ${doc.internal.getNumberOfPages()}`,250,hh-6);}});
 doc.save(`Proforma_Renta_Unidades_${data.desde}_${data.hasta}.pdf`);
 }catch(e){console.error(e);alert('No fue posible generar el PDF de la proforma.');}
};
async function ccReloadFromDatabase(){
 if(!ccSupabaseReady())return {ok:false,error:'SUPABASE_NO_CONFIGURADO'};
 try{
   const {data,error}=await gmSupabase.rpc('cc_load_all');
   if(error)throw error;
   ccRevision=Number(data?.revision||0);
   ccNormalizeState(data?.state||{});
   ccCloudReady=true;
   ccRenderAll();
   return {ok:true,revision:ccRevision};
 }catch(e){
   console.error('ERROR RECARGANDO SUPABASE:',e);
   ccCloudReady=false;
   showStatus?.('ERROR LEYENDO SUPABASE · '+(e.message||e),'error');
   return {ok:false,error:e.message||String(e)};
 }
}
window.ccReloadFromDatabase=ccReloadFromDatabase;


const ccSectionCache={};
function ccSectionCacheFresh(key,ms=5000){
  const t=ccSectionCache[key]||0;
  return (Date.now()-t)<ms;
}
function ccMarkSectionFresh(key){ccSectionCache[key]=Date.now();}
window.ccRefreshVisible=async function(){
  const btn=document.getElementById('ccRefreshVisibleBtn');
  const active=document.querySelector('#controlCajasSection .cc-panel.active');
  const sectionName=active?.id?.replace('ccPanel','')||'Dashboard';
  if(ccSectionCacheFresh('refresh_'+sectionName,1200)) return;

  try{
    if(btn){
      btn.disabled=true;
      btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Actualizando...';
    }
    showStatus?.('Actualizando '+sectionName+' desde Supabase...','info');

    const {data,error}=await gmSupabase.rpc('cc_load_all');
    if(error)throw error;
    if(data?.ok===false)throw new Error(data?.error||'No se pudo actualizar la información');

    ccRevision=Number(data?.revision||ccRevision);
    ccNormalizeState(data?.state||{});

    // Renderiza únicamente lo visible.
    if(active?.id==='ccPanelDashboard') ccRenderDashboard();
    else if(active?.id==='ccPanelInventario') ccRenderInventario();
    else if(active?.id==='ccPanelRenta') ccRenderRenta();
    else if(active?.id==='ccPanelHistorial') ccRenderHistorial();
    else if(active?.id==='ccPanelMantenimiento') ccRenderMantenimiento();
    else if(active?.id==='ccPanelConfiguracion') ccRenderConfiguracion();
    else if(active?.id==='ccPanelProforma' && typeof ccRenderProforma==='function') ccRenderProforma();
    else ccRenderAll();

